"""
Startup validation and configuration checks for CustomGPT Widget application.
Prevents crashes by validating all required environment variables and API keys at startup.
"""

import logging
import os
import sys
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Raised when startup validation fails."""
    pass


class ConfigValidator:
    """Validates environment configuration and API keys at startup."""

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate_all(self) -> bool:
        """
        Run all validation checks.

        Returns:
            bool: True if all critical checks pass, False otherwise
        """
        logger.info("=" * 60)
        logger.info("STARTUP VALIDATION - Checking Configuration")
        logger.info("=" * 60)

        # Run all validation checks
        self._validate_openai_config()
        self._validate_customgpt_config()
        self._validate_tts_config()
        self._validate_stt_config()
        self._validate_language_config()

        # Report results
        self._report_results()

        # Fail if critical errors exist
        if self.errors:
            return False

        return True

    def _validate_openai_config(self):
        """Validate OpenAI API configuration."""
        logger.info("\n[1/5] OpenAI Configuration")

        api_key = os.getenv("OPENAI_API_KEY")
        enable_voice = os.getenv("ENABLE_VOICE_FEATURES", "auto").lower()
        use_customgpt = os.getenv("USE_CUSTOMGPT", "false").lower() == "true"

        if not api_key:
            # Check if voice features are explicitly required
            if enable_voice == "true":
                self.errors.append("OPENAI_API_KEY is required when ENABLE_VOICE_FEATURES=true")
                logger.error("  ❌ OPENAI_API_KEY: Missing (required for voice features)")
            # Check if AI completions need OpenAI (no CustomGPT)
            elif not use_customgpt:
                self.errors.append("Either OPENAI_API_KEY or USE_CUSTOMGPT=true is required for AI completions")
                logger.error("  ❌ OPENAI_API_KEY: Missing (no AI provider configured)")
            else:
                # CustomGPT available, OpenAI optional for voice only
                self.warnings.append("OPENAI_API_KEY not set - Voice features will be disabled")
                logger.warning("  ⚠️  OPENAI_API_KEY: Missing (text-only mode, voice features disabled)")
            return

        # Validate key format (should start with sk-)
        if not api_key.startswith("sk-"):
            self.warnings.append("OPENAI_API_KEY format looks invalid (should start with 'sk-')")
            logger.warning(f"  ⚠️  OPENAI_API_KEY: Invalid format (should start with 'sk-')")
        else:
            voice_status = "voice features enabled" if enable_voice in ["auto", "true"] else "voice features disabled"
            logger.info(f"  ✅ OPENAI_API_KEY: Present ({api_key[:10]}...) - {voice_status}")

        # Check AI completion model if not using CustomGPT
        if not use_customgpt:
            ai_model = os.getenv("AI_COMPLETION_MODEL", "gpt-3.5-turbo")
            logger.info(f"  ✅ AI_COMPLETION_MODEL: {ai_model} (OpenAI mode)")

    def _validate_customgpt_config(self):
        """Validate CustomGPT configuration if enabled."""
        logger.info("\n[2/5] CustomGPT Configuration")

        use_customgpt = os.getenv("USE_CUSTOMGPT", "false").lower() == "true"

        if not use_customgpt:
            logger.info("  ⏭️  CustomGPT: Disabled (using OpenAI for completions)")
            return

        logger.info("  ℹ️  CustomGPT: Enabled")

        # Check required CustomGPT variables
        project_id = os.getenv("CUSTOMGPT_PROJECT_ID")
        api_key = os.getenv("CUSTOMGPT_API_KEY")

        if not project_id:
            self.errors.append("CUSTOMGPT_PROJECT_ID is required when USE_CUSTOMGPT=true")
            logger.error("  ❌ CUSTOMGPT_PROJECT_ID: Missing")
        else:
            logger.info(f"  ✅ CUSTOMGPT_PROJECT_ID: {project_id}")

        if not api_key:
            self.errors.append("CUSTOMGPT_API_KEY is required when USE_CUSTOMGPT=true")
            logger.error("  ❌ CUSTOMGPT_API_KEY: Missing")
        else:
            logger.info(f"  ✅ CUSTOMGPT_API_KEY: Present ({api_key[:10]}...)")

        # Check streaming setting
        stream = os.getenv("CUSTOMGPT_STREAM", "true").lower() == "true"
        logger.info(f"  ✅ CUSTOMGPT_STREAM: {stream}")

    def _validate_tts_config(self):
        """Validate Text-to-Speech configuration."""
        logger.info("\n[3/5] TTS Configuration")

        provider = os.getenv("TTS_PROVIDER", "OPENAI").upper()
        valid_providers = ["OPENAI", "GTTS", "ELEVENLABS", "STREAMELEMENTS", "EDGETTS"]

        if provider not in valid_providers:
            self.errors.append(f"TTS_PROVIDER '{provider}' is invalid. Must be one of: {', '.join(valid_providers)}")
            logger.error(f"  ❌ TTS_PROVIDER: Invalid value '{provider}'")
            return

        logger.info(f"  ✅ TTS_PROVIDER: {provider}")

        # Provider-specific validation
        if provider == "OPENAI":
            model = os.getenv("OPENAI_TTS_MODEL", "tts-1")
            voice = os.getenv("OPENAI_TTS_VOICE", "nova")
            valid_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]

            logger.info(f"  ✅ OPENAI_TTS_MODEL: {model}")

            if voice not in valid_voices:
                self.warnings.append(f"OPENAI_TTS_VOICE '{voice}' may be invalid. Expected: {', '.join(valid_voices)}")
                logger.warning(f"  ⚠️  OPENAI_TTS_VOICE: Unknown voice '{voice}'")
            else:
                logger.info(f"  ✅ OPENAI_TTS_VOICE: {voice}")

        elif provider == "ELEVENLABS":
            api_key = os.getenv("ELEVENLABS_API_KEY")
            if not api_key:
                self.errors.append("ELEVENLABS_API_KEY is required when TTS_PROVIDER=ELEVENLABS")
                logger.error("  ❌ ELEVENLABS_API_KEY: Missing")
            else:
                logger.info(f"  ✅ ELEVENLABS_API_KEY: Present ({api_key[:10]}...)")

        elif provider == "EDGETTS":
            voice = os.getenv("EDGETTS_VOICE")
            if not voice:
                self.warnings.append("EDGETTS_VOICE not set, using default 'en-US-EricNeural'")
                logger.warning("  ⚠️  EDGETTS_VOICE: Not set (using default)")
            else:
                logger.info(f"  ✅ EDGETTS_VOICE: {voice}")

    def _validate_stt_config(self):
        """Validate Speech-to-Text configuration."""
        logger.info("\n[4/5] STT Configuration")

        stt_model = os.getenv("STT_MODEL", "gpt-4o-mini-transcribe")
        valid_models = ["gpt-4o-mini-transcribe", "gpt-4o-transcribe", "whisper-1"]

        if stt_model not in valid_models:
            self.warnings.append(f"STT_MODEL '{stt_model}' may be invalid. Expected: {', '.join(valid_models)}")
            logger.warning(f"  ⚠️  STT_MODEL: Unknown model '{stt_model}'")
        else:
            logger.info(f"  ✅ STT_MODEL: {stt_model}")

    def _validate_language_config(self):
        """Validate language configuration."""
        logger.info("\n[5/5] Language Configuration")

        language = os.getenv("LANGUAGE", "en")
        logger.info(f"  ✅ LANGUAGE: {language}")

    def _report_results(self):
        """Report validation results."""
        logger.info("\n" + "=" * 60)
        logger.info("VALIDATION SUMMARY")
        logger.info("=" * 60)

        if not self.errors and not self.warnings:
            logger.info("✅ All checks passed - Application is properly configured")
        else:
            if self.warnings:
                logger.warning(f"\n⚠️  {len(self.warnings)} Warning(s):")
                for i, warning in enumerate(self.warnings, 1):
                    logger.warning(f"  {i}. {warning}")

            if self.errors:
                logger.error(f"\n❌ {len(self.errors)} Critical Error(s):")
                for i, error in enumerate(self.errors, 1):
                    logger.error(f"  {i}. {error}")

        logger.info("=" * 60 + "\n")


def validate_startup_config() -> None:
    """
    Validate all startup configuration.

    Raises:
        ValidationError: If critical configuration is missing or invalid
        SystemExit: Exits the application if validation fails
    """
    validator = ConfigValidator()

    if not validator.validate_all():
        logger.error("\n🚨 STARTUP VALIDATION FAILED - Application cannot start safely")
        logger.error("Please fix the configuration errors above and restart the application.\n")
        sys.exit(1)

    logger.info("🚀 Startup validation complete - Proceeding with application startup\n")


async def validate_openai_api_key() -> Dict[str, any]:
    """
    Validate OpenAI API key by making a test request.

    Returns:
        Dict with 'valid' boolean and optional 'error' message
    """
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Make a minimal test request
        response = await client.models.list()

        logger.info("✅ OpenAI API key validation: Success")
        return {"valid": True}

    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ OpenAI API key validation failed: {error_msg}")
        return {"valid": False, "error": error_msg}


async def validate_customgpt_config() -> Dict[str, any]:
    """
    Validate CustomGPT configuration by checking project access.

    Returns:
        Dict with 'valid' boolean and optional 'error' message
    """
    if os.getenv("USE_CUSTOMGPT", "false").lower() != "true":
        return {"valid": True, "skipped": True}

    try:
        import requests

        project_id = os.getenv("CUSTOMGPT_PROJECT_ID")
        api_key = os.getenv("CUSTOMGPT_API_KEY")

        # Test project access
        url = f"https://app.customgpt.ai/api/v1/projects/{project_id}/settings"
        headers = {"Authorization": f"Bearer {api_key}"}

        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            logger.info("✅ CustomGPT configuration validation: Success")
            return {"valid": True}
        else:
            error_msg = f"HTTP {response.status_code}: {response.text}"
            logger.error(f"❌ CustomGPT configuration validation failed: {error_msg}")
            return {"valid": False, "error": error_msg}

    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ CustomGPT configuration validation failed: {error_msg}")
        return {"valid": False, "error": error_msg}
