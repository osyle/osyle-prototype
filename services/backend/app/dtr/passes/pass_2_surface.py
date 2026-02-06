"""
Pass 2: Surface Treatment

Extract colors, materials, depth, atmosphere, and effects.
Captures the visual treatment layer that gives design its emotional quality.

Handles three scenarios:
1. Figma JSON only → Code extraction (high confidence for exact values)
2. Image only → Vision + K-means (lower confidence, algorithmic ground truth)
3. Both → Hybrid (code + vision + validation, highest confidence)
"""
from typing import Dict, Any, Optional
import asyncio
from datetime import datetime

from .base import BasePass, PassRegistry
from ..schemas import Pass2SurfaceDTR, ColorEntry, ColorSystem, MaterialSystem, DepthPlane, Effect
from ..extractors import (
    parse_figma_surface,
    analyze_surface_from_image,
    k_means_color_clustering
)
from app.llm import LLMService, Message, MessageRole, TextContent


class Pass2Surface(BasePass):
    """
    Pass 2: Surface Treatment
    
    Extracts the visual treatment layer - colors, materials, depth, and effects.
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
    ) -> Pass2SurfaceDTR:
        """
        Execute Pass 2: Surface Treatment
        
        Args:
            figma_json: Optional Figma JSON document
            image_bytes: Optional image data
            image_format: Image format (png, jpg, webp)
            prev_passes: Not used (Pass 2 is independent)
        
        Returns:
            Pass2SurfaceDTR with surface analysis
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
            confidence = 0.85
        
        elif has_image and not has_figma:
            # Scenario B: Image only
            data = await self._extract_from_vision(image_bytes, image_format)
            authority = "vision"
            confidence = 0.70
        
        else:
            # Scenario C: Both (hybrid)
            data = await self._extract_hybrid(figma_json, image_bytes, image_format)
            authority = "hybrid"
            confidence = 0.92
        
        # Add metadata
        data_with_metadata = self._add_metadata(data, authority, confidence)
        
        # Validate and return as Pydantic model
        return Pass2SurfaceDTR(**data_with_metadata)
    
    async def _extract_from_figma(
        self,
        figma_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract surface from Figma JSON (code-driven).
        
        High confidence for exact values (colors, effects, gradients, shadows).
        Then LLM analyzes relationships and assigns semantic roles.
        
        Args:
            figma_json: Figma JSON document
        
        Returns:
            Surface data dict
        """
        # Step 1: Code extraction (deterministic)
        figma_data = parse_figma_surface(figma_json)
        
        # Step 2: LLM analysis of extracted values
        analyzed = await self._llm_analyze_extracted_data(figma_data)
        
        return analyzed
    
    async def _extract_from_vision(
        self,
        image_bytes: bytes,
        image_format: str
    ) -> Dict[str, Any]:
        """
        Extract surface from image (vision-driven).
        
        Uses k-means clustering for color ground truth,
        then LLM vision for comprehensive analysis.
        
        Args:
            image_bytes: Image data
            image_format: Image format
        
        Returns:
            Surface data dict
        """
        # Step 1: K-means clustering (algorithmic ground truth)
        kmeans_colors = k_means_color_clustering(image_bytes, n_colors=10)
        
        # Step 2: LLM vision analysis (with kmeans reference)
        vision_data = await analyze_surface_from_image(
            image_bytes,
            image_format,
            kmeans_colors=kmeans_colors
        )
        
        # Step 3: Build structured output
        result = self._structure_vision_data(vision_data, kmeans_colors)
        
        return result
    
    async def _extract_hybrid(
        self,
        figma_json: Dict[str, Any],
        image_bytes: bytes,
        image_format: str
    ) -> Dict[str, Any]:
        """
        Extract surface using both Figma JSON and image (hybrid).
        
        Highest confidence. Code extraction for exact values,
        vision validation for perceptual qualities and composite effects.
        
        Args:
            figma_json: Figma JSON document
            image_bytes: Image data
            image_format: Image format
        
        Returns:
            Combined surface data dict
        """
        # Run both extractions in parallel
        figma_task = asyncio.to_thread(parse_figma_surface, figma_json)
        
        # K-means + vision analysis
        kmeans_colors = k_means_color_clustering(image_bytes, n_colors=10)
        vision_task = analyze_surface_from_image(
            image_bytes, 
            image_format,
            kmeans_colors=kmeans_colors
        )
        
        # Wait for both
        figma_data, vision_data = await asyncio.gather(figma_task, vision_task)
        
        # Merge: Use Figma for exact values, vision for atmosphere/materials
        merged = await self._merge_figma_and_vision(figma_data, vision_data, kmeans_colors)
        
        return merged
    
    async def _llm_analyze_extracted_data(
        self,
        figma_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        LLM analyzes extracted Figma data to assign semantic roles and narratives.
        
        Args:
            figma_data: Extracted colors, effects, gradients from Figma
        
        Returns:
            Analyzed data with roles, relationships, atmosphere
        """
        # Build prompt with extracted data
        palette = figma_data.get("colors", {}).get("palette", [])
        effects = figma_data.get("effects", [])
        gradients = figma_data.get("gradients", [])
        shadows = figma_data.get("shadows", [])
        
        prompt = f"""You have extracted the following surface design properties from Figma JSON:

COLORS PALETTE ({len(palette)} colors):
{self._format_palette_for_llm(palette)}

EFFECTS ({len(effects)} effects):
{self._format_effects_for_llm(effects)}

GRADIENTS ({len(gradients)} gradients):
{self._format_gradients_for_llm(gradients)}

SHADOWS ({len(shadows)} shadows):
{self._format_shadows_for_llm(shadows)}

Now analyze this data and provide:

1. SEMANTIC ROLES: For each color, assign a semantic role
   - Which is the background color?
   - Which are surface/elevation colors?
   - Which is the primary accent?
   - Which are text colors?
   
2. COLOR RELATIONSHIPS: Write a detailed paragraph about:
   - How colors interact to create hierarchy
   - Temperature distribution (cool vs warm)
   - Saturation characteristics
   - Emotional quality

3. MATERIAL LANGUAGE: Describe the material approach richly
   - What is the primary visual language? (glassmorphic, flat, neumorphic, etc.)
   - How is depth established?
   - Identify 2-4 depth planes with their treatments
   
4. ATMOSPHERE: Write 2-3 sentences about the overall visual feeling

Respond with a JSON object:
{{
  "color_roles": {{
    "#HEX": "semantic_role"
  }},
  "temperature": "Rich description",
  "saturation_profile": "Rich description",
  "relationships": "Multi-sentence paragraph",
  "transformation_rules": "How colors transform for interaction states (if visible)",
  "material_language": "Rich description of material approach",
  "depth_planes": [
    {{
      "level": 0,
      "treatment": "name",
      "css": "complete CSS"
    }}
  ],
  "atmosphere": "Multi-sentence description"
}}"""
        
        schema = {
            "type": "object",
            "properties": {
                "color_roles": {"type": "object"},
                "temperature": {"type": "string"},
                "saturation_profile": {"type": "string"},
                "relationships": {"type": "string"},
                "transformation_rules": {"type": "string"},
                "material_language": {"type": "string"},
                "depth_planes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "level": {"type": "integer"},
                            "treatment": {"type": "string"},
                            "css": {"type": "string"}
                        }
                    }
                },
                "atmosphere": {"type": "string"}
            }
        }
        
        response = await self.llm.generate(
            model="claude-sonnet-4.5",
            messages=[
                Message(role=MessageRole.USER, content=prompt)
            ],
            structured_output_schema=schema,
            max_tokens=4096,
            temperature=0.2
        )
        
        analysis = response.structured_output if response.structured_output else {}
        
        # Build structured output
        return self._build_structured_output(
            palette=palette,
            effects=effects,
            gradients=gradients,
            shadows=shadows,
            analysis=analysis,
            source="figma"
        )
    
    async def _merge_figma_and_vision(
        self,
        figma_data: Dict[str, Any],
        vision_data: Dict[str, Any],
        kmeans_colors: list
    ) -> Dict[str, Any]:
        """
        Merge Figma code extraction with vision analysis.
        
        Uses Figma for exact values, vision for atmosphere and perceptual qualities.
        
        Args:
            figma_data: Extracted from Figma JSON
            vision_data: Analyzed from image
            kmeans_colors: Ground truth colors from k-means
        
        Returns:
            Merged surface data
        """
        # Use Figma colors (exact) but vision's semantic analysis
        figma_palette = figma_data.get("colors", {}).get("palette", [])
        vision_colors = vision_data.get("colors", {})
        
        # Merge effects: Figma effects + any vision-only effects
        figma_effects = figma_data.get("effects", [])
        vision_effects = vision_data.get("effects", [])
        
        # Use vision's material and atmosphere (perceptual qualities)
        materials = vision_data.get("materials", {})
        atmosphere = vision_data.get("atmosphere", "")
        
        # Build color system
        color_entries = []
        for color_info in figma_palette:
            hex_val = color_info["hex"]
            # Find matching vision analysis for semantic role
            role = "unknown"
            contexts = color_info.get("contexts", [])
            
            # Try to match with vision palette
            for vision_color in vision_colors.get("palette", []):
                if self._colors_similar(hex_val, vision_color.get("hex", "")):
                    role = vision_color.get("role", role)
                    break
            
            color_entries.append(ColorEntry(
                hex=hex_val,
                role=role,
                frequency=color_info["frequency"],
                contexts=contexts,
                source="figma"
            ))
        
        # Build effects list
        effects_list = []
        for effect in figma_effects:
            effects_list.append(Effect(
                type=effect["type"],
                css=effect["css"],
                usage=effect.get("usage", "various surfaces"),
                source="figma",
                params=effect.get("params")
            ))
        
        # Add vision-only effects (like composite effects not in Figma JSON)
        for vision_effect in vision_effects:
            # Check if not already in figma effects
            css_match = any(e.css == vision_effect["css"] for e in effects_list)
            if not css_match:
                effects_list.append(Effect(
                    type=vision_effect["type"],
                    css=vision_effect["css"],
                    usage=vision_effect.get("usage", ""),
                    source="vision"
                ))
        
        # Build depth planes from vision
        depth_planes = []
        for plane in materials.get("depth_planes", []):
            depth_planes.append(DepthPlane(
                level=plane["level"],
                treatment=plane["treatment"],
                css=plane["css"]
            ))
        
        return {
            "colors": ColorSystem(
                exact_palette=color_entries,
                temperature=vision_colors.get("temperature", ""),
                saturation_profile=vision_colors.get("saturation_profile", ""),
                relationships=vision_colors.get("relationships", "")
            ),
            "materials": MaterialSystem(
                primary_language=materials.get("primary_language", ""),
                depth_planes=depth_planes
            ),
            "effects_vocabulary": effects_list,
            "atmosphere": atmosphere
        }
    
    def _structure_vision_data(
        self,
        vision_data: Dict[str, Any],
        kmeans_colors: list
    ) -> Dict[str, Any]:
        """Structure vision analysis into Pass 2 schema"""
        colors_data = vision_data.get("colors", {})
        materials_data = vision_data.get("materials", {})
        effects_data = vision_data.get("effects", [])
        atmosphere = vision_data.get("atmosphere", "")
        
        # Build color entries
        color_entries = []
        for color_info in colors_data.get("palette", []):
            color_entries.append(ColorEntry(
                hex=color_info["hex"],
                role=color_info.get("role", "unknown"),
                frequency=1,  # Vision doesn't track frequency
                contexts=color_info.get("contexts", []),
                source="vision"
            ))
        
        # Add kmeans colors as verification
        for kmeans_hex in kmeans_colors:
            if not any(c.hex == kmeans_hex for c in color_entries):
                color_entries.append(ColorEntry(
                    hex=kmeans_hex,
                    role="detected_by_kmeans",
                    frequency=1,
                    contexts=[],
                    source="kmeans"
                ))
        
        # Build depth planes
        depth_planes = []
        for plane in materials_data.get("depth_planes", []):
            depth_planes.append(DepthPlane(
                level=plane["level"],
                treatment=plane["treatment"],
                css=plane["css"]
            ))
        
        # Build effects
        effects_list = []
        for effect in effects_data:
            effects_list.append(Effect(
                type=effect["type"],
                css=effect["css"],
                usage=effect.get("usage", ""),
                source="vision"
            ))
        
        return {
            "colors": ColorSystem(
                exact_palette=color_entries,
                temperature=colors_data.get("temperature", ""),
                saturation_profile=colors_data.get("saturation_profile", ""),
                relationships=colors_data.get("relationships", "")
            ),
            "materials": MaterialSystem(
                primary_language=materials_data.get("primary_language", ""),
                depth_planes=depth_planes
            ),
            "effects_vocabulary": effects_list,
            "atmosphere": atmosphere
        }
    
    def _build_structured_output(
        self,
        palette: list,
        effects: list,
        gradients: list,
        shadows: list,
        analysis: Dict[str, Any],
        source: str
    ) -> Dict[str, Any]:
        """Build structured Pass 2 output from Figma extraction + LLM analysis"""
        color_roles = analysis.get("color_roles", {})
        
        # Build color entries
        color_entries = []
        for color_info in palette:
            hex_val = color_info["hex"]
            role = color_roles.get(hex_val, "unknown")
            
            color_entries.append(ColorEntry(
                hex=hex_val,
                role=role,
                frequency=color_info["frequency"],
                contexts=color_info.get("contexts", []),
                source=source
            ))
        
        # Build effects list
        effects_list = []
        for effect in effects:
            effects_list.append(Effect(
                type=effect["type"],
                css=effect["css"],
                usage="extracted from design",
                source=source,
                params=effect.get("params")
            ))
        
        # Add gradients as effects
        for gradient in gradients:
            effects_list.append(Effect(
                type="gradient",
                css=gradient["css"],
                usage="background fills",
                source=source,
                params=gradient.get("params")
            ))
        
        # Build depth planes
        depth_planes = []
        for plane in analysis.get("depth_planes", []):
            depth_planes.append(DepthPlane(
                level=plane["level"],
                treatment=plane["treatment"],
                css=plane["css"]
            ))
        
        return {
            "colors": ColorSystem(
                exact_palette=color_entries,
                temperature=analysis.get("temperature", ""),
                saturation_profile=analysis.get("saturation_profile", ""),
                relationships=analysis.get("relationships", ""),
                transformation_rules=analysis.get("transformation_rules")
            ),
            "materials": MaterialSystem(
                primary_language=analysis.get("material_language", ""),
                depth_planes=depth_planes
            ),
            "effects_vocabulary": effects_list,
            "atmosphere": analysis.get("atmosphere", "")
        }
    
    def _format_palette_for_llm(self, palette: list) -> str:
        """Format palette for LLM prompt"""
        lines = []
        for color in palette[:15]:  # Top 15 colors
            hex_val = color["hex"]
            freq = color["frequency"]
            contexts = ", ".join(color.get("contexts", []))
            lines.append(f"- {hex_val} (used {freq}x in: {contexts})")
        return "\n".join(lines)
    
    def _format_effects_for_llm(self, effects: list) -> str:
        """Format effects for LLM prompt"""
        lines = []
        for effect in effects[:10]:
            lines.append(f"- {effect['type']}: {effect['css']}")
        return "\n".join(lines) if lines else "None"
    
    def _format_gradients_for_llm(self, gradients: list) -> str:
        """Format gradients for LLM prompt"""
        lines = []
        for grad in gradients[:5]:
            lines.append(f"- {grad['css']}")
        return "\n".join(lines) if lines else "None"
    
    def _format_shadows_for_llm(self, shadows: list) -> str:
        """Format shadows for LLM prompt"""
        lines = []
        for shadow in shadows[:5]:
            lines.append(f"- {shadow['css']}")
        return "\n".join(lines) if lines else "None"
    
    def _colors_similar(self, hex1: str, hex2: str, threshold: int = 30) -> bool:
        """Check if two hex colors are similar (within threshold)"""
        try:
            # Remove # if present
            hex1 = hex1.lstrip('#')
            hex2 = hex2.lstrip('#')
            
            # Convert to RGB
            r1, g1, b1 = int(hex1[0:2], 16), int(hex1[2:4], 16), int(hex1[4:6], 16)
            r2, g2, b2 = int(hex2[0:2], 16), int(hex2[2:4], 16), int(hex2[4:6], 16)
            
            # Euclidean distance
            distance = ((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2) ** 0.5
            
            return distance < threshold
        except:
            return False


# Register this pass
PassRegistry.register("pass_2_surface", Pass2Surface)


# ============================================================================
# PUBLIC API
# ============================================================================

async def run_pass_2(
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png"
) -> Pass2SurfaceDTR:
    """
    Run Pass 2: Surface Treatment
    
    Convenience function for running Pass 2 directly.
    
    Args:
        figma_json: Optional Figma JSON document
        image_bytes: Optional image data
        image_format: Image format (png, jpg, webp)
    
    Returns:
        Pass2SurfaceDTR with surface analysis
    """
    pass_instance = Pass2Surface()
    return await pass_instance.execute(
        figma_json=figma_json,
        image_bytes=image_bytes,
        image_format=image_format
    )