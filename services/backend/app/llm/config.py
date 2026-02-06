"""
Configuration management for LLM infrastructure
"""
import os
from typing import Dict, Optional
from dataclasses import dataclass, field


@dataclass
class ModelPricing:
    """Pricing information for a model"""
    input_per_million: float  # $/M tokens
    output_per_million: float
    cached_input_per_million: Optional[float] = None  # For prompt caching
    
    def calculate_cost(
        self, 
        input_tokens: int, 
        output_tokens: int,
        cached_tokens: int = 0
    ) -> float:
        """Calculate cost for a request"""
        input_cost = (input_tokens * self.input_per_million) / 1_000_000
        output_cost = (output_tokens * self.output_per_million) / 1_000_000
        cached_cost = 0.0
        
        if cached_tokens > 0 and self.cached_input_per_million:
            cached_cost = (cached_tokens * self.cached_input_per_million) / 1_000_000
        
        return input_cost + output_cost + cached_cost


@dataclass
class ProviderConfig:
    """Configuration for a specific provider"""
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    default_model: Optional[str] = None
    timeout: float = 600.0
    max_retries: int = 3
    
    @classmethod
    def from_env(cls, provider: str) -> 'ProviderConfig':
        """Load provider config from environment variables"""
        key_var = f"{provider.upper()}_API_KEY"
        url_var = f"{provider.upper()}_BASE_URL"
        
        return cls(
            api_key=os.getenv(key_var),
            base_url=os.getenv(url_var),
        )


@dataclass
class LLMConfig:
    """Global LLM configuration"""
    # Provider configs
    anthropic: ProviderConfig = field(default_factory=lambda: ProviderConfig.from_env("anthropic"))
    google: ProviderConfig = field(default_factory=lambda: ProviderConfig.from_env("google"))
    openai: ProviderConfig = field(default_factory=lambda: ProviderConfig.from_env("openai"))
    
    # Default settings
    default_model: str = "claude-sonnet-4.5"
    default_temperature: float = 1.0
    default_max_tokens: int = 4096
    
    # Feature flags
    enable_caching: bool = True
    enable_retries: bool = True
    enable_fallbacks: bool = True
    enable_cost_tracking: bool = True
    enable_observability: bool = True
    
    # Observability
    log_prompts: bool = False  # Set True for debugging
    log_responses: bool = False
    
    @classmethod
    def from_env(cls) -> 'LLMConfig':
        """Load configuration from environment variables"""
        return cls(
            default_model=os.getenv("DEFAULT_LLM_MODEL", "claude-sonnet-4.5"),
            enable_caching=os.getenv("LLM_ENABLE_CACHING", "true").lower() == "true",
            log_prompts=os.getenv("LLM_LOG_PROMPTS", "false").lower() == "true",
            log_responses=os.getenv("LLM_LOG_RESPONSES", "false").lower() == "true",
        )


# Model pricing registry (as of Feb 2026)
MODEL_PRICING: Dict[str, ModelPricing] = {
    # Anthropic Claude 4.5
    "claude-opus-4.5": ModelPricing(5.00, 25.00, 0.50),
    "claude-sonnet-4.5": ModelPricing(3.00, 15.00, 0.30),
    "claude-haiku-4.5": ModelPricing(1.00, 5.00, 0.10),
    
    # Google Gemini 3
    "gemini-3-pro": ModelPricing(2.00, 12.00, 0.20),
    "gemini-3-flash": ModelPricing(0.50, 3.00, 0.05),
    
    # Google Gemini 2.5
    "gemini-2.5-pro": ModelPricing(1.25, 10.00, 0.125),
    "gemini-2.5-flash": ModelPricing(0.30, 2.50, 0.03),
    "gemini-2.5-flash-lite": ModelPricing(0.10, 0.40, 0.01),
    
    # OpenAI GPT-5.2
    "gpt-5.2-pro": ModelPricing(21.00, 168.00),
    "gpt-5.2": ModelPricing(1.75, 14.00, 0.175),
    
    # OpenAI GPT-4.1
    "gpt-4.1": ModelPricing(2.00, 8.00, 0.50),
    
    # OpenAI o-series
    "o3": ModelPricing(2.00, 8.00, 0.50),
    "o4-mini": ModelPricing(1.10, 4.40, 0.275),
    
    # OpenAI GPT-4o
    "gpt-4o": ModelPricing(2.50, 10.00, 0.625),
    "gpt-4o-mini": ModelPricing(0.15, 0.60, 0.075),
}


def get_model_pricing(model: str) -> Optional[ModelPricing]:
    """Get pricing for a model"""
    return MODEL_PRICING.get(model)


# Global config instance
_config: Optional[LLMConfig] = None


def get_config() -> LLMConfig:
    """Get global LLM configuration"""
    global _config
    if _config is None:
        _config = LLMConfig.from_env()
    return _config


def set_config(config: LLMConfig):
    """Set global LLM configuration"""
    global _config
    _config = config
