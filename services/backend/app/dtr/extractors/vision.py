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
        system_prompt = """You are a design analysis expert specializing in spatial structure and layout systems.

Analyze the STRUCTURAL skeleton of this design, focusing on the designer's spatial thinking:
- Layout topology and organization
- Visual hierarchy and how attention is guided
- Content density patterns and rhythm
- Spacing system and whitespace philosophy

Your analysis should capture not just WHAT you see, but WHY these choices work and HOW the designer thinks about structure."""
        
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

6. SPATIAL PHILOSOPHY: Write 2-3 sentences describing:
   - How this designer thinks about space and breathing room
   - Whether they favor generous whitespace or efficient density
   - How spacing creates rhythm and guides the eye

7. WHITESPACE RATIOS: Describe any patterns you see:
   - Relationship between container padding and internal gaps
   - How spacing scales with hierarchy (larger elements → more space?)
   - Ratios between adjacent spacings

8. HIERARCHY LOGIC: Write 2-3 sentences explaining:
   - WHY this hierarchy system works
   - How it guides attention through the design
   - The logic behind the size/weight/position choices

9. RHYTHM DESCRIPTION: Write 2-3 sentences about:
   - How density variations create visual rhythm
   - Push-pull between sparse and dense zones
   - How this guides the eye vertically/horizontally

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
  },
  "spatial_philosophy": "Multi-sentence description...",
  "whitespace_ratios": "Description of spacing relationships...",
  "hierarchy_logic": "Multi-sentence explanation...",
  "rhythm_description": "Multi-sentence description..."
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
                },
                "spatial_philosophy": {"type": "string"},
                "whitespace_ratios": {"type": "string"},
                "hierarchy_logic": {"type": "string"},
                "rhythm_description": {"type": "string"}
            },
            "required": ["layout", "hierarchy", "density", "spacing", "spatial_philosophy", "whitespace_ratios", "hierarchy_logic", "rhythm_description"]
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
    
    async def analyze_surface(
        self,
        image_bytes: bytes,
        image_format: str = "png",
        kmeans_colors: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Analyze surface treatment from image.
        
        Extracts:
        - Colors (approximate, validated against kmeans if provided)
        - Material language (glassmorphic, flat, neumorphic, etc.)
        - Depth planes and elevation system
        - Effects (shadows, blurs, gradients)
        - Atmosphere and visual feeling
        
        Args:
            image_bytes: Image data as bytes
            image_format: Image format (png, jpg, webp)
            kmeans_colors: Optional list of hex colors from k-means clustering
        
        Returns:
            Dict with colors, materials, effects, atmosphere
        """
        # Encode image
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Build prompt with kmeans reference if available
        kmeans_reference = ""
        if kmeans_colors:
            kmeans_reference = f"\n\nKMEANS REFERENCE (algorithmic ground truth):\nDominant colors found: {', '.join(kmeans_colors)}\nUse these as reference to validate your color extraction."
        
        system_prompt = """You are a design analysis expert specializing in visual treatment and surface design.

Analyze the SURFACE TREATMENT layer of this design - colors, materials, depth, atmosphere, and effects.

Your analysis should be:
1. Detailed and specific - not generic observations
2. Expressed in rich paragraphs where appropriate (relationships, atmosphere)
3. Precise for technical values (use exact CSS when possible)
4. Focused on the designer's TASTE - the systematic logic behind choices

Remember: This analysis will be used to generate new designs in this designer's style.
The more specific and insightful you are, the better the generation quality."""
        
        user_prompt = f"""Analyze this design's surface treatment:

1. COLORS: Extract the complete color system
   - Identify all prominent colors (provide approximate hex codes)
   - For each color, describe:
     * Its semantic role (background, surface, primary accent, text, border, etc.)
     * How frequently it appears
     * Where it's used (in what contexts)
   - Describe the temperature distribution (cool vs warm tones)
   - Describe the saturation profile (muted, vibrant, mixed)
   - Write a detailed paragraph about color RELATIONSHIPS:
     * How do colors interact to create hierarchy?
     * What emotional quality do the color choices convey?
     * Are there any sophisticated color techniques (color overlays, subtle tints, etc.)?

2. MATERIALS & DEPTH: Identify the material language
   - What is the primary material language? (Describe richly - don't just use labels)
     Examples: "Glassmorphic with heavy blur and transparency creating atmospheric depth"
              "Flat design with subtle shadows for minimal elevation"
              "Neumorphic with soft inset shadows creating tactile surfaces"
   - How many depth planes exist? For each plane:
     * Level number (0 = background, higher = more elevated)
     * Treatment description
     * Approximate CSS if visible (background, backdrop-filter, box-shadow, border)
   - How does the design establish depth? (shadows, blur, opacity, overlays)

3. EFFECTS VOCABULARY: Identify all visual effects
   - For each distinct effect you see:
     * Type (shadow, blur, gradient, border, overlay)
     * Approximate CSS implementation
     * Where it's used (usage context)
   - Pay special attention to:
     * Shadow styles (soft, hard, colored, layered)
     * Blur effects (backdrop blur for glassmorphism)
     * Gradient overlays (especially on images or backgrounds)
     * Border treatments
     * Opacity and transparency

4. ATMOSPHERE: Describe the overall visual feeling
   - Write 2-3 detailed sentences capturing:
     * The emotional quality this visual treatment creates
     * The sophistication level and design maturity
     * Any distinctive visual personality traits
     * What makes this feel cohesive and intentional

Respond with a JSON object:{kmeans_reference}

{{
  "colors": {{
    "palette": [
      {{
        "hex": "#0A0A1A",
        "role": "background",
        "contexts": ["fill", "surface"],
        "notes": "Deep navy background providing contrast"
      }}
    ],
    "temperature": "Rich description of cool vs warm distribution",
    "saturation_profile": "Rich description of saturation characteristics",
    "relationships": "Multi-sentence paragraph about how colors interact and create meaning"
  }},
  "materials": {{
    "primary_language": "Rich, detailed description of material approach",
    "depth_planes": [
      {{
        "level": 0,
        "treatment": "solid_background",
        "css": "background: #0A0A1A;",
        "notes": "Base layer"
      }}
    ],
    "depth_technique": "Description of how depth is established"
  }},
  "effects": [
    {{
      "type": "shadow",
      "css": "box-shadow: 0 4px 24px rgba(0,0,0,0.2);",
      "usage": "cards, elevated surfaces",
      "notes": "Soft, present but not harsh"
    }}
  ],
  "atmosphere": "Multi-sentence description of the overall visual feeling and emotional quality this treatment creates"
}}"""
        
        # Define schema
        schema = {
            "type": "object",
            "properties": {
                "colors": {
                    "type": "object",
                    "properties": {
                        "palette": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "hex": {"type": "string"},
                                    "role": {"type": "string"},
                                    "contexts": {
                                        "type": "array",
                                        "items": {"type": "string"}
                                    },
                                    "notes": {"type": "string"}
                                },
                                "required": ["hex", "role"]
                            }
                        },
                        "temperature": {"type": "string"},
                        "saturation_profile": {"type": "string"},
                        "relationships": {"type": "string"}
                    },
                    "required": ["palette", "temperature", "saturation_profile", "relationships"]
                },
                "materials": {
                    "type": "object",
                    "properties": {
                        "primary_language": {"type": "string"},
                        "depth_planes": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "level": {"type": "integer"},
                                    "treatment": {"type": "string"},
                                    "css": {"type": "string"},
                                    "notes": {"type": "string"}
                                },
                                "required": ["level", "treatment", "css"]
                            }
                        },
                        "depth_technique": {"type": "string"}
                    },
                    "required": ["primary_language", "depth_planes"]
                },
                "effects": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string"},
                            "css": {"type": "string"},
                            "usage": {"type": "string"},
                            "notes": {"type": "string"}
                        },
                        "required": ["type", "css", "usage"]
                    }
                },
                "atmosphere": {"type": "string"}
            },
            "required": ["colors", "materials", "effects", "atmosphere"]
        }
        
        # Call LLM with vision
        response = await self.llm.generate(
            model="gemini-2.5-flash",
            messages=[
                Message(
                    role=MessageRole.SYSTEM,
                    content=system_prompt
                ),
                Message(
                    role=MessageRole.USER,
                    content=[
                        ImageContent(
                            data=image_base64,
                            format=image_format
                        ),
                        TextContent(text=user_prompt)
                    ]
                )
            ],
            structured_output_schema=schema,
            max_tokens=8192,
            temperature=0.1  # Slightly higher for richer descriptions
        )
        
        # Use structured output
        if response.structured_output:
            return response.structured_output
        
        # Fallback: parse text
        import json
        try:
            return json.loads(response.text)
        except json.JSONDecodeError as e:
            print(f"Failed to parse surface analysis: {e}")
            print(f"Response: {response.text[:500]}")
            raise ValueError(f"Failed to parse surface analysis: {e}")


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


async def analyze_surface_from_image(
    image_bytes: bytes,
    image_format: str = "png",
    kmeans_colors: Optional[list] = None
) -> Dict[str, Any]:
    """
    Analyze surface treatment from image using vision LLM.
    
    Args:
        image_bytes: Image data as bytes
        image_format: Image format (png, jpg, webp)
        kmeans_colors: Optional list of hex colors from k-means (ground truth)
    
    Returns:
        Dict with colors, materials, effects, atmosphere
    """
    analyzer = VisionAnalyzer()
    return await analyzer.analyze_surface(image_bytes, image_format, kmeans_colors)