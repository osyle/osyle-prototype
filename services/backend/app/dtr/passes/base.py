"""
Base Pass

Abstract base class for all extraction passes.
Provides common interface and utilities.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Literal
from datetime import datetime
import time


class BasePass(ABC):
    """
    Abstract base class for extraction passes
    
    All passes implement this interface for consistency.
    """
    
    def __init__(self):
        """Initialize pass"""
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
    
    @abstractmethod
    async def execute(
        self,
        figma_json: Optional[Dict[str, Any]] = None,
        image_bytes: Optional[bytes] = None,
        image_format: str = "png",
        prev_passes: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute the pass and return DTR data
        
        Args:
            figma_json: Optional Figma JSON document
            image_bytes: Optional image data
            image_format: Image format (png, jpg, webp)
            prev_passes: Results from previous passes (for dependent passes)
        
        Returns:
            Pass-specific DTR data
        """
        pass
    
    def _start_timing(self):
        """Start timing the pass execution"""
        self.start_time = time.time()
    
    def _end_timing(self) -> int:
        """
        End timing and return elapsed milliseconds
        
        Returns:
            Elapsed time in milliseconds
        """
        self.end_time = time.time()
        if self.start_time is None:
            return 0
        return int((self.end_time - self.start_time) * 1000)
    
    def _determine_authority(
        self,
        has_figma: bool,
        has_image: bool
    ) -> Literal["code", "vision", "hybrid"]:
        """
        Determine authority source based on available inputs
        
        Args:
            has_figma: Whether Figma JSON is available
            has_image: Whether image is available
        
        Returns:
            Authority: "code", "vision", or "hybrid"
        """
        if has_figma and has_image:
            return "hybrid"
        elif has_figma:
            return "code"
        else:
            return "vision"
    
    def _calculate_confidence(
        self,
        authority: Literal["code", "vision", "hybrid"],
        base_confidence: Optional[float] = None
    ) -> float:
        """
        Calculate confidence score based on authority and other factors
        
        Args:
            authority: Source of extraction
            base_confidence: Optional base confidence override
        
        Returns:
            Confidence score (0-1)
        """
        if base_confidence is not None:
            return base_confidence
        
        # Default confidence scores by authority
        confidence_map = {
            "code": 0.90,      # High confidence from Figma JSON
            "vision": 0.65,    # Lower confidence from vision only
            "hybrid": 0.95     # Highest confidence with both
        }
        
        return confidence_map[authority]
    
    def _add_metadata(
        self,
        data: Dict[str, Any],
        authority: Literal["code", "vision", "hybrid"],
        confidence: float
    ) -> Dict[str, Any]:
        """
        Add metadata to pass output
        
        Args:
            data: Pass-specific data
            authority: Source of extraction
            confidence: Confidence score
        
        Returns:
            Data with metadata added
        """
        elapsed_ms = self._end_timing()
        
        return {
            **data,
            "authority": authority,
            "confidence": confidence,
            "extracted_at": datetime.utcnow().isoformat(),
            "extraction_time_ms": elapsed_ms
        }
    
    def _validate_inputs(
        self,
        figma_json: Optional[Dict[str, Any]],
        image_bytes: Optional[bytes]
    ):
        """
        Validate that at least one input is provided
        
        Args:
            figma_json: Optional Figma JSON
            image_bytes: Optional image bytes
        
        Raises:
            ValueError: If neither input is provided
        """
        if figma_json is None and image_bytes is None:
            raise ValueError(
                f"{self.__class__.__name__} requires at least one input: "
                "figma_json or image_bytes"
            )


# ============================================================================
# PASS REGISTRY
# ============================================================================

class PassRegistry:
    """Registry of all available passes"""
    
    _passes: Dict[str, type] = {}
    
    @classmethod
    def register(cls, name: str, pass_class: type):
        """Register a pass"""
        cls._passes[name] = pass_class
    
    @classmethod
    def get(cls, name: str) -> type:
        """Get a pass class by name"""
        if name not in cls._passes:
            raise ValueError(f"Pass '{name}' not registered")
        return cls._passes[name]
    
    @classmethod
    def list_passes(cls) -> list[str]:
        """List all registered pass names"""
        return list(cls._passes.keys())
