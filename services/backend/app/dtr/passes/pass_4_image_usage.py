"""
Pass 4: Image Usage Patterns

Analyzes how and where the designer uses imagery - photographs, illustrations,
3D renders, abstract graphics. Captures placement patterns, visual treatments,
content style, and overall image density.

This is a single-step vision analysis pass (no agentic loop required).
"""
from typing import Dict, Any, Optional, List
import json
import os
import base64
from io import BytesIO
from PIL import Image as PILImage
from .base import BasePass, PassRegistry
from ..schemas import (
    Pass4ImageUsageDTR,
    ImagePlacement,
    ImageTreatment,
    ContentStyle,
    PhotographyDetails
)
from app.llm import LLMService, Message, MessageRole, ImageContent, TextContent


class Pass4ImageUsage(BasePass):
    """
    Pass 4: Image Usage Patterns
    
    Analyzes imagery usage in the design to understand the designer's
    image philosophy - where images appear, how they're treated,
    what style of imagery is used, and overall image density.
    """
    
    def __init__(self):
        super().__init__()
        self.llm = LLMService()
    
    async def execute(
        self,
        figma_json: Optional[Dict[str, Any]] = None,
        image_bytes: Optional[bytes] = None,
        image_format: str = "png",
        prev_passes: Optional[Dict[str, Any]] = None,
        resource_id: Optional[str] = None
    ) -> Pass4ImageUsageDTR:
        """
        Execute Pass 4: Image Usage Patterns
        
        Args:
            figma_json: Optional Figma JSON document
            image_bytes: Image data (required for content analysis)
            image_format: Image format (png, jpg, webp)
            prev_passes: Not used (Pass 4 is independent)
            resource_id: Resource ID for asset storage path
        
        Returns:
            Pass4ImageUsageDTR with image usage analysis
        """
        # Image is required for content analysis
        if not image_bytes:
            # Return minimal DTR if no image available
            return self._create_no_images_dtr()
        
        # Start timing
        self._start_timing()
        
        # Check if design has images (quick detection)
        has_figma = figma_json is not None
        
        # Extract Figma image metadata if available (parallel with vision)
        figma_image_nodes = None
        if has_figma:
            figma_image_nodes = self._extract_figma_image_nodes(figma_json)
        
        # Run vision analysis (primary source)
        vision_analysis = await self._analyze_with_vision(image_bytes, image_format)
        
        # If no images detected, return early
        if not vision_analysis.get("has_images", False):
            elapsed = self._stop_timing()
            return Pass4ImageUsageDTR(
                authority="vision",
                confidence=0.85,
                has_images=False,
                image_density="none",
                placements=[],
                content_style=None,
                rhythm="No imagery present - text and UI components only",
                narrative="This design does not use photographic images, illustrations, or decorative graphics beyond standard UI icons. The visual emphasis is entirely on typography, color, and layout structure.",
                extracted_at=self._get_timestamp(),
                extraction_time_ms=elapsed
            )
        
        # Merge Figma metadata with vision analysis (if available)
        if figma_image_nodes:
            vision_analysis = self._merge_figma_metadata(vision_analysis, figma_image_nodes)
            authority = "hybrid"
            confidence = 0.85
        else:
            authority = "vision"
            confidence = 0.75
        
        # Extract and save image assets (if resource_id provided)
        if resource_id and vision_analysis.get("placements"):
            await self._extract_image_assets(
                image_bytes,
                vision_analysis["placements"],
                resource_id
            )
        
        # Generate narrative synthesis
        narrative = await self._generate_narrative(vision_analysis)
        vision_analysis["narrative"] = narrative
        
        # Add metadata
        elapsed = self._stop_timing()
        vision_analysis["authority"] = authority
        vision_analysis["confidence"] = confidence
        vision_analysis["extracted_at"] = self._get_timestamp()
        vision_analysis["extraction_time_ms"] = elapsed
        
        # Validate and return
        return Pass4ImageUsageDTR(**vision_analysis)
    
    def _extract_figma_image_nodes(
        self,
        figma_json: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Extract image nodes from Figma JSON
        
        Returns list of image node metadata with positions and properties.
        """
        image_nodes = []
        
        def walk_nodes(node: Dict[str, Any]):
            """Recursively walk node tree"""
            # Check if this node has image fills
            if node.get("fills"):
                for fill in node["fills"]:
                    if fill.get("type") == "IMAGE":
                        # Extract image metadata
                        bounds = node.get("absoluteBoundingBox", {})
                        image_nodes.append({
                            "node_id": node.get("id"),
                            "name": node.get("name", ""),
                            "coordinates": {
                                "x": bounds.get("x", 0),
                                "y": bounds.get("y", 0),
                                "width": bounds.get("width", 0),
                                "height": bounds.get("height", 0)
                            },
                            "scale_mode": fill.get("scaleMode", "FILL"),
                            "corner_radius": node.get("cornerRadius", 0),
                            "effects": node.get("effects", [])
                        })
            
            # Recurse to children
            if "children" in node:
                for child in node["children"]:
                    walk_nodes(child)
        
        # Walk tree starting from document
        if "document" in figma_json:
            walk_nodes(figma_json["document"])
        
        return image_nodes
    
    async def _analyze_with_vision(
        self,
        image_bytes: bytes,
        image_format: str
    ) -> Dict[str, Any]:
        """
        Analyze image usage with vision model (primary analysis)
        
        Uses Gemini 2.5 Flash (best vision model) to detect:
        - Image placements and roles
        - Visual treatments
        - Content style
        - Overall density and rhythm
        """
        # Prepare system prompt
        system_prompt = """You are a design analyst specializing in understanding how designers use imagery.

Analyze this design to understand the designer's image usage philosophy.

Identify:
1. Every instance where images appear (not icons/logos, but actual imagery - photographs, illustrations, graphics)
2. The placement pattern for each (hero background, card thumbnail, avatar, decorative graphic, etc.)
3. How each image is visually treated (sizing, borders, overlays, aspect ratios, etc.)
4. The style/content of the imagery (photography style, illustration style, etc.)
5. Overall image density and rhythm

Return ONLY valid JSON matching this exact schema:
{
  "has_images": boolean,
  "image_density": "minimal" | "sparse" | "moderate" | "heavy" | "dominant",
  "placements": [
    {
      "role": "hero_background | card_thumbnail | avatar | decorative_graphic | section_divider | inline_content | product_showcase",
      "position": "description of position (e.g., 'top, full-width', 'within card grid')",
      "frequency": "single instance | repeating (N instances)",
      "context": "usage context description",
      "treatment": {
        "sizing": "full-bleed | contained | cover | contain | fixed aspect ratio",
        "border_radius": "0 | 8px | 12px | 50% | etc.",
        "overlay": "none | linear-gradient(...) | rgba(...)",
        "border": "none | description",
        "shadow": "none | description",
        "mask": "rectangle | circle | custom",
        "effects": ["blur", "desaturate", etc.]
      }
    }
  ],
  "content_style": {
    "primary_type": "photography | 3d_renders | flat_illustrations | abstract_graphics | mixed",
    "secondary_type": "optional secondary type if mixed",
    "photography_details": {
      "tone": "warm | cool | neutral",
      "contrast": "high | low | medium",
      "saturation": "vibrant | desaturated | muted",
      "lighting": "bright | moody | natural | dramatic",
      "subject_matter": "people | architecture | nature | abstract | products | mixed",
      "processing": "natural | stylized | heavily edited"
    },
    "illustration_notes": "optional notes on illustration style",
    "generation_prompt_hint": "Ready-to-use prompt for image generation APIs to match this style"
  },
  "rhythm": "Description of overall image usage pattern",
  "image_to_text_ratio": "Approximate percentage split"
}

CRITICAL: 
- Respond with ONLY JSON, no preamble, no markdown backticks
- Distinguish between functional UI icons and actual imagery/graphics
- If no imagery present, return has_images: false with empty placements
- For photography_details, only include if primary_type is "photography"
"""
        
        # Encode image as base64
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        
        # Call vision model (Gemini 2.5 Flash - same as other vision extractors)
        response = await self.llm.generate(
            model="gemini-2.5-flash",
            messages=[
                Message(role=MessageRole.SYSTEM, content=system_prompt),
                Message(
                    role=MessageRole.USER,
                    content=[
                        ImageContent(
                            data=image_base64,
                            media_type=f"image/{image_format}"
                        ),
                        TextContent(text="Analyze the image usage patterns in this design.")
                    ]
                )
            ],
            max_tokens=2000,
            temperature=0.1
        )
        
        # Extract and parse JSON
        content = response.content[0].text if response.content else ""
        
        # Try to extract JSON from response
        try:
            # Clean response - remove markdown backticks if present
            cleaned = content.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            # Find JSON object
            start = cleaned.find("{")
            end = cleaned.rfind("}") + 1
            if start != -1 and end > start:
                cleaned = cleaned[start:end]
            
            data = json.loads(cleaned)
            return data
        
        except json.JSONDecodeError as e:
            # Fallback if JSON parsing fails
            print(f"Failed to parse JSON from vision model: {e}")
            print(f"Response was: {content}")
            return {
                "has_images": False,
                "image_density": "unknown",
                "placements": [],
                "content_style": None,
                "rhythm": "Unable to analyze - parsing error",
                "image_to_text_ratio": None
            }
    
    def _merge_figma_metadata(
        self,
        vision_analysis: Dict[str, Any],
        figma_nodes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Merge Figma metadata into vision analysis
        
        Enhances vision analysis with precise coordinates and properties from Figma.
        """
        # If vision found no placements, try to add Figma nodes
        if not vision_analysis.get("placements") and figma_nodes:
            vision_analysis["placements"] = []
            for node in figma_nodes:
                vision_analysis["placements"].append({
                    "role": "detected_in_figma",
                    "position": f"x:{node['coordinates']['x']}, y:{node['coordinates']['y']}",
                    "frequency": "single instance",
                    "context": f"Figma node: {node['name']}",
                    "coordinates": node["coordinates"],
                    "treatment": {
                        "sizing": node["scale_mode"].lower(),
                        "border_radius": f"{node['corner_radius']}px",
                        "overlay": "none",
                        "border": "none",
                        "shadow": "none",
                        "mask": "rectangle",
                        "effects": []
                    }
                })
        
        # Otherwise, enhance vision placements with Figma coordinates
        elif vision_analysis.get("placements") and figma_nodes:
            # Try to match vision placements with Figma nodes
            # Simple heuristic: match by approximate position/size
            for placement in vision_analysis["placements"]:
                # For now, just add coordinates to first few placements
                # In production, would do smarter matching based on position
                if len(figma_nodes) > 0 and not placement.get("coordinates"):
                    node = figma_nodes.pop(0)
                    placement["coordinates"] = node["coordinates"]
        
        return vision_analysis
    
    async def _extract_image_assets(
        self,
        source_image_bytes: bytes,
        placements: List[Dict[str, Any]],
        resource_id: str
    ):
        """
        Extract and save individual image assets from detected placements
        
        Crops images from source and saves to /dtr_outputs/{resource_id}/assets/
        """
        try:
            # Open source image
            img = PILImage.open(BytesIO(source_image_bytes))
            
            # Create assets directory
            # Using /home/claude/dtr_outputs for now (as per instruction)
            base_dir = "/home/claude/dtr_outputs"
            assets_dir = os.path.join(base_dir, resource_id, "assets")
            os.makedirs(assets_dir, exist_ok=True)
            
            # Extract each placement that has coordinates
            for idx, placement in enumerate(placements):
                coords = placement.get("coordinates")
                if not coords:
                    continue
                
                try:
                    # Crop region
                    x = int(coords.get("x", 0))
                    y = int(coords.get("y", 0))
                    width = int(coords.get("width", 0))
                    height = int(coords.get("height", 0))
                    
                    # Skip if invalid dimensions
                    if width <= 0 or height <= 0:
                        continue
                    
                    # Ensure coordinates are within image bounds
                    img_width, img_height = img.size
                    x = max(0, min(x, img_width))
                    y = max(0, min(y, img_height))
                    width = min(width, img_width - x)
                    height = min(height, img_height - y)
                    
                    if width <= 0 or height <= 0:
                        continue
                    
                    cropped = img.crop((x, y, x + width, y + height))
                    
                    # Generate filename
                    role = placement.get("role", "image").replace("_", "-")
                    filename = f"{role}-{idx + 1}.png"
                    filepath = os.path.join(assets_dir, filename)
                    
                    # Save
                    cropped.save(filepath)
                    
                    # Update placement with asset path (relative)
                    placement["asset_path"] = f"assets/{filename}"
                
                except Exception as e:
                    print(f"Failed to extract image asset {idx}: {e}")
                    continue
        
        except Exception as e:
            print(f"Failed to extract image assets: {e}")
    
    async def _generate_narrative(
        self,
        analysis_data: Dict[str, Any]
    ) -> str:
        """
        Generate rich narrative synthesis from structured analysis
        
        Uses Gemini for cost-efficiency (simpler task than typography analysis).
        """
        # Prepare analysis summary
        summary = f"""Image Usage Analysis:
- Has images: {analysis_data.get('has_images')}
- Density: {analysis_data.get('image_density')}
- Number of placements: {len(analysis_data.get('placements', []))}
- Content style: {analysis_data.get('content_style', {}).get('primary_type')}
- Rhythm: {analysis_data.get('rhythm')}

Placements:
{json.dumps(analysis_data.get('placements', []), indent=2)}

Content Style:
{json.dumps(analysis_data.get('content_style', {}), indent=2)}
"""
        
        system_prompt = """You are a design critic analyzing a designer's image usage philosophy.

Given the structured analysis of image usage in a design, synthesize a rich narrative that explains:
1. The designer's overall approach to imagery (sparingly vs heavily, decorative vs functional)
2. The visual character and consistency of the imagery
3. How images are integrated with the overall design system
4. The emotional/atmospheric role images play
5. Any notable patterns or signature approaches

Write 2-3 paragraphs that capture the essence of this designer's image philosophy.
Be specific and insightful, not generic.

Return ONLY the narrative text, no preamble."""
        
        response = await self.llm.generate(
            model="gemini-2.5-flash",
            messages=[
                Message(role=MessageRole.SYSTEM, content=system_prompt),
                Message(role=MessageRole.USER, content=summary)
            ],
            max_tokens=500,
            temperature=0.3
        )
        
        narrative = response.content[0].text if response.content else "No narrative generated."
        return narrative.strip()
    
    def _create_no_images_dtr(self) -> Pass4ImageUsageDTR:
        """Create minimal DTR when no image is available"""
        return Pass4ImageUsageDTR(
            authority="vision",
            confidence=0.0,
            has_images=False,
            image_density="unknown",
            placements=[],
            content_style=None,
            rhythm="No image available for analysis",
            narrative="Image analysis could not be performed - no image data provided.",
            extracted_at=self._get_timestamp(),
            extraction_time_ms=0
        )



# Register the pass
PassRegistry.register("pass_4_image_usage", Pass4ImageUsage)


# ============================================================================
# CONVENIENCE FUNCTION
# ============================================================================

async def run_pass_4(
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png",
    resource_id: Optional[str] = None
) -> Pass4ImageUsageDTR:
    """
    Run Pass 4: Image Usage Patterns
    
    Convenience function for running Pass 4 directly.
    
    Args:
        figma_json: Optional Figma JSON document
        image_bytes: Image data (required for content analysis)
        image_format: Image format (png, jpg, webp)
        resource_id: Resource ID for asset storage path
    
    Returns:
        Pass4ImageUsageDTR with image usage analysis
    """
    pass_instance = Pass4ImageUsage()
    return await pass_instance.execute(
        figma_json=figma_json,
        image_bytes=image_bytes,
        image_format=image_format,
        resource_id=resource_id
    )