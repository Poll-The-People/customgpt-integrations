"""
Rate limiting functionality for Rocket Chat CustomGPT Bot
"""
import time
import logging
from typing import Dict, Optional, Tuple
from collections import defaultdict, deque
from threading import Lock

logger = logging.getLogger(__name__)

class RateLimiter:
    """Thread-safe rate limiter with sliding window algorithm"""
    
    def __init__(self, 
                 global_calls: int = 10, 
                 global_period: int = 60,
                 user_calls: int = 5,
                 user_period: int = 60):
        """
        Initialize rate limiter
        
        Args:
            global_calls: Maximum global calls allowed
            global_period: Time period for global limit (seconds)
            user_calls: Maximum calls per user
            user_period: Time period for user limit (seconds)
        """
        self.global_calls = global_calls
        self.global_period = global_period
        self.user_calls = user_calls
        self.user_period = user_period
        
        # Sliding window queues
        self.global_requests: deque = deque()
        self.user_requests: Dict[str, deque] = defaultdict(deque)
        
        # Thread safety
        self.lock = Lock()
        
        # Statistics
        self.stats = {
            'total_requests': 0,
            'blocked_requests': 0,
            'user_blocks': defaultdict(int),
            'last_reset': time.time()
        }
    
    def _clean_old_requests(self, requests: deque, period: int) -> None:
        """Remove requests older than the time period"""
        current_time = time.time()
        cutoff_time = current_time - period
        
        while requests and requests[0] < cutoff_time:
            requests.popleft()
    
    def check_rate_limit(self, user_id: str) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Check if request is within rate limits
        
        Args:
            user_id: User identifier
            
        Returns:
            Tuple of (allowed, error_message, retry_after_seconds)
        """
        with self.lock:
            current_time = time.time()
            
            # Clean old requests
            self._clean_old_requests(self.global_requests, self.global_period)
            self._clean_old_requests(self.user_requests[user_id], self.user_period)
            
            # Check global rate limit
            if len(self.global_requests) >= self.global_calls:
                self.stats['blocked_requests'] += 1
                retry_after = int(self.global_period - (current_time - self.global_requests[0]))
                return False, "Global rate limit exceeded. Please try again later.", retry_after
            
            # Check user rate limit
            if len(self.user_requests[user_id]) >= self.user_calls:
                self.stats['blocked_requests'] += 1
                self.stats['user_blocks'][user_id] += 1
                retry_after = int(self.user_period - (current_time - self.user_requests[user_id][0]))
                return False, f"User rate limit exceeded. Please try again in {retry_after} seconds.", retry_after
            
            # Record the request
            self.global_requests.append(current_time)
            self.user_requests[user_id].append(current_time)
            self.stats['total_requests'] += 1
            
            return True, None, None
    
    def get_remaining_quota(self, user_id: str) -> Dict[str, int]:
        """Get remaining quota for user"""
        with self.lock:
            self._clean_old_requests(self.global_requests, self.global_period)
            self._clean_old_requests(self.user_requests[user_id], self.user_period)
            
            return {
                'global_remaining': max(0, self.global_calls - len(self.global_requests)),
                'user_remaining': max(0, self.user_calls - len(self.user_requests[user_id])),
                'global_reset_in': int(self.global_period),
                'user_reset_in': int(self.user_period)
            }
    
    def reset_user_limit(self, user_id: str) -> None:
        """Reset rate limit for specific user (admin function)"""
        with self.lock:
            self.user_requests[user_id].clear()
            logger.info(f"Rate limit reset for user: {user_id}")
    
    def get_stats(self) -> Dict:
        """Get rate limiter statistics"""
        with self.lock:
            return {
                'total_requests': self.stats['total_requests'],
                'blocked_requests': self.stats['blocked_requests'],
                'block_rate': (self.stats['blocked_requests'] / max(1, self.stats['total_requests'])) * 100,
                'top_blocked_users': sorted(
                    self.stats['user_blocks'].items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:10],
                'uptime_seconds': int(time.time() - self.stats['last_reset'])
            }


class CustomGPTRateLimiter:
    """Rate limiter that also tracks CustomGPT API usage"""
    
    def __init__(self, customgpt_client=None, **kwargs):
        """Initialize with CustomGPT client for API limit checking"""
        self.local_limiter = RateLimiter(**kwargs)
        self.customgpt_client = customgpt_client
        self._api_limits_cache = {
            'data': None,
            'last_check': 0,
            'cache_duration': 300  # 5 minutes
        }
    
    async def check_combined_limits(self, user_id: str) -> Tuple[bool, Optional[str], Optional[int]]:
        """Check both local and API rate limits"""
        # Check local limits first
        local_allowed, local_msg, retry_after = self.local_limiter.check_rate_limit(user_id)
        if not local_allowed:
            return False, local_msg, retry_after
        
        # Check API limits if client is available
        if self.customgpt_client:
            api_allowed, api_msg = await self._check_api_limits()
            if not api_allowed:
                return False, api_msg, None
        
        return True, None, None
    
    async def _check_api_limits(self) -> Tuple[bool, Optional[str]]:
        """Check CustomGPT API limits"""
        try:
            current_time = time.time()
            
            # Use cached data if fresh
            if (self._api_limits_cache['data'] and 
                current_time - self._api_limits_cache['last_check'] < self._api_limits_cache['cache_duration']):
                data = self._api_limits_cache['data']
            else:
                # Fetch fresh data
                limits = await self.customgpt_client.get_usage_limits()
                if limits and limits.get('status') == 'success':
                    data = limits.get('data', {})
                    self._api_limits_cache['data'] = data
                    self._api_limits_cache['last_check'] = current_time
                else:
                    return True, None  # Allow if can't check
            
            # Check query limits
            max_queries = data.get('max_queries', float('inf'))
            current_queries = data.get('current_queries', 0)
            
            if current_queries >= max_queries:
                return False, f"CustomGPT API query limit reached ({current_queries}/{max_queries})"
            
            # Check if close to limit (90% threshold warning)
            if max_queries != float('inf') and current_queries / max_queries >= 0.9:
                remaining = max_queries - current_queries
                logger.warning(f"Approaching CustomGPT API limit: {remaining} queries remaining")
            
            return True, None
            
        except Exception as e:
            logger.error(f"Error checking API limits: {e}")
            return True, None  # Allow on error