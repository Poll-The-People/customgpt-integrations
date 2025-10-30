import logging
import os
import requests
from fastapi import APIRouter, HTTPException
from features import get_capabilities

router = APIRouter()
logger = logging.getLogger(__name__)

CUSTOMGPT_PROJECT_ID = os.getenv("CUSTOMGPT_PROJECT_ID")
CUSTOMGPT_API_KEY = os.getenv("CUSTOMGPT_API_KEY")
USE_CUSTOMGPT = os.getenv("USE_CUSTOMGPT", "false").lower() == "true"


@router.get("/api/agent/settings")
async def get_agent_settings():
    """
    Fetch agent settings from CustomGPT API.

    Returns:
        dict: Agent settings including avatar URL and title
    """
    # If CustomGPT is not enabled, return default settings
    if not USE_CUSTOMGPT:
        return {
            "chatbot_avatar": None,
            "chatbot_title": "AI Assistant",
            "user_name": "You",
            "example_questions": []
        }

    # Validate required environment variables
    if not CUSTOMGPT_PROJECT_ID or not CUSTOMGPT_API_KEY:
        logger.error("CustomGPT credentials not configured")
        raise HTTPException(
            status_code=500,
            detail="CustomGPT credentials not configured"
        )

    try:
        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {CUSTOMGPT_API_KEY}"
        }

        # Fetch agent/project details to get project_name
        project_url = f"https://app.customgpt.ai/api/v1/projects/{CUSTOMGPT_PROJECT_ID}"
        logger.info(f"Fetching agent details from CustomGPT API")
        project_response = requests.get(project_url, headers=headers, timeout=10)

        project_name = "AI Assistant"  # Default fallback
        if project_response.status_code == 200:
            project_data = project_response.json()
            if project_data.get("status") == "success" and "data" in project_data:
                project_name = project_data["data"].get("project_name", "AI Assistant")
                logger.info(f"Got project name: {project_name}")

        # Fetch agent settings to get chatbot_avatar and chatbot_title
        settings_url = f"https://app.customgpt.ai/api/v1/projects/{CUSTOMGPT_PROJECT_ID}/settings"
        logger.info(f"Fetching agent settings from CustomGPT API")
        settings_response = requests.get(settings_url, headers=headers, timeout=10)

        if settings_response.status_code == 200:
            data = settings_response.json()

            # Extract relevant settings
            if data.get("status") == "success" and "data" in data:
                settings = data["data"]
                # Use chatbot_title if set, otherwise fall back to project_name
                title = settings.get("chatbot_title") or project_name

                # Get example questions from settings, or use default suggestions
                example_questions = settings.get("example_questions", [])
                logger.info(f"Raw example_questions from API: {example_questions}")
                logger.info(f"Type: {type(example_questions)}, Length: {len(example_questions) if isinstance(example_questions, list) else 'N/A'}")

                # Provide default suggestions if none configured
                if not example_questions:
                    example_questions = [
                        "What can you help me with?",
                        "How do I get started?",
                        "What information do you have access to?",
                        "Can you search my files?"
                    ]

                return {
                    "chatbot_avatar": settings.get("chatbot_avatar"),
                    "chatbot_title": title,
                    "user_name": "You",  # Default user name
                    "example_questions": example_questions
                }
            else:
                logger.error(f"Unexpected API response format: {data}")
                raise HTTPException(
                    status_code=500,
                    detail="Unexpected API response format"
                )
        else:
            logger.error(f"CustomGPT API error: {settings_response.status_code} - {settings_response.text}")
            raise HTTPException(
                status_code=settings_response.status_code,
                detail=f"CustomGPT API error: {settings_response.text}"
            )

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch agent settings: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch agent settings: {str(e)}"
        )


@router.get("/api/agent/capabilities")
async def get_system_capabilities():
    """
    Get system capabilities and feature availability.

    Returns:
        Dict with feature flags and provider information
    """
    try:
        caps = get_capabilities()
        return {
            "status": "success",
            "data": caps.to_dict()
        }
    except Exception as e:
        logger.error(f"Failed to get system capabilities: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get system capabilities: {str(e)}"
        )
