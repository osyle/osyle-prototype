"""
Model registry with comprehensive model information
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
from ..types import Provider


@dataclass
class ModelInfo:
    """Complete information about a model"""
    id: str
    provider: Provider
    display_name: str
    context_window: int
    supports_vision: bool
    supports_tools: bool
    supports_caching: bool
    is_reasoning: bool = False
    
    # Pricing ($ per million tokens)
    input_price: float = 0.0
    output_price: float = 0.0
    cached_price: Optional[float] = None
    
    # Metadata
    description: str = ""
    best_for: List[str] = None
    
    def __post_init__(self):
        if self.best_for is None:
            self.best_for = []


# Complete model registry
MODEL_REGISTRY: Dict[str, ModelInfo] = {
    # Anthropic Claude 4.5 family
    "claude-haiku-4.5": ModelInfo(
        id="claude-haiku-4-5-20251001",
        provider=Provider.ANTHROPIC,
        display_name="Claude Haiku 4.5",
        context_window=200000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=1.00,
        output_price=5.00,
        cached_price=0.10,
        description="Fast, cost-efficient model for high-volume operations",
        best_for=["classification", "fast_evaluation", "simple_tasks", "high_volume"]
    ),
    "claude-sonnet-4.5": ModelInfo(
        id="claude-sonnet-4-5-20250929",
        provider=Provider.ANTHROPIC,
        display_name="Claude Sonnet 4.5",
        context_window=200000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=3.00,
        output_price=15.00,
        cached_price=0.30,
        description="Best for code generation and production workflows",
        best_for=["code_generation", "react_tailwind", "design_to_code", "production_default"]
    ),
    "claude-opus-4.5": ModelInfo(
        id="claude-opus-4-5-20251101",
        provider=Provider.ANTHROPIC,
        display_name="Claude Opus 4.5",
        context_window=200000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=5.00,
        output_price=25.00,
        cached_price=0.50,
        description="Maximum intelligence for complex reasoning and agentic workflows",
        best_for=["complex_reasoning", "agentic_workflows", "maximum_quality"]
    ),
    
    # Google Gemini 3 family
    "gemini-3-pro": ModelInfo(
        id="gemini-3-pro-preview",
        provider=Provider.GOOGLE,
        display_name="Gemini 3 Pro",
        context_window=1000000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=2.00,
        output_price=12.00,
        cached_price=0.20,
        description="Best multimodal model with 1M context",
        best_for=["multimodal", "agentic", "long_context"]
    ),
    "gemini-3-flash": ModelInfo(
        id="gemini-3-flash-preview",
        provider=Provider.GOOGLE,
        display_name="Gemini 3 Flash",
        context_window=1000000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=0.50,
        output_price=3.00,
        cached_price=0.05,
        description="Frontier intelligence with speed",
        best_for=["speed", "frontier_intelligence", "multimodal"]
    ),
    
    # Google Gemini 2.5 family (stable)
    "gemini-2.5-pro": ModelInfo(
        id="gemini-2.5-pro",
        provider=Provider.GOOGLE,
        display_name="Gemini 2.5 Pro",
        context_window=1000000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=1.25,
        output_price=10.00,
        cached_price=0.125,
        description="#1 WebDev Arena model for UI/web development",
        best_for=["web_development", "ui_analysis", "stable_production"]
    ),
    "gemini-2.5-flash": ModelInfo(
        id="gemini-2.5-flash",
        provider=Provider.GOOGLE,
        display_name="Gemini 2.5 Flash",
        context_window=1000000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=0.30,
        output_price=2.50,
        cached_price=0.03,
        description="Best price-performance ratio for vision and analysis",
        best_for=["vision_analysis", "design_analysis", "cost_efficient", "default_vision"]
    ),
    "gemini-2.5-flash-lite": ModelInfo(
        id="gemini-2.5-flash-lite",
        provider=Provider.GOOGLE,
        display_name="Gemini 2.5 Flash Lite",
        context_window=1000000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=0.10,
        output_price=0.40,
        cached_price=0.01,
        description="Ultra-low cost with highest throughput",
        best_for=["ultra_low_cost", "highest_throughput"]
    ),
    
    # OpenAI GPT-5.2 family
    "gpt-5.2-pro": ModelInfo(
        id="gpt-5.2-pro",
        provider=Provider.OPENAI,
        display_name="GPT-5.2 Pro",
        context_window=400000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=False,
        input_price=21.00,
        output_price=168.00,
        description="Highest capability GPT model",
        best_for=["maximum_capability"]
    ),
    "gpt-5.2": ModelInfo(
        id="gpt-5.2",
        provider=Provider.OPENAI,
        display_name="GPT-5.2",
        context_window=400000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=1.75,
        output_price=14.00,
        cached_price=0.175,
        description="Latest flagship GPT model",
        best_for=["latest_flagship"]
    ),
    
    # OpenAI GPT-4.1
    "gpt-4.1": ModelInfo(
        id="gpt-4.1",
        provider=Provider.OPENAI,
        display_name="GPT-4.1",
        context_window=1000000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=2.00,
        output_price=8.00,
        cached_price=0.50,
        description="Best for coding with 1M context window",
        best_for=["coding", "large_codebase", "long_context"]
    ),
    
    # OpenAI o-series reasoning models
    "o3": ModelInfo(
        id="o3",
        provider=Provider.OPENAI,
        display_name="OpenAI o3",
        context_window=200000,
        supports_vision=True,
        supports_tools=False,
        supports_caching=True,
        is_reasoning=True,
        input_price=2.00,
        output_price=8.00,
        cached_price=0.50,
        description="Deep reasoning for complex planning",
        best_for=["deep_reasoning", "complex_planning"]
    ),
    "o4-mini": ModelInfo(
        id="o4-mini",
        provider=Provider.OPENAI,
        display_name="OpenAI o4-mini",
        context_window=200000,
        supports_vision=True,
        supports_tools=False,
        supports_caching=True,
        is_reasoning=True,
        input_price=1.10,
        output_price=4.40,
        cached_price=0.275,
        description="Cost-efficient reasoning model",
        best_for=["reasoning", "taste_synthesis", "personality_analysis"]
    ),
    
    # OpenAI GPT-4o family
    "gpt-4o": ModelInfo(
        id="gpt-4o-2024-11-20",
        provider=Provider.OPENAI,
        display_name="GPT-4o",
        context_window=128000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=2.50,
        output_price=10.00,
        cached_price=0.625,
        description="Multimodal flagship model",
        best_for=["multimodal"]
    ),
    "gpt-4o-mini": ModelInfo(
        id="gpt-4o-mini-2024-07-18",
        provider=Provider.OPENAI,
        display_name="GPT-4o Mini",
        context_window=128000,
        supports_vision=True,
        supports_tools=True,
        supports_caching=True,
        input_price=0.15,
        output_price=0.60,
        cached_price=0.075,
        description="Budget-friendly multimodal model",
        best_for=["budget_multimodal"]
    ),
}


# Task-based recommendations
TASK_RECOMMENDATIONS = {
    "vision_analysis": ["gemini-2.5-flash", "gemini-2.5-pro", "claude-sonnet-4.5"],
    "code_generation": ["claude-sonnet-4.5", "gpt-4.1", "claude-opus-4.5"],
    "deep_reasoning": ["o4-mini", "claude-opus-4.5", "o3"],
    "fast_evaluation": ["claude-haiku-4.5", "gemini-2.5-flash-lite"],
    "structured_extraction": ["claude-sonnet-4.5", "gemini-2.5-flash"],
    "large_context": ["gpt-4.1", "gemini-2.5-pro", "claude-sonnet-4.5"],
    "cost_efficient": ["gemini-2.5-flash-lite", "claude-haiku-4.5", "gpt-4o-mini"],
}


def get_model_info(model_name: str) -> Optional[ModelInfo]:
    """Get information about a model"""
    return MODEL_REGISTRY.get(model_name)


def list_models(provider: Optional[Provider] = None) -> List[ModelInfo]:
    """List all models, optionally filtered by provider"""
    if provider:
        return [
            info for info in MODEL_REGISTRY.values()
            if info.provider == provider
        ]
    return list(MODEL_REGISTRY.values())


def get_recommended_models(task: str) -> List[str]:
    """Get recommended models for a specific task"""
    return TASK_RECOMMENDATIONS.get(task, [])


def get_cheapest_model(
    requires_vision: bool = False,
    requires_tools: bool = False,
    requires_caching: bool = False
) -> Optional[str]:
    """Find the cheapest model that meets requirements"""
    candidates = []
    
    for name, info in MODEL_REGISTRY.items():
        if requires_vision and not info.supports_vision:
            continue
        if requires_tools and not info.supports_tools:
            continue
        if requires_caching and not info.supports_caching:
            continue
        
        # Calculate average cost
        avg_cost = (info.input_price + info.output_price) / 2
        candidates.append((name, avg_cost))
    
    if not candidates:
        return None
    
    return min(candidates, key=lambda x: x[1])[0]


def get_best_model_for_task(
    task: str,
    budget: Optional[str] = None  # "low", "medium", "high"
) -> Optional[str]:
    """
    Get the best model for a task within budget
    
    Args:
        task: Task type (vision_analysis, code_generation, etc.)
        budget: Budget tier - "low", "medium", or "high"
    
    Returns:
        Model name or None
    """
    recommendations = TASK_RECOMMENDATIONS.get(task)
    if not recommendations:
        return None
    
    if budget == "low":
        # Return cheapest recommended model
        costs = []
        for model in recommendations:
            info = MODEL_REGISTRY.get(model)
            if info:
                avg_cost = (info.input_price + info.output_price) / 2
                costs.append((model, avg_cost))
        return min(costs, key=lambda x: x[1])[0] if costs else recommendations[0]
    elif budget == "high":
        # Return most expensive (usually best) model
        return recommendations[0]
    else:
        # Return middle option
        mid_idx = len(recommendations) // 2
        return recommendations[mid_idx]
