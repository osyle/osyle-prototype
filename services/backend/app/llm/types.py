"""
Core type definitions for LLM infrastructure
"""
from typing import Dict, Any, List, Optional, Union, Literal, TypedDict, Callable
from dataclasses import dataclass, field
from enum import Enum


class Provider(str, Enum):
    """Supported LLM providers"""
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OPENAI = "openai"


class MessageRole(str, Enum):
    """Message roles in conversation"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


@dataclass
class ImageContent:
    """Image content for multimodal requests"""
    data: str  # Base64 encoded
    media_type: str = "image/png"
    detail: Optional[Literal["low", "medium", "high"]] = None  # For Gemini


@dataclass
class TextContent:
    """Text content block"""
    text: str


@dataclass
class Message:
    """A message in a conversation"""
    role: MessageRole
    content: Union[str, List[Union[TextContent, ImageContent]]]


@dataclass
class CacheConfig:
    """Configuration for prompt caching"""
    enabled: bool = False
    breakpoints: List[int] = field(default_factory=list)  # Token positions for cache breakpoints
    ttl: Optional[int] = None  # TTL in seconds (provider-specific)


@dataclass
class StructuredOutputConfig:
    """Configuration for structured outputs"""
    enabled: bool = False
    schema: Optional[Dict[str, Any]] = None  # JSON schema
    format: Literal["json", "json_schema"] = "json"
    strict: bool = False  # Enforce strict schema compliance


@dataclass
class ToolConfig:
    """Configuration for tool use"""
    enabled: bool = False
    tools: List[Dict[str, Any]] = field(default_factory=list)
    tool_choice: Optional[Union[str, Dict[str, str]]] = None


@dataclass
class ReasoningConfig:
    """Configuration for reasoning models (o-series)"""
    enabled: bool = False
    effort: Literal["low", "medium", "high"] = "medium"
    budget: Optional[int] = None  # Max thinking tokens


@dataclass
class GenerationConfig:
    """Complete configuration for a generation request"""
    model: str
    system_prompt: Optional[str] = None
    max_tokens: int = 4096
    temperature: float = 1.0
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    stop_sequences: Optional[List[str]] = None
    
    # Advanced features
    cache_config: Optional[CacheConfig] = None
    structured_output: Optional[StructuredOutputConfig] = None
    tool_config: Optional[ToolConfig] = None
    reasoning_config: Optional[ReasoningConfig] = None
    
    # Streaming
    stream: bool = False
    
    # Timeouts
    timeout: float = 600.0  # 10 minutes default


@dataclass
class Usage:
    """Token usage information"""
    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0
    reasoning_tokens: int = 0  # For o-series models
    
    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class GenerationResponse:
    """Response from LLM generation"""
    text: str
    usage: Usage
    model: str
    finish_reason: Optional[str] = None
    structured_output: Optional[Dict[str, Any]] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    raw_response: Optional[Any] = None  # For debugging


@dataclass
class Cost:
    """Cost calculation for a request"""
    input_cost: float
    output_cost: float
    cached_cost: float
    total_cost: float
    
    def __add__(self, other: 'Cost') -> 'Cost':
        return Cost(
            input_cost=self.input_cost + other.input_cost,
            output_cost=self.output_cost + other.output_cost,
            cached_cost=self.cached_cost + other.cached_cost,
            total_cost=self.total_cost + other.total_cost
        )


# Type aliases for convenience
ContentBlock = Union[TextContent, ImageContent]
UserMessage = Union[str, List[ContentBlock]]
StreamCallback = Callable[[str], None]
