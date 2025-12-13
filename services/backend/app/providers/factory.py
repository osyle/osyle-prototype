"""
Provider Factory
Creates the appropriate LLM provider based on model selection
"""
from typing import Dict, Any
from .base import BaseLLMProvider
from .claude import ClaudeProvider, CLAUDE_MODELS
from .gemini import GeminiProvider, GEMINI_MODELS


# Combined model registry
ALL_MODELS = {
    **{f"claude-{k}": v for k, v in CLAUDE_MODELS.items()},
    **{f"gemini-{k}": v for k, v in GEMINI_MODELS.items()},
}

# Provider mapping
PROVIDER_MAP = {
    "claude-haiku": "claude",
    "claude-sonnet": "claude",
    "claude-opus": "claude",
    "gemini-pro": "gemini",
    "gemini-flash": "gemini",
    "gemini-flash-lite": "gemini",
}


class ProviderFactory:
    """Factory for creating LLM providers"""
    
    def __init__(self, anthropic_api_key: str = None, google_api_key: str = None):
        """
        Initialize factory with API keys
        
        Args:
            anthropic_api_key: API key for Claude
            google_api_key: API key for Gemini
        """
        self.anthropic_api_key = anthropic_api_key
        self.google_api_key = google_api_key
        self._providers: Dict[str, BaseLLMProvider] = {}
    
    def get_provider(self, model_name: str) -> BaseLLMProvider:
        """
        Get provider instance for the given model
        
        Args:
            model_name: Full model name like 'claude-sonnet', 'gemini-flash'
            
        Returns:
            Provider instance
            
        Raises:
            ValueError: If model not found or API key missing
        """
        if model_name not in PROVIDER_MAP:
            raise ValueError(
                f"Unknown model: {model_name}. "
                f"Available models: {', '.join(ALL_MODELS.keys())}"
            )
        
        provider_type = PROVIDER_MAP[model_name]
        
        # Return cached provider if available
        if provider_type in self._providers:
            return self._providers[provider_type]
        
        # Create new provider
        if provider_type == "claude":
            if not self.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY required for Claude models")
            provider = ClaudeProvider(self.anthropic_api_key)
        elif provider_type == "gemini":
            if not self.google_api_key:
                raise ValueError("GOOGLE_API_KEY required for Gemini models")
            provider = GeminiProvider(self.google_api_key)
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")
        
        # Cache and return
        self._providers[provider_type] = provider
        return provider
    
    def get_short_model_name(self, full_model_name: str) -> str:
        """
        Extract short model name from full model name
        
        Args:
            full_model_name: Like 'claude-sonnet' or 'gemini-flash'
            
        Returns:
            Short name like 'sonnet' or 'flash'
        """
        if full_model_name.startswith("claude-"):
            return full_model_name.replace("claude-", "")
        elif full_model_name.startswith("gemini-"):
            return full_model_name.replace("gemini-", "")
        return full_model_name
    
    @staticmethod
    def list_available_models() -> Dict[str, list]:
        """
        List all available models grouped by provider
        
        Returns:
            Dict with provider names as keys and model lists as values
        """
        return {
            "claude": list(CLAUDE_MODELS.keys()),
            "gemini": list(GEMINI_MODELS.keys()),
        }
