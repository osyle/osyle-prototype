"""
Anthropic (Claude) provider implementation
Supports: Prompt caching, Structured outputs, Extended thinking, Tool use, Vision
"""
from typing import AsyncGenerator, Optional, Dict, Any, List
from anthropic import Anthropic, AsyncAnthropic
from anthropic.types import Message as AnthropicMessage

from .base import BaseLLMProvider
from ..types import (
    GenerationConfig, GenerationResponse, Message, MessageRole,
    Usage, Provider, TextContent, ImageContent
)
from ..config import get_model_pricing


# Claude 4.5 model registry
CLAUDE_MODELS = {
    "claude-haiku-4.5": {
        "id": "claude-haiku-4-5-20251001",
        "context_window": 200000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
    "claude-sonnet-4.5": {
        "id": "claude-sonnet-4-5-20250929",
        "context_window": 200000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
    "claude-opus-4.5": {
        "id": "claude-opus-4-5-20251101",
        "context_window": 200000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
}


class AnthropicProvider(BaseLLMProvider):
    """Provider for Anthropic's Claude models"""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        super().__init__(api_key, base_url)
        
        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
        
        self.client = Anthropic(**client_kwargs)
        self.async_client = AsyncAnthropic(**client_kwargs)
    
    @property
    def provider_name(self) -> Provider:
        return Provider.ANTHROPIC
    
    @property
    def supported_features(self) -> Dict[str, bool]:
        return {
            "caching": True,
            "structured_output": True,
            "tools": True,
            "vision": True,
            "reasoning": True,  # Extended thinking
        }
    
    def get_model_identifier(self, model_name: str) -> str:
        """Get Claude model ID"""
        if model_name in CLAUDE_MODELS:
            return CLAUDE_MODELS[model_name]["id"]
        # Assume it's already a full model ID
        return model_name
    
    def supports_vision(self, model: str) -> bool:
        model_info = CLAUDE_MODELS.get(model, {})
        return model_info.get("supports_vision", False)
    
    def supports_tools(self, model: str) -> bool:
        model_info = CLAUDE_MODELS.get(model, {})
        return model_info.get("supports_tools", False)
    
    def get_context_window(self, model: str) -> int:
        model_info = CLAUDE_MODELS.get(model, {})
        return model_info.get("context_window", 200000)
    
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
    ) -> tuple[Optional[str], List[Dict[str, Any]]]:
        """
        Convert messages to Claude format
        
        Returns:
            (system_prompt, messages_list)
        """
        system_prompt = None
        claude_messages = []
        
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                # Extract system prompt
                if isinstance(msg.content, str):
                    system_prompt = msg.content
                else:
                    # System content with caching
                    system_blocks = []
                    for block in msg.content:
                        if isinstance(block, TextContent):
                            text_block = {"type": "text", "text": block.text}
                            # Apply cache control if enabled
                            if config.cache_config and config.cache_config.enabled:
                                text_block["cache_control"] = {"type": "ephemeral"}
                            system_blocks.append(text_block)
                    system_prompt = system_blocks
            else:
                # User or assistant message
                content_blocks = []
                
                if isinstance(msg.content, str):
                    content_blocks.append({"type": "text", "text": msg.content})
                else:
                    for block in msg.content:
                        if isinstance(block, TextContent):
                            content_blocks.append({"type": "text", "text": block.text})
                        elif isinstance(block, ImageContent):
                            content_blocks.append({
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": block.media_type,
                                    "data": block.data
                                }
                            })
                
                claude_messages.append({
                    "role": msg.role.value,
                    "content": content_blocks
                })
        
        return system_prompt, claude_messages
    
    def _build_request_kwargs(
        self,
        system_prompt: Optional[Any],
        messages: List[Dict[str, Any]],
        config: GenerationConfig
    ) -> Dict[str, Any]:
        """Build request kwargs for Claude API"""
        model_id = self.get_model_identifier(config.model)
        
        kwargs = {
            "model": model_id,
            "messages": messages,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "timeout": config.timeout,
        }
        
        # Add system prompt
        if system_prompt:
            kwargs["system"] = system_prompt
        
        # Add optional parameters
        if config.top_p is not None:
            kwargs["top_p"] = config.top_p
        if config.top_k is not None:
            kwargs["top_k"] = config.top_k
        if config.stop_sequences:
            kwargs["stop_sequences"] = config.stop_sequences
        
        # Structured outputs
        if config.structured_output and config.structured_output.enabled:
            if config.structured_output.strict and config.structured_output.schema:
                # Use structured outputs with JSON schema
                kwargs["output_config"] = {
                    "format": {
                        "type": "json_schema",
                        "schema": config.structured_output.schema
                    }
                }
                # Add beta header for structured outputs
                if "extra_headers" not in kwargs:
                    kwargs["extra_headers"] = {}
                kwargs["extra_headers"]["anthropic-beta"] = "structured-outputs-2025-11-13"
        
        # Tool use
        if config.tool_config and config.tool_config.enabled:
            kwargs["tools"] = config.tool_config.tools
            if config.tool_config.tool_choice:
                kwargs["tool_choice"] = config.tool_config.tool_choice
        
        # Extended thinking (reasoning)
        if config.reasoning_config and config.reasoning_config.enabled:
            if "extra_headers" not in kwargs:
                kwargs["extra_headers"] = {}
            kwargs["extra_headers"]["anthropic-beta"] = "extended-thinking-2025-01-08"
            
            thinking_config = {"type": "enabled"}
            if config.reasoning_config.budget:
                thinking_config["budget_tokens"] = config.reasoning_config.budget
            kwargs["thinking"] = thinking_config
        
        return kwargs
    
    async def generate(
        self,
        messages: List[Message],
        config: GenerationConfig,
    ) -> GenerationResponse:
        """Generate completion from Claude"""
        try:
            self.validate_config(config)
            
            # Prepare messages
            system_prompt, claude_messages = self._prepare_messages(messages, config)
            
            # Build request
            request_kwargs = self._build_request_kwargs(
                system_prompt, claude_messages, config
            )
            
            # Make API call
            response: AnthropicMessage = await self.async_client.messages.create(
                **request_kwargs
            )
            
            # Extract text content
            text_content = ""
            for block in response.content:
                if block.type == "text":
                    text_content += block.text
            
            # Extract usage
            usage = Usage(
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                cached_tokens=getattr(response.usage, "cache_read_input_tokens", 0),
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
                tool_calls = [
                    {
                        "id": block.id,
                        "name": block.name,
                        "input": block.input
                    }
                    for block in response.content
                    if block.type == "tool_use"
                ]
            
            return GenerationResponse(
                text=text_content,
                usage=usage,
                model=config.model,
                finish_reason=response.stop_reason,
                structured_output=structured_output,
                tool_calls=tool_calls if tool_calls else None,
                raw_response=response
            )
            
        except Exception as e:
            raise self._handle_provider_error(e)
    
    async def generate_stream(
        self,
        messages: List[Message],
        config: GenerationConfig,
    ) -> AsyncGenerator[str, None]:
        """Stream completion from Claude"""
        try:
            self.validate_config(config)
            
            # Prepare messages
            system_prompt, claude_messages = self._prepare_messages(messages, config)
            
            # Build request
            request_kwargs = self._build_request_kwargs(
                system_prompt, claude_messages, config
            )
            
            # Stream response
            async with self.async_client.messages.stream(**request_kwargs) as stream:
                async for text_chunk in stream.text_stream:
                    yield text_chunk
            
        except Exception as e:
            raise self._handle_provider_error(e)
    
    def generate_sync(
        self,
        messages: List[Message],
        config: GenerationConfig,
    ) -> GenerationResponse:
        """Synchronous generation from Claude"""
        try:
            self.validate_config(config)
            
            # Prepare messages
            system_prompt, claude_messages = self._prepare_messages(messages, config)
            
            # Build request
            request_kwargs = self._build_request_kwargs(
                system_prompt, claude_messages, config
            )
            
            # Make API call
            response: AnthropicMessage = self.client.messages.create(
                **request_kwargs
            )
            
            # Extract text content
            text_content = ""
            for block in response.content:
                if block.type == "text":
                    text_content += block.text
            
            # Extract usage
            usage = Usage(
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                cached_tokens=getattr(response.usage, "cache_read_input_tokens", 0),
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
                finish_reason=response.stop_reason,
                structured_output=structured_output,
                raw_response=response
            )
            
        except Exception as e:
            raise self._handle_provider_error(e)
