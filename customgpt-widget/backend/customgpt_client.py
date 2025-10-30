"""
CustomGPT API Client

Handles all communication with CustomGPT Conversations API.
Supports conversation creation, message sending, and streaming responses.
"""

import os
import json
import requests
import httpx
from typing import Optional, Dict, Any, AsyncGenerator
from dotenv import load_dotenv

load_dotenv()

class CustomGPTClient:
    """Client for CustomGPT API interactions"""

    def __init__(self):
        self.base_url = "https://app.customgpt.ai/api/v1"
        self.project_id = os.getenv("CUSTOMGPT_PROJECT_ID")
        self.api_key = os.getenv("CUSTOMGPT_API_KEY")
        self.language = os.getenv("LANGUAGE", "en")

        if not self.project_id:
            raise ValueError("CUSTOMGPT_PROJECT_ID environment variable is required")
        if not self.api_key:
            raise ValueError("CUSTOMGPT_API_KEY environment variable is required")

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for API requests"""
        return {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Bearer {self.api_key}"
        }

    def create_conversation(self) -> Dict[str, Any]:
        """
        Create a new conversation.

        Returns:
            dict: Conversation data with session_id

        Example response:
        {
            "status": "success",
            "data": {
                "id": 1,
                "session_id": "f1b9aaf0-5e4e-11eb-ae93-0242ac130002",
                "project_id": 123,
                "created_at": "2023-04-30 16:43:53"
            }
        }
        """
        url = f"{self.base_url}/projects/{self.project_id}/conversations"

        # CustomGPT API requires a "name" field
        payload = {"name": "Chat Conversation"}

        response = requests.post(url, headers=self._get_headers(), json=payload)
        response.raise_for_status()

        data = response.json()
        if data.get("status") != "success":
            raise Exception(f"Failed to create conversation: {data}")

        return data["data"]

    def send_message(
        self,
        session_id: str,
        user_message: str,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Send a message to a conversation.

        Args:
            session_id: The conversation session ID
            user_message: The user's message text
            stream: Whether to stream the response

        Returns:
            dict: Message response with AI response and citations

        Example response:
        {
            "status": "success",
            "data": {
                "id": 1,
                "user_query": "Hello",
                "openai_response": "Hi! How can I help?",
                "citations": [1, 2],
                "created_at": "2021-01-01 00:00:00"
            }
        }
        """
        url = f"{self.base_url}/projects/{self.project_id}/conversations/{session_id}/messages"

        params = {
            "stream": "true" if stream else "false",
            "lang": self.language
        }

        payload = {
            "prompt": user_message,
            "response_source": "default"
        }

        response = requests.post(
            url,
            headers=self._get_headers(),
            params=params,
            json=payload
        )
        response.raise_for_status()

        data = response.json()
        if data.get("status") != "success":
            raise Exception(f"Failed to send message: {data}")

        return data["data"]

    async def send_message_stream(
        self,
        session_id: str,
        user_message: str
    ) -> AsyncGenerator[str, None]:
        """
        Send a message and stream the response using Server-Sent Events.

        Args:
            session_id: The conversation session ID
            user_message: The user's message text

        Yields:
            str: Chunks of the AI response as they arrive
        """
        url = f"{self.base_url}/projects/{self.project_id}/conversations/{session_id}/messages"

        params = {
            "stream": "true",
            "lang": self.language
        }

        payload = {
            "prompt": user_message,
            "response_source": "default"
        }

        # Using httpx for async streaming
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                url,
                headers=self._get_headers(),
                params=params,
                json=payload
            ) as response:
                response.raise_for_status()

                # Stream the response line by line
                # CustomGPT SSE format:
                # event: progress
                # data: {"status":"progress","message":"Hello"}
                async for line in response.aiter_lines():
                    if line:
                        # SSE format: "data: {json}"
                        if line.startswith('data: '):
                            data_str = line[6:]  # Remove "data: " prefix

                            try:
                                data = json.loads(data_str)

                                # CustomGPT streaming format
                                # Handle progress events with message chunks
                                if data.get('status') == 'progress':
                                    message = data.get('message', '')
                                    if message:
                                        yield message

                                # Handle finish event (end of stream)
                                elif data.get('status') == 'finish':
                                    break

                            except json.JSONDecodeError:
                                # Skip malformed JSON
                                continue

    def get_conversation_messages(self, session_id: str) -> list:
        """
        Get all messages in a conversation.

        Args:
            session_id: The conversation session ID

        Returns:
            list: List of messages in the conversation
        """
        url = f"{self.base_url}/projects/{self.project_id}/conversations/{session_id}/messages"

        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()

        data = response.json()
        if data.get("status") != "success":
            raise Exception(f"Failed to get messages: {data}")

        return data["data"]

    def update_message_reaction(
        self,
        session_id: str,
        message_id: int,
        reaction: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update reaction for a specific message.

        Args:
            session_id: The conversation session ID
            message_id: The message ID (prompt_id)
            reaction: "liked", "disliked", or None to remove reaction

        Returns:
            dict: Updated message data with response_feedback

        Example response:
        {
            "status": "success",
            "data": {
                "id": 1,
                "user_query": "Hello",
                "openai_response": "Hi!",
                "response_feedback": {
                    "created_at": "2024-08-27T21:07:20.000000Z",
                    "updated_at": "2024-08-27T21:07:20.000000Z",
                    "user_id": 1,
                    "reaction": "liked"
                }
            }
        }

        Raises:
            ValueError: If reaction is not "liked", "disliked", or None
            requests.HTTPError: If API request fails
        """
        # Validate reaction value
        if reaction not in ["liked", "disliked", None]:
            raise ValueError(f"Invalid reaction value: {reaction}. Must be 'liked', 'disliked', or None")

        url = f"{self.base_url}/projects/{self.project_id}/conversations/{session_id}/messages/{message_id}/feedback"

        payload = {"reaction": reaction}

        response = requests.put(
            url,
            headers=self._get_headers(),
            json=payload
        )
        response.raise_for_status()

        data = response.json()
        if data.get("status") != "success":
            raise Exception(f"Failed to update reaction: {data}")

        return data["data"]

    def get_citation(self, citation_id: int) -> Dict[str, Any]:
        """
        Fetch citation details by ID.

        Args:
            citation_id: Citation identifier

        Returns:
            dict: Citation data with url, title, description, image

        Raises:
            ValueError: If citation_id is invalid
            Exception: If API request fails
        """
        if not isinstance(citation_id, int) or citation_id <= 0:
            raise ValueError(f"Invalid citation ID: {citation_id}")

        url = f"{self.base_url}/projects/{self.project_id}/citations/{citation_id}"

        response = requests.get(
            url,
            headers=self._get_headers()
        )
        response.raise_for_status()

        data = response.json()
        if data.get("status") != "success":
            raise Exception(f"Failed to fetch citation: {data}")

        return data["data"]
