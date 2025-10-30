"""
Feature detection and capability management for CustomGPT Widget.
Determines which features are available based on configuration and API keys.
"""

import os
import logging
from typing import Dict
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class SystemCapabilities:
    """System feature availability flags."""
    voice_mode_enabled: bool = False
    stt_enabled: bool = False
    tts_enabled: bool = False
    ai_completions_enabled: bool = False
    provider_info: Dict[str, str] = None

    def __post_init__(self):
        if self.provider_info is None:
            self.provider_info = {}

    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "voice_mode_enabled": self.voice_mode_enabled,
            "stt_enabled": self.stt_enabled,
            "tts_enabled": self.tts_enabled,
            "ai_completions_enabled": self.ai_completions_enabled,
            "provider_info": self.provider_info
        }


def detect_system_capabilities() -> SystemCapabilities:
    """
    Detect available system capabilities based on configuration.

    Returns:
        SystemCapabilities object with feature flags
    """
    caps = SystemCapabilities()
    caps.provider_info = {}

    # Check OpenAI API key availability
    openai_key = os.getenv("OPENAI_API_KEY", "")
    has_openai = bool(openai_key and openai_key.startswith("sk-"))

    # Check CustomGPT configuration
    use_customgpt = os.getenv("USE_CUSTOMGPT", "false").lower() == "true"
    customgpt_project_id = os.getenv("CUSTOMGPT_PROJECT_ID", "")
    customgpt_api_key = os.getenv("CUSTOMGPT_API_KEY", "")
    has_customgpt = use_customgpt and bool(customgpt_project_id) and bool(customgpt_api_key)

    # Check voice feature override
    enable_voice = os.getenv("ENABLE_VOICE_FEATURES", "auto").lower()

    # STT Detection (requires OpenAI Whisper API)
    if has_openai:
        caps.stt_enabled = True if enable_voice in ["auto", "true"] else False
        if caps.stt_enabled:
            stt_model = os.getenv("STT_MODEL", "gpt-4o-mini-transcribe")
            caps.provider_info["stt"] = f"OpenAI Whisper ({stt_model})"
    else:
        caps.stt_enabled = False
        if enable_voice == "true":
            logger.error("⚠️  Voice features explicitly enabled but OPENAI_API_KEY missing")

    # TTS Detection (multiple providers available)
    tts_provider = os.getenv("TTS_PROVIDER", "OPENAI").upper()

    if tts_provider == "OPENAI":
        caps.tts_enabled = has_openai and (enable_voice in ["auto", "true"])
        if caps.tts_enabled:
            tts_model = os.getenv("OPENAI_TTS_MODEL", "tts-1")
            tts_voice = os.getenv("OPENAI_TTS_VOICE", "nova")
            caps.provider_info["tts"] = f"OpenAI TTS ({tts_model}/{tts_voice})"
    elif tts_provider == "GTTS":
        caps.tts_enabled = True if enable_voice in ["auto", "true"] else False
        caps.provider_info["tts"] = "Google TTS (gTTS)"
    elif tts_provider == "ELEVENLABS":
        has_elevenlabs = bool(os.getenv("ELEVENLABS_API_KEY"))
        caps.tts_enabled = has_elevenlabs and (enable_voice in ["auto", "true"])
        if caps.tts_enabled:
            caps.provider_info["tts"] = "ElevenLabs TTS"
    elif tts_provider == "STREAMELEMENTS":
        caps.tts_enabled = True if enable_voice in ["auto", "true"] else False
        caps.provider_info["tts"] = "StreamElements TTS"
    elif tts_provider == "EDGETTS":
        caps.tts_enabled = True if enable_voice in ["auto", "true"] else False
        voice = os.getenv("EDGETTS_VOICE", "en-US-EricNeural")
        caps.provider_info["tts"] = f"Microsoft Edge TTS ({voice})"

    # Voice Mode requires both STT and TTS
    caps.voice_mode_enabled = caps.stt_enabled and caps.tts_enabled

    # AI Completions Detection
    if has_customgpt:
        caps.ai_completions_enabled = True
        caps.provider_info["ai"] = f"CustomGPT (Project: {customgpt_project_id})"
    elif has_openai:
        caps.ai_completions_enabled = True
        ai_model = os.getenv("AI_COMPLETION_MODEL", "gpt-3.5-turbo")
        caps.provider_info["ai"] = f"OpenAI ({ai_model})"
    else:
        caps.ai_completions_enabled = False
        logger.error("⚠️  No AI provider configured - chat functionality unavailable")

    # Log detected capabilities
    logger.info("\n" + "=" * 60)
    logger.info("SYSTEM CAPABILITIES DETECTED")
    logger.info("=" * 60)
    logger.info(f"Voice Mode:       {'✅ Enabled' if caps.voice_mode_enabled else '❌ Disabled'}")
    logger.info(f"Speech-to-Text:   {'✅ Enabled' if caps.stt_enabled else '❌ Disabled'}")
    logger.info(f"Text-to-Speech:   {'✅ Enabled' if caps.tts_enabled else '❌ Disabled'}")
    logger.info(f"AI Completions:   {'✅ Enabled' if caps.ai_completions_enabled else '❌ Disabled'}")
    logger.info("\nProvider Information:")
    for feature, provider in caps.provider_info.items():
        logger.info(f"  {feature.upper()}: {provider}")
    logger.info("=" * 60 + "\n")

    return caps


# Global capabilities instance
_capabilities: SystemCapabilities = None


def get_capabilities() -> SystemCapabilities:
    """Get cached system capabilities."""
    global _capabilities
    if _capabilities is None:
        _capabilities = detect_system_capabilities()
    return _capabilities


def refresh_capabilities() -> SystemCapabilities:
    """Force refresh of system capabilities."""
    global _capabilities
    _capabilities = detect_system_capabilities()
    return _capabilities
