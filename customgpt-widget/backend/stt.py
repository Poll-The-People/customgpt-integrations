import logging
import os
import shutil
import time
import uuid

import ffmpeg
from openai import AsyncOpenAI

from retry_utils import retry_async, RETRY_CONFIG_STT
from fallback import execute_fallback_chain, ServiceType, STT_FALLBACK_CHAIN

LANGUAGE = os.getenv("LANGUAGE", "en")
STT_MODEL = os.getenv("STT_MODEL", "gpt-4o-mini-transcribe")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


async def _transcribe_internal(converted_filepath: str) -> str:
    """
    Internal transcription function with retry logic.

    Args:
        converted_filepath: Path to converted audio file

    Returns:
        Transcribed text
    """
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    with open(converted_filepath, "rb") as audio_file:
        logging.debug("calling STT model: %s", STT_MODEL)

        # Use AsyncOpenAI v2.6.1 API
        response = await client.audio.transcriptions.create(
            model=STT_MODEL,
            file=audio_file,
            language=LANGUAGE
        )
        return response.text


async def transcribe(audio):
    """
    Transcribe audio with retry logic for resilience.

    Args:
        audio: Audio file upload

    Returns:
        Transcribed text
    """
    start_time = time.time()

    # Read audio file content directly into memory
    audio_content = await audio.read()

    # Create temporary file for ffmpeg processing
    temp_filepath = f"/tmp/{uuid.uuid4()}.wav"

    try:
        # Write once and convert in one step
        with open(temp_filepath, "wb") as f:
            f.write(audio_content)

        # Convert with ffmpeg (necessary for Whisper API compatibility)
        converted_filepath = f"/tmp/converted-{uuid.uuid4()}.wav"
        (
            ffmpeg
            .input(temp_filepath)
            .output(converted_filepath, loglevel="error", ar=16000, ac=1)  # Optimize for Whisper: 16kHz, mono
            .run()
        )

        # Transcribe with retry logic and fallback chain
        async def _transcribe_with_retry(filepath):
            return await retry_async(
                _transcribe_internal,
                filepath,
                config=RETRY_CONFIG_STT,
                operation_name="STT"
            )

        fallback_result = await execute_fallback_chain(
            ServiceType.STT,
            _transcribe_with_retry,
            "OpenAI Whisper",
            converted_filepath,
            fallback_funcs=STT_FALLBACK_CHAIN
        )

        if not fallback_result.success:
            logging.error("[STT] All providers failed - using text-only mode")
            return "[Speech recognition unavailable]"

        transcription = fallback_result.result

        logging.info("[TIMING] STT (%s): %.3fs", STT_MODEL, time.time() - start_time)
        logging.info('user prompt: %s', transcription)

        return transcription

    finally:
        # Clean up temporary files
        os.remove(temp_filepath)
        if 'converted_filepath' in locals():
            os.remove(converted_filepath)
