"""
Retry utility with exponential backoff for resilient service calls.
Implements configurable retry logic for STT, AI, and TTS operations.
"""

import asyncio
import logging
import time
from functools import wraps
from typing import Callable, TypeVar, Any, Optional, Tuple

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RetryConfig:
    """Configuration for retry behavior."""

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 10.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        """
        Initialize retry configuration.

        Args:
            max_attempts: Maximum number of retry attempts (including initial attempt)
            base_delay: Base delay in seconds between retries
            max_delay: Maximum delay in seconds (caps exponential growth)
            exponential_base: Base for exponential backoff calculation
            jitter: Whether to add random jitter to delays
        """
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter

    def calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay for given attempt using exponential backoff.

        Args:
            attempt: Current attempt number (0-indexed)

        Returns:
            Delay in seconds
        """
        # Exponential backoff: base_delay * (exponential_base ^ attempt)
        delay = self.base_delay * (self.exponential_base ** attempt)

        # Cap at max_delay
        delay = min(delay, self.max_delay)

        # Add jitter (random 0-25% variation)
        if self.jitter:
            import random
            jitter_amount = delay * 0.25 * random.random()
            delay += jitter_amount

        return delay


# Predefined configurations for different service types
RETRY_CONFIG_STT = RetryConfig(
    max_attempts=3,
    base_delay=1.0,
    max_delay=5.0,
    exponential_base=2.0,
    jitter=True
)

RETRY_CONFIG_AI = RetryConfig(
    max_attempts=3,
    base_delay=2.0,
    max_delay=10.0,
    exponential_base=2.0,
    jitter=True
)

RETRY_CONFIG_TTS = RetryConfig(
    max_attempts=3,
    base_delay=1.0,
    max_delay=5.0,
    exponential_base=2.0,
    jitter=True
)


def should_retry(exception: Exception) -> bool:
    """
    Determine if an exception is retryable.

    Args:
        exception: The exception to check

    Returns:
        True if the exception should trigger a retry
    """
    # Network errors - always retry
    if isinstance(exception, (
        ConnectionError,
        TimeoutError,
        asyncio.TimeoutError,
    )):
        return True

    # Check for specific error messages
    error_msg = str(exception).lower()

    # Retry on these conditions
    retryable_conditions = [
        "timeout",
        "connection",
        "network",
        "503",  # Service Unavailable
        "502",  # Bad Gateway
        "504",  # Gateway Timeout
        "429",  # Rate Limit
        "rate limit",
        "too many requests",
    ]

    for condition in retryable_conditions:
        if condition in error_msg:
            return True

    # Don't retry on these conditions
    non_retryable_conditions = [
        "401",  # Unauthorized (bad API key)
        "403",  # Forbidden
        "404",  # Not Found
        "invalid api key",
        "authentication",
        "authorization",
    ]

    for condition in non_retryable_conditions:
        if condition in error_msg:
            return False

    # Default: retry on 5xx errors
    if "500" in error_msg or "5xx" in error_msg:
        return True

    # Unknown error - don't retry by default
    return False


async def retry_async(
    func: Callable[..., Any],
    *args,
    config: Optional[RetryConfig] = None,
    operation_name: str = "operation",
    **kwargs
) -> Any:
    """
    Retry an async function with exponential backoff.

    Args:
        func: Async function to retry
        *args: Positional arguments for func
        config: Retry configuration (uses default if None)
        operation_name: Name for logging
        **kwargs: Keyword arguments for func

    Returns:
        Result of successful function call

    Raises:
        Last exception if all retries fail
    """
    if config is None:
        config = RetryConfig()

    last_exception = None

    for attempt in range(config.max_attempts):
        try:
            # Log attempt
            if attempt > 0:
                logger.info(f"[RETRY] {operation_name}: Attempt {attempt + 1}/{config.max_attempts}")

            # Execute function
            start_time = time.time()
            result = await func(*args, **kwargs)
            elapsed = time.time() - start_time

            # Log success
            if attempt > 0:
                logger.info(f"[RETRY] {operation_name}: Success after {attempt + 1} attempts ({elapsed:.3f}s)")

            return result

        except Exception as e:
            last_exception = e
            is_last_attempt = (attempt == config.max_attempts - 1)

            # Check if we should retry
            if not should_retry(e):
                logger.error(f"[RETRY] {operation_name}: Non-retryable error: {str(e)}")
                raise

            # Log the failure
            if is_last_attempt:
                logger.error(f"[RETRY] {operation_name}: All {config.max_attempts} attempts failed")
                raise
            else:
                delay = config.calculate_delay(attempt)
                logger.warning(
                    f"[RETRY] {operation_name}: Attempt {attempt + 1} failed: {str(e)[:100]}... "
                    f"Retrying in {delay:.2f}s"
                )
                await asyncio.sleep(delay)

    # Should never reach here, but just in case
    raise last_exception


def retry_sync(
    func: Callable[..., Any],
    *args,
    config: Optional[RetryConfig] = None,
    operation_name: str = "operation",
    **kwargs
) -> Any:
    """
    Retry a sync function with exponential backoff.

    Args:
        func: Sync function to retry
        *args: Positional arguments for func
        config: Retry configuration (uses default if None)
        operation_name: Name for logging
        **kwargs: Keyword arguments for func

    Returns:
        Result of successful function call

    Raises:
        Last exception if all retries fail
    """
    if config is None:
        config = RetryConfig()

    last_exception = None

    for attempt in range(config.max_attempts):
        try:
            # Log attempt
            if attempt > 0:
                logger.info(f"[RETRY] {operation_name}: Attempt {attempt + 1}/{config.max_attempts}")

            # Execute function
            start_time = time.time()
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time

            # Log success
            if attempt > 0:
                logger.info(f"[RETRY] {operation_name}: Success after {attempt + 1} attempts ({elapsed:.3f}s)")

            return result

        except Exception as e:
            last_exception = e
            is_last_attempt = (attempt == config.max_attempts - 1)

            # Check if we should retry
            if not should_retry(e):
                logger.error(f"[RETRY] {operation_name}: Non-retryable error: {str(e)}")
                raise

            # Log the failure
            if is_last_attempt:
                logger.error(f"[RETRY] {operation_name}: All {config.max_attempts} attempts failed")
                raise
            else:
                delay = config.calculate_delay(attempt)
                logger.warning(
                    f"[RETRY] {operation_name}: Attempt {attempt + 1} failed: {str(e)[:100]}... "
                    f"Retrying in {delay:.2f}s"
                )
                time.sleep(delay)

    # Should never reach here, but just in case
    raise last_exception


def with_retry(config: Optional[RetryConfig] = None, operation_name: Optional[str] = None):
    """
    Decorator for adding retry logic to async functions.

    Args:
        config: Retry configuration (uses default if None)
        operation_name: Name for logging (uses function name if None)

    Example:
        @with_retry(config=RETRY_CONFIG_STT, operation_name="transcribe")
        async def transcribe_audio(audio_data):
            # ... implementation ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            name = operation_name or func.__name__
            return await retry_async(func, *args, config=config, operation_name=name, **kwargs)
        return wrapper
    return decorator
