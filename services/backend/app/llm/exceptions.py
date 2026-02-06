"""
Custom exceptions for LLM infrastructure
"""


class LLMError(Exception):
    """Base exception for LLM-related errors"""
    pass


class ProviderError(LLMError):
    """Error from LLM provider"""
    def __init__(self, message: str, provider: str, status_code: int = None):
        self.provider = provider
        self.status_code = status_code
        super().__init__(f"[{provider}] {message}")


class RateLimitError(ProviderError):
    """Rate limit exceeded"""
    pass


class AuthenticationError(ProviderError):
    """Authentication failed"""
    pass


class InvalidRequestError(ProviderError):
    """Invalid request parameters"""
    pass


class ModelNotFoundError(LLMError):
    """Requested model not found"""
    def __init__(self, model: str, available_models: list = None):
        self.model = model
        self.available_models = available_models
        message = f"Model '{model}' not found"
        if available_models:
            message += f". Available: {', '.join(available_models)}"
        super().__init__(message)


class ValidationError(LLMError):
    """Response validation failed"""
    pass


class StructuredOutputError(ValidationError):
    """Failed to parse structured output"""
    def __init__(self, message: str, raw_output: str = None):
        self.raw_output = raw_output
        super().__init__(message)


class ContextLengthError(ProviderError):
    """Context length exceeded"""
    def __init__(self, message: str, provider: str, tokens_used: int, max_tokens: int):
        self.tokens_used = tokens_used
        self.max_tokens = max_tokens
        super().__init__(message, provider)


class TimeoutError(ProviderError):
    """Request timeout"""
    pass


class ToolExecutionError(LLMError):
    """Error executing tool"""
    def __init__(self, tool_name: str, error: str):
        self.tool_name = tool_name
        super().__init__(f"Tool '{tool_name}' failed: {error}")


class LoopNonConvergenceError(LLMError):
    """Agentic loop failed to converge"""
    def __init__(self, iterations: int, max_iterations: int, reason: str = None):
        self.iterations = iterations
        self.max_iterations = max_iterations
        message = f"Loop failed to converge after {iterations} iterations"
        if reason:
            message += f": {reason}"
        super().__init__(message)
