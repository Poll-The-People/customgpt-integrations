"""
Text-to-Speech API route using OpenAI TTS API with streaming support.
"""
import logging
import os
import asyncio
import time
from typing import AsyncIterator
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from openai import AsyncOpenAI

from retry_utils import retry_async, RETRY_CONFIG_TTS
from fallback import execute_fallback_chain, ServiceType, TTS_FALLBACK_CHAIN
from features import get_capabilities
from tts import _edge_tts_to_speech

router = APIRouter(prefix="/api/tts", tags=["tts"])
logger = logging.getLogger(__name__)

# Initialize OpenAI client (conditionally - only if API key is available)
openai_api_key = os.getenv("OPENAI_API_KEY")
openai_client = AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None

# Configuration
TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "tts-1")  # tts-1 for speed, tts-1-hd for quality
TTS_VOICE = os.getenv("OPENAI_TTS_VOICE", "nova")  # alloy, echo, fable, onyx, nova, shimmer


class TTSRequest(BaseModel):
    """Request model for TTS endpoint."""
    text: str

    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        """Validate text input."""
        if not v or not v.strip():
            raise ValueError("Text cannot be empty")
        if len(v) > 4096:
            raise ValueError("Text exceeds maximum length of 4096 characters")
        return v.strip()


@router.post("/")
async def text_to_speech(request: TTSRequest, background_tasks: BackgroundTasks) -> StreamingResponse:
    """
    Convert text to speech using OpenAI TTS API with streaming.

    Args:
        request: TTSRequest containing text to convert

    Returns:
        StreamingResponse: Streaming MP3 audio

    Raises:
        HTTPException: If OpenAI API fails or validation fails
    """
    # Check if TTS capability is available
    caps = get_capabilities()
    if not caps.tts_enabled:
        raise HTTPException(
            status_code=503,
            detail="Text-to-speech is not available. Please configure OPENAI_API_KEY to enable voice features."
        )

    try:
        tts_start = time.time()
        logger.info(f"[TTS] Processing streaming request: {len(request.text)} characters")

        # Try OpenAI TTS with streaming (with retry logic)
        streaming_response = None
        file_path = None  # Initialize to avoid UnboundLocalError
        use_file_streaming = False

        # Check if OpenAI client is available
        if openai_client is not None:
            for attempt in range(3):
                try:
                    if attempt > 0:
                        logger.info(f"[TTS] Retry attempt {attempt + 1}/3")

                    logger.info(f"[TTS] Using primary provider: OpenAI TTS")

                    # Call with_streaming_response - returns context manager
                    # We need to enter it immediately to get the response
                    streaming_response = await openai_client.audio.speech.with_streaming_response.create(
                        model=TTS_MODEL,
                        voice=TTS_VOICE,
                        input=request.text,
                        response_format="mp3"
                    ).__aenter__()

                    api_time = time.time() - tts_start
                    logger.info(f"[TTS] ✅ Success with OpenAI TTS (API responded in {api_time:.3f}s)")
                    break  # Success!

                except Exception as e:
                    error_str = str(e).lower()

                    # Check if error is retryable
                    is_retryable = any(keyword in error_str for keyword in [
                        'timeout', 'connection', 'network', '503', '502', '504', '429', 'rate limit'
                    ])

                    # Don't retry on authentication errors
                    if '401' in error_str or 'authentication' in error_str or 'unauthorized' in error_str:
                        logger.error(f"[TTS] Authentication error: {str(e)[:100]}")
                        break  # Don't retry, will fall back

                    if attempt < 2 and is_retryable:  # Not last attempt and retryable
                        delay = 2 ** attempt  # Exponential backoff: 1s, 2s
                        logger.warning(f"[TTS] Attempt {attempt + 1} failed: {str(e)[:100]}, retrying in {delay}s")
                        await asyncio.sleep(delay)
                    else:
                        logger.warning(f"[TTS] OpenAI TTS failed: {str(e)[:100]}")
                        break

        # If OpenAI TTS failed or unavailable, try fallback (Edge TTS)
        if streaming_response is None:
            logger.warning(f"[TTS] OpenAI TTS unavailable, attempting Edge TTS fallback")

            try:
                # Call Edge TTS directly
                file_path = await _edge_tts_to_speech(request.text, background_tasks)
                use_file_streaming = True
                logger.info(f"[TTS] ✅ Success with Edge TTS fallback")
            except Exception as e:
                logger.error(f"[TTS] Edge TTS fallback also failed: {e}")
                raise HTTPException(status_code=503, detail="TTS service temporarily unavailable")

        # Stream the audio chunks with TRUE async streaming
        chunk_count = 0
        first_chunk_time = None

        async def audio_stream() -> AsyncIterator[bytes]:
            """Async generator that streams audio chunks."""
            nonlocal chunk_count, first_chunk_time

            try:
                if use_file_streaming:
                    # File-based streaming (Edge TTS fallback)
                    # Use async file I/O to avoid blocking
                    loop = asyncio.get_event_loop()

                    def read_file_sync():
                        """Read file synchronously in executor."""
                        with open(file_path, 'rb') as f:
                            return f.read()

                    # Read entire file in executor to avoid blocking
                    audio_data = await loop.run_in_executor(None, read_file_sync)

                    # Yield chunks from the loaded data
                    for i in range(0, len(audio_data), 8192):
                        chunk = audio_data[i:i + 8192]

                        if chunk_count == 0:
                            first_chunk_time = time.time() - tts_start
                            logger.info(f"[TTS] First chunk sent at {first_chunk_time:.3f}s")

                        chunk_count += 1
                        yield chunk
                else:
                    # True async streaming from OpenAI (AsyncStreamedBinaryAPIResponse)
                    # This streams chunks as they arrive - NO download wait!
                    async for chunk in streaming_response.iter_bytes(chunk_size=8192):
                        if chunk_count == 0:
                            first_chunk_time = time.time() - tts_start
                            logger.info(f"[TTS] First chunk sent at {first_chunk_time:.3f}s")

                        chunk_count += 1
                        yield chunk

                total_time = time.time() - tts_start
                logger.info(f"[TTS] Streaming complete: {chunk_count} chunks in {total_time:.3f}s")

            finally:
                # Cleanup: close OpenAI streaming response
                if streaming_response is not None and not use_file_streaming:
                    try:
                        # AsyncStreamedBinaryAPIResponse has a close() method, not __aexit__
                        await streaming_response.close()
                    except Exception as close_error:
                        logger.warning(f"[TTS] Error closing streaming response: {close_error}")

                # Note: Edge TTS temp files are automatically deleted by background_tasks
                # No manual deletion needed here to avoid race condition

        return StreamingResponse(
            audio_stream(),
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "no-cache",
                "Accept-Ranges": "bytes"
            }
        )

    except ValueError as e:
        logger.error(f"[TTS] Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[TTS] OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate speech")
