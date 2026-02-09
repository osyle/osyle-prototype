"""
Vision Analyzer

Uses LLM vision (Gemini 2.5 Flash) to extract design properties from images.
Used by all passes when analyzing screenshots.
"""

import re
import json
import traceback
 
from typing import List, Dict, Any, Optional
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
   - Approximate number of columns (0 if NOT a grid layout)
   - Are columns equal width or varied?
   - Estimate gap between columns (in pixels, or leave empty if no grid)
   - IMPORTANT: If not a grid, set count=0, widths_string="", gap=""

3. VISUAL HIERARCHY: What catches the eye first, second, third?
   - List the top 3-5 hierarchy levels (do NOT repeat the same elements)
   - For each level, be SPECIFIC about:
     * What unique elements are at this level (e.g., "main heading", "user score badge", "section titles")
     * How hierarchy is established (e.g., "size + weight", "color + position")
   - Each rank should describe DIFFERENT elements - avoid duplication
   - Examples: 
     * Rank 1: "main greeting heading" (size + weight)
     * Rank 2: "user score badge in yellow circle" (color + size)
     * Rank 3: "task count with underline" (position + decoration)

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
      "count": <number> (set to 0 if layout is NOT grid-based),
      "widths_string": "" (empty string if no grid, otherwise "200, 400, 200"),
      "gap": "" (empty string if no grid, otherwise "16px")
    }
  },
  "hierarchy": {
    "levels": [
      {
        "rank": 1,
        "elements_string": "main_page_heading" (SPECIFIC, not generic),
        "established_by": "size + weight"
      },
      {
        "rank": 2,
        "elements_string": "user_profile_avatar, score_badge" (DIFFERENT from rank 1),
        "established_by": "color + position"
      },
      {
        "rank": 3,
        "elements_string": "section_titles" (DIFFERENT from ranks 1 & 2),
        "established_by": "size + spacing"
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
    "scale_string": "8, 16, 24, 32, 48" (comma-separated integers),
    "consistency": <0-1>
  },
  "spatial_philosophy": "Multi-sentence description...",
  "whitespace_ratios": "Description of spacing relationships...",
  "hierarchy_logic": "Multi-sentence explanation...",
  "rhythm_description": "Multi-sentence description..."
}"""
        
        # Schema for structured output - use strings instead of arrays to avoid Gemini issues
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
                            "type": "object",
                            "properties": {
                                "count": {"type": "integer"},
                                "widths_string": {"type": "string"},
                                "gap": {"type": "string"}
                            },
                            "required": ["count", "widths_string", "gap"]
                        }
                    },
                    "required": ["type", "direction", "nesting_depth", "columns"]
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
                                    "elements_string": {"type": "string"},
                                    "established_by": {"type": "string"}
                                },
                                "required": ["rank", "elements_string", "established_by"]
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
                        "scale_string": {"type": "string"},
                        "consistency": {"type": "number"}
                    },
                    "required": ["quantum", "scale_string", "consistency"]
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
            max_tokens=16384,  # Increased to prevent truncation in complex schemas
            temperature=0.0  # Deterministic for analysis
        )
        
        # Parse structured output
        if response.structured_output:
            result = response.structured_output
            # Convert string fields back to lists/arrays
            self._convert_structure_strings_to_lists(result)
            return result
        
        # Fallback: try parsing text
    
        try:
            result = json.loads(response.text)
            self._convert_structure_strings_to_lists(result)
            return result
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse LLM response as JSON: {e}\nResponse: {response.text[:500]}")
    
    def _convert_structure_strings_to_lists(self, result: Dict[str, Any]) -> None:
        """Convert string fields back to lists in structure analysis result"""
        # Convert hierarchy elements_string to elements list
        if "hierarchy" in result and "levels" in result["hierarchy"]:
            for level in result["hierarchy"]["levels"]:
                if "elements_string" in level:
                    elements_str = level.pop("elements_string")
                    level["elements"] = [e.strip() for e in elements_str.split(",") if e.strip()]
        
        # Convert spacing scale_string to scale list
        if "spacing" in result and "scale_string" in result["spacing"]:
            scale_str = result["spacing"].pop("scale_string")
            try:
                # Parse comma-separated integers
                result["spacing"]["scale"] = [int(s.strip()) for s in scale_str.split(",") if s.strip()]
            except ValueError:
                result["spacing"]["scale"] = []
        
        # Convert columns widths_string to widths list
        if "layout" in result and "columns" in result["layout"] and result["layout"]["columns"]:
            if "widths_string" in result["layout"]["columns"]:
                widths_str = result["layout"]["columns"].pop("widths_string")
                if widths_str:
                    try:
                        result["layout"]["columns"]["widths"] = [int(w.strip()) for w in widths_str.split(",") if w.strip()]
                    except ValueError:
                        result["layout"]["columns"]["widths"] = None
                else:
                    result["layout"]["columns"]["widths"] = None
    
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
            max_tokens=16384,  # Increased to prevent truncation
            temperature=0.0
        )
        
        # Use structured output if available
        if response.structured_output:
            return response.structured_output
        
        # Fallback: parse text (should not happen with structured output enabled)
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
     * Where it's used (in what contexts - as comma-separated string)
   - Describe the temperature distribution (cool vs warm tones)
   - Describe the saturation profile (muted, vibrant, mixed)
   - Write a detailed paragraph about color RELATIONSHIPS

2. MATERIALS & DEPTH: Identify the material language
   - Primary material language (rich description)
   - Depth planes with level, treatment, CSS, and notes
   - How depth is established

3. EFFECTS VOCABULARY: Identify all visual effects
   - Type (shadow, blur, gradient, border, overlay)
   - Approximate CSS implementation
   - Usage context
   - Brief notes

4. INTERACTION PATTERNS: Analyze how elements respond to interaction
   - Look for visual cues that suggest hover/active states:
     * Do shadows get stronger or softer on interactive elements?
     * Do elements scale or lift when hovered?
     * Do colors brighten or darken?
     * Are there subtle animations or transitions?
   - For each interactive element type (buttons, cards, links):
     * Estimate hover state CSS
     * Estimate active/pressed state CSS
   - Note: If no clear interactive elements, return empty object

5. TRANSFORMATION RULES: Describe the interaction philosophy (2-3 sentences)
   - How does this designer approach hover states?
   - What's the transition style (instant, smooth, bouncy)?
   - How aggressive or subtle are the state changes?
   - Examples: "Soft elevation on hover, gentle 200ms transitions"

6. ATMOSPHERE: Overall visual feeling (2-3 sentences)

Respond with a JSON object:{kmeans_reference}

{{
  "colors": {{
    "palette": [
      {{
        "hex": "#0A0A1A",
        "role": "background",
        "contexts_string": "fill, surface",
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
  "interaction_states": [
    {{"state": "button-primary-hover", "css": "transform: scale(1.02); box-shadow: 0px 8px 24px rgba(0,0,0,0.15);"}},
    {{"state": "button-primary-active", "css": "transform: scale(0.98); box-shadow: 0px 2px 8px rgba(0,0,0,0.1);"}},
    {{"state": "card-hover", "css": "transform: translateY(-2px); box-shadow: 0px 8px 32px rgba(0,0,0,0.12);"}}
  ],
  "transformation_rules": "Hover states use subtle scale (1.02) and shadow elevation (+4px). Active states compress to 0.98 scale. All transitions are smooth 200ms ease-out. Material approach favors gentle elevation over dramatic effects.",
  "atmosphere": "Multi-sentence description of the overall visual feeling and emotional quality this treatment creates"
}}"""
        
        # Define schema - use contexts_string instead of array to avoid Gemini issues
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
                                    "contexts_string": {"type": "string"},
                                    "notes": {"type": "string"}
                                },
                                "required": ["hex", "role", "contexts_string"]
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
                "interaction_states": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "state": {"type": "string"},
                            "css": {"type": "string"}
                        },
                        "required": ["state", "css"]
                    }
                },
                "transformation_rules": {"type": "string"},
                "atmosphere": {"type": "string"}
            },
            "required": ["colors", "materials", "effects", "interaction_states", "transformation_rules", "atmosphere"]
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
                            media_type=f"image/{image_format}"
                        ),
                        TextContent(text=user_prompt)
                    ]
                )
            ],
            structured_output_schema=schema,
            max_tokens=16384,  # Increased from 8192 to prevent truncation
            temperature=0.1
        )
        
        # Use structured output
        if response.structured_output:
            result = response.structured_output
            # Convert contexts_string back to list
            if "colors" in result and "palette" in result["colors"]:
                for color in result["colors"]["palette"]:
                    if "contexts_string" in color:
                        contexts_str = color.pop("contexts_string")
                        color["contexts"] = [c.strip() for c in contexts_str.split(",") if c.strip()]
            return result
        
        # Fallback: parse text
        try:
            result = json.loads(response.text)
            # Same conversion for fallback
            if "colors" in result and "palette" in result["colors"]:
                for color in result["colors"]["palette"]:
                    if "contexts_string" in color:
                        contexts_str = color.pop("contexts_string")
                        color["contexts"] = [c.strip() for c in contexts_str.split(",") if c.strip()]
            return result
        except json.JSONDecodeError as e:
            print(f"Failed to parse surface analysis: {e}")
            print(f"Response: {response.text[:500]}")
            raise ValueError(f"Failed to parse surface analysis: {e}")
    
    async def analyze_typography(
        self,
        image_bytes: bytes,
        image_format: str = "png"
    ) -> Dict[str, Any]:
        """
        Analyze typography system from image using vision LLM.
        
        Extracts font families, scale relationships, weight usage, spacing patterns,
        and generates rich narratives about typographic philosophy.
        
        Args:
            image_bytes: Image data as bytes
            image_format: Image format (png, jpg, webp)
        
        Returns:
            Dict with typography data including families, scale, narratives
        """
        # Convert to base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        system_prompt = """You are a typography expert analyzing a design's type system.

