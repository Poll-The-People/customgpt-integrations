"""
Conversation management for Instagram CustomGPT Bot
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
import json

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from config import Config

logger = logging.getLogger(__name__)

class ConversationManager:
    """Manages conversation sessions and agent assignments for Instagram users"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.local_storage: Dict[str, Dict] = {}
        self.session_ttl = 24 * 60 * 60  # 24 hours in seconds
        self._initialize_redis()
    
    def _initialize_redis(self):
        """Initialize Redis connection if available"""
        if REDIS_AVAILABLE and Config.REDIS_URL:
            try:
                self.redis_client = redis.from_url(
                    Config.REDIS_URL,
                    decode_responses=True,
                    health_check_interval=30
                )
                logger.info("ConversationManager: Redis client initialized")
            except Exception as e:
                logger.warning(f"ConversationManager: Failed to initialize Redis: {e}")
                self.redis_client = None
        else:
            logger.info("ConversationManager: Using local storage")
    
    def _get_user_key(self, user_id: str) -> str:
        """Generate Redis key for user data"""
        return f"instagram_user:{user_id}"
    
    def _get_session_key(self, user_id: str) -> str:
        """Generate Redis key for user session"""
        return f"instagram_session:{user_id}"
    
    async def set_user_agent(self, user_id: str, agent_id: str) -> bool:
        """Set the active agent for a user"""
        try:
            user_data = {
                "agent_id": agent_id,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if self.redis_client:
                await self.redis_client.hset(
                    self._get_user_key(user_id),
                    mapping=user_data
                )
                await self.redis_client.expire(self._get_user_key(user_id), self.session_ttl)
                logger.info(f"Set agent {agent_id} for user {user_id} in Redis")
            else:
                self.local_storage[f"user:{user_id}"] = user_data
                logger.info(f"Set agent {agent_id} for user {user_id} in local storage")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to set user agent: {e}")
            return False
    
    async def get_user_agent(self, user_id: str) -> Optional[str]:
        """Get the active agent ID for a user"""
        try:
            if self.redis_client:
                data = await self.redis_client.hgetall(self._get_user_key(user_id))
                if data:
                    return data.get("agent_id")
            else:
                data = self.local_storage.get(f"user:{user_id}")
                if data:
                    # Check if data is still valid (within session TTL)
                    updated_at = datetime.fromisoformat(data["updated_at"])
                    if datetime.utcnow() - updated_at < timedelta(seconds=self.session_ttl):
                        return data.get("agent_id")
                    else:
                        # Clean expired data
                        del self.local_storage[f"user:{user_id}"]
            
            # Return default agent if configured
            return Config.DEFAULT_AGENT_ID
            
        except Exception as e:
            logger.error(f"Failed to get user agent: {e}")
            return Config.DEFAULT_AGENT_ID
    
    async def set_user_session(self, user_id: str, agent_id: str, session_id: str) -> bool:
        """Set the current conversation session for a user"""
        try:
            session_data = {
                "session_id": session_id,
                "agent_id": agent_id,
                "created_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat()
            }
            
            if self.redis_client:
                await self.redis_client.hset(
                    self._get_session_key(user_id),
                    mapping=session_data
                )
                await self.redis_client.expire(self._get_session_key(user_id), self.session_ttl)
                logger.info(f"Set session {session_id} for user {user_id} in Redis")
            else:
                self.local_storage[f"session:{user_id}"] = session_data
                logger.info(f"Set session {session_id} for user {user_id} in local storage")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to set user session: {e}")
            return False
    
    async def get_user_session(self, user_id: str, agent_id: str) -> Optional[str]:
        """Get the current conversation session for a user and agent"""
        try:
            if self.redis_client:
                data = await self.redis_client.hgetall(self._get_session_key(user_id))
                if data and data.get("agent_id") == agent_id:
                    # Update last activity
                    await self.redis_client.hset(
                        self._get_session_key(user_id),
                        "last_activity",
                        datetime.utcnow().isoformat()
                    )
                    return data.get("session_id")
            else:
                data = self.local_storage.get(f"session:{user_id}")
                if data and data.get("agent_id") == agent_id:
                    # Check if session is still valid
                    created_at = datetime.fromisoformat(data["created_at"])
                    if datetime.utcnow() - created_at < timedelta(seconds=self.session_ttl):
                        # Update last activity
                        data["last_activity"] = datetime.utcnow().isoformat()
                        return data.get("session_id")
                    else:
                        # Clean expired session
                        del self.local_storage[f"session:{user_id}"]
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user session: {e}")
            return None
    
    async def clear_user_session(self, user_id: str) -> bool:
        """Clear the current session for a user"""
        try:
            if self.redis_client:
                await self.redis_client.delete(self._get_session_key(user_id))
                logger.info(f"Cleared session for user {user_id} in Redis")
            else:
                if f"session:{user_id}" in self.local_storage:
                    del self.local_storage[f"session:{user_id}"]
                    logger.info(f"Cleared session for user {user_id} in local storage")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear user session: {e}")
            return False
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics and session info"""
        try:
            stats = {
                "user_id": user_id,
                "has_agent": False,
                "has_session": False,
                "agent_id": None,
                "session_id": None,
                "last_activity": None
            }
            
            # Get agent info
            agent_id = await self.get_user_agent(user_id)
            if agent_id:
                stats["has_agent"] = True
                stats["agent_id"] = agent_id
            
            # Get session info
            if self.redis_client:
                session_data = await self.redis_client.hgetall(self._get_session_key(user_id))
                if session_data:
                    stats["has_session"] = True
                    stats["session_id"] = session_data.get("session_id")
                    stats["last_activity"] = session_data.get("last_activity")
            else:
                session_data = self.local_storage.get(f"session:{user_id}")
                if session_data:
                    # Check if session is still valid
                    created_at = datetime.fromisoformat(session_data["created_at"])
                    if datetime.utcnow() - created_at < timedelta(seconds=self.session_ttl):
                        stats["has_session"] = True
                        stats["session_id"] = session_data.get("session_id")
                        stats["last_activity"] = session_data.get("last_activity")
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get user stats: {e}")
            return {"error": str(e)}
    
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions from local storage"""
        if self.redis_client:
            # Redis handles TTL automatically
            return 0
        
        try:
            expired_count = 0
            now = datetime.utcnow()
            keys_to_remove = []
            
            for key, data in self.local_storage.items():
                if key.startswith("session:") or key.startswith("user:"):
                    if "created_at" in data:
                        created_at = datetime.fromisoformat(data["created_at"])
                        if now - created_at >= timedelta(seconds=self.session_ttl):
                            keys_to_remove.append(key)
                            expired_count += 1
                    elif "updated_at" in data:
                        updated_at = datetime.fromisoformat(data["updated_at"])
                        if now - updated_at >= timedelta(seconds=self.session_ttl):
                            keys_to_remove.append(key)
                            expired_count += 1
            
            for key in keys_to_remove:
                del self.local_storage[key]
            
            if expired_count > 0:
                logger.info(f"Cleaned up {expired_count} expired sessions")
            
            return expired_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get conversation manager statistics"""
        stats = {
            "storage_type": "redis" if self.redis_client else "local",
            "local_entries": len(self.local_storage),
            "session_ttl_hours": self.session_ttl / 3600
        }
        
        if self.redis_client:
            try:
                info = await self.redis_client.info()
                stats["redis_connected"] = True
                stats["redis_used_memory"] = info.get("used_memory_human", "unknown")
            except Exception as e:
                stats["redis_connected"] = False
                stats["redis_error"] = str(e)
        
        return stats