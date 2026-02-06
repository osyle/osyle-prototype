"""
Pass 1: Structural Skeleton

Extract layout topology, hierarchy, density, and spacing system from design.

Handles three scenarios:
1. Figma JSON only → Code extraction (high confidence)
2. Image only → Vision analysis (lower confidence)
3. Both → Hybrid (code + vision validation, highest confidence)
"""
from typing import Dict, Any, Optional
from .base import BasePass, PassRegistry
from ..schemas import Pass1StructureDTR
from ..extractors import parse_figma_structure, analyze_structure_from_image, validate_hierarchy


class Pass1Structure(BasePass):
    """
    Pass 1: Structural Skeleton
    
    Extracts the design's information architecture, spatial organization,
    and hierarchy logic, stripping away visual treatment.
    """
    
    async def execute(
        self,
        figma_json: Optional[Dict[str, Any]] = None,
        image_bytes: Optional[bytes] = None,
        image_format: str = "png",
        prev_passes: Optional[Dict[str, Any]] = None
    ) -> Pass1StructureDTR:
        """
        Execute Pass 1: Structural Skeleton
        
        Args:
            figma_json: Optional Figma JSON document
            image_bytes: Optional image data
            image_format: Image format (png, jpg, webp)
            prev_passes: Not used (Pass 1 is independent)
        
        Returns:
            Pass1StructureDTR with structural analysis
        """
        # Validate inputs
        self._validate_inputs(figma_json, image_bytes)
        
        # Start timing
        self._start_timing()
        
        # Determine which inputs are available
        has_figma = figma_json is not None
        has_image = image_bytes is not None
        
        # Route to appropriate extraction method
        if has_figma and not has_image:
            # Scenario A: Figma JSON only
            data = await self._extract_from_figma(figma_json)
            authority = "code"
            confidence = 0.90
        
        elif has_image and not has_figma:
            # Scenario B: Image only
            data = await self._extract_from_vision(image_bytes, image_format)
            authority = "vision"
            confidence = 0.65
        
        else:
            # Scenario C: Both (hybrid)
            data = await self._extract_hybrid(figma_json, image_bytes, image_format)
            authority = "hybrid"
            confidence = 0.95
        
        # Add metadata
        data_with_metadata = self._add_metadata(data, authority, confidence)
        
        # Validate and return as Pydantic model
        return Pass1StructureDTR(**data_with_metadata)
    
    async def _extract_from_figma(
        self,
        figma_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract structure from Figma JSON (code-driven)
        
        High confidence, exact measurements.
        
        Args:
            figma_json: Figma JSON document
        
        Returns:
            Structure data dict
        """
        # Use code parser
        result = parse_figma_structure(figma_json)
        
        return result
    
    async def _extract_from_vision(
        self,
        image_bytes: bytes,
        image_format: str
    ) -> Dict[str, Any]:
        """
        Extract structure from image (vision-driven)
        
        Lower confidence, approximate measurements.
        
        Args:
            image_bytes: Image data
            image_format: Image format
        
        Returns:
            Structure data dict
        """
        # Use vision analyzer
        result = await analyze_structure_from_image(image_bytes, image_format)
        
        return result
    
    async def _extract_hybrid(
        self,
        figma_json: Dict[str, Any],
        image_bytes: bytes,
        image_format: str
    ) -> Dict[str, Any]:
        """
        Extract structure using both Figma JSON and image (hybrid)
        
        Highest confidence. Code extraction for measurements,
        vision validation for visual hierarchy.
        
        Args:
            figma_json: Figma JSON document
            image_bytes: Image data
            image_format: Image format
        
        Returns:
            Combined structure data dict
        """
        import asyncio
        
        # Run both extractions in parallel
        # Figma parsing is synchronous, so wrap in thread to avoid blocking
        figma_task = asyncio.to_thread(parse_figma_structure, figma_json)
        
        # Vision analysis runs independently
        vision_task = analyze_structure_from_image(image_bytes, image_format)
        
        # Wait for both to complete in parallel
        figma_data, vision_data = await asyncio.gather(figma_task, vision_task)
        
        # Use Figma as primary source (higher confidence for measurements)
        result = figma_data.copy()
        
        # Cross-validate hierarchy from vision
        # Compare code hierarchy vs visual hierarchy
        code_hierarchy = figma_data.get("hierarchy", {})
        vision_hierarchy = vision_data.get("hierarchy", {})
        
        # If there are significant differences, note them
        code_levels = len(code_hierarchy.get("levels", []))
        vision_levels = len(vision_hierarchy.get("levels", []))
        
        if abs(code_levels - vision_levels) > 1:
            # Significant discrepancy
            result["hierarchy"]["validation"] = {
                "matches": False,
                "code_levels": code_levels,
                "vision_levels": vision_levels,
                "note": "Visual hierarchy differs from structural hierarchy"
            }
        else:
            result["hierarchy"]["validation"] = {
                "matches": True,
                "note": "Code and vision hierarchies align"
            }
        
        return result


# Register this pass
PassRegistry.register("pass_1_structure", Pass1Structure)


# ============================================================================
# PUBLIC API
# ============================================================================

async def run_pass_1(
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png"
) -> Pass1StructureDTR:
    """
    Run Pass 1: Structural Skeleton
    
    Convenience function for running Pass 1 directly.
    
    Args:
        figma_json: Optional Figma JSON document
        image_bytes: Optional image data
        image_format: Image format (png, jpg, webp)
    
    Returns:
        Pass1StructureDTR with structural analysis
    """
    pass_instance = Pass1Structure()
    return await pass_instance.execute(
        figma_json=figma_json,
        image_bytes=image_bytes,
        image_format=image_format
    )