Your task is to extract both EXACT TOKENS (for code generation) and RICH NARRATIVES (for understanding the designer's typographic thinking).

Focus on:
1. Font families used and their roles
2. Font sizes and scale relationships (mathematical ratios)
3. Font weight distribution and usage patterns
4. Line height patterns by context
5. Letter spacing relationships (especially with uppercase)
6. Text case patterns
7. Alignment preferences
8. The designer's typographic philosophy and logic

Be extremely thorough in your narratives - explain WHY choices were made, not just WHAT they are.

CRITICAL: You must respond with ONLY a valid JSON object. No preamble, no explanations before or after, no markdown code blocks. Just the raw JSON."""

        user_prompt = """Analyze the typography in this design.

Return a JSON object with this EXACT structure:

{
  "families": [
    {
      "name": "Inter",
      "approximate_weights": [400, 600, 700],
      "usage_notes": "Used for all text - headings and body"
    }
  ],
  "sizes_approximate": [12, 14, 16, 20, 24, 32, 48],
  "scale_analysis": "Multi-sentence rich description of the type scale system. Explain if it appears mathematical (consistent ratios) or intuitive (varied ratios). Describe what this reveals about the designer's approach to hierarchy.",
  
  "weight_distribution": [
    {"weight": "400", "estimated_frequency": "high", "contexts": "body text, descriptions, paragraphs"},
    {"weight": "600", "estimated_frequency": "medium", "contexts": "subheadings, buttons, labels"},
    {"weight": "700", "estimated_frequency": "low", "contexts": "hero headings, primary titles"}
  ],
  
  "line_height_observations": [
    {"context": "hero_headings", "approximate_ratio": 1.2, "notes": "Tight for impact"},
    {"context": "body", "approximate_ratio": 1.6, "notes": "Generous for readability"},
    {"context": "buttons", "approximate_ratio": 1.1, "notes": "Tight for compactness"}
  ],
  
  "letter_spacing_patterns": [
    {"context": "uppercase_text", "value": "increased", "notes": "Navigation and labels use generous spacing with uppercase"},
    {"context": "headings", "value": "tight_negative", "notes": "Large headings use negative tracking"},
    {"context": "body", "value": "normal", "notes": "Standard spacing for body text"}
  ],
  
  "case_usage": [
    {"context": "navigation", "case_style": "UPPERCASE"},
    {"context": "hero_headings", "case_style": "Sentence case"},
    {"context": "buttons", "case_style": "UPPERCASE"},
    {"context": "body", "case_style": "Sentence case"}
  ],
  
  "alignment_dominant": "left",
  "alignment_notes": "Body and navigation left-aligned, hero sections centered for impact",
  
  "family_usage_philosophy": "Multi-sentence explanation of why these fonts were chosen and how they're used. Describe the overall character (modern? editorial? technical?) and how the single/multiple family approach creates coherence.",
  
  "scale_philosophy": "Rich description of the type scale system, its mathematical nature (or lack thereof), what the ratios reveal about systematic vs intuitive design thinking. Explain how the scale creates hierarchy and rhythm.",
  
  "weight_hierarchy_logic": "Detailed explanation of how weight creates hierarchy. When is each weight used? Is there high contrast (regular vs bold only) or nuanced gradation (many weights)? How does this guide the eye and establish importance?",
  
  "case_and_spacing_relationships": "Rich narrative explaining the relationship between text case and letter-spacing. Do uppercase elements get more spacing? Do headings use tight tracking? Explain the typographic logic behind these patterns.",
  
  "line_height_philosophy": "Explanation of line-height choices and their functional purposes. How do tight vs loose line-heights create different zones (reading vs action)? How does this affect visual rhythm and readability?",
  
  "alignment_patterns": "Description of alignment usage and logic. When is text centered vs left-aligned? How does alignment relate to hierarchy and function?",
  
  "contextual_rules": "Clear, actionable rules for when to apply each typographic treatment. Example: 'All interactive elements use semibold weight with uppercase treatment and 0.05em letter-spacing. Hero headings use bold with sentence case and negative tracking.'",
  
  "system_narrative": "Multi-paragraph synthesis of the overall typographic philosophy. What is the designer's typographic voice? How do all these choices work together to create meaning? How does typography relate to the overall design language? What does this reveal about the designer's values (clarity? impact? sophistication?)?"
}

CRITICAL: All narrative fields must be rich, multi-sentence paragraphs that explain the LOGIC and RELATIONSHIPS, not just describe what you see."""

        # Define schema
        schema = {
            "type": "object",
            "properties": {
                "families": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "approximate_weights": {"type": "array", "items": {"type": "integer"}},
                            "usage_notes": {"type": "string"}
                        },
                        "required": ["name", "approximate_weights", "usage_notes"]
                    }
                },
                "sizes_approximate": {"type": "array", "items": {"type": "number"}},
                "scale_analysis": {"type": "string"},
                "weight_distribution": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "weight": {"type": "string"},
                            "estimated_frequency": {"type": "string"},
                            "contexts": {"type": "string"}
                        },
                        "required": ["weight", "estimated_frequency", "contexts"]
                    }
                },
                "line_height_observations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "context": {"type": "string"},
                            "approximate_ratio": {"type": "number"},
                            "notes": {"type": "string"}
                        },
                        "required": ["context", "approximate_ratio", "notes"]
                    }
                },
                "letter_spacing_patterns": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "context": {"type": "string"},
                            "value": {"type": "string"},
                            "notes": {"type": "string"}
                        },
                        "required": ["context", "value", "notes"]
                    }
                },
                "case_usage": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "context": {"type": "string"},
                            "case_style": {"type": "string"}
                        },
                        "required": ["context", "case_style"]
                    }
                },
                "alignment_dominant": {"type": "string"},
                "alignment_notes": {"type": "string"},
                "family_usage_philosophy": {"type": "string"},
                "scale_philosophy": {"type": "string"},
                "weight_hierarchy_logic": {"type": "string"},
                "case_and_spacing_relationships": {"type": "string"},
                "line_height_philosophy": {"type": "string"},
                "alignment_patterns": {"type": "string"},
                "contextual_rules": {"type": "string"},
                "system_narrative": {"type": "string"}
            },
            "required": [
                "families", "sizes_approximate", "scale_analysis",
                "weight_distribution", "family_usage_philosophy",
                "scale_philosophy", "weight_hierarchy_logic",
                "case_and_spacing_relationships", "line_height_philosophy",
                "alignment_patterns", "contextual_rules", "system_narrative"
            ]
        }
        
        # Call LLM with vision
        # Using Gemini 2.5 Flash - handles structured typography analysis well
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
                            media_type=f"image/{image_format}"
                        ),
                        TextContent(text=user_prompt)
                    ]
                )
            ],
            structured_output_schema=schema,
            max_tokens=16384,  # Increased to prevent truncation
            temperature=0.1
        )
        
        # Use structured output
        if response.structured_output:
            return response.structured_output
        
        # Fallback: parse JSON from text with robust extraction
    
        try:
            # Try direct parsing first
            return json.loads(response.text)
        except json.JSONDecodeError:
            # Try extracting JSON from markdown code blocks
            try:
                # Look for ```json ... ``` or ``` ... ```
                match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response.text, re.DOTALL)
                if match:
                    return json.loads(match.group(1))
                
                # Look for first { to last }
                match = re.search(r'\{.*\}', response.text, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
                
                # If all parsing fails, raise original error
                raise ValueError(f"Could not extract JSON from response")
            except (json.JSONDecodeError, AttributeError) as inner_e:
                print(f"Failed to parse typography analysis: {inner_e}")
                print(f"Response: {response.text[:500]}")
                raise ValueError(f"Failed to parse typography analysis: {inner_e}")
    
    async def analyze_image_usage(
        self,
        image_bytes: bytes,
        image_format: str = "png"
    ) -> Dict[str, Any]:
        """
        Analyze image usage patterns from design.
        
        Uses Gemini 2.5 Flash to detect all imagery including:
        - Avatar photos (profile pictures, user avatars)
        - Product photos/illustrations (cars, items, etc.)
        - Hero images and backgrounds
        - Card thumbnails
        - Decorative graphics and abstract shapes
        
        Args:
            image_bytes: Image data as bytes
            image_format: Image format (png, jpg, webp)
        
        Returns:
            Dict with has_images, placements, content_style, rhythm data
        """
        # Encode image
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Build system prompt - EXPLICIT about what counts as imagery
        system_prompt = """You are a design analyst specializing in understanding how designers use imagery.

Analyze this design to identify ALL imagery including:

**WHAT COUNTS AS IMAGERY (include ALL of these):**
1. Profile photos and avatar images (circular user photos, profile pictures)
2. Product photos and illustrations (cars, items, objects, devices)
3. Hero images and background imagery
4. Card thumbnails and content images
5. Decorative graphics (gradient orbs, abstract shapes, patterns, blurred backgrounds)
6. Icons that are photographic or illustrative (not simple line icons)
7. Photographs of any kind (people, places, things)
8. 3D renders and illustrations
9. Complex graphics and visual elements

**WHAT TO EXCLUDE (skip these):**
- Simple line icons (hamburger menu, chevron, etc.)
- Text and typography
- Solid color fills (unless they're decorative graphic elements like gradient orbs)
- Buttons and form controls without images

For each image you identify, analyze:
1. Its role/placement (avatar, product_photo, hero_image, decorative_graphic, etc.)
2. Position and frequency
3. Visual treatment (sizing, border_radius, shadows, overlays, etc.)
4. Content style (photography type, illustration style, etc.)

Return ONLY valid JSON matching this exact schema:
{
  "has_images": boolean,
  "image_density": "minimal" | "sparse" | "moderate" | "heavy" | "dominant",
  "placements": [
    {
      "role": "avatar | product_photo | hero_background | card_thumbnail | decorative_graphic | section_divider | inline_content",
      "position": "description of position (e.g., 'top left corner', 'within user card row', 'bottom navigation')",
      "frequency": "single instance | repeating (N instances)",
      "context": "usage context description",
      "coordinates": {"x": 0, "y": 0, "width": 100, "height": 100},
      "treatment": {
        "sizing": "full-bleed | contained | cover | contain | fixed",
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
    "photography_details": {
      "tone": "warm | cool | neutral",
      "contrast": "high | low | medium",
      "saturation": "vibrant | desaturated | muted",
      "lighting": "bright | moody | natural | dramatic",
      "subject_matter": "people | architecture | nature | abstract | products | mixed",
      "processing": "natural | stylized | heavily edited"
    },
    "generation_prompt_hint": "Ready-to-use prompt for image generation APIs to match this style"
  },
  "rhythm": "Description of overall image usage pattern",
  "image_to_text_ratio": "~X% visual, Y% text"
}

CRITICAL OUTPUT FORMAT: 
- Your response must START with { and END with }
- Do NOT include any text before or after the JSON
- Do NOT wrap in markdown code blocks (no ```json or ```)
- Do NOT include any preamble or explanation
- Return ONLY the raw JSON object
- Ensure all strings are properly escaped for JSON

VALIDATION RULES:
- If you find ANY images, set has_images: true
- If placements array has items, has_images MUST be true
- rhythm field MUST be a descriptive string about visual flow, NEVER an error message
- All string values must be valid JSON strings with proper escaping
- Avatar photos ARE imagery (count them!)
- Product photos ARE imagery (count them!)
- Decorative graphics ARE imagery (count them!)
"""
        
        user_prompt = """Analyze all imagery in this design. Be thorough and generous - include:
- ALL profile photos and avatars
- ALL product images or illustrations  
- ALL decorative graphics (even subtle ones like gradient orbs)
- Hero images and backgrounds
- Any other visual content that isn't plain text or simple icons

CRITICAL: Return ONLY the JSON object. No markdown, no backticks, no explanation. Just pure JSON starting with { and ending with }."""
        
        # Retry logic for intermittent failures
        max_attempts = 5
        last_error = None
        
        for attempt in range(1, max_attempts + 1):
            try:
                print(f"Vision analysis attempt {attempt}/{max_attempts}...")
                
                # Use Gemini 2.5 Flash (cheaper, faster) with retries instead of Claude
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
                    max_tokens=4096,
                    temperature=0.2
                )
                
                # Parse response
                
                # Safety check
                if not response or not hasattr(response, 'text'):
                    last_error = "Invalid response from LLM"
                    print(f"Attempt {attempt} failed: {last_error}")
                    continue
                
                # Try structured output first
                if hasattr(response, 'structured_output') and response.structured_output:
                    result = response.structured_output
                else:
                    # Fallback: parse from text with aggressive extraction
                    text = response.text.strip()
                    
                    # Remove markdown code blocks
                    if '```json' in text:
                        # Extract content between ```json and ```
                        parts = text.split('```json')
                        if len(parts) > 1:
                            text = parts[1].split('```')[0].strip()
                    elif '```' in text:
                        # Generic code block
                        parts = text.split('```')
                        if len(parts) >= 3:
                            text = parts[1].strip()
                    
                    # Remove any leading/trailing text before/after JSON
                    # Find first { and last }
                    start = text.find('{')
                    end = text.rfind('}')
                    
                    if start != -1 and end != -1 and end > start:
                        text = text[start:end+1]
                    
                    try:
                        result = json.loads(text)
                    except json.JSONDecodeError as e:
                        last_error = f"JSON parse error: {e}"
                        print(f"Attempt {attempt} failed: {last_error}")
                        print(f"Response preview: {response.text[:300]}")
                        continue
                
                # Validate result quality
                if not isinstance(result, dict):
                    last_error = "Result is not a dict"
                    print(f"Attempt {attempt} failed: {last_error}")
                    continue
                
                # Critical validation: if placements exist, has_images must be true
                placements = result.get('placements', [])
                has_images = result.get('has_images', False)
                
                if len(placements) > 0 and not has_images:
                    # Auto-fix: model found images but said has_images: false
                    print(f"Auto-fixing: Found {len(placements)} placements but has_images was false")
                    result['has_images'] = True
                
                # Check for minimal required fields
                required_fields = ['has_images', 'placements']
                missing_fields = [f for f in required_fields if f not in result]
                
                if missing_fields:
                    last_error = f"Missing required fields: {missing_fields}"
                    print(f"Attempt {attempt} failed: {last_error}")
                    continue
                
                # Check if rhythm field has error message (common failure pattern)
                rhythm = result.get('rhythm', '')
                if 'unable to analyze' in rhythm.lower() or 'parsing error' in rhythm.lower() or 'analysis failed' in rhythm.lower():
                    last_error = f"Rhythm field contains error message: {rhythm[:100]}"
                    print(f"Attempt {attempt} failed: {last_error}")
                    continue
                
                # Success! Return the result
                print(f"✓ Vision analysis succeeded on attempt {attempt}")
                return result
                
            except Exception as e:
                last_error = f"Exception: {str(e)}"
                print(f"Attempt {attempt} failed with exception: {e}")
                traceback.print_exc()
                continue
        
        # All attempts failed - return safe fallback
        print(f"❌ All {max_attempts} vision analysis attempts failed. Last error: {last_error}")
        return {
            "has_images": False,
            "image_density": "unknown",
            "placements": [],
            "content_style": None,
            "rhythm": f"Analysis failed after {max_attempts} attempts: {last_error}",
            "image_to_text_ratio": None
        }
    
    async def analyze_components(
        self,
        image_bytes: bytes,
        image_format: str = "png",
        figma_inventory: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Analyze component vocabulary from design.
        
        Identifies components and their properties, generating rich narratives
        about the designer's component thinking.
        
        Args:
            image_bytes: Image data as bytes
            image_format: Image format (png, jpg, webp)
            figma_inventory: Optional inventory from Figma JSON parsing
        
        Returns:
            Dict with component inventory, properties, and rich narratives
        """
        # Encode image
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Build context from Figma inventory if provided
        figma_context = ""
        if figma_inventory:
            figma_context = "\n\nCOMPONENTS DETECTED FROM FIGMA:\n"
            for comp in figma_inventory:
                figma_context += f"- {comp['type']}: {comp.get('instances_count', 0)} instances"
                if comp.get('variants'):
                    figma_context += f", variants: {', '.join(comp['variants'])}"
                figma_context += "\n"
        
        # Build system prompt - SIMPLIFIED for better JSON compliance
        system_prompt = f"""You are a design analyst. Analyze this UI design and identify all components.

IDENTIFY THESE COMPONENT TYPES:
- Buttons (and their variants like primary/secondary/ghost)
- Cards (content cards, stat cards, etc.)
- Inputs (text fields, checkboxes, toggles, etc.)
- Navigation items (tabs, nav links)
- Avatars/profile images
- Badges/tags
- Any other recurring UI patterns{figma_context}

For each component, note:
- Type (button, card, etc.)
- Variants (if any)
- Visual properties (colors, sizes, spacing, shadows, etc.)
  - font_weight should be numeric: 100-900 (e.g., 400, 600, 700)
- Code hints (Tailwind classes)
- Design thinking (why they look this way)

Also provide:
- Overall component philosophy
- Patterns shared across components
- What's notably absent

Return ONLY a JSON object matching this schema:
{{
  "component_system_philosophy": "text describing overall approach",
  "cross_component_patterns": "text describing shared patterns",
  "notable_absences": "text describing what's missing",
  "inventory": [
    {{
      "type": "button",
      "variants": ["primary", "secondary"],
      "properties": {{
        "primary": {{"background": "#5856D6", "text_color": "#FFF", "border_radius": "8px", "padding": "12px 24px", "font_weight": 600}}
      }},
      "code_hints": {{"primary": "bg-purple-600 text-white px-6 py-3 rounded-lg"}},
      "narratives": {{
        "design_thinking": "Why this component looks this way",
        "variant_system": "How variants differ"
      }},
      "source": "vision",
      "confidence": 0.8
    }}
  ],
  "total_components": 5,
  "total_variants": 10
}}

CRITICAL: 
- Return ONLY the JSON object
- Start with {{ and end with }}
- No markdown code blocks
- No explanatory text before or after
- All strings must be valid JSON (use double quotes, escape special characters)
"""
        
        user_prompt = "Identify all UI components in this design. For EACH component, write 3-4 detailed narratives (minimum 3 sentences each) explaining WHY the designer made these choices. Return ONLY valid JSON, no markdown blocks, no extra text."
        
        # Use Gemini 2.5 Flash for vision analysis (cheaper, excellent vision performance)
        max_attempts = 5
        last_error = None
        
        for attempt in range(1, max_attempts + 1):
            try:
                print(f"Component analysis attempt {attempt}/{max_attempts}...")
                
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
                                    media_type=f"image/{image_format}"
                                ),
                                TextContent(text=user_prompt)
                            ]
                        )
                    ],
                    temperature=0.3,
                    max_tokens=16384  # Increased to prevent truncation in component analysis
                )
                
                # Extract JSON from response
                response_text = response.text.strip()
                
                # DEBUG: Print response for troubleshooting
                print(f"\n{'='*80}")
                print(f"RAW RESPONSE (first 500 chars):")
                print(response_text[:500])
                print(f"{'='*80}\n")
                
                # Remove markdown code blocks with aggressive extraction
                if '```json' in response_text:
                    # Extract content between ```json and ```
                    parts = response_text.split('```json')
                    if len(parts) > 1:
                        response_text = parts[1].split('```')[0].strip()
                elif '```' in response_text:
                    # Generic code block
                    parts = response_text.split('```')
                    if len(parts) >= 3:
                        response_text = parts[1].strip()
                
                # Find JSON object - first { to last }
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}')
                
                if start_idx == -1 or end_idx == -1 or end_idx <= start_idx:
                    last_error = "No JSON object found in response"
                    print(f"Attempt {attempt} failed: {last_error}")
                    print(f"Response preview: {response_text[:300]}")
                    continue
                
                json_str = response_text[start_idx:end_idx+1]
                
                try:
                    result = json.loads(json_str)
                except json.JSONDecodeError as e:
                    last_error = f"JSON parse error: {e}"
                    print(f"Attempt {attempt} failed: {last_error}")
                    print(f"JSON string preview: {json_str[:300]}")
                    continue
                
                # Validate required fields
                required_fields = ['inventory', 'component_system_philosophy']
                missing_fields = [f for f in required_fields if f not in result]
                
                if missing_fields:
                    last_error = f"Missing required fields: {missing_fields}"
                    print(f"Attempt {attempt} failed: {last_error}")
                    continue
                
                # Calculate totals if not provided
                if 'total_components' not in result:
                    result['total_components'] = len(result['inventory'])
                if 'total_variants' not in result:
                    result['total_variants'] = sum(len(comp.get('variants', [])) for comp in result['inventory'])
                
                # Success!
                print(f"✓ Component analysis succeeded on attempt {attempt}")
                return result
                
            except Exception as e:
                last_error = f"Exception: {str(e)}"
                print(f"Attempt {attempt} failed with exception: {e}")
                traceback.print_exc()
                continue
        
        # All attempts failed - return safe fallback
        print(f"❌ All {max_attempts} component analysis attempts failed. Last error: {last_error}")
        return {
            "component_system_philosophy": f"Analysis failed: {last_error}",
            "cross_component_patterns": "Unable to analyze",
            "notable_absences": "Unable to analyze",
            "inventory": [],
            "total_components": 0,
            "total_variants": 0
        }


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


