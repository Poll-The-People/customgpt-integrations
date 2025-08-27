#!/usr/bin/env python3
"""
Instagram CustomGPT Bot
A bot that integrates Instagram DMs with CustomGPT's RAG platform
"""

import os
import json
import logging
import asyncio
import hmac
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional

from aiohttp import web, ClientSession
from aiohttp.web import Request, Response, Application

from config import Config
from customgpt_client import CustomGPTClient
from rate_limiter import RateLimiter
from conversation_manager import ConversationManager
from starter_questions import StarterQuestionsManager

# Setup logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class InstagramBot:
    """Instagram CustomGPT Bot"""
    
    def __init__(self):
        self.customgpt_client = CustomGPTClient(Config.CUSTOMGPT_API_KEY)
        self.rate_limiter = RateLimiter()
        self.conversation_manager = ConversationManager()
        self.starter_questions_manager = StarterQuestionsManager(self.customgpt_client)
        self.access_token = Config.INSTAGRAM_ACCESS_TOKEN
        self.app_secret = Config.INSTAGRAM_APP_SECRET
        
        # Cache for agent information
        self.agent_cache: Dict[str, Any] = {}
        
        logger.info("Instagram Bot initialized")
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature from Instagram"""
        try:
            if not signature.startswith('sha256='):
                logger.warning("Invalid signature format")
                return False
            
            signature = signature.replace('sha256=', '')
            expected_signature = hmac.new(
                self.app_secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            is_valid = hmac.compare_digest(expected_signature, signature)
            
            if not is_valid:
                logger.warning("Webhook signature verification failed")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Signature verification error: {e}")
            return False
    
    async def send_instagram_message(self, recipient_id: str, message: str) -> bool:
        """Send message to Instagram user"""
        try:
            url = f"https://graph.facebook.com/v21.0/me/messages"
            
            payload = {
                "recipient": {"id": recipient_id},
                "message": {"text": message}
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            async with ClientSession() as session:
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        logger.info(f"Message sent successfully to {recipient_id}")
                        return True
                    else:
                        error_data = await response.json()
                        logger.error(f"Failed to send message: {response.status} - {error_data}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending Instagram message: {e}")
            return False
    
    async def send_typing_indicator(self, recipient_id: str, typing_on: bool = True) -> bool:
        """Send typing indicator to Instagram user"""
        if not Config.ENABLE_TYPING_INDICATOR:
            return True
        
        try:
            url = f"https://graph.facebook.com/v21.0/me/messages"
            
            payload = {
                "recipient": {"id": recipient_id},
                "sender_action": "typing_on" if typing_on else "typing_off"
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            async with ClientSession() as session:
                async with session.post(url, json=payload, headers=headers) as response:
                    return response.status == 200
                        
        except Exception as e:
            logger.error(f"Error sending typing indicator: {e}")
            return False
    
    async def get_or_create_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get agent information, with caching"""
        if agent_id in self.agent_cache:
            return self.agent_cache[agent_id]
        
        agent_info = await self.customgpt_client.get_agent_by_id(agent_id)
        if agent_info:
            self.agent_cache[agent_id] = agent_info
            logger.info(f"Cached agent info for {agent_id}: {agent_info.get('project_name', 'Unknown')}")
        
        return agent_info
    
    async def process_message(self, sender_id: str, message_text: str) -> str:
        """Process incoming message and generate response"""
        try:
            # Check rate limits
            rate_limit_result = await self.rate_limiter.check_rate_limit(sender_id)
            
            if not rate_limit_result["allowed"]:
                limit_info = rate_limit_result.get("limit_type", "minute")
                remaining_time = rate_limit_result.get("reset_time", "soon")
                return f"⏱️ You've reached your {limit_info}ly message limit. Please try again later. Reset at: {remaining_time}"
            
            # Check if user is allowed
            allowed_users = Config.get_allowed_user_ids()
            blocked_users = Config.get_blocked_user_ids()
            
            if allowed_users and sender_id not in allowed_users:
                return "🚫 Sorry, you're not authorized to use this bot."
            
            if sender_id in blocked_users:
                return "🚫 You've been blocked from using this bot."
            
            # Get or set user's agent
            agent_id = await self.conversation_manager.get_user_agent(sender_id)
            
            if not agent_id:
                return "❌ No agent configured. Please contact the administrator to set up your agent."
            
            # Verify agent exists
            agent_info = await self.get_or_create_agent(agent_id)
            if not agent_info:
                return f"❌ Agent {agent_id} not found. Please contact the administrator."
            
            # Handle agent switching command
            if message_text.lower().startswith('/agent '):
                try:
                    new_agent_id = message_text.split(' ', 1)[1].strip()
                    new_agent_info = await self.get_or_create_agent(new_agent_id)
                    
                    if new_agent_info:
                        await self.conversation_manager.set_user_agent(sender_id, new_agent_id)
                        await self.conversation_manager.clear_user_session(sender_id)
                        agent_name = new_agent_info.get('project_name', f'Agent {new_agent_id}')
                        
                        # Get starter questions for the new agent
                        starter_questions = await self.starter_questions_manager.get_agent_starter_questions(new_agent_id)
                        return self.starter_questions_manager.format_agent_switch_message(agent_name, starter_questions)
                    else:
                        return f"❌ Agent {new_agent_id} not found."
                except (IndexError, ValueError):
                    return "❌ Invalid command. Use: /agent [agent_id]"
            
            # Handle help command
            if message_text.lower() in ['/help', 'help']:
                agent_name = agent_info.get('project_name', f'Agent {agent_id}')
                starter_questions = await self.starter_questions_manager.get_agent_starter_questions(agent_id)
                
                help_message = f"""🤖 **Instagram CustomGPT Bot**

**Currently using:** {agent_name}

**Commands:**
• `/agent [id]` - Switch to different agent
• `/help` - Show this help message
• Any message - Ask the AI assistant

**Rate limits:** {Config.RATE_LIMIT_PER_USER_PER_MINUTE}/min, {Config.RATE_LIMIT_PER_USER_PER_HOUR}/hour"""

                if starter_questions:
                    help_message += f"\n\n**Popular questions:**\n"
                    for i, question in enumerate(starter_questions[:3], 1):
                        help_message += f"{i}. {question}\n"

                help_message += f"\n💬 Just send me any question and I'll help you!"
                return help_message
            
            # Handle starter question selection by number
            question_index = self.starter_questions_manager.is_question_selection(message_text)
            if question_index:
                selected_question = await self.starter_questions_manager.handle_question_selection(agent_id, question_index)
                if selected_question:
                    # Process the selected question as if the user typed it
                    message_text = selected_question
                else:
                    return "❌ Invalid question number. Type `/help` to see available questions."
            
            # Get or create conversation session
            session_id = await self.conversation_manager.get_user_session(sender_id, agent_id)
            
            if not session_id:
                session_id = await self.customgpt_client.create_conversation(agent_id)
                if not session_id:
                    return "❌ Failed to create conversation. Please try again later."
                
                await self.conversation_manager.set_user_session(sender_id, agent_id, session_id)
                logger.info(f"Created new conversation {session_id} for user {sender_id}")
            
            # Prepare user metadata
            user_metadata = {
                "user_id": sender_id,
                "platform": "instagram",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send message to CustomGPT
            logger.info(f"Sending message to CustomGPT - Agent: {agent_id}, Session: {session_id}")
            response_data = await self.customgpt_client.send_message(
                agent_id=agent_id,
                session_id=session_id,
                message=message_text,
                user_metadata=user_metadata
            )
            
            if "error" in response_data:
                error_msg = response_data["error"]
                if "query credits" in error_msg.lower():
                    return "⚠️ Query limit reached. Please try again later or contact support."
                return f"❌ Error: {error_msg}"
            
            # Format response
            response_text = response_data.get("response", "")
            citations = response_data.get("citations", [])
            
            if not response_text:
                return "❌ No response received. Please try again."
            
            # Add citations if enabled and available
            if Config.ENABLE_CITATIONS and citations:
                citation_text = "\n\n📚 **Sources:**"
                for i, citation in enumerate(citations[:3], 1):  # Limit to 3 citations
                    if isinstance(citation, dict):
                        title = citation.get('title', f'Source {i}')
                        url = citation.get('url', '')
                        citation_text += f"\n{i}. {title}"
                        if url:
                            citation_text += f" - {url}"
                    else:
                        citation_text += f"\n{i}. Source {i}"
                
                response_text += citation_text
            
            return response_text[:Config.MAX_MESSAGE_LENGTH]  # Respect Instagram message limits
            
        except Exception as e:
            logger.error(f"Error processing message from {sender_id}: {e}")
            return "❌ An error occurred while processing your message. Please try again later."
    
    async def handle_webhook_verification(self, request: Request) -> Response:
        """Handle webhook verification from Instagram"""
        try:
            hub_mode = request.query.get('hub.mode')
            hub_token = request.query.get('hub.verify_token')
            hub_challenge = request.query.get('hub.challenge')
            
            logger.info(f"Webhook verification - Mode: {hub_mode}, Token: {hub_token}")
            
            if hub_mode == 'subscribe' and hub_token == Config.WEBHOOK_VERIFY_TOKEN:
                logger.info("Webhook verification successful")
                return Response(text=hub_challenge, status=200)
            else:
                logger.error("Webhook verification failed")
                return Response(text='Verification failed', status=403)
                
        except Exception as e:
            logger.error(f"Webhook verification error: {e}")
            return Response(text='Error', status=500)
    
    async def handle_webhook_event(self, request: Request) -> Response:
        """Handle incoming webhook events from Instagram"""
        try:
            # Verify signature
            signature = request.headers.get('X-Hub-Signature-256', '')
            payload = await request.read()
            
            if not self.verify_webhook_signature(payload, signature):
                return Response(text='Signature verification failed', status=403)
            
            # Parse event data
            try:
                data = json.loads(payload.decode('utf-8'))
            except json.JSONDecodeError:
                logger.error("Invalid JSON payload")
                return Response(text='Invalid JSON', status=400)
            
            logger.info(f"Received webhook event: {data}")
            
            # Process Instagram messages
            if data.get('object') == 'instagram':
                for entry in data.get('entry', []):
                    if 'messaging' in entry:
                        for messaging_event in entry['messaging']:
                            await self._process_messaging_event(messaging_event)
            
            return Response(text='OK', status=200)
            
        except Exception as e:
            logger.error(f"Webhook event handling error: {e}")
            return Response(text='Error', status=500)
    
    async def _process_messaging_event(self, event: Dict[str, Any]):
        """Process individual messaging event"""
        try:
            sender_id = event.get('sender', {}).get('id')
            recipient_id = event.get('recipient', {}).get('id')
            
            if not sender_id:
                logger.warning("No sender ID in messaging event")
                return
            
            # Handle message events
            if 'message' in event:
                message = event['message']
                message_text = message.get('text', '').strip()
                
                if message_text:
                    logger.info(f"Processing message from {sender_id}: {message_text[:100]}")
                    
                    # Send typing indicator
                    await self.send_typing_indicator(sender_id, True)
                    
                    # Process message and get response
                    response_text = await self.process_message(sender_id, message_text)
                    
                    # Send typing off
                    await self.send_typing_indicator(sender_id, False)
                    
                    # Send response
                    if response_text:
                        await self.send_instagram_message(sender_id, response_text)
                
                else:
                    # Handle non-text messages
                    await self.send_instagram_message(
                        sender_id, 
                        "📝 I can only respond to text messages right now. Please send me a text message!"
                    )
            
            # Handle postback events (if using buttons in the future)
            elif 'postback' in event:
                postback = event['postback']
                payload = postback.get('payload', '')
                
                logger.info(f"Processing postback from {sender_id}: {payload}")
                
                # Handle postback based on payload
                if payload == 'GET_STARTED':
                    # Get user's current agent
                    agent_id = await self.conversation_manager.get_user_agent(sender_id)
                    if agent_id:
                        agent_info = await self.get_or_create_agent(agent_id)
                        agent_name = agent_info.get('project_name', 'CustomGPT Bot') if agent_info else 'CustomGPT Bot'
                        starter_questions = await self.starter_questions_manager.get_agent_starter_questions(agent_id)
                        welcome_message = self.starter_questions_manager.format_welcome_message_with_questions(agent_name, starter_questions)
                    else:
                        welcome_message = """🤖 **Welcome to CustomGPT Bot!**

I'm here to help answer your questions using AI-powered knowledge bases.

Type `/help` to see available commands or just ask me anything! 💬"""
                    
                    await self.send_instagram_message(sender_id, welcome_message)
            
        except Exception as e:
            logger.error(f"Error processing messaging event: {e}")
    
    async def health_check(self, request: Request) -> Response:
        """Health check endpoint"""
        try:
            # Test CustomGPT API
            limits = await self.customgpt_client.get_usage_limits()
            customgpt_status = "error" not in limits
            
            # Get stats
            rate_limiter_stats = await self.rate_limiter.get_stats()
            conversation_stats = await self.conversation_manager.get_stats()
            
            status = {
                "status": "healthy" if customgpt_status else "degraded",
                "timestamp": datetime.utcnow().isoformat(),
                "customgpt_api": "connected" if customgpt_status else "error",
                "rate_limiter": rate_limiter_stats,
                "conversation_manager": conversation_stats,
                "config": {
                    "default_agent_id": Config.DEFAULT_AGENT_ID,
                    "rate_limits": {
                        "per_minute": Config.RATE_LIMIT_PER_USER_PER_MINUTE,
                        "per_hour": Config.RATE_LIMIT_PER_USER_PER_HOUR
                    }
                }
            }
            
            return Response(
                text=json.dumps(status, indent=2),
                status=200,
                content_type='application/json'
            )
            
        except Exception as e:
            error_status = {
                "status": "error",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
            
            return Response(
                text=json.dumps(error_status, indent=2),
                status=500,
                content_type='application/json'
            )
    
    def create_app(self) -> Application:
        """Create aiohttp application"""
        app = Application()
        
        # Routes
        app.router.add_get('/webhook', self.handle_webhook_verification)
        app.router.add_post('/webhook', self.handle_webhook_event)
        app.router.add_get('/health', self.health_check)
        app.router.add_get('/', lambda request: Response(text='Instagram CustomGPT Bot is running!'))
        
        return app
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            await self.customgpt_client.close()
            logger.info("Bot cleanup completed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

def main():
    """Main function"""
    # Validate configuration
    config_errors = Config.validate_config()
    if config_errors:
        logger.error("Configuration errors:")
        for error in config_errors:
            logger.error(f"  - {error}")
        return
    
    logger.info("Starting Instagram CustomGPT Bot...")
    logger.info(f"Host: {Config.HOST}:{Config.PORT}")
    logger.info(f"Debug: {Config.DEBUG}")
    logger.info(f"Default Agent ID: {Config.DEFAULT_AGENT_ID}")
    
    # Create bot instance
    bot = InstagramBot()
    app = bot.create_app()
    
    # Setup cleanup
    async def cleanup_handler(app):
        await bot.cleanup()
    
    app.on_cleanup.append(cleanup_handler)
    
    # Run server
    try:
        web.run_app(
            app,
            host=Config.HOST,
            port=Config.PORT,
            access_log=logger if Config.DEBUG else None
        )
    except KeyboardInterrupt:
        logger.info("Received interrupt signal, shutting down...")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise

if __name__ == '__main__':
    main()