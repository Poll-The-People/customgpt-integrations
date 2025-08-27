"""
Rocket Chat CustomGPT Bot
"""
import asyncio
import logging
import re
import sys
from typing import Dict, Optional
from rocketchat_API.rocketchat import RocketChat
from rocketchat_API.APIExceptions.RocketExceptions import RocketConnectionException

from config import Config
from customgpt_client import CustomGPTClient
from rate_limiter import CustomGPTRateLimiter
from conversation_manager import ConversationManager, MessageFormatter

# Setup logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RocketChatBot:
    """Main bot class for Rocket Chat integration"""
    
    def __init__(self):
        """Initialize the bot"""
        # Validate configuration
        Config.validate()
        
        # Initialize Rocket Chat client
        self.rocket = self._init_rocket_chat()
        
        # Initialize CustomGPT client
        self.customgpt = CustomGPTClient()
        
        # Initialize rate limiter
        self.rate_limiter = CustomGPTRateLimiter(
            customgpt_client=self.customgpt,
            global_calls=Config.RATE_LIMIT_CALLS,
            global_period=Config.RATE_LIMIT_PERIOD,
            user_calls=Config.RATE_LIMIT_USER_CALLS,
            user_period=Config.RATE_LIMIT_USER_PERIOD
        )
        
        # Initialize conversation manager
        self.conversation_manager = ConversationManager()
        
        # Bot info
        self.bot_info = None
        self.running = False
        
        # Command patterns
        self.command_patterns = {
            'help': re.compile(r'^help$', re.IGNORECASE),
            'start': re.compile(r'^start$', re.IGNORECASE),
            'clear': re.compile(r'^clear$', re.IGNORECASE),
            'stats': re.compile(r'^stats$', re.IGNORECASE),
            'quota': re.compile(r'^quota$', re.IGNORECASE),
        }
    
    def _init_rocket_chat(self) -> RocketChat:
        """Initialize Rocket Chat connection"""
        try:
            if Config.ROCKET_CHAT_AUTH_TOKEN and Config.ROCKET_CHAT_USER_ID:
                # Use existing auth token
                rocket = RocketChat(
                    server_url=Config.ROCKET_CHAT_URL,
                    user_id=Config.ROCKET_CHAT_USER_ID,
                    auth_token=Config.ROCKET_CHAT_AUTH_TOKEN
                )
            else:
                # Login with username/password
                rocket = RocketChat(
                    user=Config.ROCKET_CHAT_USER,
                    password=Config.ROCKET_CHAT_PASSWORD,
                    server_url=Config.ROCKET_CHAT_URL
                )
            
            # Test connection
            rocket.me().json()
            logger.info("Successfully connected to Rocket Chat")
            return rocket
            
        except Exception as e:
            logger.error(f"Failed to connect to Rocket Chat: {e}")
            raise
    
    async def start(self):
        """Start the bot"""
        self.running = True
        logger.info(f"Starting {Config.BOT_NAME}...")
        
        # Get bot info
        self.bot_info = self.rocket.me().json()
        logger.info(f"Bot user: {self.bot_info['username']} (ID: {self.bot_info['_id']})")
        
        # Start background tasks
        asyncio.create_task(self._cleanup_sessions_task())
        
        # Start message polling
        await self._poll_messages()
    
    async def _poll_messages(self):
        """Poll for new messages"""
        last_message_timestamp = None
        
        while self.running:
            try:
                # Get subscriptions (channels bot is in)
                subscriptions = self.rocket.subscriptions_get().json()
                
                for sub in subscriptions.get('subscriptions', []):
                    room_id = sub['rid']
                    
                    # Skip if not in allowed channels (if configured)
                    if Config.ALLOWED_CHANNELS and room_id not in Config.ALLOWED_CHANNELS:
                        continue
                    
                    # Get recent messages
                    history = self.rocket.rooms_history(
                        room_id=room_id,
                        count=10
                    ).json()
                    
                    for message in history.get('messages', []):
                        # Skip if we've already processed this message
                        if last_message_timestamp and message['ts'] <= last_message_timestamp:
                            continue
                        
                        # Skip bot's own messages
                        if message['u']['_id'] == self.bot_info['_id']:
                            continue
                        
                        # Check if message mentions bot
                        if self._is_bot_mentioned(message):
                            await self._handle_message(message, room_id)
                        
                        # Update timestamp
                        if not last_message_timestamp or message['ts'] > last_message_timestamp:
                            last_message_timestamp = message['ts']
                
                # Small delay to avoid hammering the API
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Error in message polling: {e}")
                await asyncio.sleep(5)  # Wait longer on error
    
    def _is_bot_mentioned(self, message: Dict) -> bool:
        """Check if bot is mentioned in message"""
        text = message.get('msg', '')
        
        # Check for @mention
        mentions = message.get('mentions', [])
        if any(mention['_id'] == self.bot_info['_id'] for mention in mentions):
            return True
        
        # Check for bot alias
        if Config.BOT_ALIAS and Config.BOT_ALIAS.lower() in text.lower():
            return True
        
        # Check for direct message
        if message.get('t') == 'd':
            return True
        
        return False
    
    async def _handle_message(self, message: Dict, room_id: str):
        """Handle incoming message"""
        try:
            user_id = message['u']['_id']
            username = message['u']['username']
            text = self._extract_message_text(message)
            
            # Security check - blocked users
            if user_id in Config.BLOCKED_USERS:
                logger.warning(f"Blocked user attempted to use bot: {username}")
                return
            
            # Check message length
            if len(text) > Config.MAX_MESSAGE_LENGTH:
                await self._send_message(
                    room_id,
                    MessageFormatter.format_error(
                        f"Message too long. Maximum length is {Config.MAX_MESSAGE_LENGTH} characters."
                    ),
                    thread_id=message.get('tmid')
                )
                return
            
            # Check for commands
            command = self._extract_command(text)
            if command:
                await self._handle_command(command, message, room_id)
                return
            
            # Rate limiting check
            if Config.RATE_LIMIT_ENABLED:
                allowed, error_msg, retry_after = await self.rate_limiter.check_combined_limits(user_id)
                if not allowed:
                    await self._send_message(
                        room_id,
                        MessageFormatter.format_error(error_msg, retry_after),
                        thread_id=message.get('tmid')
                    )
                    return
            
            # Process with CustomGPT
            await self._process_customgpt_query(text, message, room_id)
            
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self._send_message(
                room_id,
                MessageFormatter.format_error("An error occurred processing your message."),
                thread_id=message.get('tmid')
            )
    
    def _extract_message_text(self, message: Dict) -> str:
        """Extract clean text from message"""
        text = message.get('msg', '')
        
        # Remove bot mentions
        for mention in message.get('mentions', []):
            if mention['_id'] == self.bot_info['_id']:
                text = text.replace(f"@{mention['username']}", '').strip()
        
        # Remove bot alias
        if Config.BOT_ALIAS:
            text = re.sub(rf'@?{Config.BOT_ALIAS}\s*', '', text, flags=re.IGNORECASE).strip()
        
        return text
    
    def _extract_command(self, text: str) -> Optional[str]:
        """Extract command from text"""
        text = text.strip()
        for cmd, pattern in self.command_patterns.items():
            if pattern.match(text):
                return cmd
        return None
    
    async def _handle_command(self, command: str, message: Dict, room_id: str):
        """Handle bot commands"""
        user_id = message['u']['_id']
        thread_id = message.get('tmid')
        
        if command == 'help':
            features = {
                'citations': Config.ENABLE_CITATIONS,
                'formatting': Config.ENABLE_FORMATTING,
                'threading': Config.ENABLE_THREADING,
                'rate_limiting': Config.RATE_LIMIT_ENABLED
            }
            response = MessageFormatter.format_help_message(Config.BOT_NAME, features)
        
        elif command == 'start':
            questions = Config.get_starter_questions()
            response = MessageFormatter.format_starter_questions(questions)
        
        elif command == 'clear':
            await self.conversation_manager.clear_session(room_id, user_id)
            response = "✅ Conversation context cleared."
        
        elif command == 'stats':
            stats = self.conversation_manager.get_stats()
            rate_stats = self.rate_limiter.local_limiter.get_stats()
            response = f"""**📊 Bot Statistics**
            
**Conversations:**
• Active sessions: {stats['active_sessions']}
• Total sessions: {stats['total_sessions']}
• Total messages: {stats['total_messages']}
• Unique users: {stats['unique_users']}

**Rate Limiting:**
• Total requests: {rate_stats['total_requests']}
• Blocked requests: {rate_stats['blocked_requests']}
• Block rate: {rate_stats['block_rate']:.1f}%
"""
        
        elif command == 'quota':
            quota = self.rate_limiter.local_limiter.get_remaining_quota(user_id)
            response = f"""**📊 Your Quota**
            
• User quota: {quota['user_remaining']}/{Config.RATE_LIMIT_USER_CALLS} (resets in {quota['user_reset_in']}s)
• Global quota: {quota['global_remaining']}/{Config.RATE_LIMIT_CALLS} (resets in {quota['global_reset_in']}s)
"""
        
        await self._send_message(room_id, response, thread_id=thread_id)
    
    async def _process_customgpt_query(self, query: str, message: Dict, room_id: str):
        """Process query with CustomGPT"""
        user_id = message['u']['_id']
        thread_id = message.get('tmid')
        
        try:
            # Get or create session
            session_id = await self.conversation_manager.get_or_create_session(
                room_id, user_id, self.customgpt
            )
            
            # Get user language preference
            language = await self.conversation_manager.get_user_preference(
                user_id, 'language', Config.DEFAULT_LANGUAGE
            )
            
            # Send typing indicator
            # Note: Rocket Chat doesn't have a standard typing API, so we skip this
            
            # Send query to CustomGPT
            response = await self.customgpt.send_message(
                message=query,
                session_id=session_id,
                language=language,
                stream=False,
                with_citations=Config.ENABLE_CITATIONS
            )
            
            if response['status'] == 'success':
                # Format and send response
                formatted_response = MessageFormatter.format_response(
                    response['response'],
                    response.get('citations', []),
                    Config.ENABLE_FORMATTING
                )
                
                # Truncate if needed
                formatted_response = MessageFormatter.truncate_message(
                    formatted_response, 
                    Config.MAX_MESSAGE_LENGTH
                )
                
                await self._send_message(room_id, formatted_response, thread_id=thread_id)
                
                # Update session context
                await self.conversation_manager.update_session_context(
                    room_id, user_id, {'last_query': query}
                )
            else:
                error_msg = response.get('error', 'Unknown error occurred')
                await self._send_message(
                    room_id,
                    MessageFormatter.format_error(error_msg),
                    thread_id=thread_id
                )
                
        except Exception as e:
            logger.error(f"Error processing CustomGPT query: {e}")
            await self._send_message(
                room_id,
                MessageFormatter.format_error("Failed to process your query. Please try again."),
                thread_id=thread_id
            )
    
    async def _send_message(self, room_id: str, text: str, thread_id: Optional[str] = None):
        """Send message to Rocket Chat"""
        try:
            params = {
                'roomId': room_id,
                'text': text
            }
            
            # Add thread ID if threading is enabled and available
            if Config.ENABLE_THREADING and thread_id:
                params['tmid'] = thread_id
            
            self.rocket.chat_post_message(**params)
            
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
    
    async def _cleanup_sessions_task(self):
        """Background task to cleanup expired sessions"""
        while self.running:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                cleaned = await self.conversation_manager.cleanup_expired_sessions()
                if cleaned > 0:
                    logger.info(f"Cleaned up {cleaned} expired sessions")
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
    
    async def stop(self):
        """Stop the bot"""
        logger.info("Stopping bot...")
        self.running = False
        await self.customgpt.close()


async def main():
    """Main entry point"""
    bot = RocketChatBot()
    
    try:
        await bot.start()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Bot error: {e}")
    finally:
        await bot.stop()


if __name__ == "__main__":
    asyncio.run(main())