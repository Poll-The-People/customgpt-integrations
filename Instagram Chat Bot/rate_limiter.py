"""
Rate limiting for Instagram CustomGPT Bot
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import json

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from config import Config

logger = logging.getLogger(__name__)

class RateLimiter:
    """Rate limiter with support for Redis and in-memory storage"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.local_storage: Dict[str, Dict] = {}
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
                logger.info("Redis client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Redis: {e}. Using local storage.")
                self.redis_client = None
        else:
            logger.info("Redis not available. Using local storage for rate limiting.")
    
    async def _get_redis_key(self, user_id: str, window_type: str) -> str:
        """Generate Redis key for rate limiting"""
        now = datetime.utcnow()
        if window_type == "minute":
            window = now.strftime("%Y-%m-%d-%H-%M")
        elif window_type == "hour":
            window = now.strftime("%Y-%m-%d-%H")
        else:
            raise ValueError(f"Invalid window_type: {window_type}")
        
        return f"rate_limit:instagram:{user_id}:{window_type}:{window}"
    
    async def _check_redis_limit(self, user_id: str, limit: int, window_type: str) -> Tuple[bool, int, int]:
        """Check rate limit using Redis"""
        if not self.redis_client:
            return await self._check_local_limit(user_id, limit, window_type)
        
        try:
            key = await self._get_redis_key(user_id, window_type)
            
            # Use pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, 3600 if window_type == "hour" else 60)  # TTL in seconds
            pipe.get(key)
            
            results = await pipe.execute()
            current_count = int(results[2]) if results[2] else 0
            
            remaining = max(0, limit - current_count)
            allowed = current_count <= limit
            
            logger.debug(f"Redis rate limit check - User: {user_id}, Window: {window_type}, "
                        f"Count: {current_count}, Limit: {limit}, Allowed: {allowed}")
            
            return allowed, remaining, current_count
            
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}. Falling back to local storage.")
            return await self._check_local_limit(user_id, limit, window_type)
    
    async def _check_local_limit(self, user_id: str, limit: int, window_type: str) -> Tuple[bool, int, int]:
        """Check rate limit using local storage"""
        now = datetime.utcnow()
        
        if window_type == "minute":
            window_start = now.replace(second=0, microsecond=0)
            window_duration = timedelta(minutes=1)
        elif window_type == "hour":
            window_start = now.replace(minute=0, second=0, microsecond=0)
            window_duration = timedelta(hours=1)
        else:
            raise ValueError(f"Invalid window_type: {window_type}")
        
        # Clean old entries
        cutoff_time = now - window_duration * 2  # Keep 2 windows worth of data
        self.local_storage = {
            k: v for k, v in self.local_storage.items()
            if datetime.fromisoformat(v.get('last_updated', '1970-01-01')) > cutoff_time
        }
        
        key = f"{user_id}_{window_type}_{window_start.isoformat()}"
        
        if key not in self.local_storage:
            self.local_storage[key] = {
                'count': 0,
                'window_start': window_start.isoformat(),
                'last_updated': now.isoformat()
            }
        
        # Check if we're still in the same window
        stored_window_start = datetime.fromisoformat(self.local_storage[key]['window_start'])
        if now >= stored_window_start + window_duration:
            # New window, reset count
            self.local_storage[key] = {
                'count': 0,
                'window_start': window_start.isoformat(),
                'last_updated': now.isoformat()
            }
        
        # Increment count
        self.local_storage[key]['count'] += 1
        self.local_storage[key]['last_updated'] = now.isoformat()
        
        current_count = self.local_storage[key]['count']
        remaining = max(0, limit - current_count)
        allowed = current_count <= limit
        
        logger.debug(f"Local rate limit check - User: {user_id}, Window: {window_type}, "
                    f"Count: {current_count}, Limit: {limit}, Allowed: {allowed}")
        
        return allowed, remaining, current_count
    
    async def check_rate_limit(self, user_id: str) -> Dict[str, any]:
        """Check rate limits for a user"""
        try:
            # Check minute limit
            minute_allowed, minute_remaining, minute_count = await self._check_redis_limit(
                user_id, Config.RATE_LIMIT_PER_USER_PER_MINUTE, "minute"
            )
            
            # Check hour limit
            hour_allowed, hour_remaining, hour_count = await self._check_redis_limit(
                user_id, Config.RATE_LIMIT_PER_USER_PER_HOUR, "hour"
            )
            
            overall_allowed = minute_allowed and hour_allowed
            
            # Determine which limit is most restrictive
            if not minute_allowed:
                reset_time = datetime.utcnow().replace(second=0, microsecond=0) + timedelta(minutes=1)
                limit_type = "minute"
                remaining = minute_remaining
            elif not hour_allowed:
                reset_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
                limit_type = "hour"
                remaining = hour_remaining
            else:
                reset_time = datetime.utcnow().replace(second=0, microsecond=0) + timedelta(minutes=1)
                limit_type = "minute"
                remaining = minute_remaining
            
            result = {
                "allowed": overall_allowed,
                "minute": {
                    "allowed": minute_allowed,
                    "remaining": minute_remaining,
                    "count": minute_count,
                    "limit": Config.RATE_LIMIT_PER_USER_PER_MINUTE
                },
                "hour": {
                    "allowed": hour_allowed,
                    "remaining": hour_remaining,
                    "count": hour_count,
                    "limit": Config.RATE_LIMIT_PER_USER_PER_HOUR
                },
                "reset_time": reset_time.isoformat(),
                "limit_type": limit_type
            }
            
            if not overall_allowed:
                logger.warning(f"Rate limit exceeded for user {user_id}: {result}")
            
            return result
            
        except Exception as e:
            logger.error(f"Rate limit check failed for user {user_id}: {e}")
            # Fail open - allow the request if rate limiting fails
            return {
                "allowed": True,
                "error": str(e),
                "minute": {"allowed": True, "remaining": 999, "count": 0},
                "hour": {"allowed": True, "remaining": 999, "count": 0}
            }
    
    async def reset_limits(self, user_id: str) -> bool:
        """Reset rate limits for a user (admin function)"""
        try:
            if self.redis_client:
                # Delete all rate limit keys for the user
                pattern = f"rate_limit:instagram:{user_id}:*"
                keys = []
                async for key in self.redis_client.scan_iter(match=pattern):
                    keys.append(key)
                
                if keys:
                    await self.redis_client.delete(*keys)
                    logger.info(f"Reset Redis rate limits for user {user_id}")
            
            # Clean local storage
            keys_to_remove = [k for k in self.local_storage.keys() if k.startswith(f"{user_id}_")]
            for key in keys_to_remove:
                del self.local_storage[key]
            
            logger.info(f"Reset local rate limits for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reset rate limits for user {user_id}: {e}")
            return False
    
    async def get_stats(self) -> Dict[str, any]:
        """Get rate limiting statistics"""
        stats = {
            "storage_type": "redis" if self.redis_client else "local",
            "local_entries": len(self.local_storage),
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