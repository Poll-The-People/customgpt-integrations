import logging
import os
import time
import uuid

import requests
from gtts import gTTS
import edge_tts
from elevenlabs import generate, save
import openai

LANGUAGE = os.getenv("LANGUAGE", "en")
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "OPENAI")

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", None)
ELEVENLABS_VOICE = os.getenv("ELEVENLABS_VOICE", "EXAVITQu4vr4xnSDxMaL")
EDGETTS_VOICE = os.getenv("EDGETTS_VOICE", "en-US-EricNeural")

# OpenAI TTS Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "tts-1")  # tts-1 or tts-1-hd
OPENAI_TTS_VOICE = os.getenv("OPENAI_TTS_VOICE", "nova")  # alloy, echo, fable, onyx, nova, shimmer


async def to_speech(text, background_tasks):
    if TTS_PROVIDER == "OPENAI":
        return await _openai_tts_to_speech(text, background_tasks)
    elif TTS_PROVIDER == "gTTS":
        return _gtts_to_speech(text, background_tasks)
    elif TTS_PROVIDER == "ELEVENLABS":
        return _elevenlabs_to_speech(text, background_tasks)
    elif TTS_PROVIDER == "STREAMELEMENTS":
        return _streamelements_to_speech(text, background_tasks)
    elif TTS_PROVIDER == "EDGETTS":
        return await _edge_tts_to_speech(text, background_tasks)
    else:
        raise ValueError(f"env var TTS_PROVIDER set to unsupported value: {TTS_PROVIDER}")


async def _openai_tts_to_speech(text, background_tasks):
    """
    OpenAI TTS API v2.6.1 - Natural, human-like voices with async streaming

    Features:
    - True async/await with AsyncOpenAI (non-blocking)
    - Streaming for memory efficiency
    - Retry logic with exponential backoff
    - Edge TTS fallback for reliability

    Models:
    - tts-1: Fast, low latency (~300-500ms) for real-time
    - tts-1-hd: High quality for production content
    """
    import asyncio
    from openai import AsyncOpenAI, OpenAIError, APITimeoutError, RateLimitError

    max_retries = 3
    retry_delay = 1.0
    start_time = time.time()

    for attempt in range(max_retries):
        try:
            # Use AsyncOpenAI for true async operations
            client = AsyncOpenAI(
                api_key=OPENAI_API_KEY,
                timeout=15.0,
                max_retries=0  # Manual retry control for better logging
            )

            filepath = f"/tmp/{uuid.uuid4()}.mp3"

            # Streaming response - memory efficient, lower latency
            async with client.audio.speech.with_streaming_response.create(
                model=OPENAI_TTS_MODEL,
                voice=OPENAI_TTS_VOICE,
                input=text,
                response_format="mp3"
            ) as response:
                await response.stream_to_file(filepath)

            background_tasks.add_task(os.remove, filepath)

            logging.info(
                f'[TIMING] TTS (OpenAI {OPENAI_TTS_VOICE}, attempt {attempt + 1}): '
                f'{time.time() - start_time:.3f}s'
            )
            return filepath

        except RateLimitError as e:
            wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
            logging.warning(
                f"OpenAI TTS rate limit (attempt {attempt + 1}/{max_retries}), "
                f"waiting {wait_time}s"
            )
            if attempt < max_retries - 1:
                await asyncio.sleep(wait_time)
                continue

        except APITimeoutError as e:
            logging.warning(
                f"OpenAI TTS timeout (attempt {attempt + 1}/{max_retries})"
            )
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                continue

        except OpenAIError as e:
            # Don't retry config errors (invalid API key, wrong voice, etc.)
            if "invalid" in str(e).lower():
                logging.error(f"OpenAI TTS config error: {e}")
                break
            logging.warning(
                f"OpenAI TTS error (attempt {attempt + 1}/{max_retries}): {e}"
            )
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                continue

        except Exception as e:
            logging.error(f"Unexpected OpenAI TTS error: {e}")
            break

    # Fallback to Edge TTS after all retries exhausted
    logging.error(
        f"OpenAI TTS failed after {max_retries} attempts, falling back to Edge TTS"
    )
    return await _edge_tts_to_speech(text, background_tasks)


async def _edge_tts_to_speech(text, background_tasks):
    start_time = time.time()

    communicate = edge_tts.Communicate(text, EDGETTS_VOICE)
    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    await communicate.save(filepath)

    background_tasks.add_task(os.remove, filepath)

    logging.info('TTS time: %s %s', time.time() - start_time, 'seconds')
    return filepath


def _gtts_to_speech(text, background_tasks):
    start_time = time.time()

    tts = gTTS(text, lang=LANGUAGE)
    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    tts.save(filepath)

    background_tasks.add_task(os.remove, filepath)

    logging.info('TTS time: %s %s', time.time() - start_time, 'seconds')
    return filepath


def _elevenlabs_to_speech(text, background_tasks):
    start_time = time.time()

    audio = generate(
        api_key=ELEVENLABS_API_KEY,
        text=text,
        voice=ELEVENLABS_VOICE,
        model="eleven_monolingual_v1"
    )

    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    save(audio, filepath)

    background_tasks.add_task(os.remove, filepath)

    logging.info('TTS time: %s %s', time.time() - start_time, 'seconds')
    return filepath


def _streamelements_to_speech(text, background_tasks):
    start_time = time.time()

    response = requests.get(f"https://api.streamelements.com/kappa/v2/speech?voice=Salli&text={text}")

    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    with open(filepath, "wb") as f:
        f.write(response.content)

    background_tasks.add_task(os.remove, filepath)

    logging.info('TTS time: %s %s', time.time() - start_time, 'seconds')
    return filepath
