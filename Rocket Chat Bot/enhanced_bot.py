"""
Enhanced Rocket Chat CustomGPT Bot with advanced features
"""
import asyncio
import json
import random
from typing import Dict, List, Optional
from datetime import datetime
from collections import defaultdict

from bot import RocketChatBot
from conversation_manager import MessageFormatter

class EnhancedRocketChatBot(RocketChatBot):
    """Enhanced bot with additional features"""
    
    def __init__(self):
        """Initialize enhanced bot"""
        super().__init__()
        
        # Enhanced features
        self.starter_questions_cache = defaultdict(list)
        self.quick_actions = self._init_quick_actions()
        self.response_templates = self._init_response_templates()
        self.conversation_insights = defaultdict(dict)
        
    def _init_quick_actions(self) -> Dict[str, Dict]:
        """Initialize quick action buttons"""
        return {
            'more_info': {
                'text': 'Tell me more',
                'action': 'expand_last_response'
            },
            'simpler': {
                'text': 'Explain simpler',
                'action': 'simplify_last_response'
            },
            'examples': {
                'text': 'Show examples',
                'action': 'provide_examples'
            },
            'related': {
                'text': 'Related topics',
                'action': 'suggest_related'
            }
        }
    
    def _init_response_templates(self) -> Dict[str, str]:
        """Initialize response templates"""
        return {
            'greeting': "👋 Hello! I'm {bot_name}, your AI assistant powered by CustomGPT. {starter_prompt}",
            'first_time': "Welcome! I see this is your first time using {bot_name}. {help_prompt}",
            'returning': "Welcome back! {context_prompt}",
            'follow_up': "Would you like to know more about:\n{options}",
            'clarification': "I'd be happy to help! Could you provide more details about {topic}?",
            'multi_step': "I'll help you with that. Let me break it down:\n{steps}"
        }
    
    async def get_contextual_starter_questions(self, 
                                             channel_id: str, 
                                             user_id: str) -> List[str]:
        """Get personalized starter questions based on context"""
        
        # Check user history
        session_info = await self.conversation_manager.get_session_info(channel_id, user_id)
        
        if not session_info or session_info['message_count'] == 0:
            # First time user
            return [
                "What can you help me with?",
                "Tell me about your capabilities",
                "How do I get started?",
                "Show me some example questions",
                "What makes you different from other bots?"
            ]
        
        # Get user's recent topics
        recent_context = session_info.get('context', {})
        last_query = recent_context.get('last_query', '')
        
        # Generate contextual questions
        contextual_questions = []
        
        if last_query:
            # Based on last query
            contextual_questions.extend([
                f"Tell me more about {self._extract_topic(last_query)}",
                f"What are alternatives to {self._extract_topic(last_query)}?",
                "Can you provide examples?",
                "What are the best practices?"
            ])
        
        # Add general follow-up questions
        contextual_questions.extend([
            "What else would you like to know?",
            "Do you have any other questions?",
            "Would you like me to explain differently?"
        ])
        
        return contextual_questions[:5]  # Return top 5
    
    def _extract_topic(self, text: str) -> str:
        """Extract main topic from text"""
        # Simple extraction - can be enhanced with NLP
        words = text.split()
        if len(words) > 3:
            return ' '.join(words[:3]) + '...'
        return text
    
    async def send_welcome_message(self, channel_id: str, user_id: str):
        """Send personalized welcome message"""
        session_info = await self.conversation_manager.get_session_info(channel_id, user_id)
        
        if not session_info or session_info['message_count'] == 0:
            # First time user
            template = self.response_templates['first_time']
            starter_questions = await self.get_contextual_starter_questions(channel_id, user_id)
            
            message = template.format(
                bot_name=self.config.BOT_NAME,
                help_prompt="Here are some things I can help you with:"
            )
            
            message += "\n\n" + MessageFormatter.format_starter_questions(starter_questions)
            
        else:
            # Returning user
            template = self.response_templates['returning']
            last_activity = session_info['last_activity']
            time_diff = datetime.now() - last_activity
            
            if time_diff.days > 0:
                context_prompt = f"It's been {time_diff.days} days since we last talked."
            else:
                context_prompt = "Ready to continue our conversation?"
            
            message = template.format(context_prompt=context_prompt)
        
        await self._send_message(channel_id, message)
    
    async def suggest_follow_up_actions(self, 
                                      response: str, 
                                      channel_id: str,
                                      thread_id: Optional[str] = None):
        """Suggest follow-up actions after a response"""
        
        # Generate follow-up suggestions
        suggestions = []
        
        # Add quick actions
        for action_id, action in self.quick_actions.items():
            suggestions.append(f"• {action['text']}")
        
        # Create follow-up message
        follow_up = "\n\n**Quick actions:**\n" + "\n".join(suggestions)
        
        # Add to response
        enhanced_response = response + follow_up
        
        await self._send_message(channel_id, enhanced_response, thread_id=thread_id)
    
    async def track_conversation_insights(self, 
                                        user_id: str, 
                                        query: str, 
                                        response: str):
        """Track conversation insights for personalization"""
        insights = self.conversation_insights[user_id]
        
        # Track query patterns
        if 'query_count' not in insights:
            insights['query_count'] = 0
        insights['query_count'] += 1
        
        # Track topics (simple word frequency)
        words = query.lower().split()
        if 'topics' not in insights:
            insights['topics'] = defaultdict(int)
        
        for word in words:
            if len(word) > 4:  # Track meaningful words
                insights['topics'][word] += 1
        
        # Track query complexity
        if 'avg_query_length' not in insights:
            insights['avg_query_length'] = len(query)
        else:
            insights['avg_query_length'] = (
                (insights['avg_query_length'] * (insights['query_count'] - 1) + len(query)) 
                / insights['query_count']
            )
        
        # Track response satisfaction (could be enhanced with feedback)
        insights['last_interaction'] = datetime.now().isoformat()
    
    def get_user_insights(self, user_id: str) -> Dict:
        """Get user conversation insights"""
        return dict(self.conversation_insights.get(user_id, {}))
    
    async def handle_quick_action(self, 
                                action: str, 
                                last_response: str,
                                channel_id: str,
                                user_id: str):
        """Handle quick action requests"""
        
        if action == 'expand_last_response':
            prompt = f"Please provide more details about: {last_response[:100]}..."
        elif action == 'simplify_last_response':
            prompt = f"Please explain this in simpler terms: {last_response[:100]}..."
        elif action == 'provide_examples':
            prompt = f"Please provide examples for: {last_response[:100]}..."
        elif action == 'suggest_related':
            prompt = f"What are related topics to: {last_response[:100]}..."
        else:
            return
        
        # Process with CustomGPT
        session_id = await self.conversation_manager.get_or_create_session(
            channel_id, user_id, self.customgpt
        )
        
        response = await self.customgpt.send_message(
            message=prompt,
            session_id=session_id,
            language=self.config.DEFAULT_LANGUAGE,
            with_citations=self.config.ENABLE_CITATIONS
        )
        
        if response['status'] == 'success':
            formatted_response = MessageFormatter.format_response(
                response['response'],
                response.get('citations', []),
                self.config.ENABLE_FORMATTING
            )
            await self._send_message(channel_id, formatted_response)


class InteractiveMessageHandler:
    """Handle interactive messages and buttons (if supported by Rocket Chat instance)"""
    
    @staticmethod
    def create_starter_questions_attachment(questions: List[str]) -> Dict:
        """Create interactive attachment with starter questions"""
        actions = []
        
        for i, question in enumerate(questions):
            actions.append({
                "type": "button",
                "text": question,
                "msg": question,
                "msg_in_chat_window": True
            })
        
        return {
            "title": "Starter Questions",
            "text": "Click a question to get started:",
            "button_alignment": "vertical",
            "actions": actions
        }
    
    @staticmethod
    def create_feedback_attachment() -> Dict:
        """Create feedback attachment"""
        return {
            "title": "Was this helpful?",
            "button_alignment": "horizontal",
            "actions": [
                {
                    "type": "button",
                    "text": "👍 Yes",
                    "msg": "/feedback positive",
                    "msg_in_chat_window": False
                },
                {
                    "type": "button", 
                    "text": "👎 No",
                    "msg": "/feedback negative",
                    "msg_in_chat_window": False
                }
            ]
        }