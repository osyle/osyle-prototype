"""
OpenAI provider implementation
Supports: Prompt caching, Structured outputs, Reasoning models (o-series), Tool use, Vision
"""
from typing import AsyncGenerator, Optional, Dict, Any, List
from openai import OpenAI, AsyncOpenAI

from .base import BaseLLMProvider
from ..types import (
    GenerationConfig, GenerationResponse, Message, MessageRole,
    Usage, Provider, TextContent, ImageContent
)
from ..config import get_model_pricing


# OpenAI model registry
OPENAI_MODELS = {
    # GPT-5.2 series
    "gpt-5.2-pro": {
        "id": "gpt-5.2-pro",
        "context_window": 400000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": False,  # Not yet available
    },
    "gpt-5.2": {
        "id": "gpt-5.2",
        "context_window": 400000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
    # GPT-4.1 series
    "gpt-4.1": {
        "id": "gpt-4.1",
        "context_window": 1000000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
    # o-series reasoning models
    "o3": {
        "id": "o3",
        "context_window": 200000,
        "supports_vision": True,
        "supports_tools": False,  # Reasoning models don't support tools yet
        "supports_caching": True,
        "is_reasoning": True,
    },
    "o4-mini": {
        "id": "o4-mini",
        "context_window": 200000,
        "supports_vision": True,
        "supports_tools": False,
        "supports_caching": True,
        "is_reasoning": True,
    },
    # GPT-4o series
    "gpt-4o": {
        "id": "gpt-4o-2024-11-20",
        "context_window": 128000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
    "gpt-4o-mini": {
        "id": "gpt-4o-mini-2024-07-18",
        "context_window": 128000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
}


class OpenAIProvider(BaseLLMProvider):
    """Provider for OpenAI's GPT models"""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        super().__init__(api_key, base_url)
        
        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
        
        self.client = OpenAI(**client_kwargs)
        self.async_client = AsyncOpenAI(**client_kwargs)
    
    @property
    def provider_name(self) -> Provider:
        return Provider.OPENAI
    
    @property
    def supported_features(self) -> Dict[str, bool]:
        return {
            "caching": True,
            "structured_output": True,
            "tools": True,
            "vision": True,
            "reasoning": True,  # o-series models
        }
    
    def get_model_identifier(self, model_name: str) -> str:
        """Get OpenAI model ID"""
        if model_name in OPENAI_MODELS:
            return OPENAI_MODELS[model_name]["id"]
        return model_name
    
    def supports_vision(self, model: str) -> bool:
        model_info = OPENAI_MODELS.get(model, {})
        return model_info.get("supports_vision", False)
    
    def supports_tools(self, model: str) -> bool:
        model_info = OPENAI_MODELS.get(model, {})
        return model_info.get("supports_tools", False)
    
    def get_context_window(self, model: str) -> int:
        model_info = OPENAI_MODELS.get(model, {})
        return model_info.get("context_window", 128000)
    
    def is_reasoning_model(self, model: str) -> bool:
        """Check if model is an o-series reasoning model"""
        model_info = OPENAI_MODELS.get(model, {})
        return model_info.get("is_reasoning", False)
    
    def calculate_cost(self, usage: Usage, model: str) -> float:
        """Calculate cost using model pricing"""
        pricing = get_model_pricing(model)
        if not pricing:
            return 0.0
        
        return pricing.calculate_cost(
            usage.input_tokens,
            usage.output_tokens,
            usage.cached_tokens
        )
    
    def _prepare_messages(
        self,
        messages: List[Message],
        config: GenerationConfig
    ) -> List[Dict[str, Any]]:
        """Convert messages to OpenAI format"""
        openai_messages = []
        
        for msg in messages:
            content_parts = []
            
            if isinstance(msg.content, str):
                content_parts.append({"type": "text", "text": msg.content})
            else:
                for block in msg.content:
                    if isinstance(block, TextContent):
                        content_parts.append({"type": "text", "text": block.text})
                    elif isinstance(block, ImageContent):
                        # OpenAI uses url or base64
                        content_parts.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{block.media_type};base64,{block.data}",
                                "detail": block.detail or "auto"
                            }
                        })
            
            openai_messages.append({
                "role": msg.role.value,
                "content": content_parts if len(content_parts) > 1 else content_parts[0]["text"]
            })
        
        return openai_messages
    
    def _build_request_kwargs(
        self,
        messages: List[Dict[str, Any]],
        config: GenerationConfig
    ) -> Dict[str, Any]:
        """Build request kwargs for OpenAI API"""
        model_id = self.get_model_identifier(config.model)
        is_reasoning = self.is_reasoning_model(config.model)
        
        kwargs = {
            "model": model_id,
            "messages": messages,
            "temperature": config.temperature,
            "timeout": config.timeout,
        }
        
        # Reasoning models don't use max_tokens, they use max_completion_tokens
        if is_reasoning:
            kwargs["max_completion_tokens"] = config.max_tokens
            # Add reasoning effort if configured
            if config.reasoning_config and config.reasoning_config.enabled:
                kwargs["reasoning_effort"] = config.reasoning_config.effort
        else:
            kwargs["max_tokens"] = config.max_tokens
        
        # Add optional parameters (not supported for reasoning models)
        if not is_reasoning:
            if config.top_p is not None:
                kwargs["top_p"] = config.top_p
            if config.stop_sequences:
                kwargs["stop"] = config.stop_sequences
        
        # Structured outputs
        if config.structured_output and config.structured_output.enabled:
            if config.structured_output.strict and config.structured_output.schema:
                # Use structured outputs with JSON schema
                kwargs["response_format"] = {
                    "type": "json_schema",
                    "json_schema": config.structured_output.schema
                }
            else:
                # Use JSON mode
                kwargs["response_format"] = {"type": "json_object"}
        
        # Tool use (not supported for reasoning models)
        if config.tool_config and config.tool_config.enabled and not is_reasoning:
            kwargs["tools"] = config.tool_config.tools
            if config.tool_config.tool_choice:
                kwargs["tool_choice"] = config.tool_config.tool_choice
        
        return kwargs
    
    async def generate(
        self,
        messages: List[Message],
        config: GenerationConfig,
    ) -> GenerationResponse:
        """Generate completion from OpenAI"""
        try:
            self.validate_config(config)
            
            # Prepare messages
            openai_messages = self._prepare_messages(messages, config)
            
            # Build request
            request_kwargs = self._build_request_kwargs(openai_messages, config)
            
            # Make API call
            response = await self.async_client.chat.completions.create(
                **request_kwargs
            )
            
            # Extract text content
            message = response.choices[0].message
            text_content = message.content or ""
            
            # Extract usage
            usage = Usage(
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
                cached_tokens=getattr(response.usage, "prompt_tokens_details", {}).get("cached_tokens", 0),
                reasoning_tokens=getattr(response.usage, "completion_tokens_details", {}).get("reasoning_tokens", 0),
            )
            
            # Extract structured output if applicable
            structured_output = None
            if config.structured_output and config.structured_output.enabled:
                import json
                try:
                    structured_output = json.loads(text_content)
                except json.JSONDecodeError:
                    pass
            
            # Extract tool calls if applicable
            tool_calls = None
            if config.tool_config and config.tool_config.enabled:
                if message.tool_calls:
                    tool_calls = [
                        {
                            "id": tc.id,
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                        for tc in message.tool_calls
                    ]
            
            return GenerationResponse(
                text=text_content,
                usage=usage,
                model=config.model,
                finish_reason=response.choices[0].finish_reason,
                structured_output=structured_output,
                tool_calls=tool_calls,
                raw_response=response
            )
            
        except Exception as e:
            raise self._handle_provider_error(e)
    
    async def generate_stream(
        self,
        messages: List[Message],
        config: GenerationConfig,
    ) -> AsyncGenerator[str, None]:
        """Stream completion from OpenAI"""
        try:
            self.validate_config(config)
            
            # Prepare messages
            openai_messages = self._prepare_messages(messages, config)
            
            # Build request
            request_kwargs = self._build_request_kwargs(openai_messages, config)
            request_kwargs["stream"] = True
            
            # Stream response
            stream = await self.async_client.chat.completions.create(**request_kwargs)
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            
        except Exception as e:
            raise self._handle_provider_error(e)
    
    def generate_sync(
        self,
        messages: List[Message],
        config: GenerationConfig,
    ) -> GenerationResponse:
        """Synchronous generation from OpenAI"""
        try:
            self.validate_config(config)
            
            # Prepare messages
            openai_messages = self._prepare_messages(messages, config)
            
            # Build request
            request_kwargs = self._build_request_kwargs(openai_messages, config)
            
            # Make API call
            response = self.client.chat.completions.create(**request_kwargs)
            
            # Extract text content
            message = response.choices[0].message
            text_content = message.content or ""
            
            # Extract usage
            usage = Usage(
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
                cached_tokens=getattr(response.usage, "prompt_tokens_details", {}).get("cached_tokens", 0),
                reasoning_tokens=getattr(response.usage, "completion_tokens_details", {}).get("reasoning_tokens", 0),
            )
            
            # Extract structured output if applicable
            structured_output = None
            if config.structured_output and config.structured_output.enabled:
                import json
                try:
                    structured_output = json.loads(text_content)
                except json.JSONDecodeError:
                    pass
            
            return GenerationResponse(
                text=text_content,
                usage=usage,
                model=config.model,
                finish_reason=response.choices[0].finish_reason,
                structured_output=structured_output,
                raw_response=response
            )
            
        except Exception as e:
            raise self._handle_provider_error(e)
