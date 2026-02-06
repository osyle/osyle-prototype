"""
Vision Analyzer

Uses LLM vision (Gemini 2.5 Flash) to extract design properties from images.
Used by all passes when analyzing screenshots.
"""
from typing import Dict, Any, Optional
import base64
from app.llm import LLMService, Message, MessageRole, ImageContent, TextContent


class VisionAnalyzer:
    """
    Analyze design images using LLM vision
    
    Wraps LLMService for vision-based extraction tasks.
    """
    
    def __init__(self):
        """Initialize with LLM service"""
        self.llm = LLMService()
    
    async def analyze_structure(
        self, 
        image_bytes: bytes,
        image_format: str = "png"
    ) -> Dict[str, Any]:
        """
        Analyze structural skeleton from image
        
        Extracts:
        - Layout pattern
        - Approximate column structure
        - Visual hierarchy
        - Content density
        - Navigation placement
        
        Args:
            image_bytes: Image data as bytes
            image_format: Image format (png, jpg, webp)
        
        Returns:
            Dict with layout, hierarchy, density, spacing data
        """
        # Encode image
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Build prompt
        system_prompt = """You are a design analysis expert. Analyze the structure and layout of this design screenshot.

Focus on the STRUCTURAL skeleton, ignoring visual styling:
- Layout pattern (sidebar+content, hero sections, card grid, etc.)
- Column structure and spacing
- Visual hierarchy (what draws attention first/second/third)
- Content density (sparse vs dense sections)
- Spacing patterns

Provide a structured analysis."""
        
        user_prompt = """Analyze this design's structural skeleton:

1. LAYOUT PATTERN: Identify the overall layout type
   - Is it sidebar+content, full-width sections, card grid, single column, or other?
   - What is the primary direction: vertical or horizontal flow?
   - Estimate nesting depth (how many levels of containers)

2. COLUMN STRUCTURE: If grid-like layout exists
   - Approximate number of columns
   - Are columns equal width or varied?
   - Estimate gap between columns (in pixels)

3. VISUAL HIERARCHY: What catches the eye first, second, third?
   - List the top 3-4 hierarchy levels
   - For each level, describe: what elements, and how is hierarchy established?
   - Examples: "size + position", "weight + spacing", "color + size"

4. CONTENT DENSITY: How much content vs empty space?
   - Overall density (0-1 scale, where 1 is very dense)
   - Identify 2-3 distinct sections and their individual density
   - Examples: "hero section: 0.3 (sparse)", "features grid: 0.7 (dense)"

5. SPACING SYSTEM: Do you see consistent spacing patterns?
   - Guess the base spacing unit (4px, 8px, 16px?)
   - List 4-6 spacing values you see repeated
   - How consistent is spacing (0-1 scale)?

Respond with a JSON object matching this structure:
{
  "layout": {
    "type": "sidebar_content | hero_sections | card_grid | single_column",
    "direction": "vertical | horizontal",
    "nesting_depth": <number>,
    "columns": {
      "count": <number or null>,
      "widths": <array of widths or null>,
      "gap": "<value>px or null"
    }
  },
  "hierarchy": {
    "levels": [
      {
        "rank": 1,
        "elements": ["hero_heading"],
        "established_by": "size + position"
      }
    ]
  },
  "density": {
    "global": <0-1>,
    "per_section": [
      {"section": "hero", "density": <0-1>}
    ]
  },
  "spacing": {
    "quantum": "8px",
    "scale": [8, 16, 24, 32, 48],
    "consistency": <0-1>
  }
}"""
        
        # Schema for structured output
        schema = {
            "type": "object",
            "properties": {
                "layout": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string"},
                        "direction": {"type": "string"},
                        "nesting_depth": {"type": "integer"},
                        "columns": {
                            "type": ["object", "null"],
                            "properties": {
                                "count": {"type": ["integer", "null"]},
                                "widths": {"type": ["array", "null"]},
                                "gap": {"type": ["string", "null"]}
                            }
                        }
                    },
                    "required": ["type", "direction", "nesting_depth"]
                },
                "hierarchy": {
                    "type": "object",
                    "properties": {
                        "levels": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "rank": {"type": "integer"},
                                    "elements": {"type": "array", "items": {"type": "string"}},
                                    "established_by": {"type": "string"}
                                },
                                "required": ["rank", "elements", "established_by"]
                            }
                        }
                    },
                    "required": ["levels"]
                },
                "density": {
                    "type": "object",
                    "properties": {
                        "global": {"type": "number"},
                        "per_section": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "section": {"type": "string"},
                                    "density": {"type": "number"}
                                },
                                "required": ["section", "density"]
                            }
                        }
                    },
                    "required": ["global", "per_section"]
                },
                "spacing": {
                    "type": "object",
                    "properties": {
                        "quantum": {"type": "string"},
                        "scale": {"type": "array", "items": {"type": "integer"}},
                        "consistency": {"type": "number"}
                    },
                    "required": ["quantum", "scale", "consistency"]
                }
            },
            "required": ["layout", "hierarchy", "density", "spacing"]
        }
        
        # Call LLM vision model (Gemini 2.5 Flash - best for vision)
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
                        TextContent(text=user_prompt)
                    ]
                )
            ],
            structured_output_schema=schema,
            temperature=0.0  # Deterministic for analysis
        )
        
        # Parse structured output
        if response.structured_output:
            return response.structured_output
        
        # Fallback: try parsing text
        import json
        try:
            return json.loads(response.text)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse LLM response as JSON: {e}\nResponse: {response.text[:500]}")
    
    async def validate_visual_hierarchy(
        self,
        image_bytes: bytes,
        code_hierarchy: Dict[str, Any],
        image_format: str = "png"
    ) -> Dict[str, Any]:
        """
        Validate code-extracted hierarchy against visual appearance
        
        Used in hybrid mode (Figma JSON + image) to catch discrepancies.
        
        Args:
            image_bytes: Image data
            code_hierarchy: Hierarchy extracted from Figma JSON
            image_format: Image format
        
        Returns:
            Validation results with discrepancies noted
        """
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        system_prompt = """You are a design analysis expert. Compare the visual hierarchy you see in the image against the structural hierarchy from code."""
        
        user_prompt = f"""The code analysis extracted this hierarchy:
{code_hierarchy}

Looking at the actual design image, does the VISUAL hierarchy match?

Consider:
- What actually draws the eye first, second, third?
- Does visual prominence match structural hierarchy?
- Are there elements that are structurally nested but visually prominent (or vice versa)?

Respond with:
{{
  "matches": true/false,
  "discrepancies": [
    {{
      "element": "description of element",
      "structural_rank": <rank from code>,
      "visual_rank": <actual visual rank>,
      "reason": "why it differs (color, size, position, etc.)"
    }}
  ],
  "confidence": <0-1>
}}"""
        
        schema = {
            "type": "object",
            "properties": {
                "matches": {"type": "boolean"},
                "discrepancies": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "element": {"type": "string"},
                            "structural_rank": {"type": "integer"},
                            "visual_rank": {"type": "integer"},
                            "reason": {"type": "string"}
                        }
                    }
                },
                "confidence": {"type": "number"}
            },
            "required": ["matches", "discrepancies", "confidence"]
        }
        
        response = await self.llm.generate(
            model="gemini-2.5-flash",
            messages=[
                Message(role=MessageRole.SYSTEM, content=system_prompt),
                Message(
                    role=MessageRole.USER,
                    content=[
                        ImageContent(data=image_base64, media_type=f"image/{image_format}"),
                        TextContent(text=user_prompt)
                    ]
                )
            ],
            structured_output_schema=schema,
            max_tokens=8192,  # Increase for longer responses
            temperature=0.0
        )
        
        # Use structured output if available
        if response.structured_output:
            return response.structured_output
        
        # Fallback: parse text (should not happen with structured output enabled)
        import json
        try:
            return json.loads(response.text)
        except json.JSONDecodeError as e:
            # Log the full response for debugging
            print(f"Failed to parse hierarchy validation response: {e}")
            print(f"Full response text: {response.text}")
            raise ValueError(f"Failed to parse hierarchy validation: {e}\nResponse: {response.text[:500]}")


# ============================================================================
# PUBLIC API
# ============================================================================

async def analyze_structure_from_image(
    image_bytes: bytes,
    image_format: str = "png"
) -> Dict[str, Any]:
    """
    Analyze structural skeleton from image using vision LLM
    
    Args:
        image_bytes: Image data as bytes
        image_format: Image format (png, jpg, webp)
    
    Returns:
        Dict with layout, hierarchy, density, spacing data
    """
    analyzer = VisionAnalyzer()
    return await analyzer.analyze_structure(image_bytes, image_format)


async def validate_hierarchy(
    image_bytes: bytes,
    code_hierarchy: Dict[str, Any],
    image_format: str = "png"
) -> Dict[str, Any]:
    """
    Validate code-extracted hierarchy against visual appearance
    
    Args:
        image_bytes: Image data
        code_hierarchy: Hierarchy from Figma JSON
        image_format: Image format
    
    Returns:
        Validation results with discrepancies
    """
    analyzer = VisionAnalyzer()
    return await analyzer.validate_visual_hierarchy(image_bytes, code_hierarchy, image_format)