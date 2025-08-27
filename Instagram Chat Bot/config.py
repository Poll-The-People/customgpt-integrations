"""
Configuration management for Instagram CustomGPT Bot
"""

import os
from typing import Optional

class Config:
    """Configuration class for Instagram bot"""
    
    # Instagram/Meta API Configuration
    INSTAGRAM_ACCESS_TOKEN: str = os.getenv('INSTAGRAM_ACCESS_TOKEN', '')
    INSTAGRAM_APP_SECRET: str = os.getenv('INSTAGRAM_APP_SECRET', '')
    WEBHOOK_VERIFY_TOKEN: str = os.getenv('WEBHOOK_VERIFY_TOKEN', 'instagram_webhook_verify_token')
    
    # CustomGPT API Configuration
    CUSTOMGPT_API_KEY: str = os.getenv('CUSTOMGPT_API_KEY', '')
    CUSTOMGPT_API_BASE_URL: str = os.getenv('CUSTOMGPT_API_BASE_URL', 'https://app.customgpt.ai/api/v1')
    DEFAULT_AGENT_ID: Optional[str] = os.getenv('DEFAULT_AGENT_ID')
    
    # Server Configuration
    HOST: str = os.getenv('HOST', '0.0.0.0')
    PORT: int = int(os.getenv('PORT', '3000'))
    DEBUG: bool = os.getenv('DEBUG', 'false').lower() == 'true'
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    
    # Security Configuration
    RATE_LIMIT_PER_USER_PER_MINUTE: int = int(os.getenv('RATE_LIMIT_PER_USER_PER_MINUTE', '10'))
    RATE_LIMIT_PER_USER_PER_HOUR: int = int(os.getenv('RATE_LIMIT_PER_USER_PER_HOUR', '50'))
    MAX_MESSAGE_LENGTH: int = int(os.getenv('MAX_MESSAGE_LENGTH', '2000'))
    
    # Redis Configuration (optional)
    REDIS_URL: Optional[str] = os.getenv('REDIS_URL')
    
    # Analytics Configuration (optional)
    ANALYTICS_ENABLED: bool = os.getenv('ANALYTICS_ENABLED', 'false').lower() == 'true'
    ANALYTICS_ENDPOINT: Optional[str] = os.getenv('ANALYTICS_ENDPOINT')
    
    # Feature Configuration
    ENABLE_STARTER_QUESTIONS: bool = os.getenv('ENABLE_STARTER_QUESTIONS', 'true').lower() == 'true'
    ENABLE_CITATIONS: bool = os.getenv('ENABLE_CITATIONS', 'true').lower() == 'true'
    ENABLE_TYPING_INDICATOR: bool = os.getenv('ENABLE_TYPING_INDICATOR', 'true').lower() == 'true'
    
    # User Management
    ALLOWED_USER_IDS: Optional[str] = os.getenv('ALLOWED_USER_IDS')  # Comma-separated list
    BLOCKED_USER_IDS: Optional[str] = os.getenv('BLOCKED_USER_IDS')  # Comma-separated list
    
    @classmethod
    def validate_config(cls) -> list:
        """Validate required configuration values"""
        errors = []
        
        required_fields = [
            ('INSTAGRAM_ACCESS_TOKEN', cls.INSTAGRAM_ACCESS_TOKEN),
            ('INSTAGRAM_APP_SECRET', cls.INSTAGRAM_APP_SECRET),
            ('CUSTOMGPT_API_KEY', cls.CUSTOMGPT_API_KEY),
        ]
        
        for field_name, field_value in required_fields:
            if not field_value:
                errors.append(f"Missing required configuration: {field_name}")
        
        return errors
    
    @classmethod
    def get_allowed_user_ids(cls) -> list:
        """Get list of allowed user IDs"""
        if cls.ALLOWED_USER_IDS:
            return [uid.strip() for uid in cls.ALLOWED_USER_IDS.split(',')]
        return []
    
    @classmethod
    def get_blocked_user_ids(cls) -> list:
        """Get list of blocked user IDs"""
        if cls.BLOCKED_USER_IDS:
            return [uid.strip() for uid in cls.BLOCKED_USER_IDS.split(',')]
        return []