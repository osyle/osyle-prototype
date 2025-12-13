"""
Gemini Provider Implementation
Uses Google's Gemini API
"""
from typing import AsyncGenerator, Any
import google.generativeai as genai
from .base import BaseLLMProvider


# Gemini model mappings - using the latest stable models
GEMINI_MODELS = {
    # Gemini 3 series (latest)
    "pro": "gemini-3-pro-preview",  # Most intelligent model
    
    # Gemini 2.5 series (stable, production-ready)
    "flash": "gemini-2.5-flash",  # Best price-performance
    "flash-lite": "gemini-2.5-flash-lite",  # Optimized for speed/cost
}


class GeminiProvider(BaseLLMProvider):
    """Provider for Google's Gemini models"""
    
    def __init__(self, api_key: str):
        """Initialize Gemini provider with API key"""
        genai.configure(api_key=api_key)
        self.api_key = api_key
    
    def get_model_id(self, model_name: str) -> str:
        """Get Gemini model ID from friendly name"""
        return GEMINI_MODELS.get(model_name, GEMINI_MODELS["flash"])
    
    def _prepare_content(self, user_message: Any) -> list:
        """
        Convert message format to Gemini's content format
        
        Gemini expects:
        - Text: string or {"text": "..."}
        - Image: {"inline_data": {"mime_type": "...", "data": base64}}
        """
        if isinstance(user_message, str):
            return [user_message]
        
        # Convert from Anthropic format to Gemini format
        gemini_content = []
        for block in user_message:
            if block.get("type") == "text":
                gemini_content.append(block["text"])
            elif block.get("type") == "image":
                # Convert Anthropic image format to Gemini format
                source = block.get("source", {})
                if source.get("type") == "base64":
                    gemini_content.append({
                        "inline_data": {
                            "mime_type": source.get("media_type", "image/png"),
                            "data": source.get("data")
                        }
                    })
        
        return gemini_content
    
    async def call_streaming(
        self,
        system_prompt: str,
        user_message: Any,
        model: str,
        max_tokens: int = 50000,
        temperature: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        """Stream response from Gemini"""
        model_id = self.get_model_id(model)
        
        # Create model with system instruction
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        gemini_model = genai.GenerativeModel(
            model_name=model_id,
            system_instruction=system_prompt,
            generation_config=generation_config,
        )
        
        # Prepare content
        content = self._prepare_content(user_message)
        
        # Stream response
        response = await gemini_model.generate_content_async(
            content,
            stream=True
        )
        
        async for chunk in response:
            if chunk.text:
                yield chunk.text
    
    async def call(
        self,
        system_prompt: str,
        user_message: Any,
        model: str,
        max_tokens: int = 50000,
        temperature: float = 1.0,
    ) -> str:
        """Call Gemini and return complete response"""
        model_id = self.get_model_id(model)
        
        # Create model with system instruction
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        gemini_model = genai.GenerativeModel(
            model_name=model_id,
            system_instruction=system_prompt,
            generation_config=generation_config,
        )
        
        # Prepare content
        content = self._prepare_content(user_message)
        
        # Generate response
        response = await gemini_model.generate_content_async(content)
        
        return response.text
    
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
        
        # Create model with system instruction
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        gemini_model = genai.GenerativeModel(
            model_name=model_id,
            system_instruction=system_prompt,
            generation_config=generation_config,
        )
        
        # Prepare content
        content = self._prepare_content(user_message)
        
        # Generate response
        response = gemini_model.generate_content(content)
        
        return response.text
