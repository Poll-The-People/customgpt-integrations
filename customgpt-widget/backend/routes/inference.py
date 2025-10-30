"""
Production-grade unified inference endpoint: STT → AI → TTS pipeline

SAFETY FEATURES:
- Memory leak prevention with proper cleanup
- Comprehensive error handling with graceful degradation
- Request size limits and validation  
- Timeout protection for each pipeline stage
- Resource cleanup in all error paths
- Proper async context management
"""

import logging
import time
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, Header, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Optional
import base64
import json

router = APIRouter()
logger = logging.getLogger(__name__)

# Configuration constants
MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB max audio file
MAX_CONVERSATION_LENGTH = 10  # Keep last 10 messages
STT_TIMEOUT = 30  # seconds
AI_TIMEOUT = 60  # seconds
TTS_TIMEOUT = 120  # seconds


# Helper class to wrap bytes as file-like object
class BytesFile:
    """Wrapper to make bytes compatible with transcribe() function"""
    def __init__(self, data: bytes):
        self._data = data
    
    async def read(self):
        return self._data


@router.post("/inference")
async def unified_inference(
    audio: UploadFile = File(...),
    conversation: Optional[str] = Header(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
) -> StreamingResponse:
    """
    Production-grade unified endpoint: Audio → Transcript → AI Response → Audio Stream

    Safety features:
    - Input validation and size limits
    - Timeouts for each stage
    - Memory cleanup
    - Error handling with fallbacks
    - Proper resource management
    """

    total_start = time.time()
    audio_data = None
    streaming_response = None

    try:
        # ==================== STEP 0: VALIDATION ====================
        # Validate file type
        if not audio.content_type or 'audio' not in audio.content_type:
            raise HTTPException(status_code=400, detail="Invalid audio file type")

        # Read audio data with size limit
        audio_data = await audio.read()

        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")

        if len(audio_data) > MAX_AUDIO_SIZE:
            raise HTTPException(status_code=413, detail=f"Audio file too large (max {MAX_AUDIO_SIZE} bytes)")

        logger.info(f"[INFERENCE] Processing audio ({len(audio_data)} bytes)")

        # ==================== STEP 1: SPEECH-TO-TEXT ====================
        stt_start = time.time()

        try:
            # Import here to avoid circular dependencies
            from stt import transcribe
            
            # Wrap bytes in file-like object for transcribe() function
            audio_file = BytesFile(audio_data)

            # Run STT with timeout protection
            transcript = await asyncio.wait_for(
                transcribe(audio_file),
                timeout=STT_TIMEOUT
            )

            stt_time = time.time() - stt_start
            logger.info(f"[INFERENCE] ✅ STT complete: {stt_time:.3f}s | Transcript: {transcript[:100]}...")

        except asyncio.TimeoutError:
            logger.error(f"[INFERENCE] ❌ STT timeout after {STT_TIMEOUT}s")
            raise HTTPException(status_code=504, detail="Speech recognition timed out")
        except Exception as e:
            logger.error(f"[INFERENCE] ❌ STT failed: {str(e)[:200]}")
            raise HTTPException(status_code=500, detail=f"Speech recognition failed: {str(e)[:100]}")
        finally:
            # Clear audio data from memory
            del audio_data
            audio_data = None

        # Validate transcript
        if not transcript or not transcript.strip():
            raise HTTPException(status_code=400, detail="Could not transcribe audio - please speak clearly")

        # Truncate overly long transcripts (likely errors)
        if len(transcript) > 1000:
            logger.warning(f"[INFERENCE] Transcript unusually long ({len(transcript)} chars), truncating")
            transcript = transcript[:1000]

        # ==================== STEP 2: AI COMPLETION ====================
        ai_start = time.time()

        try:
            # Parse conversation history with error handling
            messages = []
            if conversation:
                try:
                    conversation_data = base64.b64decode(conversation).decode('utf-8')
                    messages = json.loads(conversation_data)

                    # Validate message structure
                    if not isinstance(messages, list):
                        logger.warning("[INFERENCE] Invalid conversation format, resetting")
                        messages = []

                    # Limit conversation length to prevent memory issues
                    if len(messages) > MAX_CONVERSATION_LENGTH:
                        messages = messages[-MAX_CONVERSATION_LENGTH:]

                except (base64.binascii.Error, json.JSONDecodeError, UnicodeDecodeError) as e:
                    logger.warning(f"[INFERENCE] Failed to parse conversation: {e}")
                    messages = []

            # Import and call AI completion with timeout
            from ai import get_completion

            # Encode messages for get_completion (it expects base64-encoded conversation)
            if messages:
                messages_b64 = base64.b64encode(
                    json.dumps(messages).encode('utf-8')
                ).decode('utf-8')
            else:
                messages_b64 = None

            ai_response = await asyncio.wait_for(
                get_completion(transcript, messages_b64),
                timeout=AI_TIMEOUT
            )

            ai_time = time.time() - ai_start
            logger.info(f"[INFERENCE] ✅ AI complete: {ai_time:.3f}s | Response: {ai_response[:100]}...")

        except asyncio.TimeoutError:
            logger.error(f"[INFERENCE] ❌ AI timeout after {AI_TIMEOUT}s")
            raise HTTPException(status_code=504, detail="AI response timed out")
        except Exception as e:
            logger.error(f"[INFERENCE] ❌ AI failed: {str(e)[:200]}")
            raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)[:100]}")

        # Validate AI response
        if not ai_response or not ai_response.strip():
            raise HTTPException(status_code=500, detail="AI returned empty response")

        # Truncate overly long responses
        if len(ai_response) > 5000:
            logger.warning(f"[INFERENCE] AI response very long ({len(ai_response)} chars), truncating")
            ai_response = ai_response[:5000] + "..."

        # ==================== STEP 3: TEXT-TO-SPEECH ====================
        tts_start = time.time()

        try:
            # Import TTS components
            from routes.tts import TTSRequest, text_to_speech

            # Create TTS request
            tts_request = TTSRequest(text=ai_response)

            # Get streaming response with timeout
            streaming_response = await asyncio.wait_for(
                text_to_speech(tts_request, background_tasks),
                timeout=TTS_TIMEOUT
            )

            tts_time = time.time() - tts_start
            logger.info(f"[INFERENCE] ✅ TTS initiated: {tts_time:.3f}s")

        except asyncio.TimeoutError:
            logger.error(f"[INFERENCE] ❌ TTS timeout after {TTS_TIMEOUT}s")
            raise HTTPException(status_code=504, detail="Text-to-speech timed out")
        except Exception as e:
            logger.error(f"[INFERENCE] ❌ TTS failed: {str(e)[:200]}")
            raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)[:100]}")

        # ==================== STEP 4: BUILD RESPONSE ====================
        # Update conversation history
        messages.append({"role": "user", "content": transcript})
        messages.append({"role": "assistant", "content": ai_response})

        # Keep only last N messages to prevent memory growth
        if len(messages) > MAX_CONVERSATION_LENGTH:
            messages = messages[-MAX_CONVERSATION_LENGTH:]

        # Encode safely with error handling
        try:
            # Return last 2 messages (current turn only) to frontend
            last_turn = messages[-2:] if len(messages) >= 2 else messages
            conversation_json = json.dumps(last_turn)
            conversation_header = base64.b64encode(
                conversation_json.encode('utf-8')
            ).decode('utf-8')
        except Exception as e:
            logger.warning(f"[INFERENCE] Failed to encode conversation: {e}")
            conversation_header = base64.b64encode(b'[]').decode('utf-8')

        # Encode AI response safely
        try:
            ai_response_b64 = base64.b64encode(ai_response.encode('utf-8')).decode('utf-8')
        except Exception as e:
            logger.warning(f"[INFERENCE] Failed to encode AI response: {e}")
            ai_response_b64 = ""

        # Build response headers
        # Encode Unicode text to base64 for HTTP headers (headers must be ASCII)
        try:
            transcript_b64 = base64.b64encode(transcript[:500].encode('utf-8')).decode('ascii')
        except Exception as e:
            logger.warning(f"[INFERENCE] Failed to encode transcript: {e}")
            transcript_b64 = ""

        headers = {
            "X-STT-Time": f"{stt_time:.3f}",
            "X-AI-Time": f"{ai_time:.3f}",
            "X-Transcript": transcript_b64,  # Base64-encoded for Unicode support
            "X-AI-Response": ai_response_b64[:2000],  # Limit header size
            "X-Conversation": conversation_header,
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }

        pipeline_time = time.time() - total_start
        logger.info(f"[INFERENCE] ✅ Pipeline complete: {pipeline_time:.3f}s (STT: {stt_time:.3f}s, AI: {ai_time:.3f}s)")

        # Return streaming response
        return StreamingResponse(
            streaming_response.body_iterator,
            media_type="audio/mpeg",
            headers=headers
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise

    except Exception as e:
        # Catch-all for unexpected errors
        logger.error(f"[INFERENCE] ❌ Unexpected error: {str(e)[:200]}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        # Cleanup: ensure audio data is freed
        if audio_data is not None:
            del audio_data
