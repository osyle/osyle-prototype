"""
Pass 1: Structural Skeleton

Extract layout topology, hierarchy, density, and spacing system from design.

Handles three scenarios:
1. Figma JSON only → Code extraction + LLM analysis (high confidence)
2. Image only → Vision analysis (lower confidence)
3. Both → Hybrid (code + vision validation, highest confidence)
"""
from typing import Dict, Any, Optional
from .base import BasePass, PassRegistry
from ..schemas import Pass1StructureDTR
from ..extractors import parse_figma_structure, analyze_structure_from_image, validate_hierarchy
from app.llm import LLMService, Message, MessageRole


class Pass1Structure(BasePass):
    """
    Pass 1: Structural Skeleton
    
    Extracts the design's information architecture, spatial organization,
    and hierarchy logic, stripping away visual treatment.
    """
    
    def __init__(self):
        super().__init__()
        self.llm = LLMService()
    
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
        Extract structure from Figma JSON (code-driven + LLM analysis)
        
        High confidence, exact measurements from code.
        Then LLM analyzes to add rich contextual narratives.
        
        Args:
            figma_json: Figma JSON document
        
        Returns:
            Structure data dict with rich narratives
        """
        # Step 1: Code extraction (deterministic)
        code_result = parse_figma_structure(figma_json)
        
        # Step 2: LLM analysis to add rich narratives
        analyzed = await self._llm_analyze_extracted_structure(code_result)
        
        return analyzed
    
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
        
        Highest confidence. Code extraction for exact measurements,
        vision analysis for rich contextual narratives and validation.
        
        Args:
            figma_json: Figma JSON document
            image_bytes: Image data
            image_format: Image format
        
        Returns:
            Combined structure data dict with measurements + narratives
        """
        import asyncio
        
        # Run both extractions in parallel
        # Figma parsing is synchronous, so wrap in thread to avoid blocking
        figma_task = asyncio.to_thread(parse_figma_structure, figma_json)
        
        # Vision analysis runs independently (now includes rich narratives)
        vision_task = analyze_structure_from_image(image_bytes, image_format)
        
        # Wait for both to complete in parallel
        figma_data, vision_data = await asyncio.gather(figma_task, vision_task)
        
        # Use Figma as primary source for measurements (higher confidence)
        result = figma_data.copy()
        
        # Add rich narratives from vision (vision sees the full picture)
        result["spatial_philosophy"] = vision_data.get("spatial_philosophy", "")
        result["whitespace_ratios"] = vision_data.get("whitespace_ratios")
        result["hierarchy_logic"] = vision_data.get("hierarchy_logic", "")
        result["rhythm_description"] = vision_data.get("rhythm_description", "")
        
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
    
    async def _llm_analyze_extracted_structure(
        self,
        code_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        LLM analyzes code-extracted structure to add rich contextual narratives.
        
        Takes exact measurements from code and generates insights about:
        - Spatial philosophy
        - Whitespace ratios
        - Hierarchy logic
        - Rhythm description
        
        Args:
            code_data: Structure extracted from Figma JSON
        
        Returns:
            Structure data with added narratives
        """
        # Build prompt with extracted data
        layout = code_data.get("layout", {})
        hierarchy = code_data.get("hierarchy", {})
        density = code_data.get("density", {})
        spacing = code_data.get("spacing", {})
        
        prompt = f"""You have extracted the following structural properties from Figma JSON:

LAYOUT:
- Type: {layout.get('type')}
- Direction: {layout.get('direction')}
- Nesting depth: {layout.get('nesting_depth')}
- Columns: {layout.get('columns')}

HIERARCHY:
{self._format_hierarchy_for_llm(hierarchy)}

DENSITY:
- Global: {density.get('global')}
- Per section: {density.get('per_section')}

SPACING:
- Quantum: {spacing.get('quantum')}
- Scale: {spacing.get('scale')}
- Consistency: {spacing.get('consistency')}

Now analyze this structural data and provide rich contextual insights:

1. SPATIAL PHILOSOPHY: Write 2-3 sentences describing:
   - How this designer thinks about space and breathing room
   - Whether they favor generous whitespace or efficient density
   - How spacing creates rhythm and guides the eye

2. WHITESPACE RATIOS: Describe any patterns in spacing relationships:
   - How container padding relates to internal gaps
   - How spacing scales with hierarchy (larger elements → more space?)
   - Mathematical relationships (2:1 ratios, consistent multipliers, etc.)

3. HIERARCHY LOGIC: Write 2-3 sentences explaining:
   - WHY this hierarchy system works
   - How it guides attention through the design
   - The logic behind the size/position/nesting choices

4. RHYTHM DESCRIPTION: Write 2-3 sentences about:
   - How density variations create visual rhythm
   - Push-pull between sparse and dense zones
   - How this guides the eye through the design

Respond with a JSON object:
{{
  "spatial_philosophy": "Multi-sentence description...",
  "whitespace_ratios": "Description of spacing relationships...",
  "hierarchy_logic": "Multi-sentence explanation...",
  "rhythm_description": "Multi-sentence description..."
}}"""
        
        schema = {
            "type": "object",
            "properties": {
                "spatial_philosophy": {"type": "string"},
                "whitespace_ratios": {"type": "string"},
                "hierarchy_logic": {"type": "string"},
                "rhythm_description": {"type": "string"}
            },
            "required": ["spatial_philosophy", "whitespace_ratios", "hierarchy_logic", "rhythm_description"]
        }
        
        response = await self.llm.generate(
            model="claude-sonnet-4.5",
            messages=[
                Message(role=MessageRole.USER, content=prompt)
            ],
            structured_output_schema=schema,
            max_tokens=2048,
            temperature=0.2
        )
        
        analysis = response.structured_output if response.structured_output else {}
        
        # Merge code data with LLM analysis
        result = {
            **code_data,
            "spatial_philosophy": analysis.get("spatial_philosophy", ""),
            "whitespace_ratios": analysis.get("whitespace_ratios"),
            "hierarchy_logic": analysis.get("hierarchy_logic", ""),
            "rhythm_description": analysis.get("rhythm_description", "")
        }
        
        return result
    
    def _format_hierarchy_for_llm(self, hierarchy: Dict[str, Any]) -> str:
        """Format hierarchy data for LLM prompt"""
        levels = hierarchy.get("levels", [])
        lines = []
        for level in levels:
            rank = level.get("rank")
            elements = ", ".join(level.get("elements", []))
            established_by = level.get("established_by", "")
            lines.append(f"- Rank {rank}: {elements} (established by: {established_by})")
        return "\n".join(lines) if lines else "No hierarchy levels"


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