"""
CustomGPT API client for Rocket Chat Bot
"""
import aiohttp
import asyncio
import logging
import json
from typing import Dict, Optional, List, AsyncGenerator
from config import Config

logger = logging.getLogger(__name__)

class CustomGPTClient:
    """Async client for CustomGPT API with streaming support"""
    
    def __init__(self):
        """Initialize CustomGPT client"""
        self.api_key = Config.CUSTOMGPT_API_KEY
        self.project_id = Config.CUSTOMGPT_PROJECT_ID
        self.base_url = Config.CUSTOMGPT_BASE_URL.rstrip('/')
        self.timeout = Config.CUSTOMGPT_API_TIMEOUT
        
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        # Session management
        self._session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        self._session = aiohttp.ClientSession(
            headers=self.headers,
            timeout=aiohttp.ClientTimeout(total=self.timeout)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self._session:
            await self._session.close()
    
    def _get_session(self) -> aiohttp.ClientSession:
        """Get or create session"""
        if not self._session:
            self._session = aiohttp.ClientSession(
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
        return self._session
    
    async def send_message(self, 
                          message: str, 
                          session_id: Optional[str] = None,
                          language: str = 'en',
                          stream: bool = False,
                          with_citations: bool = True) -> Dict:
        """
        Send message to CustomGPT using OpenAI-compatible endpoint
        
        Args:
            message: User message
            session_id: Conversation session ID
            language: Response language
            stream: Enable streaming response
            with_citations: Include citations in response
            
        Returns:
            API response dictionary
        """
        endpoint = f"{self.base_url}/api/v1/projects/{self.project_id}/chat/completions"
        
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": message
                }
            ],
            "stream": stream,
            "lang": language,
            "is_inline_citation": with_citations
        }
        
        # Add session ID to maintain conversation context
        if session_id:
            payload["session_id"] = session_id
        
        try:
            session = self._get_session()
            
            if stream:
                return await self._handle_streaming_response(session, endpoint, payload)
            else:
                async with session.post(endpoint, json=payload) as response:
                    if response.status == 429:
                        error_data = await response.json()
                        raise RateLimitError(error_data.get('message', 'Rate limit exceeded'))
                    
                    response.raise_for_status()
                    data = await response.json()
                    
                    # Extract response from OpenAI format
                    if 'choices' in data and data['choices']:
                        content = data['choices'][0]['message']['content']
                        citations = data.get('citations', [])
                        
                        return {
                            'status': 'success',
                            'response': content,
                            'citations': citations,
                            'message_id': data.get('id'),
                            'session_id': session_id
                        }
                    else:
                        raise ValueError("Invalid response format")
                        
        except aiohttp.ClientError as e:
            logger.error(f"API request failed: {e}")
            return {
                'status': 'error',
                'error': f'API request failed: {str(e)}'
            }
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {
                'status': 'error',
                'error': f'Unexpected error: {str(e)}'
            }
    
    async def _handle_streaming_response(self, session: aiohttp.ClientSession, 
                                       endpoint: str, payload: Dict) -> AsyncGenerator:
        """Handle streaming response from API"""
        try:
            async with session.post(endpoint, json=payload) as response:
                response.raise_for_status()
                
                buffer = ""
                async for line in response.content:
                    if line:
                        line_text = line.decode('utf-8').strip()
                        if line_text.startswith('data: '):
                            data_str = line_text[6:]
                            if data_str == '[DONE]':
                                break
                            
                            try:
                                data = json.loads(data_str)
                                if 'choices' in data and data['choices']:
                                    delta = data['choices'][0].get('delta', {})
                                    if 'content' in delta:
                                        yield {
                                            'status': 'streaming',
                                            'content': delta['content']
                                        }
                            except json.JSONDecodeError:
                                continue
                
                # Send final message with citations if available
                yield {
                    'status': 'complete',
                    'citations': []  # Citations would be in final message
                }
                
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield {
                'status': 'error',
                'error': str(e)
            }
    
    async def get_usage_limits(self) -> Dict:
        """Get current usage and limits"""
        endpoint = f"{self.base_url}/api/v1/limits/usage"
        
        try:
            session = self._get_session()
            async with session.get(endpoint) as response:
                response.raise_for_status()
                return await response.json()
        except Exception as e:
            logger.error(f"Failed to get usage limits: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def get_agent_info(self) -> Dict:
        """Get agent/project information"""
        endpoint = f"{self.base_url}/api/v1/projects/{self.project_id}"
        
        try:
            session = self._get_session()
            async with session.get(endpoint) as response:
                response.raise_for_status()
                return await response.json()
        except Exception as e:
            logger.error(f"Failed to get agent info: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def create_conversation(self, name: Optional[str] = None) -> Dict:
        """Create a new conversation session"""
        endpoint = f"{self.base_url}/api/v1/projects/{self.project_id}/conversations"
        
        payload = {}
        if name:
            payload['name'] = name
        
        try:
            session = self._get_session()
            async with session.post(endpoint, json=payload) as response:
                response.raise_for_status()
                data = await response.json()
                return {
                    'status': 'success',
                    'session_id': data.get('data', {}).get('id')
                }
        except Exception as e:
            logger.error(f"Failed to create conversation: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def close(self):
        """Close the client session"""
        if self._session:
            await self._session.close()
            self._session = None


class RateLimitError(Exception):
    """Custom exception for rate limit errors"""
    pass