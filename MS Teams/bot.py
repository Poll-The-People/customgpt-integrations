"""
Microsoft Teams Bot Implementation for CustomGPT
"""

import asyncio
import logging
import re
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone

from botbuilder.core import (
    TurnContext,
    MessageFactory,
    CardFactory,
    ActivityHandler,
    BotFrameworkAdapter
)
from botbuilder.schema import (
    Activity,
    ActivityTypes,
    ChannelAccount,
    ConversationReference,
    Mention,
    CardAction,
    ActionTypes,
    SuggestedActions,
    CardImage,
    HeroCard,
    ThumbnailCard,
    Attachment
)
from botbuilder.core.conversation_state import ConversationState
from botbuilder.core.user_state import UserState

from config import Config
from customgpt_client import CustomGPTClient
from rate_limiter import RateLimiter
from conversation_manager import ConversationManager
from adaptive_cards import AdaptiveCardBuilder
from input_validator import InputValidator

# Conditional Confluence import
confluence_client_module = None
if Config.CONFLUENCE_ENABLED:
    try:
        from confluence_client import ConfluenceClient
        confluence_client_module = ConfluenceClient
    except ImportError:
        logger.warning("Confluence enabled but confluence_client module not found")

logger = logging.getLogger(__name__)

class CustomGPTTeamsBot(ActivityHandler):
    """Microsoft Teams bot implementation for CustomGPT integration"""

    def __init__(
        self,
        conversation_state: ConversationState,
        user_state: UserState
    ):
        super().__init__()

        # Initialize components
        self.conversation_state = conversation_state
        self.user_state = user_state
        self.customgpt_client = CustomGPTClient(Config.CUSTOMGPT_API_KEY)
        self.rate_limiter = RateLimiter(self.customgpt_client)
        self.conversation_manager = ConversationManager()
        self._initialized = False

        # Initialize Confluence client if enabled
        self.confluence_client = None
        if Config.CONFLUENCE_ENABLED and confluence_client_module:
            self.confluence_client = confluence_client_module(
                base_url=Config.CONFLUENCE_BASE_URL,
                username=Config.CONFLUENCE_USERNAME,
                api_token=Config.CONFLUENCE_API_TOKEN,
                access_token=Config.CONFLUENCE_ACCESS_TOKEN,
                is_cloud=Config.CONFLUENCE_IS_CLOUD
            )

        # Cache for starter questions
        self._starter_questions_cache = None
        self._starter_questions_timestamp = None
        self._starter_questions_ttl = 3600  # 1 hour cache

        # Command patterns
        self.command_patterns = {
            '/help': self._handle_help_command,
            '/clear': self._handle_clear_command,
            '/status': self._handle_status_command
        }

        # Add Confluence commands if enabled
        if Config.CONFLUENCE_ENABLED:
            self.command_patterns['/confluence'] = self._handle_confluence_command
            self.command_patterns['/search'] = self._handle_confluence_search

    async def initialize(self):
        """
        Async initialization - call this before using the bot
        Properly initializes async components with error handling
        """
        if self._initialized:
            return

        try:
            # Initialize HTTP session
            await self.customgpt_client._ensure_session()
            logger.info("CustomGPT client initialized")

            # Initialize Redis connections if available
            await self.rate_limiter.initialize()
            logger.info("Rate limiter initialized")

            await self.conversation_manager.initialize()
            logger.info("Conversation manager initialized")

            # Initialize Confluence client if enabled
            if self.confluence_client:
                await self.confluence_client._ensure_session()
                logger.info("Confluence client initialized")

            self._initialized = True
            logger.info("Bot initialization complete")
        except Exception as e:
            logger.error(f"Bot initialization failed: {e}")
            raise

    async def cleanup(self):
        """Clean up bot resources"""
        logger.info("Starting bot cleanup...")
        try:
            await self.customgpt_client.close()
            await self.rate_limiter.close()
            await self.conversation_manager.close()
            if self.confluence_client:
                await self.confluence_client.close()
            logger.info("Bot cleanup complete")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    async def on_message_activity(self, turn_context: TurnContext) -> None:
        """Handle incoming messages"""
        try:
            # Extract message details
            activity = turn_context.activity
            text = activity.text.strip() if activity.text else ""

            # Handle adaptive card actions
            if activity.value:
                await self._handle_card_action(turn_context, activity.value)
                return

            # Skip empty messages
            if not text:
                return

            # Validate and sanitize input
            if not InputValidator.validate_message_length(text):
                await turn_context.send_activity(
                    f"Your message is too long. Maximum length is {InputValidator.MAX_MESSAGE_LENGTH} characters."
                )
                return

            # Check for potential injection attacks
            if InputValidator.detect_potential_injection(text):
                logger.warning(f"Potential injection attempt detected from user")
                await turn_context.send_activity(
                    "Your message contains potentially unsafe content. Please rephrase your question."
                )
                return

            # Sanitize message text
            text = InputValidator.sanitize_message(text)

            # Get conversation details
            user_id = activity.from_property.id
            user_name = activity.from_property.name
            channel_id = activity.channel_data.get("channel", {}).get("id", activity.conversation.id)
            tenant_id = activity.channel_data.get("tenant", {}).get("id", "default")

            # Validate IDs
            if not InputValidator.validate_user_id(user_id):
                logger.error(f"Invalid user ID format: {user_id}")
                return

            if not InputValidator.validate_channel_id(channel_id):
                logger.error(f"Invalid channel ID format: {channel_id}")
                return
            thread_id = activity.conversation.conversation_type if activity.conversation.is_group else None
            
            # Check if bot was mentioned in a channel
            is_channel = activity.conversation.is_group
            bot_mentioned = False
            
            if is_channel:
                # Remove bot mentions from text
                text, bot_mentioned = self._remove_mentions(activity)
                
                # Skip if bot wasn't mentioned and mentions are required
                if Config.REQUIRE_MENTION_IN_CHANNELS and not bot_mentioned:
                    return
            
            # Check if sender is a bot and we should ignore
            if activity.from_property.properties.get("isBot") and not Config.RESPOND_TO_OTHER_BOTS:
                return
            
            # Security checks
            if Config.is_user_blocked(user_id):
                await turn_context.send_activity("Sorry, you don't have permission to use this bot.")
                return
            
            if not Config.is_tenant_allowed(tenant_id):
                await turn_context.send_activity("Sorry, this bot is not available for your organization.")
                return
            
            if not Config.is_channel_allowed(channel_id):
                await turn_context.send_activity("Sorry, this bot is not enabled for this channel.")
                return
            
            # Check for commands
            command = text.lower().split()[0] if text else ""
            if command in self.command_patterns:
                await self.command_patterns[command](turn_context)
                return
            
            # Rate limiting
            is_allowed, error_message = await self.rate_limiter.check_rate_limit(
                user_id,
                channel_id,
                tenant_id
            )
            
            if not is_allowed:
                # Get remaining quota
                quota_info = await self.rate_limiter.get_remaining_quota(user_id, tenant_id)
                
                # Send rate limit card
                card = AdaptiveCardBuilder.create_rate_limit_card(
                    reset_time=60,  # Default to 60 seconds
                    user_remaining=quota_info.get("user_remaining"),
                    api_remaining=quota_info.get("api_remaining")
                )
                await turn_context.send_activity(MessageFactory.attachment(card))
                return
            
            # Send typing indicator
            await self._send_typing_indicator(turn_context)
            
            # Get or create conversation context
            conversation = await self.conversation_manager.get_or_create_conversation(
                channel_id=channel_id,
                tenant_id=tenant_id,
                user_id=user_id,
                thread_id=thread_id,
                metadata={
                    "user_name": user_name,
                    "is_channel": is_channel,
                    "teams_conversation_id": activity.conversation.id
                }
            )
            
            # Send message to CustomGPT
            try:
                # Get context messages if threading is enabled
                context_messages = []
                if Config.ENABLE_THREADING and Config.ENABLE_CONVERSATION_HISTORY:
                    context_messages = await self.conversation_manager.get_context_messages(
                        channel_id,
                        user_id,
                        thread_id,
                        limit=Config.MAX_CONTEXT_MESSAGES
                    )
                
                # Prepare user info for API
                user_info = {
                    "id": user_id,
                    "name": user_name,
                    "tenant": tenant_id,
                    "channel": channel_id
                }
                
                # Send message
                if context_messages:
                    # Use OpenAI format with context
                    messages = context_messages + [{"role": "user", "content": text}]
                    response_data = await self.customgpt_client.send_message_openai_format(
                        project_id=Config.CUSTOMGPT_PROJECT_ID,
                        messages=messages,
                        lang=Config.DEFAULT_LANGUAGE,
                        session_id=conversation.session_id
                    )
                    
                    # Extract response
                    response_text = response_data['choices'][0]['message']['content']
                    citations = response_data.get('citations', [])
                    session_id = response_data.get('session_id', conversation.session_id)
                    message_id = response_data.get('id')
                else:
                    # Use standard format
                    response_data = await self.customgpt_client.send_message(
                        project_id=Config.CUSTOMGPT_PROJECT_ID,
                        session_id=conversation.session_id,
                        message=text,
                        lang=Config.DEFAULT_LANGUAGE,
                        user_info=user_info
                    )
                    
                    response_text = response_data['openai_response']
                    citations = response_data.get('citations', [])
                    session_id = response_data['session_id']
                    message_id = response_data['id']
                
                # Update session ID if it changed
                if session_id != conversation.session_id:
                    await self.conversation_manager.update_session_id(
                        channel_id,
                        user_id,
                        session_id,
                        thread_id
                    )
                
                # Add messages to context
                await self.conversation_manager.add_message_to_context(
                    channel_id,
                    user_id,
                    "user",
                    text,
                    thread_id
                )
                
                await self.conversation_manager.add_message_to_context(
                    channel_id,
                    user_id,
                    "assistant",
                    response_text,
                    thread_id
                )
                
                # Send response
                if Config.ENABLE_ADAPTIVE_CARDS:
                    # Create adaptive card response
                    card = AdaptiveCardBuilder.create_response_card(
                        response=response_text,
                        citations=citations if Config.SHOW_CITATIONS else None,
                        session_id=session_id,
                        message_id=message_id,
                        show_feedback=True
                    )
                    await turn_context.send_activity(MessageFactory.attachment(card))
                else:
                    # Send plain text response
                    await turn_context.send_activity(MessageFactory.text(response_text))
                
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                
                # Send error card
                error_card = AdaptiveCardBuilder.create_error_card(
                    error_message="I encountered an error while processing your request.",
                    details=str(e) if Config.LOG_LEVEL == "DEBUG" else None,
                    retry_available=True
                )
                await turn_context.send_activity(MessageFactory.attachment(error_card))
        
        except Exception as e:
            logger.error(f"Unexpected error in message handler: {str(e)}")
            await turn_context.send_activity("An unexpected error occurred. Please try again later.")
    
    async def on_members_added_activity(
        self,
        members_added: List[ChannelAccount],
        turn_context: TurnContext
    ) -> None:
        """Handle new members joining"""
        for member in members_added:
            if member.id != turn_context.activity.recipient.id:
                # New user joined, send welcome message
                await self._send_welcome_message(turn_context)
    
    async def _send_welcome_message(self, turn_context: TurnContext) -> None:
        """Send welcome message to new users"""
        try:
            # Get starter questions
            starter_questions = await self._get_starter_questions()
            
            # Create welcome card
            welcome_card = AdaptiveCardBuilder.create_welcome_card(
                bot_name="CustomGPT",
                starter_questions=starter_questions
            )
            
            await turn_context.send_activity(MessageFactory.attachment(welcome_card))
        except Exception as e:
            logger.error(f"Error sending welcome message: {str(e)}")
            await turn_context.send_activity(
                "Welcome! I'm CustomGPT Bot. Ask me anything or type /help for more information."
            )
    
    async def _handle_card_action(self, turn_context: TurnContext, value: Dict[str, Any]) -> None:
        """Handle adaptive card actions"""
        action = value.get("action")
        
        if action == "ask_question":
            # Handle starter question selection
            question = value.get("question")
            if question:
                # Update activity text and process as normal message
                turn_context.activity.text = question
                await self.on_message_activity(turn_context)
        
        elif action == "feedback":
            # Handle feedback
            reaction = value.get("reaction")
            session_id = value.get("session_id")
            message_id = value.get("message_id")
            
            if reaction and session_id and message_id:
                try:
                    await self.customgpt_client.update_message_feedback(
                        Config.CUSTOMGPT_PROJECT_ID,
                        session_id,
                        message_id,
                        reaction
                    )
                    
                    # Send confirmation
                    confirmation_card = AdaptiveCardBuilder.create_feedback_confirmation_card(reaction)
                    await turn_context.send_activity(MessageFactory.attachment(confirmation_card))
                except Exception as e:
                    logger.error(f"Error updating feedback: {str(e)}")
        
        elif action == "copy":
            # Handle copy action (client-side handling needed)
            await turn_context.send_activity("Please select and copy the text above.")
        
        elif action == "retry":
            # Handle retry action
            await turn_context.send_activity("Please try your question again.")
    
    async def _handle_help_command(self, turn_context: TurnContext) -> None:
        """Handle /help command"""
        help_card = AdaptiveCardBuilder.create_help_card()
        await turn_context.send_activity(MessageFactory.attachment(help_card))
    
    async def _handle_clear_command(self, turn_context: TurnContext) -> None:
        """Handle /clear command"""
        activity = turn_context.activity
        user_id = activity.from_property.id
        channel_id = activity.channel_data.get("channel", {}).get("id", activity.conversation.id)
        thread_id = activity.conversation.conversation_type if activity.conversation.is_group else None
        
        # Clear conversation
        await self.conversation_manager.clear_conversation(
            channel_id,
            user_id,
            thread_id
        )
        
        await turn_context.send_activity("✅ Conversation history cleared. Starting fresh!")
    
    async def _handle_status_command(self, turn_context: TurnContext) -> None:
        """Handle /status command"""
        activity = turn_context.activity
        user_id = activity.from_property.id
        tenant_id = activity.channel_data.get("tenant", {}).get("id", "default")
        
        # Get quota information
        quota_info = await self.rate_limiter.get_remaining_quota(user_id, tenant_id)
        
        # Get conversation info
        conversation_count = await self.conversation_manager.get_active_conversations_count(tenant_id)
        
        status_text = f"""**Bot Status**
        
**Rate Limits:**
• User messages remaining: {quota_info['user_remaining']}/{quota_info['user_limit']} (per minute)
• API queries remaining: {quota_info['api_remaining']}/{quota_info['api_limit']} if quota_info['api_remaining'] else 'N/A'

**Active Conversations:** {conversation_count}

**Configuration:**
• Language: {Config.DEFAULT_LANGUAGE}
• Threading: {'Enabled' if Config.ENABLE_THREADING else 'Disabled'}
• Citations: {'Shown' if Config.SHOW_CITATIONS else 'Hidden'}
"""
        
        await turn_context.send_activity(MessageFactory.text(status_text))
    
    async def _send_typing_indicator(self, turn_context: TurnContext) -> None:
        """Send typing indicator"""
        typing_activity = MessageFactory.text("")
        typing_activity.type = ActivityTypes.typing
        await turn_context.send_activity(typing_activity)
    
    def _remove_mentions(self, activity: Activity) -> Tuple[str, bool]:
        """Remove bot mentions from text and check if bot was mentioned"""
        text = activity.text or ""
        bot_mentioned = False
        
        if activity.entities:
            for entity in activity.entities:
                if entity.type == "mention":
                    mentioned = entity.properties.get("mentioned", {})
                    if mentioned.get("id") == activity.recipient.id:
                        bot_mentioned = True
                        # Remove mention text
                        mention_text = entity.properties.get("text", "")
                        text = text.replace(mention_text, "").strip()
        
        return text, bot_mentioned
    
    async def _get_starter_questions(self) -> List[str]:
        """Get starter questions from agent settings"""
        try:
            # Check cache
            now = datetime.now(timezone.utc)
            if self._starter_questions_cache and self._starter_questions_timestamp:
                cache_age = (now - self._starter_questions_timestamp).total_seconds()
                if cache_age < self._starter_questions_ttl:
                    return self._starter_questions_cache
            
            # Get fresh data
            settings = await self.customgpt_client.get_agent_settings(Config.CUSTOMGPT_PROJECT_ID)
            starter_questions = settings.get('starter_questions', [])
            
            # Update cache
            self._starter_questions_cache = starter_questions
            self._starter_questions_timestamp = now
            
            return starter_questions
        except Exception as e:
            logger.error(f"Error getting starter questions: {str(e)}")
            return [
                "What can you help me with?",
                "Tell me about your capabilities",
                "How do I get started?"
            ]
    
    async def on_turn_error(self, context: TurnContext, error: Exception) -> None:
        """Handle errors"""
        logger.error(f"Turn error: {str(error)}")

        try:
            # Send error message
            await context.send_activity(
                "Sorry, an error occurred while processing your request. Please try again."
            )
        except Exception:
            pass

    async def _handle_confluence_command(self, turn_context: TurnContext) -> None:
        """Handle /confluence command - show Confluence integration info"""
        if not self.confluence_client:
            await turn_context.send_activity("Confluence integration is not enabled.")
            return

        try:
            # Get spaces user has access to
            spaces = await self.confluence_client.get_spaces(limit=5)

            spaces_list = "\n".join([f"• **{s.get('name')}** ({s.get('key')})" for s in spaces[:5]])

            help_text = f"""**Confluence Integration Active**

**Available Spaces:**
{spaces_list}

**Commands:**
• `/search <query>` - Search Confluence content
• `/confluence` - Show this help

**Example:**
`/search product roadmap`
"""
            await turn_context.send_activity(MessageFactory.text(help_text))
        except Exception as e:
            logger.error(f"Error handling confluence command: {e}")
            await turn_context.send_activity("Error accessing Confluence. Check configuration.")

    async def _handle_confluence_search(self, turn_context: TurnContext) -> None:
        """Handle /search command - search Confluence"""
        if not self.confluence_client:
            await turn_context.send_activity("Confluence integration is not enabled.")
            return

        # Extract search query
        text = turn_context.activity.text or ""
        query = text.replace('/search', '').strip()

        if not query:
            await turn_context.send_activity("Please provide a search query. Example: `/search product roadmap`")
            return

        await self._send_typing_indicator(turn_context)

        try:
            # Search Confluence
            results = await self.confluence_client.search_by_text(
                query=query,
                space_key=Config.CONFLUENCE_DEFAULT_SPACE,
                limit=Config.CONFLUENCE_SEARCH_LIMIT
            )

            if not results:
                await turn_context.send_activity(f"No results found for '{query}'")
                return

            # Format results
            formatted_results = []
            for content in results:
                formatted = self.confluence_client.format_content_for_teams(content)
                formatted_results.append(formatted)

            # Create response card with results
            if Config.ENABLE_ADAPTIVE_CARDS:
                card = self._create_confluence_results_card(query, formatted_results)
                await turn_context.send_activity(MessageFactory.attachment(card))
            else:
                # Plain text response
                response_text = f"**Search Results for '{query}':**\n\n"
                for result in formatted_results:
                    response_text += f"**{result['title']}**\n"
                    response_text += f"{result['excerpt']}\n"
                    response_text += f"📍 {result['space_name']} | 🔗 {result['url']}\n\n"

                await turn_context.send_activity(MessageFactory.text(response_text))

        except Exception as e:
            logger.error(f"Error searching Confluence: {e}")
            error_card = AdaptiveCardBuilder.create_error_card(
                error_message=f"Error searching Confluence for '{query}'",
                details=str(e) if Config.LOG_LEVEL == "DEBUG" else None
            )
            await turn_context.send_activity(MessageFactory.attachment(error_card))

    def _create_confluence_results_card(self, query: str, results: List[Dict]) -> Attachment:
        """Create adaptive card for Confluence search results"""
        from botbuilder.schema import Attachment

        card_body = [
            {
                "type": "TextBlock",
                "text": f"Confluence Search Results",
                "weight": "Bolder",
                "size": "Large"
            },
            {
                "type": "TextBlock",
                "text": f"Query: {query}",
                "isSubtle": True,
                "spacing": "None"
            },
            {
                "type": "TextBlock",
                "text": f"Found {len(results)} result(s)",
                "isSubtle": True,
                "spacing": "Small"
            }
        ]

        # Add results
        for idx, result in enumerate(results):
            if idx > 0:
                card_body.append({"type": "Container", "separator": True, "items": []})

            card_body.append({
                "type": "TextBlock",
                "text": result['title'],
                "weight": "Bolder",
                "size": "Medium",
                "wrap": True
            })

            card_body.append({
                "type": "TextBlock",
                "text": result['excerpt'],
                "wrap": True,
                "spacing": "Small"
            })

            card_body.append({
                "type": "ColumnSet",
                "spacing": "Small",
                "columns": [
                    {
                        "type": "Column",
                        "width": "auto",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": f"📍 {result['space_name']}",
                                "size": "Small",
                                "isSubtle": True
                            }
                        ]
                    },
                    {
                        "type": "Column",
                        "width": "stretch",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": f"✏️ {result['last_updated_by']}",
                                "size": "Small",
                                "isSubtle": True,
                                "horizontalAlignment": "Right"
                            }
                        ]
                    }
                ]
            })

            card_body.append({
                "type": "ActionSet",
                "spacing": "Small",
                "actions": [
                    {
                        "type": "Action.OpenUrl",
                        "title": "Open in Confluence",
                        "url": result['url']
                    }
                ]
            })

        card = {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.5",
            "body": card_body
        }

        return CardFactory.adaptive_card(card)