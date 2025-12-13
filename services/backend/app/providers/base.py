"""
Base Provider Interface for LLM Services
Defines the contract that all LLM providers must implement
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, AsyncGenerator


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    def __init__(self, api_key: str):
        """Initialize provider with API key"""
        pass
    
    @abstractmethod
    async def call_streaming(
        self,
        system_prompt: str,
        user_message: Any,  # Can be string or list of content blocks
        model: str,
        max_tokens: int = 50000,
        temperature: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        """
        Stream response from LLM
        
        Args:
            system_prompt: System prompt text
            user_message: User message (string or list of content blocks)
            model: Model identifier
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            
        Yields:
            Text chunks as they arrive
        """
        pass
    
    @abstractmethod
    async def call(
        self,
        system_prompt: str,
        user_message: Any,  # Can be string or list of content blocks
        model: str,
        max_tokens: int = 50000,
        temperature: float = 1.0,
    ) -> str:
        """
        Call LLM and return complete response
        
        Args:
            system_prompt: System prompt text
            user_message: User message (string or list of content blocks)
            model: Model identifier
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            
        Returns:
            Complete response text
        """
        pass
    
    @abstractmethod
    def call_sync(
        self,
        system_prompt: str,
        user_message: Any,
        model: str,
        max_tokens: int = 50000,
        temperature: float = 1.0,
    ) -> str:
        """
        Synchronous version of call
        
        Args:
            system_prompt: System prompt text
            user_message: User message (string or list of content blocks)
            model: Model identifier
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            
        Returns:
            Complete response text
        """
        pass
    
    @abstractmethod
    def get_model_id(self, model_name: str) -> str:
        """
        Get the actual model ID for a friendly model name
        
        Args:
            model_name: Friendly name like 'sonnet', 'flash', etc.
            
        Returns:
            Actual model ID string for the API
        """
        pass
