"""
LLM Service for Multi-Provider API interactions
Supports Claude (Anthropic) and Gemini (Google) models
Handles streaming, JSON parsing, and response management
"""
import json
import os
from typing import Dict, Any, Optional, AsyncGenerator
import re

from app.providers import ProviderFactory

# Default model from environment or fallback to Claude Sonnet
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "claude-sonnet")


class LLMService:
    """Service for handling multi-provider LLM API calls"""
    
    def __init__(self, anthropic_api_key: str = None, google_api_key: str = None):
        """
        Initialize LLM service with API keys
        
        Args:
            anthropic_api_key: API key for Claude models
            google_api_key: API key for Gemini models
        """
        self.factory = ProviderFactory(
            anthropic_api_key=anthropic_api_key,
            google_api_key=google_api_key
        )
    
    def _load_prompt(self, prompt_name: str) -> str:
        """Load system prompt from prompts directory"""
        prompt_path = os.path.join("app", "prompts", f"{prompt_name}.md")
        
        if not os.path.exists(prompt_path):
            raise FileNotFoundError(f"Prompt file not found: {prompt_path}")
        
        with open(prompt_path, "r") as f:
            return f.read()
    
    def _extract_json_from_response(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract and parse JSON from LLM response
        Handles markdown code blocks and incomplete JSON
        """
        # Remove markdown code blocks if present
        text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^```\s*$', '', text, flags=re.MULTILINE)
        text = text.strip()
        
        # Try direct parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON object in text
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass
        
        # Try to fix incomplete JSON by adding missing brackets
        try:
            # Count braces and brackets
            open_braces = text.count('{') - text.count('}')
            open_brackets = text.count('[') - text.count(']')
            
            fixed_text = text
            fixed_text += '}' * open_braces
            fixed_text += ']' * open_brackets
            
            return json.loads(fixed_text)
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def call_claude_streaming(
        self,
        prompt_name: str,
        user_message: str,
        model: str = DEFAULT_MODEL,
        max_tokens: int = 50000,
        system_suffix: Optional[str] = None,
        temperature: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        """
        Stream response from any LLM provider
        Yields text chunks as they arrive
        
        Note: Method name kept for backward compatibility
        """
        system_prompt = self._load_prompt(prompt_name)
        
        if system_suffix:
            system_prompt += "\n\n" + system_suffix
        
        # Get provider and short model name
        provider = self.factory.get_provider(model)
        short_model = self.factory.get_short_model_name(model)
        
        # Stream response
        async for text_chunk in provider.call_streaming(
            system_prompt=system_prompt,
            user_message=user_message,
            model=short_model,
            max_tokens=max_tokens,
            temperature=temperature,
        ):
            yield text_chunk
    
    async def call_claude(
        self,
        prompt_name: str,
        user_message: Any,  # Can be string or list of content blocks
        model: str = DEFAULT_MODEL,
        max_tokens: int = 50000,
        system_suffix: Optional[str] = None,
        temperature: float = 1.0,
        parse_json: bool = False,
    ) -> Dict[str, Any]:
        """
        Call any LLM provider and return complete response
        
        Note: Method name kept for backward compatibility
        
        Args:
            prompt_name: Name of prompt file (without .md extension)
            user_message: User message content (text or list of content blocks)
            model: Model to use (e.g., 'claude-sonnet', 'gemini-flash')
            max_tokens: Maximum tokens in response
            system_suffix: Additional text to append to system prompt
            temperature: Sampling temperature (0-1)
            parse_json: Whether to parse response as JSON
            
        Returns:
            Dict with 'text' and optionally 'json' keys
        """
        system_prompt = self._load_prompt(prompt_name)
        
        if system_suffix:
            system_prompt += "\n\n" + system_suffix
        
        # For JSON responses, add explicit instruction
        if parse_json:
            system_prompt += "\n\nIMPORTANT: Output a single valid JSON object only. No markdown, no explanations."
        
        # Get provider and short model name
        provider = self.factory.get_provider(model)
        short_model = self.factory.get_short_model_name(model)
        
        # Call provider
        text_content = await provider.call(
            system_prompt=system_prompt,
            user_message=user_message,
            model=short_model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        
        result = {"text": text_content}
        
        # Parse JSON if requested
        if parse_json:
            parsed_json = self._extract_json_from_response(text_content)
            if parsed_json:
                result["json"] = parsed_json
            else:
                raise ValueError("Failed to parse JSON from response")
        
        return result
    
    def call_claude_sync(
        self,
        prompt_name: str,
        user_message: Any,
        model: str = DEFAULT_MODEL,
        max_tokens: int = 50000,
        system_suffix: Optional[str] = None,
        temperature: float = 1.0,
        parse_json: bool = False,
    ) -> Dict[str, Any]:
        """
        Synchronous version of call_claude
        
        Note: Method name kept for backward compatibility
        """
        system_prompt = self._load_prompt(prompt_name)
        
        if system_suffix:
            system_prompt += "\n\n" + system_suffix
        
        if parse_json:
            system_prompt += "\n\nIMPORTANT: Output a single valid JSON object only. No markdown, no explanations."
        
        # Get provider and short model name
        provider = self.factory.get_provider(model)
        short_model = self.factory.get_short_model_name(model)
        
        # Call provider
        text_content = provider.call_sync(
            system_prompt=system_prompt,
            user_message=user_message,
            model=short_model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        
        result = {"text": text_content}
        
        # Parse JSON if requested
        if parse_json:
            parsed_json = self._extract_json_from_response(text_content)
            if parsed_json:
                result["json"] = parsed_json
            else:
                raise ValueError("Failed to parse JSON from response")
        
        return result
    
    @staticmethod
    def list_available_models() -> Dict[str, list]:
        """List all available models grouped by provider"""
        return ProviderFactory.list_available_models()


def get_llm_service() -> LLMService:
    """Get LLM service instance with API keys from environment"""
    anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
    google_api_key = os.getenv("GOOGLE_API_KEY")
    
    if not anthropic_api_key and not google_api_key:
        raise ValueError(
            "At least one API key required: "
            "ANTHROPIC_API_KEY or GOOGLE_API_KEY"
        )
    
    return LLMService(
        anthropic_api_key=anthropic_api_key,
        google_api_key=google_api_key
    )
