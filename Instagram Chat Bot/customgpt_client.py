"""
CustomGPT API Client for Instagram Bot
"""

import aiohttp
import asyncio
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from config import Config

logger = logging.getLogger(__name__)

class CustomGPTClient:
    """Client for interacting with CustomGPT API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = Config.CUSTOMGPT_API_BASE_URL
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                headers=self.headers
            )
        return self._session
    
    async def close(self):
        """Close the aiohttp session"""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def list_agents(self, page: int = 1) -> Dict[str, Any]:
        """List all available agents"""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/projects"
            params = {'page': page, 'order': 'desc', 'orderBy': 'id'}
            
            logger.info(f"Listing agents - page: {page}")
            
            async with session.get(url, params=params) as response:
                data = await response.json()
                
                if response.status == 200:
                    logger.info(f"Successfully listed agents - found {len(data.get('data', {}).get('data', []))} agents")
                    return data
                else:
                    logger.error(f"Failed to list agents: {response.status} - {data}")
                    return {"error": f"API returned {response.status}"}
                    
        except Exception as e:
            logger.error(f"Exception in list_agents: {str(e)}")
            return {"error": str(e)}
    
    async def get_agent_by_id(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get agent information by ID"""
        try:
            agents_response = await self.list_agents()
            if "error" in agents_response:
                return None
            
            agents = agents_response.get('data', {}).get('data', [])
            for agent in agents:
                if str(agent.get('id')) == str(agent_id):
                    return agent
            
            return None
                    
        except Exception as e:
            logger.error(f"Exception in get_agent_by_id: {str(e)}")
            return None
    
    async def create_conversation(self, agent_id: str) -> Optional[str]:
        """Create a new conversation and return session_id"""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/projects/{agent_id}/conversations"
            
            logger.info(f"Creating conversation for agent: {agent_id}")
            
            async with session.post(url) as response:
                data = await response.json()
                
                if response.status == 201:
                    session_id = data.get('data', {}).get('session_id')
                    logger.info(f"Created conversation with session_id: {session_id}")
                    return session_id
                else:
                    logger.error(f"Failed to create conversation: {response.status} - {data}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception in create_conversation: {str(e)}")
            return None
    
    async def send_message(
        self, 
        agent_id: str, 
        session_id: str, 
        message: str, 
        stream: bool = False,
        user_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send a message to CustomGPT and get response"""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/projects/{agent_id}/conversations/{session_id}/messages"
            
            # Prepare request payload
            payload = {
                "prompt": message,
                "response_source": "default"
            }
            
            if user_metadata:
                payload["metadata"] = user_metadata
            
            params = {
                "stream": "true" if stream else "false",
                "lang": "en"
            }
            
            logger.info(f"Sending message to agent {agent_id}, session {session_id}")
            
            async with session.post(url, json=payload, params=params) as response:
                
                if stream:
                    # Handle streaming response
                    full_response = ""
                    async for line in response.content:
                        if line:
                            line_str = line.decode('utf-8').strip()
                            if line_str.startswith('data: '):
                                try:
                                    json_data = json.loads(line_str[6:])  # Remove 'data: ' prefix
                                    if 'choices' in json_data and json_data['choices']:
                                        delta = json_data['choices'][0].get('delta', {})
                                        if 'content' in delta:
                                            full_response += delta['content']
                                except json.JSONDecodeError:
                                    continue
                    
                    return {
                        "response": full_response,
                        "citations": [],
                        "message_id": None
                    }
                else:
                    # Handle regular response
                    data = await response.json()
                    
                    if response.status == 200:
                        message_data = data.get('data', {})
                        return {
                            "response": message_data.get('openai_response', ''),
                            "citations": message_data.get('citations', []),
                            "message_id": message_data.get('id')
                        }
                    else:
                        logger.error(f"Failed to send message: {response.status} - {data}")
                        error_message = data.get('data', {}).get('message', f'API returned {response.status}')
                        return {"error": error_message}
                        
        except Exception as e:
            logger.error(f"Exception in send_message: {str(e)}")
            return {"error": str(e)}
    
    async def get_conversation_messages(self, agent_id: str, session_id: str, page: int = 1) -> Dict[str, Any]:
        """Get messages from a conversation"""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/projects/{agent_id}/conversations/{session_id}/messages"
            params = {'page': page, 'order': 'desc'}
            
            async with session.get(url, params=params) as response:
                data = await response.json()
                
                if response.status == 200:
                    return data
                else:
                    logger.error(f"Failed to get conversation messages: {response.status} - {data}")
                    return {"error": f"API returned {response.status}"}
                    
        except Exception as e:
            logger.error(f"Exception in get_conversation_messages: {str(e)}")
            return {"error": str(e)}
    
    async def get_usage_limits(self) -> Dict[str, Any]:
        """Get user's current usage and limits"""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/limits/usage"
            
            async with session.get(url) as response:
                data = await response.json()
                
                if response.status == 200:
                    return data.get('data', {})
                else:
                    logger.error(f"Failed to get usage limits: {response.status} - {data}")
                    return {"error": f"API returned {response.status}"}
                    
        except Exception as e:
            logger.error(f"Exception in get_usage_limits: {str(e)}")
            return {"error": str(e)}
    
    async def send_feedback(self, agent_id: str, session_id: str, message_id: str, reaction: str) -> bool:
        """Send feedback for a message (liked/disliked)"""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/projects/{agent_id}/conversations/{session_id}/messages/{message_id}/feedback"
            
            payload = {"reaction": reaction}
            
            async with session.put(url, json=payload) as response:
                
                if response.status == 200:
                    logger.info(f"Feedback sent successfully: {reaction}")
                    return True
                else:
                    data = await response.json()
                    logger.error(f"Failed to send feedback: {response.status} - {data}")
                    return False
                    
        except Exception as e:
            logger.error(f"Exception in send_feedback: {str(e)}")
            return False