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
            max_tokens=8192,  # Ensure enough space for complete response
            temperature=0.0  # Deterministic for analysis
        )
        
        # Parse structured output
        if response.structured_output:
            result = response.structured_output
            # Convert string fields back to lists/arrays
            self._convert_structure_strings_to_lists(result)
            return result
        
        # Fallback: try parsing text
        import json
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
            max_tokens=8192,
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
        import json
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
        # Using Claude Sonnet 4.5 instead of Gemini because:
        # 1. Better structured output handling (proven in narrative generation)
        # 2. More reliable JSON parsing with our robust extraction
        # 3. Consistency - same model family as narrative generation
        response = await self.llm.generate(
            model="claude-sonnet-4.5",
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
            max_tokens=8192,
            temperature=0.1
        )
        
        # Use structured output
        if response.structured_output:
            return response.structured_output
        
        # Fallback: parse JSON from text with robust extraction
        import json
        import re
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