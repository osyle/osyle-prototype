"""
Production-grade LLM Infrastructure

Multi-provider abstraction layer supporting:
- Anthropic Claude (prompt caching, structured outputs, extended thinking)
- Google Gemini (context caching, vision, 1M context)
- OpenAI GPT (reasoning models, vision, tool use)

Features:
- Automatic retry with exponential backoff
- Cost tracking and monitoring
- Provider-agnostic APIs
- Streaming support
- Tool use / function calling
- Vision capabilities
- Structured outputs with JSON schema
- Reasoning models (o-series)
- Conversation management

Example:
    from llm import LLMService, Message, MessageRole
    
    service = LLMService()
    
    response = await service.generate(
        model="claude-sonnet-4.5",
        messages=[
            Message(role=MessageRole.SYSTEM, content="You are helpful"),
            Message(role=MessageRole.USER, content="Hello!")
        ],
        enable_caching=True
    )
    
    print(response.text)
    service.print_cost_summary()
"""

# Core service
from .service import LLMService, generate, generate_with_vision

# Singleton instance for backward compatibility
_llm_service_instance = None

def get_llm_service() -> LLMService:
    """
    Get singleton LLM service instance (backward compatibility)
    
    This function provides compatibility with old code that expects
    get_llm_service(). New code should instantiate LLMService directly.
    
    Returns:
        LLMService: Singleton service instance
    """
    global _llm_service_instance
    if _llm_service_instance is None:
        _llm_service_instance = LLMService()
    return _llm_service_instance

# Types
from .types import (
    # Core types
    Message, MessageRole, TextContent, ImageContent,
    GenerationConfig, GenerationResponse, Usage,
    
    # Configuration types
    CacheConfig, StructuredOutputConfig, ToolConfig, ReasoningConfig,
    
    # Enums
    Provider,
)

# Providers
from .providers import (
    # Provider classes
    AnthropicProvider, GoogleProvider, OpenAIProvider,
    BaseLLMProvider, ProviderFactory,
    
    # Model info
    ModelInfo, get_model_info, list_models,
    get_recommended_models, get_best_model_for_task,
)

# Config
from .config import (
    LLMConfig, ProviderConfig, ModelPricing,
    get_config, set_config, get_model_pricing
)

# Utilities
from .utils import (
    # Retry
    RetryConfig, with_retry, with_retry_sync,
    
    # Cost tracking
    CostTracker, get_tracker, set_tracker,
)

# Exceptions
from .exceptions import (
    LLMError, ProviderError, RateLimitError, AuthenticationError,
    ModelNotFoundError, ValidationError, StructuredOutputError,
    ContextLengthError, TimeoutError, ToolExecutionError,
)

__version__ = "1.0.0"

__all__ = [
    # Core service
    "LLMService",
    "get_llm_service",  # Backward compatibility
    "generate",
    "generate_with_vision",
    
    # Types
    "Message",
    "MessageRole",
    "TextContent",
    "ImageContent",
    "GenerationConfig",
    "GenerationResponse",
    "Usage",
    "CacheConfig",
    "StructuredOutputConfig",
    "ToolConfig",
    "ReasoningConfig",
    "Provider",
    
    # Providers
    "AnthropicProvider",
    "GoogleProvider",
    "OpenAIProvider",
    "BaseLLMProvider",
    "ProviderFactory",
    "ModelInfo",
    "get_model_info",
    "list_models",
    "get_recommended_models",
    "get_best_model_for_task",
    
    # Config
    "LLMConfig",
    "ProviderConfig",
    "ModelPricing",
    "get_config",
    "set_config",
    "get_model_pricing",
    
    # Utilities
    "RetryConfig",
    "with_retry",
    "with_retry_sync",
    "CostTracker",
    "get_tracker",
    "set_tracker",
    
    # Exceptions
    "LLMError",
    "ProviderError",
    "RateLimitError",
    "AuthenticationError",
    "ModelNotFoundError",
    "ValidationError",
    "StructuredOutputError",
    "ContextLengthError",
    "TimeoutError",
    "ToolExecutionError",
]
