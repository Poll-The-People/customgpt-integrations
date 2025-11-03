"""
Input Validation and Sanitization for Microsoft Teams Bot
"""

import re
import html
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class InputValidator:
    """Validates and sanitizes user inputs"""

    # Maximum lengths for different input types
    MAX_MESSAGE_LENGTH = 4000
    MAX_USERNAME_LENGTH = 256
    MAX_METADATA_LENGTH = 1000

    # Dangerous patterns to detect
    SCRIPT_PATTERN = re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL)
    HTML_TAG_PATTERN = re.compile(r'<[^>]+>')

    @staticmethod
    def sanitize_message(text: str, max_length: Optional[int] = None) -> str:
        """
        Sanitize user message text

        Args:
            text: Input text to sanitize
            max_length: Maximum allowed length (default: MAX_MESSAGE_LENGTH)

        Returns:
            Sanitized text safe for processing and display
        """
        if not text:
            return ""

        # Use default max length if not specified
        if max_length is None:
            max_length = InputValidator.MAX_MESSAGE_LENGTH

        # Truncate to max length
        text = text[:max_length]

        # Remove null bytes
        text = text.replace('\x00', '')

        # HTML encode dangerous characters
        text = html.escape(text, quote=False)

        # Strip excessive whitespace
        text = ' '.join(text.split())

        # Remove any remaining script tags (defense in depth)
        text = InputValidator.SCRIPT_PATTERN.sub('', text)

        return text.strip()

    @staticmethod
    def sanitize_html(text: str, allow_basic_formatting: bool = False) -> str:
        """
        Sanitize HTML content

        Args:
            text: HTML text to sanitize
            allow_basic_formatting: If True, allows basic markdown-safe formatting

        Returns:
            Sanitized HTML
        """
        if not text:
            return ""

        # Remove script tags
        text = InputValidator.SCRIPT_PATTERN.sub('', text)

        if not allow_basic_formatting:
            # Remove all HTML tags
            text = InputValidator.HTML_TAG_PATTERN.sub('', text)

        # HTML encode
        text = html.escape(text, quote=True)

        return text.strip()

    @staticmethod
    def validate_user_id(user_id: str) -> bool:
        """
        Validate user ID format

        Args:
            user_id: User ID to validate

        Returns:
            True if valid, False otherwise
        """
        if not user_id:
            return False

        # Check length
        if len(user_id) > 256:
            return False

        # Check for null bytes
        if '\x00' in user_id:
            return False

        # User IDs should be alphanumeric with some special chars
        if not re.match(r'^[a-zA-Z0-9\-_:@.]+$', user_id):
            logger.warning(f"Invalid user ID format: {user_id}")
            return False

        return True

    @staticmethod
    def validate_channel_id(channel_id: str) -> bool:
        """
        Validate channel ID format

        Args:
            channel_id: Channel ID to validate

        Returns:
            True if valid, False otherwise
        """
        if not channel_id:
            return False

        # Similar validation to user ID
        if len(channel_id) > 256:
            return False

        if '\x00' in channel_id:
            return False

        if not re.match(r'^[a-zA-Z0-9\-_:@.]+$', channel_id):
            logger.warning(f"Invalid channel ID format: {channel_id}")
            return False

        return True

    @staticmethod
    def sanitize_user_info(user_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize user information dictionary

        Args:
            user_info: User info dictionary

        Returns:
            Sanitized user info dictionary
        """
        if not user_info:
            return {}

        sanitized = {}

        # Sanitize string fields
        string_fields = ['id', 'name', 'tenant', 'channel']
        for field in string_fields:
            if field in user_info and user_info[field]:
                value = str(user_info[field])[:InputValidator.MAX_USERNAME_LENGTH]
                sanitized[field] = html.escape(value, quote=False)

        return sanitized

    @staticmethod
    def validate_message_length(text: str, max_length: Optional[int] = None) -> bool:
        """
        Check if message length is within acceptable limits

        Args:
            text: Message text to check
            max_length: Maximum allowed length

        Returns:
            True if valid length, False otherwise
        """
        if not text:
            return False

        if max_length is None:
            max_length = InputValidator.MAX_MESSAGE_LENGTH

        return len(text) <= max_length

    @staticmethod
    def detect_potential_injection(text: str) -> bool:
        """
        Detect potential injection attacks

        Args:
            text: Text to analyze

        Returns:
            True if potential injection detected, False otherwise
        """
        if not text:
            return False

        # Check for script tags
        if InputValidator.SCRIPT_PATTERN.search(text):
            logger.warning("Potential script injection detected")
            return True

        # Check for SQL injection patterns
        sql_patterns = [
            r'(\bunion\b.*\bselect\b)',
            r'(\bselect\b.*\bfrom\b)',
            r'(\binsert\b.*\binto\b)',
            r'(\bdelete\b.*\bfrom\b)',
            r'(\bdrop\b.*\btable\b)',
        ]

        for pattern in sql_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning("Potential SQL injection pattern detected")
                return True

        # Check for command injection
        command_patterns = [
            r'[;&|`$]',  # Shell command separators
            r'\$\{.*\}',  # Variable expansion
            r'\$\(.*\)',  # Command substitution
        ]

        for pattern in command_patterns:
            if re.search(pattern, text):
                logger.warning("Potential command injection pattern detected")
                return True

        return False

    @staticmethod
    def sanitize_for_adaptive_card(text: str) -> str:
        """
        Sanitize text for safe display in Adaptive Cards

        Args:
            text: Text to sanitize

        Returns:
            Sanitized text safe for Adaptive Cards
        """
        if not text:
            return ""

        # Adaptive Cards support markdown, but we need to be careful
        # Remove script tags
        text = InputValidator.SCRIPT_PATTERN.sub('', text)

        # Escape characters that could break JSON
        text = text.replace('\\', '\\\\')
        text = text.replace('"', '\\"')
        text = text.replace('\n', '\\n')
        text = text.replace('\r', '\\r')
        text = text.replace('\t', '\\t')

        return text
