"""
High-level LLM service API
Main interface for applications to interact with LLMs
"""
from typing import Optional, List, AsyncGenerator, Dict, Any
import logging

from .types import (
    GenerationConfig, GenerationResponse, Message, MessageRole,
    TextContent, ImageContent, CacheConfig, StructuredOutputConfig,
    ToolConfig, ReasoningConfig
)
from .providers import ProviderFactory, get_recommended_models
from .utils import RetryConfig, with_retry, get_tracker
from .config import get_config
from .exceptions import ModelNotFoundError

logger = logging.getLogger(__name__)


class LLMService:
    """
    High-level service for LLM interactions
    
    Provides simple, clean APIs for common LLM operations with:
    - Automatic provider selection based on model
    - Retry logic with exponential backoff
    - Cost tracking
    - Prompt caching support
    - Structured outputs
    - Tool use
    - Reasoning models
    
    Example:
        service = LLMService()
        
        # Simple text generation
        response = await service.generate(
            model="claude-sonnet-4.5",
            messages=[
                Message(role=MessageRole.SYSTEM, content="You are a helpful assistant"),
                Message(role=MessageRole.USER, content="Write a haiku about code")
            ]
        )
        
        # With caching and streaming
        async for chunk in service.generate_stream(
            model="claude-sonnet-4.5",
            messages=messages,
            enable_caching=True
        ):
            print(chunk, end="")
    """
    
    def __init__(
        self,
        anthropic_api_key: Optional[str] = None,
        google_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        enable_cost_tracking: bool = True,
        enable_retries: bool = True,
        retry_config: Optional[RetryConfig] = None,
    ):
        """
        Initialize LLM service
        
        Args:
            anthropic_api_key: Optional API key for Claude
            google_api_key: Optional API key for Gemini
            openai_api_key: Optional API key for OpenAI
            enable_cost_tracking: Whether to track costs
            enable_retries: Whether to retry failed requests
            retry_config: Custom retry configuration
        """
        self.factory = ProviderFactory(
            anthropic_api_key=anthropic_api_key,
            google_api_key=google_api_key,
            openai_api_key=openai_api_key
        )
        
        self.config = get_config()
        self.enable_cost_tracking = enable_cost_tracking
        self.enable_retries = enable_retries
        self.retry_config = retry_config or RetryConfig()
        
        if enable_cost_tracking:
            self.cost_tracker = get_tracker()
        else:
            self.cost_tracker = None
    
    async def generate(
        self,
        model: str,
        messages: List[Message],
        max_tokens: int = 4096,
        temperature: float = 1.0,
        enable_caching: bool = False,
        structured_output_schema: Optional[Dict[str, Any]] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        reasoning_effort: Optional[str] = None,  # "low", "medium", "high"
        **kwargs
    ) -> GenerationResponse:
        """
        Generate completion from messages
        
        Args:
            model: Model to use (e.g., "claude-sonnet-4.5", "gemini-2.5-flash")
            messages: List of conversation messages
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            enable_caching: Enable prompt caching (for system messages)
            structured_output_schema: Optional JSON schema for structured output
            tools: Optional list of tools for function calling
            reasoning_effort: For o-series models: "low", "medium", or "high"
            **kwargs: Additional provider-specific parameters
            
        Returns:
            GenerationResponse with text, usage, and metadata
        """
        # Build configuration
        config = GenerationConfig(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            **kwargs
        )
        
        # Add caching if enabled
        if enable_caching:
            config.cache_config = CacheConfig(enabled=True)
        
        # Add structured output if schema provided
        if structured_output_schema:
            config.structured_output = StructuredOutputConfig(
                enabled=True,
                schema=structured_output_schema,
                strict=True
            )
        
        # Add tools if provided
        if tools:
            config.tool_config = ToolConfig(
                enabled=True,
                tools=tools
            )
        
        # Add reasoning config if effort specified
        if reasoning_effort:
            config.reasoning_config = ReasoningConfig(
                enabled=True,
                effort=reasoning_effort
            )
        
        # Get provider
        provider = self.factory.get_provider_for_model(model)
        
        # Generate with retry if enabled
        if self.enable_retries:
            @with_retry(self.retry_config)
            async def _generate():
                return await provider.generate(messages, config)
            
            response = await _generate()
        else:
            response = await provider.generate(messages, config)
        
        # Track cost if enabled
        if self.cost_tracker:
            self.cost_tracker.track_request(response)
        
        # Log if configured
        if self.config.log_prompts:
            logger.debug(f"Prompt: {messages}")
        if self.config.log_responses:
            logger.debug(f"Response: {response.text[:200]}...")
        
        return response
    
    async def generate_stream(
        self,
        model: str,
        messages: List[Message],
        max_tokens: int = 4096,
        temperature: float = 1.0,
        enable_caching: bool = False,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Stream completion from messages
        
        Args:
            model: Model to use
            messages: List of conversation messages
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            enable_caching: Enable prompt caching
            **kwargs: Additional parameters
            
        Yields:
            Text chunks as they arrive
        """
        # Build configuration
        config = GenerationConfig(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
            **kwargs
        )
        
        if enable_caching:
            config.cache_config = CacheConfig(enabled=True)
        
        # Get provider
        provider = self.factory.get_provider_for_model(model)
        
        # Stream with retry if enabled
        if self.enable_retries:
            @with_retry(self.retry_config)
            async def _stream():
                async for chunk in provider.generate_stream(messages, config):
                    yield chunk
            
            async for chunk in _stream():
                yield chunk
        else:
            async for chunk in provider.generate_stream(messages, config):
                yield chunk
    
    def generate_sync(
        self,
        model: str,
        messages: List[Message],
        max_tokens: int = 4096,
        temperature: float = 1.0,
        enable_caching: bool = False,
        structured_output_schema: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> GenerationResponse:
        """
        Synchronous version of generate
        
        Args:
            model: Model to use
            messages: List of conversation messages
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            enable_caching: Enable prompt caching
            structured_output_schema: Optional JSON schema
            **kwargs: Additional parameters
            
        Returns:
            GenerationResponse
        """
        # Build configuration
        config = GenerationConfig(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            **kwargs
        )
        
        if enable_caching:
            config.cache_config = CacheConfig(enabled=True)
        
        if structured_output_schema:
            config.structured_output = StructuredOutputConfig(
                enabled=True,
                schema=structured_output_schema,
                strict=True
            )
        
        # Get provider
        provider = self.factory.get_provider_for_model(model)
        
        # Generate synchronously
        response = provider.generate_sync(messages, config)
        
        # Track cost if enabled
        if self.cost_tracker:
            self.cost_tracker.track_request(response)
        
        return response
    
    def get_recommended_model(
        self,
        task: str,
        budget: Optional[str] = None
    ) -> str:
        """
        Get recommended model for a task
        
        Args:
            task: Task type (e.g., "code_generation", "vision_analysis")
            budget: Budget tier: "low", "medium", or "high"
            
        Returns:
            Recommended model name
        """
        from .providers import get_best_model_for_task
        
        model = get_best_model_for_task(task, budget)
        if not model:
            # Fallback to default
            return self.config.default_model
        return model
    
    def list_available_models(self) -> Dict[str, List[str]]:
        """List all available models grouped by provider"""
        return self.factory.list_available_models()
    
    def get_cost_summary(self) -> dict:
        """Get cost tracking summary"""
        if not self.cost_tracker:
            return {"error": "Cost tracking not enabled"}
        return self.cost_tracker.get_stats()
    
    def print_cost_summary(self):
        """Print cost tracking summary"""
        if not self.cost_tracker:
            print("Cost tracking not enabled")
            return
        self.cost_tracker.print_summary()


# Convenience functions

async def generate(
    model: str,
    prompt: str,
    system: Optional[str] = None,
    **kwargs
) -> str:
    """
    Simple convenience function for quick text generation
    
    Args:
        model: Model to use
        prompt: User prompt
        system: Optional system prompt
        **kwargs: Additional parameters
        
    Returns:
        Generated text
    """
    service = LLMService()
    
    messages = []
    if system:
        messages.append(Message(role=MessageRole.SYSTEM, content=system))
    messages.append(Message(role=MessageRole.USER, content=prompt))
    
    response = await service.generate(model, messages, **kwargs)
    return response.text


async def generate_with_vision(
    model: str,
    prompt: str,
    image_data: str,
    image_type: str = "image/png",
    system: Optional[str] = None,
    **kwargs
) -> str:
    """
    Convenience function for vision-enabled generation
    
    Args:
        model: Model to use (must support vision)
        prompt: User prompt
        image_data: Base64-encoded image data
        image_type: MIME type of image
        system: Optional system prompt
        **kwargs: Additional parameters
        
    Returns:
        Generated text
    """
    service = LLMService()
    
    messages = []
    if system:
        messages.append(Message(role=MessageRole.SYSTEM, content=system))
    
    # Create multimodal message
    messages.append(Message(
        role=MessageRole.USER,
        content=[
            TextContent(text=prompt),
            ImageContent(data=image_data, media_type=image_type)
        ]
    ))
    
    response = await service.generate(model, messages, **kwargs)
    return response.text
