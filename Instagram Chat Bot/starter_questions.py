"""
Starter questions management for Instagram CustomGPT Bot
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from customgpt_client import CustomGPTClient
from config import Config

logger = logging.getLogger(__name__)

class StarterQuestionsManager:
    """Manages starter questions for better user experience"""
    
    def __init__(self, customgpt_client: CustomGPTClient):
        self.customgpt_client = customgpt_client
        self.questions_cache: Dict[str, Dict] = {}
        self.cache_ttl = 3600  # 1 hour cache
    
    async def get_agent_starter_questions(self, agent_id: str) -> List[str]:
        """Get starter questions for an agent"""
        if not Config.ENABLE_STARTER_QUESTIONS:
            return []
        
        try:
            # Check cache first
            cache_key = f"questions_{agent_id}"
            if cache_key in self.questions_cache:
                cache_data = self.questions_cache[cache_key]
                cached_at = datetime.fromisoformat(cache_data['timestamp'])
                
                if datetime.utcnow() - cached_at < timedelta(seconds=self.cache_ttl):
                    logger.debug(f"Returning cached starter questions for agent {agent_id}")
                    return cache_data['questions']
            
            # Try to get questions from agent settings
            questions = await self._fetch_agent_questions(agent_id)
            
            if not questions:
                # Use default questions if none found
                questions = self._get_default_questions()
            
            # Cache the questions
            self.questions_cache[cache_key] = {
                'questions': questions,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Retrieved {len(questions)} starter questions for agent {agent_id}")
            return questions
            
        except Exception as e:
            logger.error(f"Error getting starter questions for agent {agent_id}: {e}")
            return self._get_default_questions()
    
    async def _fetch_agent_questions(self, agent_id: str) -> List[str]:
        """Fetch starter questions from agent settings"""
        try:
            # Note: This would require an agent settings API endpoint
            # For now, we'll return empty list and use defaults
            # In the future, this could call:
            # settings = await self.customgpt_client.get_agent_settings(agent_id)
            # return settings.get('starter_questions', [])
            
            logger.debug(f"Agent settings API not implemented, using defaults for {agent_id}")
            return []
            
        except Exception as e:
            logger.error(f"Error fetching agent questions: {e}")
            return []
    
    def _get_default_questions(self) -> List[str]:
        """Get default starter questions"""
        return [
            "What can you help me with?",
            "Tell me about your capabilities",
            "How do I get started?",
            "What kind of questions can I ask?",
            "Can you provide examples?"
        ]
    
    def format_welcome_message_with_questions(self, agent_name: str, questions: List[str]) -> str:
        """Format welcome message with starter questions"""
        if not questions:
            return f"👋 Welcome! I'm {agent_name}. How can I help you today?"
        
        message = f"👋 **Welcome! I'm {agent_name}.**\n\nHere are some things you can ask me:\n\n"
        
        for i, question in enumerate(questions[:5], 1):  # Limit to 5 questions
            message += f"{i}. {question}\n"
        
        message += f"\n💬 Or just ask me anything!"
        
        return message
    
    def format_agent_switch_message(self, agent_name: str, questions: List[str]) -> str:
        """Format message when switching agents"""
        if not questions:
            return f"✅ Switched to **{agent_name}**\n\nWhat would you like to know?"
        
        message = f"✅ **Switched to {agent_name}**\n\nPopular questions:\n\n"
        
        for i, question in enumerate(questions[:3], 1):  # Limit to 3 questions for switch
            message += f"• {question}\n"
        
        message += f"\n💬 What would you like to ask?"
        
        return message
    
    async def get_contextual_suggestions(self, agent_id: str, conversation_history: List[str]) -> List[str]:
        """Get contextual question suggestions based on conversation"""
        try:
            # This is a placeholder for future enhancement
            # Could analyze conversation history and suggest follow-up questions
            
            base_questions = await self.get_agent_starter_questions(agent_id)
            
            # For now, return a subset of starter questions
            # In the future, this could use AI to generate contextual questions
            return base_questions[:3] if base_questions else []
            
        except Exception as e:
            logger.error(f"Error getting contextual suggestions: {e}")
            return []
    
    async def handle_question_selection(self, agent_id: str, question_index: int) -> Optional[str]:
        """Handle when user selects a starter question by number"""
        try:
            questions = await self.get_agent_starter_questions(agent_id)
            
            if 1 <= question_index <= len(questions):
                selected_question = questions[question_index - 1]
                logger.info(f"User selected starter question {question_index}: {selected_question}")
                return selected_question
            
            return None
            
        except Exception as e:
            logger.error(f"Error handling question selection: {e}")
            return None
    
    def is_question_selection(self, message: str) -> Optional[int]:
        """Check if message is selecting a starter question by number"""
        message = message.strip()
        
        # Check for simple number
        if message.isdigit():
            return int(message)
        
        # Check for patterns like "1.", "1)", "question 1", etc.
        import re
        patterns = [
            r'^(\d+)[.)]\s*$',
            r'^question\s+(\d+)$',
            r'^q(\d+)$',
            r'^#(\d+)$'
        ]
        
        for pattern in patterns:
            match = re.match(pattern, message.lower())
            if match:
                return int(match.group(1))
        
        return None
    
    async def cleanup_cache(self):
        """Clean up expired cache entries"""
        try:
            now = datetime.utcnow()
            expired_keys = []
            
            for key, data in self.questions_cache.items():
                cached_at = datetime.fromisoformat(data['timestamp'])
                if now - cached_at >= timedelta(seconds=self.cache_ttl):
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self.questions_cache[key]
            
            if expired_keys:
                logger.debug(f"Cleaned up {len(expired_keys)} expired question cache entries")
            
        except Exception as e:
            logger.error(f"Error cleaning up question cache: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get starter questions manager statistics"""
        return {
            "enabled": Config.ENABLE_STARTER_QUESTIONS,
            "cached_agents": len(self.questions_cache),
            "cache_ttl_minutes": self.cache_ttl / 60,
            "default_questions_count": len(self._get_default_questions())
        }