"""
Provider factory for creating appropriate LLM provider instances
"""
from typing import Optional, Dict
from .base import BaseLLMProvider
from .anthropic import AnthropicProvider
from .google import GoogleProvider
from .openai import OpenAIProvider
from .registry import MODEL_REGISTRY, get_model_info
from ..types import Provider
from ..config import get_config
from ..exceptions import ModelNotFoundError


class ProviderFactory:
    """
    Factory for creating and caching LLM provider instances
    """
    
    def __init__(
        self,
        anthropic_api_key: Optional[str] = None,
        google_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None
    ):
        """
        Initialize factory with API keys
        
        Args:
            anthropic_api_key: API key for Claude
            google_api_key: API key for Gemini
            openai_api_key: API key for OpenAI
        """
        config = get_config()
        
        # Use provided keys or fallback to config
        self.anthropic_api_key = anthropic_api_key or config.anthropic.api_key
        self.google_api_key = google_api_key or config.google.api_key
        self.openai_api_key = openai_api_key or config.openai.api_key
        
        # Cache for provider instances
        self._providers: Dict[Provider, BaseLLMProvider] = {}
    
    def get_provider_for_model(self, model_name: str) -> BaseLLMProvider:
        """
        Get provider instance for a specific model
        
        Args:
            model_name: Model name (e.g., 'claude-sonnet-4.5', 'gemini-2.5-flash')
            
        Returns:
            Provider instance
            
        Raises:
            ModelNotFoundError: If model not found
            ValueError: If API key missing for provider
        """
        # Get model info
        model_info = get_model_info(model_name)
        if not model_info:
            raise ModelNotFoundError(
                model_name,
                list(MODEL_REGISTRY.keys())
            )
        
        # Get or create provider
        provider_type = model_info.provider
        
        if provider_type in self._providers:
            return self._providers[provider_type]
        
        # Create new provider
        if provider_type == Provider.ANTHROPIC:
            if not self.anthropic_api_key:
                raise ValueError(
                    "ANTHROPIC_API_KEY required for Claude models. "
                    "Set in environment or pass to ProviderFactory."
                )
            provider = AnthropicProvider(self.anthropic_api_key)
        
        elif provider_type == Provider.GOOGLE:
            if not self.google_api_key:
                raise ValueError(
                    "GOOGLE_API_KEY required for Gemini models. "
                    "Set in environment or pass to ProviderFactory."
                )
            provider = GoogleProvider(self.google_api_key)
        
        elif provider_type == Provider.OPENAI:
            if not self.openai_api_key:
                raise ValueError(
                    "OPENAI_API_KEY required for OpenAI models. "
                    "Set in environment or pass to ProviderFactory."
                )
            provider = OpenAIProvider(self.openai_api_key)
        
        else:
            raise ValueError(f"Unknown provider: {provider_type}")
        
        # Cache and return
        self._providers[provider_type] = provider
        return provider
    
    def get_provider_by_type(self, provider: Provider) -> BaseLLMProvider:
        """
        Get provider instance by provider type
        
        Args:
            provider: Provider enum value
            
        Returns:
            Provider instance
            
        Raises:
            ValueError: If API key missing
        """
        if provider in self._providers:
            return self._providers[provider]
        
        # Create provider
        if provider == Provider.ANTHROPIC:
            if not self.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY required")
            instance = AnthropicProvider(self.anthropic_api_key)
        elif provider == Provider.GOOGLE:
            if not self.google_api_key:
                raise ValueError("GOOGLE_API_KEY required")
            instance = GoogleProvider(self.google_api_key)
        elif provider == Provider.OPENAI:
            if not self.openai_api_key:
                raise ValueError("OPENAI_API_KEY required")
            instance = OpenAIProvider(self.openai_api_key)
        else:
            raise ValueError(f"Unknown provider: {provider}")
        
        self._providers[provider] = instance
        return instance
    
    @staticmethod
    def list_available_models() -> Dict[str, list]:
        """
        List all available models grouped by provider
        
        Returns:
            Dict with provider names as keys and model name lists as values
        """
        from .registry import list_models
        
        result = {}
        for provider in Provider:
            models = list_models(provider)
            result[provider.value] = [m.id for m in models]
        
        return result
    
    @staticmethod
    def validate_model(model_name: str) -> bool:
        """Check if model name is valid"""
        return model_name in MODEL_REGISTRY


# Global factory instance
_factory: Optional[ProviderFactory] = None


def get_factory() -> ProviderFactory:
    """Get global provider factory instance"""
    global _factory
    if _factory is None:
        _factory = ProviderFactory()
    return _factory


def set_factory(factory: ProviderFactory):
    """Set global provider factory instance"""
    global _factory
    _factory = factory
