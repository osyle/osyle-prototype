"""
Enhanced base provider interface for LLM services
Defines comprehensive contract for all provider implementations
"""
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional, Dict, Any
from ..types import (
    GenerationConfig, GenerationResponse, Message, 
    UserMessage, Usage, Provider
)
from ..exceptions import ProviderError


class BaseLLMProvider(ABC):
    """
    Abstract base class for LLM providers
    
    All providers must implement:
    - Basic generation (streaming and non-streaming)
    - Prompt caching (provider-specific)
    - Structured outputs (when supported)
    - Tool use (when supported)
    - Vision capabilities (when supported)
    - Cost calculation
    """
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize provider with API credentials
        
        Args:
            api_key: API key for the provider
            base_url: Optional custom base URL
        """
        self.api_key = api_key
        self.base_url = base_url
    
    @property
    @abstractmethod
    def provider_name(self) -> Provider:
        """Return provider identifier"""
        pass
    
    @property
    @abstractmethod
    def supported_features(self) -> Dict[str, bool]:
        """
        Return dict of supported features
        
        Returns:
            Dict with keys: caching, structured_output, tools, vision, reasoning
        """
        pass
    
    @abstractmethod
    async def generate(
        self,
        messages: list[Message],
        config: GenerationConfig,
    ) -> GenerationResponse:
        """
        Generate completion from messages
        
        Args:
            messages: List of conversation messages
            config: Generation configuration
            
        Returns:
            Generation response with text, usage, and metadata
            
        Raises:
            ProviderError: If generation fails
        """
        pass
    
    @abstractmethod
    async def generate_stream(
        self,
        messages: list[Message],
        config: GenerationConfig,
    ) -> AsyncGenerator[str, None]:
        """
        Stream completion from messages
        
        Args:
            messages: List of conversation messages
            config: Generation configuration
            
        Yields:
            Text chunks as they arrive
            
        Raises:
            ProviderError: If streaming fails
        """
        pass
    
    @abstractmethod
    def generate_sync(
        self,
        messages: list[Message],
        config: GenerationConfig,
    ) -> GenerationResponse:
        """
        Synchronous version of generate
        
        Args:
            messages: List of conversation messages
            config: Generation configuration
            
        Returns:
            Generation response
            
        Raises:
            ProviderError: If generation fails
        """
        pass
    
    @abstractmethod
    def get_model_identifier(self, model_name: str) -> str:
        """
        Get provider-specific model identifier
        
        Args:
            model_name: Friendly model name
            
        Returns:
            Provider-specific model ID
        """
        pass
    
    @abstractmethod
    def calculate_cost(self, usage: Usage, model: str) -> float:
        """
        Calculate cost for a request
        
        Args:
            usage: Token usage information
            model: Model used
            
        Returns:
            Total cost in USD
        """
        pass
    
    @abstractmethod
    def supports_vision(self, model: str) -> bool:
        """Check if model supports vision"""
        pass
    
    @abstractmethod
    def supports_tools(self, model: str) -> bool:
        """Check if model supports tool use"""
        pass
    
    @abstractmethod
    def get_context_window(self, model: str) -> int:
        """Get maximum context window size for model"""
        pass
    
    def validate_config(self, config: GenerationConfig) -> None:
        """
        Validate generation config for this provider
        
        Args:
            config: Configuration to validate
            
        Raises:
            ValueError: If configuration is invalid
        """
        # Check context window
        if config.max_tokens > self.get_context_window(config.model):
            raise ValueError(
                f"max_tokens {config.max_tokens} exceeds context window "
                f"{self.get_context_window(config.model)} for {config.model}"
            )
        
        # Check feature support
        if config.structured_output and config.structured_output.enabled:
            if not self.supported_features.get("structured_output"):
                raise ValueError(
                    f"Provider {self.provider_name} does not support structured outputs"
                )
        
        if config.tool_config and config.tool_config.enabled:
            if not self.supports_tools(config.model):
                raise ValueError(
                    f"Model {config.model} does not support tool use"
                )
        
        if config.reasoning_config and config.reasoning_config.enabled:
            if not self.supported_features.get("reasoning"):
                raise ValueError(
                    f"Provider {self.provider_name} does not support reasoning models"
                )
    
    def _handle_provider_error(self, error: Exception) -> ProviderError:
        """
        Convert provider-specific errors to ProviderError
        
        Args:
            error: Original exception
            
        Returns:
            ProviderError with appropriate message
        """
        from ..exceptions import (
            RateLimitError, AuthenticationError, 
            ContextLengthError, TimeoutError
        )
        
        error_msg = str(error)
        
        # Check for rate limits
        if "rate limit" in error_msg.lower() or "429" in error_msg:
            return RateLimitError(
                "Rate limit exceeded",
                provider=self.provider_name.value
            )
        
        # Check for auth errors
        if "auth" in error_msg.lower() or "401" in error_msg or "403" in error_msg:
            return AuthenticationError(
                "Authentication failed",
                provider=self.provider_name.value
            )
        
        # Check for context length
        if "context length" in error_msg.lower() or "too long" in error_msg.lower():
            return ContextLengthError(
                "Context length exceeded",
                provider=self.provider_name.value,
                tokens_used=0,  # Extract from error if possible
                max_tokens=0
            )
        
        # Check for timeout
        if "timeout" in error_msg.lower():
            return TimeoutError(
                "Request timeout",
                provider=self.provider_name.value
            )
        
        # Generic provider error
        return ProviderError(
            error_msg,
            provider=self.provider_name.value
        )
