"""
Fallback chain management for resilient service operations.
Provides cascading fallback strategies for STT, AI, and TTS services.
"""

import logging
import os
from typing import Optional, Callable, Any, List, Dict
from enum import Enum

logger = logging.getLogger(__name__)


class ServiceType(Enum):
    """Types of services with fallback support."""
    STT = "STT"
    AI = "AI"
    TTS = "TTS"


class FallbackResult:
    """Result of a fallback chain execution."""

    def __init__(
        self,
        success: bool,
        result: Any = None,
        provider_used: str = None,
        fallback_level: int = 0,
        error: Optional[Exception] = None
    ):
        self.success = success
        self.result = result
        self.provider_used = provider_used
        self.fallback_level = fallback_level
        self.error = error

    def __repr__(self):
        return f"FallbackResult(success={self.success}, provider={self.provider_used}, level={self.fallback_level})"


async def execute_fallback_chain(
    service_type: ServiceType,
    primary_func: Callable,
    primary_name: str,
    *args,
    fallback_funcs: Optional[List[tuple]] = None,
    **kwargs
) -> FallbackResult:
    """
    Execute a primary function with fallback chain support.

    Args:
        service_type: Type of service (STT, AI, TTS)
        primary_func: Primary async function to execute
        primary_name: Name of primary provider
        *args: Positional arguments for functions
        fallback_funcs: List of (func, name) tuples for fallback providers
        **kwargs: Keyword arguments for functions

    Returns:
        FallbackResult with outcome and metadata

    Example:
        result = await execute_fallback_chain(
            ServiceType.TTS,
            openai_tts,
            "OpenAI TTS",
            text="Hello",
            fallback_funcs=[
                (edge_tts, "Edge TTS"),
                (text_only, "Text-only mode")
            ]
        )
    """
    # Try primary function first
    try:
        logger.info(f"[{service_type.value}] Using primary provider: {primary_name}")
        result = await primary_func(*args, **kwargs)
        logger.info(f"[{service_type.value}] ✅ Success with {primary_name}")
        return FallbackResult(
            success=True,
            result=result,
            provider_used=primary_name,
            fallback_level=0
        )

    except Exception as e:
        logger.warning(f"[{service_type.value}] ❌ Primary provider ({primary_name}) failed: {str(e)[:100]}")

        # Try fallback functions
        if fallback_funcs:
            for level, (fallback_func, fallback_name) in enumerate(fallback_funcs, start=1):
                try:
                    logger.warning(f"[FALLBACK] {service_type.value}: Attempting fallback #{level}: {fallback_name}")
                    result = await fallback_func(*args, **kwargs)
                    logger.info(f"[FALLBACK] {service_type.value}: ✅ Fallback successful with {fallback_name} (level {level})")
                    return FallbackResult(
                        success=True,
                        result=result,
                        provider_used=fallback_name,
                        fallback_level=level
                    )

                except Exception as fallback_error:
                    logger.warning(
                        f"[FALLBACK] {service_type.value}: ❌ {fallback_name} failed: "
                        f"{str(fallback_error)[:100]}"
                    )
                    continue

        # All fallbacks failed
        logger.error(f"[FALLBACK] {service_type.value}: ❌ All providers failed")
        return FallbackResult(
            success=False,
            error=e,
            provider_used=None,
            fallback_level=-1
        )


# ============================================================================
# STT Fallback Functions
# ============================================================================

async def stt_text_only_mode(*args, **kwargs) -> str:
    """
    Text-only fallback when STT completely fails.
    Returns a user-friendly message indicating STT is unavailable.
    """
    logger.warning("[STT FALLBACK] All STT providers failed - returning text-only mode message")
    return "[Speech recognition unavailable - please type your message]"


# ============================================================================
# AI Fallback Functions
# ============================================================================

async def ai_openai_fallback(messages: List[Dict], *args, **kwargs) -> str:
    """
    OpenAI fallback when CustomGPT fails.
    Uses standard OpenAI API as backup.
    """
    from openai import AsyncOpenAI

    logger.info("[AI FALLBACK] Using OpenAI as fallback for CustomGPT")

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    model = os.getenv("AI_COMPLETION_MODEL", "gpt-3.5-turbo")

    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=150,
        timeout=15.0
    )

    return response.choices[0].message.content


