"""
LLM Service for Claude API interactions
Handles streaming, JSON parsing, and response management
"""
import json
import os
from typing import Dict, Any, Optional, List, AsyncGenerator
from anthropic import Anthropic, AsyncAnthropic
import re

# Model options (easy to change)
MODELS = {
    "haiku": "claude-haiku-4-5-20251001",
    "sonnet": "claude-sonnet-4-5-20251001", 
    "opus": "claude-opus-4-1-20250514",
}

class LLMService:
    """Service for handling Claude API calls with streaming and JSON parsing"""
    
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
        self.async_client = AsyncAnthropic(api_key=api_key)
        
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
        model: str = "haiku",
        max_tokens: int = 50000,
        system_suffix: Optional[str] = None,
        temperature: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        """
        Stream response from Claude API
        Yields text chunks as they arrive
        """
        system_prompt = self._load_prompt(prompt_name)
        
        if system_suffix:
            system_prompt += "\n\n" + system_suffix
        
        model_id = MODELS.get(model, MODELS["haiku"])
        
        async with self.async_client.messages.stream(
            model=model_id,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            max_tokens=max_tokens,
            temperature=temperature,
        ) as stream:
            async for text_chunk in stream.text_stream:
                yield text_chunk
    
    async def call_claude(
        self,
        prompt_name: str,
        user_message: str,
        model: str = "haiku",
        max_tokens: int = 50000,
        system_suffix: Optional[str] = None,
        temperature: float = 1.0,
        parse_json: bool = False,
    ) -> Dict[str, Any]:
        """
        Call Claude API and return complete response
        
        Args:
            prompt_name: Name of prompt file (without .md extension)
            user_message: User message content (text or list of content blocks)
            model: Model to use (haiku, sonnet, opus)
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
        
        model_id = MODELS.get(model, MODELS["haiku"])
        
        # Build message content
        if isinstance(user_message, str):
            message_content = [{"type": "text", "text": user_message}]
        else:
            message_content = user_message
        
        # ✅ FIX: Add timeout for large requests (images, long content)
        # Set to 15 minutes (900 seconds) to handle large images
        response = await self.async_client.messages.create(
            model=model_id,
            system=system_prompt,
            messages=[{"role": "user", "content": message_content}],
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=900.0,  # ✅ 15 minutes timeout for large requests
        )
        
        # Extract text from response
        text_content = ""
        for block in response.content:
            if block.type == "text":
                text_content += block.text
        
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
        user_message: str,
        model: str = "haiku",
        max_tokens: int = 50000,
        system_suffix: Optional[str] = None,
        temperature: float = 1.0,
        parse_json: bool = False,
    ) -> Dict[str, Any]:
        """Synchronous version of call_claude"""
        system_prompt = self._load_prompt(prompt_name)
        
        if system_suffix:
            system_prompt += "\n\n" + system_suffix
        
        if parse_json:
            system_prompt += "\n\nIMPORTANT: Output a single valid JSON object only. No markdown, no explanations."
        
        model_id = MODELS.get(model, MODELS["haiku"])
        
        # Build message content
        if isinstance(user_message, str):
            message_content = [{"type": "text", "text": user_message}]
        else:
            message_content = user_message
        
        # ✅ FIX: Add timeout for large requests
        response = self.client.messages.create(
            model=model_id,
            system=system_prompt,
            messages=[{"role": "user", "content": message_content}],
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=900.0,  # ✅ 15 minutes timeout
        )
        
        # Extract text from response
        text_content = ""
        for block in response.content:
            if block.type == "text":
                text_content += block.text
        
        result = {"text": text_content}
        
        # Parse JSON if requested
        if parse_json:
            parsed_json = self._extract_json_from_response(text_content)
            if parsed_json:
                result["json"] = parsed_json
            else:
                raise ValueError("Failed to parse JSON from response")
        
        return result


def get_llm_service() -> LLMService:
    """Get LLM service instance with API key from environment"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not found in environment")
    return LLMService(api_key)
