"""
Google (Gemini) provider implementation
Supports: Context caching, Vision, Tool use, Long context (1M tokens)
"""
from typing import AsyncGenerator, Optional, Dict, Any, List
import google.generativeai as genai

from .base import BaseLLMProvider
from ..types import (
    GenerationConfig, GenerationResponse, Message, MessageRole,
    Usage, Provider, TextContent, ImageContent
)
from ..config import get_model_pricing


# Gemini model registry
GEMINI_MODELS = {
    # Gemini 3 series
    "gemini-3-pro": {
        "id": "gemini-3-pro-preview",
        "context_window": 1000000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
    "gemini-3-flash": {
        "id": "gemini-3-flash-preview",
        "context_window": 1000000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
    # Gemini 2.5 series (production stable)
    "gemini-2.5-pro": {
        "id": "gemini-2.5-pro",
        "context_window": 1000000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
    "gemini-2.5-flash": {
        "id": "gemini-2.5-flash",
        "context_window": 1000000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
    "gemini-2.5-flash-lite": {
        "id": "gemini-2.5-flash-lite",
        "context_window": 1000000,
        "supports_vision": True,
        "supports_tools": True,
        "supports_caching": True,
    },
}


class GoogleProvider(BaseLLMProvider):
    """Provider for Google's Gemini models"""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        super().__init__(api_key, base_url)
        genai.configure(api_key=api_key)
        self.api_key = api_key
    
    @property
    def provider_name(self) -> Provider:
        return Provider.GOOGLE
    
    @property
    def supported_features(self) -> Dict[str, bool]:
        return {
            "caching": True,
            "structured_output": True,  # Via response_mime_type
            "tools": True,
            "vision": True,
            "reasoning": False,
        }
    
    def get_model_identifier(self, model_name: str) -> str:
        """Get Gemini model ID"""
        if model_name in GEMINI_MODELS:
            return GEMINI_MODELS[model_name]["id"]
        return model_name
    
    def supports_vision(self, model: str) -> bool:
        model_info = GEMINI_MODELS.get(model, {})
        return model_info.get("supports_vision", False)
    
    def supports_tools(self, model: str) -> bool:
        model_info = GEMINI_MODELS.get(model, {})
        return model_info.get("supports_tools", False)
    
    def get_context_window(self, model: str) -> int:
        model_info = GEMINI_MODELS.get(model, {})
        return model_info.get("context_window", 1000000)
    
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
    
    def _prepare_content(self, message_content: Any) -> List[Any]:
        """
        Convert message content to Gemini format
        
        Gemini expects:
        - Text: string or {"text": "..."}
        - Image: {"inline_data": {"mime_type": "...", "data": base64}}
        """
        if isinstance(message_content, str):
            return [message_content]
        
        gemini_content = []
        for block in message_content:
            if isinstance(block, TextContent):
                gemini_content.append(block.text)
            elif isinstance(block, ImageContent):
                gemini_content.append({
                    "inline_data": {
                        "mime_type": block.media_type,
                        "data": block.data
                    }
                })
        
        return gemini_content
    
    def _build_generation_config(self, config: GenerationConfig) -> Dict[str, Any]:
        """Build Gemini generation config"""
        gen_config = {
            "temperature": config.temperature,
            "max_output_tokens": config.max_tokens,
        }
        
        if config.top_p is not None:
            gen_config["top_p"] = config.top_p
        if config.top_k is not None:
            gen_config["top_k"] = config.top_k
        if config.stop_sequences:
            gen_config["stop_sequences"] = config.stop_sequences
        
        # Structured output via JSON mode
        if config.structured_output and config.structured_output.enabled:
            gen_config["response_mime_type"] = "application/json"
            if config.structured_output.schema:
                gen_config["response_schema"] = config.structured_output.schema
        
        return gen_config
    
    def _prepare_messages(
        self,
        messages: List[Message],
        config: GenerationConfig
    ) -> tuple[Optional[str], List[Dict[str, Any]]]:
        """
        Convert messages to Gemini format
        
        Returns:
            (system_instruction, chat_history)
        """
        system_instruction = None
        chat_history = []
        
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                # System instruction
                if isinstance(msg.content, str):
                    system_instruction = msg.content
                else:
                    # Extract text from system content blocks
                    system_texts = [
                        block.text 
                        for block in msg.content 
                        if isinstance(block, TextContent)
                    ]
                    system_instruction = "\n\n".join(system_texts)
            else:
                # User or model message
                content = self._prepare_content(msg.content)
                
                # Gemini uses "model" instead of "assistant"
                role = "model" if msg.role == MessageRole.ASSISTANT else "user"
                
                chat_history.append({
                    "role": role,
                    "parts": content
                })
        
        return system_instruction, chat_history
    
    async def generate(
        self,
        messages: List[Message],
        config: GenerationConfig,
    ) -> GenerationResponse:
        """Generate completion from Gemini"""
        try:
            self.validate_config(config)
            
            model_id = self.get_model_identifier(config.model)
            
            # Prepare messages
            system_instruction, chat_history = self._prepare_messages(messages, config)
            
            # Build generation config
            generation_config = self._build_generation_config(config)
            
            # Create model with optional caching
            model_kwargs = {
                "model_name": model_id,
                "generation_config": generation_config,
            }
            
            if system_instruction:
                model_kwargs["system_instruction"] = system_instruction
            
            # Add tools if configured
            if config.tool_config and config.tool_config.enabled:
                model_kwargs["tools"] = config.tool_config.tools
            
            # Context caching setup
            if config.cache_config and config.cache_config.enabled:
                # Gemini caching is automatic for system instructions and long contexts
                # TTL can be set via cached_content API (separate from model creation)
                pass
            
            model = genai.GenerativeModel(**model_kwargs)
            
            # If we have chat history, use chat mode
            if len(chat_history) > 1 or (len(chat_history) == 1 and chat_history[0]["role"] == "model"):
                # Multi-turn conversation
                chat = model.start_chat(history=chat_history[:-1])
                response = await chat.send_message_async(
                    chat_history[-1]["parts"]
                )
            else:
                # Single turn
                content = chat_history[0]["parts"] if chat_history else []
                response = await model.generate_content_async(content)
            
            # Extract text
            text_content = response.text if hasattr(response, 'text') else ""
            
            # Extract usage (Gemini provides token counts)
            usage_metadata = getattr(response, 'usage_metadata', None)
            usage = Usage(
                input_tokens=getattr(usage_metadata, 'prompt_token_count', 0) if usage_metadata else 0,
                output_tokens=getattr(usage_metadata, 'candidates_token_count', 0) if usage_metadata else 0,
                cached_tokens=getattr(usage_metadata, 'cached_content_token_count', 0) if usage_metadata else 0,
            )
            
            # Extract structured output if applicable
            structured_output = None
            if config.structured_output and config.structured_output.enabled:
                import json
                try:
                    structured_output = json.loads(text_content)
                except json.JSONDecodeError as e:
                    # Don't silently fail - raise error with context
                    raise ValueError(
                        f"Gemini returned invalid JSON for structured output: {e}\n"
                        f"Response text (first 500 chars): {text_content[:500]}\n"
                        f"Response may have been truncated. Try increasing max_tokens."
                    )
            
            # Extract tool calls if applicable
            tool_calls = None
            if config.tool_config and config.tool_config.enabled:
                # Gemini returns function calls in candidate.content.parts
                if hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        tool_calls = []
                        for part in candidate.content.parts:
                            if hasattr(part, 'function_call'):
                                tool_calls.append({
                                    "name": part.function_call.name,
                                    "arguments": dict(part.function_call.args)
                                })
            
            return GenerationResponse(
                text=text_content,
                usage=usage,
                model=config.model,
                finish_reason=response.candidates[0].finish_reason.name if response.candidates else None,
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
        """Stream completion from Gemini"""
        try:
            self.validate_config(config)
            
            model_id = self.get_model_identifier(config.model)
            
            # Prepare messages
            system_instruction, chat_history = self._prepare_messages(messages, config)
            
            # Build generation config
            generation_config = self._build_generation_config(config)
            
            # Create model
            model_kwargs = {
                "model_name": model_id,
                "generation_config": generation_config,
            }
            
            if system_instruction:
                model_kwargs["system_instruction"] = system_instruction
            
            if config.tool_config and config.tool_config.enabled:
                model_kwargs["tools"] = config.tool_config.tools
            
            model = genai.GenerativeModel(**model_kwargs)
            
            # Generate streaming response
            content = chat_history[0]["parts"] if chat_history else []
            response = await model.generate_content_async(
                content,
                stream=True
            )
            
            async for chunk in response:
                if hasattr(chunk, 'text') and chunk.text:
                    yield chunk.text
            
        except Exception as e:
            raise self._handle_provider_error(e)
    
    def generate_sync(
        self,
        messages: List[Message],
        config: GenerationConfig,
    ) -> GenerationResponse:
        """Synchronous generation from Gemini"""
        try:
            self.validate_config(config)
            
            model_id = self.get_model_identifier(config.model)
            
            # Prepare messages
            system_instruction, chat_history = self._prepare_messages(messages, config)
            
            # Build generation config
            generation_config = self._build_generation_config(config)
            
            # Create model
            model_kwargs = {
                "model_name": model_id,
                "generation_config": generation_config,
            }
            
            if system_instruction:
                model_kwargs["system_instruction"] = system_instruction
            
            if config.tool_config and config.tool_config.enabled:
                model_kwargs["tools"] = config.tool_config.tools
            
            model = genai.GenerativeModel(**model_kwargs)
            
            # Generate response
            content = chat_history[0]["parts"] if chat_history else []
            response = model.generate_content(content)
            
            # Extract text
            text_content = response.text if hasattr(response, 'text') else ""
            
            # Extract usage
            usage_metadata = getattr(response, 'usage_metadata', None)
            usage = Usage(
                input_tokens=getattr(usage_metadata, 'prompt_token_count', 0) if usage_metadata else 0,
                output_tokens=getattr(usage_metadata, 'candidates_token_count', 0) if usage_metadata else 0,
                cached_tokens=getattr(usage_metadata, 'cached_content_token_count', 0) if usage_metadata else 0,
            )
            
            # Extract structured output if applicable
            structured_output = None
            if config.structured_output and config.structured_output.enabled:
                import json
                try:
                    structured_output = json.loads(text_content)
                except json.JSONDecodeError as e:
                    # Don't silently fail - raise error with context
                    raise ValueError(
                        f"Gemini returned invalid JSON for structured output: {e}\n"
                        f"Response text (first 500 chars): {text_content[:500]}\n"
                        f"Response may have been truncated. Try increasing max_tokens."
                    )
            
            return GenerationResponse(
                text=text_content,
                usage=usage,
                model=config.model,
                finish_reason=response.candidates[0].finish_reason.name if response.candidates else None,
                structured_output=structured_output,
                raw_response=response
            )
            
        except Exception as e:
            raise self._handle_provider_error(e)