async def ai_template_fallback(*args, **kwargs) -> str:
    """
    Template response fallback when all AI providers fail.
    Returns a helpful error message.
    """
    logger.warning("[AI FALLBACK] All AI providers failed - returning template response")
    return "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."


# ============================================================================
# TTS Fallback Functions
# ============================================================================

async def tts_edge_fallback(text: str, *args, **kwargs):
    """
    Edge TTS fallback when OpenAI TTS fails.
    Uses Microsoft Edge TTS as free alternative.
    """
    try:
        import edge_tts
        import tempfile

        logger.info("[TTS FALLBACK] Using Edge TTS as fallback")

        voice = os.getenv("EDGETTS_VOICE", "en-US-EricNeural")

        # Create temporary file for audio
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        temp_path = temp_file.name
        temp_file.close()

        # Generate speech with Edge TTS
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(temp_path)

        # Read and return audio data
        with open(temp_path, "rb") as f:
            audio_data = f.read()

        # Clean up temp file
        import os as os_module
        os_module.remove(temp_path)

        # Return audio data wrapped to match OpenAI response format
        class EdgeTTSResponse:
            def __init__(self, data):
                self._data = data

            def iter_bytes(self, chunk_size=1024):
                """Iterate over bytes in chunks to match OpenAI API."""
                for i in range(0, len(self._data), chunk_size):
                    yield self._data[i:i + chunk_size]

        return EdgeTTSResponse(audio_data)

    except ImportError:
        logger.error("[TTS FALLBACK] Edge TTS not installed - install with: pip install edge-tts")
        raise


async def tts_gtts_fallback(text: str, *args, **kwargs):
    """
    gTTS fallback when Edge TTS fails.
    Uses Google Text-to-Speech as final audio fallback.
    """
    try:
        from gtts import gTTS
        import tempfile

        logger.info("[TTS FALLBACK] Using gTTS as fallback")

        language = os.getenv("LANGUAGE", "en")

        # Create temporary file for audio
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        temp_path = temp_file.name
        temp_file.close()

        # Generate speech with gTTS
        tts = gTTS(text=text, lang=language)
        tts.save(temp_path)

        # Read and return audio data
        with open(temp_path, "rb") as f:
            audio_data = f.read()

        # Clean up temp file
        import os as os_module
        os_module.remove(temp_path)

        # Return audio data wrapped to match OpenAI response format
        class gTTSResponse:
            def __init__(self, data):
                self._data = data

            def iter_bytes(self, chunk_size=1024):
                """Iterate over bytes in chunks to match OpenAI API."""
                for i in range(0, len(self._data), chunk_size):
                    yield self._data[i:i + chunk_size]

        return gTTSResponse(audio_data)

    except ImportError:
        logger.error("[TTS FALLBACK] gTTS not installed - install with: pip install gtts")
        raise


async def tts_text_only_mode(*args, **kwargs):
    """
    Text-only fallback when all TTS providers fail.
    Returns None to signal text-only mode to frontend.
    """
    logger.warning("[TTS FALLBACK] All TTS providers failed - text-only mode")
    raise Exception("TTS_UNAVAILABLE: All TTS providers failed - text-only mode")


# ============================================================================
# Fallback Chain Configurations
# ============================================================================

# TTS Fallback Chain: OpenAI → Edge TTS → gTTS → Text-only
TTS_FALLBACK_CHAIN = [
    (tts_edge_fallback, "Edge TTS"),
    (tts_gtts_fallback, "gTTS"),
]

# AI Fallback Chain: CustomGPT → OpenAI → Template
# Note: Primary is either CustomGPT or OpenAI depending on USE_CUSTOMGPT
AI_FALLBACK_CHAIN = [
    (ai_template_fallback, "Template Response"),
]

# STT Fallback Chain: OpenAI Whisper → Text-only
# Note: Only one STT provider currently, direct to text-only mode
STT_FALLBACK_CHAIN = [
    (stt_text_only_mode, "Text-only mode"),
]
