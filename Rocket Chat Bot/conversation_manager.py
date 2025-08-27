"""
Conversation management for Rocket Chat CustomGPT Bot
"""
import asyncio
import logging
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict
import json

logger = logging.getLogger(__name__)

class ConversationManager:
    """Manages conversation sessions and context"""
    
    def __init__(self, session_timeout: int = 3600):
        """
        Initialize conversation manager
        
        Args:
            session_timeout: Session timeout in seconds (default 1 hour)
        """
        self.sessions: Dict[str, Dict] = {}
        self.session_timeout = session_timeout
        self.user_preferences: Dict[str, Dict] = defaultdict(dict)
        self._lock = asyncio.Lock()
    
    async def get_or_create_session(self, 
                                   channel_id: str, 
                                   user_id: str,
                                   customgpt_client) -> str:
        """Get existing session or create new one"""
        async with self._lock:
            session_key = f"{channel_id}:{user_id}"
            
            # Check if session exists and is valid
            if session_key in self.sessions:
                session = self.sessions[session_key]
                if self._is_session_valid(session):
                    session['last_activity'] = datetime.now()
                    return session['session_id']
            
            # Create new session
            result = await customgpt_client.create_conversation(
                name=f"Rocket Chat - {user_id[:8]}"
            )
            
            if result['status'] == 'success':
                session_id = result['session_id']
                self.sessions[session_key] = {
                    'session_id': session_id,
                    'channel_id': channel_id,
                    'user_id': user_id,
                    'created_at': datetime.now(),
                    'last_activity': datetime.now(),
                    'message_count': 0,
                    'context': {}
                }
                return session_id
            else:
                raise Exception(f"Failed to create session: {result.get('error')}")
    
    def _is_session_valid(self, session: Dict) -> bool:
        """Check if session is still valid"""
        timeout = timedelta(seconds=self.session_timeout)
        return datetime.now() - session['last_activity'] < timeout
    
    async def update_session_context(self, 
                                   channel_id: str, 
                                   user_id: str,
                                   context_update: Dict):
        """Update session context"""
        async with self._lock:
            session_key = f"{channel_id}:{user_id}"
            if session_key in self.sessions:
                self.sessions[session_key]['context'].update(context_update)
                self.sessions[session_key]['message_count'] += 1
    
    async def get_session_info(self, channel_id: str, user_id: str) -> Optional[Dict]:
        """Get session information"""
        async with self._lock:
            session_key = f"{channel_id}:{user_id}"
            return self.sessions.get(session_key)
    
    async def clear_session(self, channel_id: str, user_id: str):
        """Clear a specific session"""
        async with self._lock:
            session_key = f"{channel_id}:{user_id}"
            if session_key in self.sessions:
                del self.sessions[session_key]
                logger.info(f"Cleared session for {session_key}")
    
    async def cleanup_expired_sessions(self):
        """Remove expired sessions"""
        async with self._lock:
            expired_keys = []
            for key, session in self.sessions.items():
                if not self._is_session_valid(session):
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self.sessions[key]
                logger.info(f"Cleaned up expired session: {key}")
            
            return len(expired_keys)
    
    async def set_user_preference(self, user_id: str, preference: str, value: any):
        """Set user preference"""
        async with self._lock:
            self.user_preferences[user_id][preference] = value
    
    async def get_user_preference(self, user_id: str, preference: str, default=None):
        """Get user preference"""
        async with self._lock:
            return self.user_preferences[user_id].get(preference, default)
    
    def get_stats(self) -> Dict:
        """Get conversation statistics"""
        total_messages = sum(s.get('message_count', 0) for s in self.sessions.values())
        active_sessions = sum(1 for s in self.sessions.values() if self._is_session_valid(s))
        
        return {
            'total_sessions': len(self.sessions),
            'active_sessions': active_sessions,
            'total_messages': total_messages,
            'unique_users': len(set(s['user_id'] for s in self.sessions.values()))
        }


class MessageFormatter:
    """Format messages for Rocket Chat"""
    
    @staticmethod
    def format_response(text: str, 
                       citations: List[Dict] = None,
                       enable_formatting: bool = True) -> str:
        """
        Format CustomGPT response for Rocket Chat
        
        Args:
            text: Response text
            citations: List of citations
            enable_formatting: Enable markdown formatting
            
        Returns:
            Formatted message
        """
        if not enable_formatting:
            return text
        
        # Basic markdown formatting
        formatted_text = text
        
        # Add citations if available
        if citations:
            formatted_text += "\n\n**Sources:**"
            for i, citation in enumerate(citations, 1):
                title = citation.get('title', 'Source')
                url = citation.get('url', '')
                if url:
                    formatted_text += f"\n{i}. [{title}]({url})"
                else:
                    formatted_text += f"\n{i}. {title}"
        
        return formatted_text
    
    @staticmethod
    def format_error(error_message: str, retry_after: Optional[int] = None) -> str:
        """Format error message"""
        formatted = f"❌ **Error:** {error_message}"
        
        if retry_after:
            formatted += f"\n⏰ Please try again in {retry_after} seconds."
        
        return formatted
    
    @staticmethod
    def format_starter_questions(questions: List[str]) -> str:
        """Format starter questions"""
        message = "**Here are some questions to get you started:**\n\n"
        for i, question in enumerate(questions, 1):
            message += f"{i}. {question}\n"
        return message
    
    @staticmethod
    def format_help_message(bot_name: str, features: Dict) -> str:
        """Format help message"""
        message = f"**{bot_name} - Help**\n\n"
        message += "**Available Commands:**\n"
        message += "• `@bot help` - Show this help message\n"
        message += "• `@bot start` - Show starter questions\n"
        message += "• `@bot clear` - Clear conversation context\n"
        message += "• `@bot stats` - Show usage statistics\n"
        message += "• `@bot quota` - Check remaining quota\n"
        
        if features.get('threading'):
            message += "• Reply to a bot message to continue the conversation\n"
        
        message += "\n**Features:**\n"
        features_list = []
        if features.get('citations'):
            features_list.append("✅ Source citations")
        if features.get('formatting'):
            features_list.append("✅ Markdown formatting")
        if features.get('threading'):
            features_list.append("✅ Thread support")
        if features.get('rate_limiting'):
            features_list.append("✅ Rate limiting")
        
        message += "\n".join(features_list)
        
        return message
    
    @staticmethod
    def truncate_message(message: str, max_length: int = 2000) -> str:
        """Truncate message if too long"""
        if len(message) <= max_length:
            return message
        
        truncated = message[:max_length - 50]
        truncated += "\n\n... *(Message truncated due to length)*"
        return truncated