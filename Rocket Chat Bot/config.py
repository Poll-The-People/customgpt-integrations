"""
Configuration management for Rocket Chat CustomGPT Bot
"""
import os
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration class for Rocket Chat CustomGPT Bot"""
    
    # Rocket Chat Configuration
    ROCKET_CHAT_URL: str = os.getenv('ROCKET_CHAT_URL', 'http://localhost:3000')
    ROCKET_CHAT_USER: str = os.getenv('ROCKET_CHAT_USER', '')
    ROCKET_CHAT_PASSWORD: str = os.getenv('ROCKET_CHAT_PASSWORD', '')
    ROCKET_CHAT_AUTH_TOKEN: Optional[str] = os.getenv('ROCKET_CHAT_AUTH_TOKEN')
    ROCKET_CHAT_USER_ID: Optional[str] = os.getenv('ROCKET_CHAT_USER_ID')
    
    # CustomGPT Configuration
    CUSTOMGPT_API_KEY: str = os.getenv('CUSTOMGPT_API_KEY', '')
    CUSTOMGPT_PROJECT_ID: str = os.getenv('CUSTOMGPT_PROJECT_ID', '')
    CUSTOMGPT_BASE_URL: str = os.getenv('CUSTOMGPT_BASE_URL', 'https://app.customgpt.ai')
    CUSTOMGPT_API_TIMEOUT: int = int(os.getenv('CUSTOMGPT_API_TIMEOUT', '30'))
    
    # Bot Configuration
    BOT_NAME: str = os.getenv('BOT_NAME', 'CustomGPT Bot')
    BOT_ALIAS: str = os.getenv('BOT_ALIAS', 'cgpt')
    BOT_DESCRIPTION: str = os.getenv('BOT_DESCRIPTION', 'AI-powered assistant using CustomGPT')
    
    # Rate Limiting Configuration
    RATE_LIMIT_ENABLED: bool = os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    RATE_LIMIT_CALLS: int = int(os.getenv('RATE_LIMIT_CALLS', '10'))
    RATE_LIMIT_PERIOD: int = int(os.getenv('RATE_LIMIT_PERIOD', '60'))  # seconds
    RATE_LIMIT_USER_CALLS: int = int(os.getenv('RATE_LIMIT_USER_CALLS', '5'))
    RATE_LIMIT_USER_PERIOD: int = int(os.getenv('RATE_LIMIT_USER_PERIOD', '60'))  # seconds
    
    # Security Configuration
    ALLOWED_CHANNELS: list = os.getenv('ALLOWED_CHANNELS', '').split(',') if os.getenv('ALLOWED_CHANNELS') else []
    BLOCKED_USERS: list = os.getenv('BLOCKED_USERS', '').split(',') if os.getenv('BLOCKED_USERS') else []
    MAX_MESSAGE_LENGTH: int = int(os.getenv('MAX_MESSAGE_LENGTH', '2000'))
    ENABLE_LOGGING: bool = os.getenv('ENABLE_LOGGING', 'true').lower() == 'true'
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    
    # Feature Flags
    ENABLE_STARTER_QUESTIONS: bool = os.getenv('ENABLE_STARTER_QUESTIONS', 'true').lower() == 'true'
    ENABLE_CITATIONS: bool = os.getenv('ENABLE_CITATIONS', 'true').lower() == 'true'
    ENABLE_FORMATTING: bool = os.getenv('ENABLE_FORMATTING', 'true').lower() == 'true'
    ENABLE_THREADING: bool = os.getenv('ENABLE_THREADING', 'true').lower() == 'true'
    
    # Response Configuration
    DEFAULT_LANGUAGE: str = os.getenv('DEFAULT_LANGUAGE', 'en')
    RESPONSE_TIMEOUT: int = int(os.getenv('RESPONSE_TIMEOUT', '30'))
    MAX_RETRIES: int = int(os.getenv('MAX_RETRIES', '3'))
    
    # Monitoring Configuration
    ENABLE_ANALYTICS: bool = os.getenv('ENABLE_ANALYTICS', 'false').lower() == 'true'
    ANALYTICS_ENDPOINT: str = os.getenv('ANALYTICS_ENDPOINT', '')
    
    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration"""
        required_fields = [
            'ROCKET_CHAT_URL',
            'CUSTOMGPT_API_KEY',
            'CUSTOMGPT_PROJECT_ID'
        ]
        
        # Need either username/password or auth token
        if not cls.ROCKET_CHAT_AUTH_TOKEN:
            required_fields.extend(['ROCKET_CHAT_USER', 'ROCKET_CHAT_PASSWORD'])
        
        missing_fields = []
        for field in required_fields:
            if not getattr(cls, field):
                missing_fields.append(field)
        
        if missing_fields:
            raise ValueError(f"Missing required configuration: {', '.join(missing_fields)}")
        
        return True
    
    @classmethod
    def get_starter_questions(cls) -> list:
        """Get starter questions from environment or defaults"""
        env_questions = os.getenv('STARTER_QUESTIONS', '')
        if env_questions:
            return [q.strip() for q in env_questions.split('|') if q.strip()]
        
        return [
            "What can you help me with?",
            "Tell me about your capabilities",
            "How do I get started?",
            "What kind of questions can I ask?",
            "Show me some examples"
        ]
    
    @classmethod
    def to_dict(cls) -> Dict[str, Any]:
        """Convert config to dictionary (excluding sensitive data)"""
        config_dict = {}
        for key in dir(cls):
            if key.isupper() and not key.startswith('_'):
                value = getattr(cls, key)
                # Mask sensitive values
                if any(sensitive in key for sensitive in ['PASSWORD', 'TOKEN', 'KEY']):
                    config_dict[key] = '***' if value else None
                else:
                    config_dict[key] = value
        return config_dict