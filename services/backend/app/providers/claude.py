"""
Claude Provider Implementation
Uses Anthropic's Claude API
"""
from typing import AsyncGenerator, Any
from anthropic import Anthropic, AsyncAnthropic
from .base import BaseLLMProvider


# Claude model mappings
CLAUDE_MODELS = {
    "haiku": "claude-haiku-4-5",
    "sonnet": "claude-sonnet-4-5",
    "opus": "claude-opus-4-5",
}


class ClaudeProvider(BaseLLMProvider):
    """Provider for Anthropic's Claude models"""
    
    def __init__(self, api_key: str):
        """Initialize Claude provider with API key"""
        self.client = Anthropic(api_key=api_key)
        self.async_client = AsyncAnthropic(api_key=api_key)
    
    def get_model_id(self, model_name: str) -> str:
        """Get Claude model ID from friendly name"""
        return CLAUDE_MODELS.get(model_name, CLAUDE_MODELS["sonnet"])
    
    async def call_streaming(
        self,
        system_prompt: str,
        user_message: Any,
        model: str,
        max_tokens: int = 50000,
        temperature: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        """Stream response from Claude"""
        model_id = self.get_model_id(model)
        
        # Build message content
        if isinstance(user_message, str):
            message_content = [{"type": "text", "text": user_message}]
        else:
            message_content = user_message
        
        async with self.async_client.messages.stream(
            model=model_id,
            system=system_prompt,
            messages=[{"role": "user", "content": message_content}],
            max_tokens=max_tokens,
            temperature=temperature,
        ) as stream:
            async for text_chunk in stream.text_stream:
                yield text_chunk
    
    async def call(
        self,
        system_prompt: str,
        user_message: Any,
        model: str,
        max_tokens: int = 50000,
        temperature: float = 1.0,
    ) -> str:
        """Call Claude and return complete response"""
        model_id = self.get_model_id(model)
        
        # Build message content
        if isinstance(user_message, str):
            message_content = [{"type": "text", "text": user_message}]
        else:
            message_content = user_message
        
        # Add timeout for large requests (15 minutes)
        response = await self.async_client.messages.create(
            model=model_id,
            system=system_prompt,
            messages=[{"role": "user", "content": message_content}],
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=900.0,
        )
        
        # Extract text from response
        text_content = ""
        for block in response.content:
            if block.type == "text":
                text_content += block.text
        
        return text_content
    
    def call_sync(
        self,
        system_prompt: str,
        user_message: Any,
        model: str,
        max_tokens: int = 50000,
        temperature: float = 1.0,
    ) -> str:
        """Synchronous version of call"""
        model_id = self.get_model_id(model)
        
        # Build message content
        if isinstance(user_message, str):
            message_content = [{"type": "text", "text": user_message}]
        else:
            message_content = user_message
        
        response = self.client.messages.create(
            model=model_id,
            system=system_prompt,
            messages=[{"role": "user", "content": message_content}],
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=900.0,
        )
        
        # Extract text from response
        text_content = ""
        for block in response.content:
            if block.type == "text":
                text_content += block.text
        
        return text_content
