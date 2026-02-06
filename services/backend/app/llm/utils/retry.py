"""
Retry utilities with exponential backoff for LLM requests
"""
import asyncio
import time
from typing import TypeVar, Callable, Optional, Type
from functools import wraps
import logging

from ..exceptions import RateLimitError, TimeoutError, ProviderError

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RetryConfig:
    """Configuration for retry behavior"""
    
    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retry_on: tuple[Type[Exception], ...] = (RateLimitError, TimeoutError),
    ):
        """
        Initialize retry configuration
        
        Args:
            max_retries: Maximum number of retry attempts
            initial_delay: Initial delay in seconds
            max_delay: Maximum delay in seconds
            exponential_base: Base for exponential backoff
            jitter: Whether to add random jitter to delay
            retry_on: Tuple of exception types to retry on
        """
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retry_on = retry_on
    
    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for a given attempt"""
        import random
        
        delay = min(
            self.initial_delay * (self.exponential_base ** attempt),
            self.max_delay
        )
        
        if self.jitter:
            # Add ±25% jitter
            delay *= (0.75 + random.random() * 0.5)
        
        return delay


def with_retry(config: Optional[RetryConfig] = None):
    """
    Decorator for retrying async functions with exponential backoff
    
    Example:
        @with_retry(RetryConfig(max_retries=3))
        async def call_llm():
            ...
    """
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(config.max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                
                except config.retry_on as e:
                    last_exception = e
                    
                    if attempt >= config.max_retries:
                        logger.error(
                            f"Max retries ({config.max_retries}) exceeded for {func.__name__}: {e}"
                        )
                        raise
                    
                    delay = config.calculate_delay(attempt)
                    
                    logger.warning(
                        f"Retry {attempt + 1}/{config.max_retries} for {func.__name__} "
                        f"after {delay:.2f}s: {e}"
                    )
                    
                    await asyncio.sleep(delay)
                
                except Exception as e:
                    # Don't retry on other exceptions
                    logger.error(f"Non-retryable error in {func.__name__}: {e}")
                    raise
            
            # Should never reach here, but just in case
            raise last_exception
        
        return wrapper
    return decorator


def with_retry_sync(config: Optional[RetryConfig] = None):
    """
    Decorator for retrying synchronous functions with exponential backoff
    
    Example:
        @with_retry_sync(RetryConfig(max_retries=3))
        def call_llm():
            ...
    """
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(config.max_retries + 1):
                try:
                    return func(*args, **kwargs)
                
                except config.retry_on as e:
                    last_exception = e
                    
                    if attempt >= config.max_retries:
                        logger.error(
                            f"Max retries ({config.max_retries}) exceeded for {func.__name__}: {e}"
                        )
                        raise
                    
                    delay = config.calculate_delay(attempt)
                    
                    logger.warning(
                        f"Retry {attempt + 1}/{config.max_retries} for {func.__name__} "
                        f"after {delay:.2f}s: {e}"
                    )
                    
                    time.sleep(delay)
                
                except Exception as e:
                    # Don't retry on other exceptions
                    logger.error(f"Non-retryable error in {func.__name__}: {e}")
                    raise
            
            # Should never reach here, but just in case
            raise last_exception
        
        return wrapper
    return decorator


async def retry_with_config(
    func: Callable[[], T],
    config: Optional[RetryConfig] = None
) -> T:
    """
    Retry an async function with the given configuration
    
    Args:
        func: Async function to retry
        config: Retry configuration
        
    Returns:
        Result from function
        
    Raises:
        Exception: Last exception if all retries fail
    """
    if config is None:
        config = RetryConfig()
    
    last_exception = None
    
    for attempt in range(config.max_retries + 1):
        try:
            return await func()
        
        except config.retry_on as e:
            last_exception = e
            
            if attempt >= config.max_retries:
                raise
            
            delay = config.calculate_delay(attempt)
            logger.warning(
                f"Retry {attempt + 1}/{config.max_retries} after {delay:.2f}s: {e}"
            )
            await asyncio.sleep(delay)
        
        except Exception as e:
            logger.error(f"Non-retryable error: {e}")
            raise
    
    raise last_exception
