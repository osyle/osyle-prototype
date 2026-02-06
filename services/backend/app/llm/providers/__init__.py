"""
LLM Providers Package
Multi-provider abstraction layer for Claude, Gemini, and OpenAI
"""
from .base import BaseLLMProvider
from .anthropic import AnthropicProvider, CLAUDE_MODELS
from .google import GoogleProvider, GEMINI_MODELS
from .openai import OpenAIProvider, OPENAI_MODELS
from .registry import (
    MODEL_REGISTRY, ModelInfo,
    get_model_info, list_models,
    get_recommended_models, get_best_model_for_task,
    TASK_RECOMMENDATIONS
)
from .factory import ProviderFactory, get_factory, set_factory

__all__ = [
    # Base
    "BaseLLMProvider",
    
    # Providers
    "AnthropicProvider",
    "GoogleProvider",
    "OpenAIProvider",
    
    # Model registries
    "CLAUDE_MODELS",
    "GEMINI_MODELS",
    "OPENAI_MODELS",
    "MODEL_REGISTRY",
    
    # Registry functions
    "ModelInfo",
    "get_model_info",
    "list_models",
    "get_recommended_models",
    "get_best_model_for_task",
    "TASK_RECOMMENDATIONS",
    
    # Factory
    "ProviderFactory",
    "get_factory",
    "set_factory",
]
