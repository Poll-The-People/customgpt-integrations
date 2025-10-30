"""
Chat API Routes

FastAPI endpoints for chat functionality powered by CustomGPT.
Supports conversation creation, message sending, and streaming responses.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import logging
import time

from customgpt_client import CustomGPTClient
from stt import transcribe
from markdown_processor import preprocess_markdown
from features import get_capabilities

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Initialize CustomGPT client
try:
    customgpt_client = CustomGPTClient()
except ValueError as e:
    logger.error(f"Failed to initialize CustomGPT client: {e}")
    customgpt_client = None


# Request/Response Models
class CreateConversationResponse(BaseModel):
    session_id: str
    project_id: int
    created_at: str


class SendMessageRequest(BaseModel):
    session_id: str
    message: str
    stream: Optional[bool] = False


class SendMessageResponse(BaseModel):
    id: int
    user_query: str
    openai_response: str
    citations: list[int] = []  # Changed from Optional to required with default
    created_at: str

    class Config:
        # Ensure all fields are included in response, even with default values
        json_schema_extra = {
            "example": {
                "id": 123,
                "user_query": "example",
                "openai_response": "example response",
                "citations": [1, 2, 3],
                "created_at": "2025-01-01"
            }
        }


class ResponseFeedback(BaseModel):
    created_at: str
    updated_at: str
    user_id: int
    reaction: Optional[str] = None


class UpdateReactionRequest(BaseModel):
    session_id: str
    reaction: Optional[str] = None  # "liked", "disliked", or null


class UpdateReactionResponse(BaseModel):
    id: int
    user_query: str
    openai_response: str
    citations: list[int] = []  # Changed from Optional to required with default
    created_at: str
    response_feedback: Optional[ResponseFeedback] = None


class CitationDetails(BaseModel):
    id: int
    url: str
    title: str
    description: Optional[str] = None  # Can be None from CustomGPT API
    image: Optional[str] = None


# Endpoints
@router.post("/conversations", response_model=CreateConversationResponse)
async def create_conversation():
    """
    Create a new conversation.

    Returns:
        CreateConversationResponse: Conversation session data
    """
    if not customgpt_client:
        raise HTTPException(status_code=500, detail="CustomGPT client not initialized")

    try:
        data = customgpt_client.create_conversation()
        return CreateConversationResponse(
            session_id=data["session_id"],
            project_id=data["project_id"],
            created_at=data["created_at"]
        )
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages", response_model=SendMessageResponse)
async def send_message(request: SendMessageRequest):
    """
    Send a message to a conversation.

    Args:
        request: SendMessageRequest with session_id, message, and optional stream flag

    Returns:
        SendMessageResponse: AI response with citations
    """
    if not customgpt_client:
        raise HTTPException(status_code=500, detail="CustomGPT client not initialized")

    try:
        # For streaming, use a different endpoint
        if request.stream:
            raise HTTPException(
                status_code=400,
                detail="Use /api/chat/messages/stream for streaming responses"
            )

        ai_start = time.time()
        data = customgpt_client.send_message(
            session_id=request.session_id,
            user_message=request.message,
            stream=False
        )
        ai_time = time.time() - ai_start

        # Extract citations from response
        citations = data.get("citations", [])
        logger.info(f"[TIMING] AI: {ai_time:.3f}s | Response: {data['openai_response'][:100]}...")
        logger.info(f"[CITATIONS] Message ID: {data['id']}, Citations: {citations}, Count: {len(citations)}")

        # Preprocess markdown to fix formatting issues
        response_text = data["openai_response"]
        processed_text = preprocess_markdown(response_text)

        response = SendMessageResponse(
            id=data["id"],
            user_query=data["user_query"],
            openai_response=processed_text,
            citations=citations,
            created_at=data["created_at"]
        )

        # DEBUG: Log the response object
        logger.info(f"[CITATIONS] Returning response: {response.model_dump()}")
        logger.info(f"[CITATIONS] Response citations field: {response.citations}")

        return response
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/stream")
async def send_message_stream(request: SendMessageRequest):
    """
    Send a message and stream the response using Server-Sent Events.

    Args:
        request: SendMessageRequest with session_id and message

    Returns:
        StreamingResponse: SSE stream of AI response chunks
    """
    if not customgpt_client:
        raise HTTPException(status_code=500, detail="CustomGPT client not initialized")

    async def event_generator():
        """Generate Server-Sent Events from CustomGPT stream"""
        try:
            accumulated_text = ""

            async for chunk in customgpt_client.send_message_stream(
                session_id=request.session_id,
                user_message=request.message
            ):
                # Accumulate chunks for markdown processing
                accumulated_text += chunk

                # Send chunk as-is for streaming display
                # We'll process the final accumulated text at the end
                yield f"data: {chunk}\n\n"

            # Process the complete accumulated text
            processed_text = preprocess_markdown(accumulated_text)

            # Send end signal with processed version for final update
            # Frontend can replace accumulated text with this processed version
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: [ERROR: {str(e)}]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/conversations/{session_id}/messages")
async def get_conversation_messages(session_id: str):
    """
    Get all messages in a conversation.

    Args:
        session_id: The conversation session ID

    Returns:
        list: List of messages
    """
    if not customgpt_client:
        raise HTTPException(status_code=500, detail="CustomGPT client not initialized")

    try:
        messages = customgpt_client.get_conversation_messages(session_id)
        return {"status": "success", "data": messages}
    except Exception as e:
        logger.error(f"Failed to get messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio to text using OpenAI Whisper.

    Args:
        audio: Audio file (WAV format recommended)

    Returns:
        dict: Transcription result with text
    """
    # Check if STT capability is available
    caps = get_capabilities()
    if not caps.stt_enabled:
        raise HTTPException(
            status_code=503,
            detail="Speech-to-text is not available. Please configure OPENAI_API_KEY to enable voice features."
        )

    try:
        # Validate audio file
        if not audio.content_type or not audio.content_type.startswith('audio/'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload an audio file."
            )

        # Transcribe audio using existing STT module
        stt_start = time.time()
        transcript = await transcribe(audio)
        stt_time = time.time() - stt_start
        logger.info(f"[TIMING] STT: {stt_time:.3f}s | Transcript: {transcript}")

        if not transcript or not transcript.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not transcribe audio. Please speak clearly and try again."
            )

        return {
            "status": "success",
            "transcript": transcript.strip()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to transcribe audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/messages/{message_id}/feedback", response_model=UpdateReactionResponse)
async def update_message_reaction(message_id: int, request: UpdateReactionRequest):
    """
    Update reaction (like/dislike) for a specific message.

    Args:
        message_id: The CustomGPT message ID (prompt_id)
        request: UpdateReactionRequest with session_id and reaction

    Returns:
        UpdateReactionResponse: Updated message with response_feedback

    Raises:
        400: Invalid reaction value
        404: Message or conversation not found
        500: CustomGPT client error or internal error
    """
    if not customgpt_client:
        raise HTTPException(status_code=500, detail="CustomGPT client not initialized")

    # Validate reaction value
    if request.reaction not in ["liked", "disliked", None]:
        raise HTTPException(
            status_code=400,
            detail="Invalid reaction. Must be 'liked', 'disliked', or null"
        )

    try:
        data = customgpt_client.update_message_reaction(
            session_id=request.session_id,
            message_id=message_id,
            reaction=request.reaction
        )

        # Build response with response_feedback
        response_feedback = None
        if "response_feedback" in data and data["response_feedback"]:
            feedback_data = data["response_feedback"]
            response_feedback = ResponseFeedback(
                created_at=feedback_data["created_at"],
                updated_at=feedback_data["updated_at"],
                user_id=feedback_data["user_id"],
                reaction=feedback_data.get("reaction")
            )

        return UpdateReactionResponse(
            id=data["id"],
            user_query=data["user_query"],
            openai_response=data["openai_response"],
            citations=data.get("citations", []),
            created_at=data["created_at"],
            response_feedback=response_feedback
        )

    except ValueError as e:
        logger.error(f"Validation error updating reaction: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update reaction: {e}")
        # Check if it's a 404 error (message not found)
        if hasattr(e, 'response') and hasattr(e.response, 'status_code'):
            if e.response.status_code == 404:
                raise HTTPException(status_code=404, detail="Message or conversation not found")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/citations/{citation_id}", response_model=CitationDetails)
async def get_citation_details(citation_id: int):
    """
    Fetch Open Graph metadata for a citation.

    Args:
        citation_id: Unique citation identifier

    Returns:
        CitationDetails: Citation metadata including title, description, image

    Raises:
        HTTPException: 400 for invalid ID, 404 for not found, 500 for server errors
    """
    if not customgpt_client:
        raise HTTPException(status_code=500, detail="CustomGPT client not initialized")

    try:
        data = customgpt_client.get_citation(citation_id=citation_id)

        return CitationDetails(
            id=data["id"],
            url=data["url"],
            title=data["title"],
            description=data.get("description"),  # Can be None
            image=data.get("image")
        )

    except ValueError as e:
        logger.error(f"Invalid citation ID: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to fetch citation {citation_id}: {e}")
        # Check if it's a 404 error (citation not found)
        if hasattr(e, 'response') and hasattr(e.response, 'status_code'):
            if e.response.status_code == 404:
                raise HTTPException(status_code=404, detail="Citation not found")
        raise HTTPException(status_code=500, detail=str(e))