async def analyze_typography_from_image(
    image_bytes: bytes,
    image_format: str = "png"
) -> Dict[str, Any]:
    """
    Analyze typography system from image using vision LLM.
    
    Args:
        image_bytes: Image data as bytes
        image_format: Image format (png, jpg, webp)
    
    Returns:
        Dict with font families, scale, weight patterns, and rich narratives
    """
    analyzer = VisionAnalyzer()
    return await analyzer.analyze_typography(image_bytes, image_format)


async def analyze_image_usage_from_image(
    image_bytes: bytes,
    image_format: str = "png"
) -> Dict[str, Any]:
    """
    Analyze image usage patterns from image using vision LLM.
    
    Args:
        image_bytes: Image data as bytes
        image_format: Image format (png, jpg, webp)
    
    Returns:
        Dict with has_images, placements, content_style, rhythm data
    """
    analyzer = VisionAnalyzer()
    return await analyzer.analyze_image_usage(image_bytes, image_format)


async def analyze_components_from_image(
    image_bytes: bytes,
    image_format: str = "png",
    figma_inventory: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Analyze component vocabulary from image using vision LLM.
    
    Args:
        image_bytes: Image data as bytes
        image_format: Image format (png, jpg, webp)
        figma_inventory: Optional component inventory from Figma parsing
    
    Returns:
        Dict with component inventory, properties, and rich narratives
    """
    analyzer = VisionAnalyzer()
    return await analyzer.analyze_components(image_bytes, image_format, figma_inventory)