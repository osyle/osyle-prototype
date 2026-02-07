"""
Pass 3: Typography System

Extracts the designer's complete typographic approach - fonts, scale system,
weight usage, spacing patterns, and the logic behind typographic choices.

This pass:
1. Code extraction: Exact values from Figma JSON (families, sizes, weights, spacing)
2. Vision analysis: Rich descriptions from image (for image-only or validation)
3. Metric computation: Type scale ratios, weight distribution, pattern analysis
4. LLM synthesis: Rich narratives explaining typographic philosophy and logic
"""

import statistics
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.llm import get_llm_service, Message, MessageRole, TextContent
from app.dtr.schemas import Pass3TypographyDTR, FontFamily, ScaleMetrics
from app.dtr.extractors.figma_parser import parse_figma_typography
from app.dtr.extractors.vision import analyze_typography_from_image
from app.dtr.passes.base import BasePass


class Pass3Typography(BasePass):
    """
    Pass 3: Typography System
    
    Handles 3 scenarios:
    1. Figma JSON only → Code extraction + LLM narrative synthesis
    2. Image only → Vision analysis (approximate values + narratives)
    3. Both → Code extraction + Vision validation + LLM synthesis
    """
    
    def __init__(self):
        super().__init__()
        self.llm = get_llm_service()
    
    async def execute(
        self,
        figma_json: Optional[Dict[str, Any]] = None,
        image_bytes: Optional[bytes] = None,
        image_format: str = "png"
    ) -> Pass3TypographyDTR:
        """
        Execute Pass 3 typography extraction.
        
        Args:
            figma_json: Optional Figma JSON data
            image_bytes: Optional image data
            image_format: Image format (png, jpg, webp)
        
        Returns:
            Pass3TypographyDTR with typography analysis
        """
        start_time = datetime.now()
        
        # Determine input scenario
        has_figma = figma_json is not None
        has_image = image_bytes is not None
        
        if not has_figma and not has_image:
            raise ValueError("At least one of figma_json or image_bytes must be provided")
        
        # Route to appropriate extraction method
        if has_figma and not has_image:
            result = await self._extract_from_figma(figma_json)
            authority = "code"
            confidence = 0.90
        
        elif has_image and not has_figma:
            result = await self._extract_from_vision(image_bytes, image_format)
            authority = "vision"
            confidence = 0.65
        
        else:  # Both available
            result = await self._extract_hybrid(figma_json, image_bytes, image_format)
            authority = "hybrid"
            confidence = 0.95
        
        # Add metadata
        end_time = datetime.now()
        extraction_time = int((end_time - start_time).total_seconds() * 1000)
        
        result["authority"] = authority
        result["confidence"] = confidence
        result["extracted_at"] = datetime.now().isoformat()
        result["extraction_time_ms"] = extraction_time
        
        # Validate and return as Pydantic model
        return Pass3TypographyDTR(**result)
    
    async def _extract_from_figma(self, figma_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract typography from Figma JSON only.
        
        Flow:
        1. Code parser extracts exact values
        2. Compute derived metrics
        3. LLM generates rich narratives
        """
        try:
            # Step 1: Code extraction
            extracted = parse_figma_typography(figma_json)
            
            # Step 2: Compute metrics
            metrics = self._compute_metrics(extracted)
            
            # Step 3: LLM narrative synthesis
            narratives = await self._generate_narratives_from_data(metrics, extracted)
            
            # Step 4: Combine into output format
            return {
                **metrics,
                **narratives
            }
        
        except Exception as e:
            # If ANYTHING fails, ensure we return valid output with fallback narratives
            print(f"ERROR in _extract_from_figma: {e}")
            import traceback
            traceback.print_exc()
            
            # Try to at least get the metrics if we can
            try:
                extracted = parse_figma_typography(figma_json)
                metrics = self._compute_metrics(extracted)
            except Exception as inner_e:
                print(f"ERROR: Even basic extraction failed: {inner_e}")
                # If even that fails, return minimal valid output
                metrics = {
                    "families": [],
                    "sizes_used": [],
                    "scale_metrics": {"ratio_mean": 1.0, "ratio_consistency": 0.0},
                    "weight_frequencies": {},
                    "exact_line_heights": {},
                    "exact_letter_spacing": {}
                }
            
            # Always include fallback narratives
            return {
                **metrics,
                **self._generate_fallback_narratives()
            }
    
    async def _extract_from_vision(
        self,
        image_bytes: bytes,
        image_format: str
    ) -> Dict[str, Any]:
        """
        Extract typography from image only using vision LLM.
        
        Vision LLM does both extraction AND narrative generation.
        """
        try:
            # Vision analyzer does everything in one pass
            vision_result = await analyze_typography_from_image(image_bytes, image_format)
            
            # Convert vision result to our schema format
            return self._convert_vision_to_schema(vision_result)
        
        except Exception as e:
            # If vision fails, return minimal valid output with fallback narratives
            print(f"ERROR in _extract_from_vision: {e}")
            import traceback
            traceback.print_exc()
            
            # Return minimal valid structure
            return {
                "families": [],
                "sizes_used": [14, 16, 20, 24, 32],  # Common defaults
                "scale_metrics": {"ratio_mean": 1.25, "ratio_consistency": 0.5},
                "weight_frequencies": {"400": {"frequency": 80, "contexts": ["body"]}},
                "exact_line_heights": {"body": 1.5},
                "exact_letter_spacing": {"body": "normal"},
                **self._generate_fallback_narratives()
            }
    
    async def _extract_hybrid(
        self,
        figma_json: Dict[str, Any],
        image_bytes: bytes,
        image_format: str
    ) -> Dict[str, Any]:
        """
        Extract from both Figma JSON and image.
        
        Flow:
        1. Code extracts exact values (ground truth from Figma)
        2. Vision validates and enriches with perceptual feedback (now using Claude Sonnet)
        3. Synthesize narratives using both sources
        
        Vision now uses Claude Sonnet 4.5 instead of Gemini for better reliability.
        """
        # Get code extraction (exact values from Figma)
        extracted = parse_figma_typography(figma_json)
        metrics = self._compute_metrics(extracted)
        
        # Get vision analysis (perceptual validation + enrichment)
        # Now using Claude Sonnet 4.5 which handles structured output reliably
        try:
            vision_result = await analyze_typography_from_image(image_bytes, image_format)
            
            # Synthesize narratives using both exact data and visual perception
            narratives = await self._generate_narratives_hybrid(
                code_data=metrics,
                code_extracted=extracted,
                vision_data=vision_result
            )
        except Exception as e:
            # If vision fails for any reason, fall back to code-only narratives
            print(f"WARNING: Vision analysis failed, using code-only: {e}")
            narratives = await self._generate_narratives_from_data(metrics, extracted)
        
        return {
            **metrics,
            **narratives
        }
    
    def _compute_metrics(self, extracted: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute derived metrics from raw extracted data.
        
        Args:
            extracted: Raw data from figma parser
        
        Returns:
            Dict with computed metrics in schema format
        """
        # Font families
        families_data = extracted.get("families", [])
        families = [
            {
                "name": f["name"],
                "weights_used": f["weights_used"],
                "source": "figma"
            }
            for f in families_data
        ]
        
        # Font sizes
        sizes = extracted.get("sizes", [])
        
        # Type scale metrics
        scale_metrics = self._calculate_scale_metrics(sizes)
        
        # Weight frequencies with contexts (per taste-spec)
        weight_data = extracted.get("weights", {})
        weight_frequencies = {
            weight: {
                "frequency": data["frequency"],
                "contexts": data["contexts"]
            }
            for weight, data in weight_data.items()
        }
        
        # Line heights by context
        line_heights = extracted.get("line_heights", {})
        
        # Letter spacing by context
        letter_spacing = extracted.get("letter_spacing", {})
        
        return {
            "families": families,
            "sizes_used": sizes,
            "scale_metrics": scale_metrics,
            "weight_frequencies": weight_frequencies,
            "exact_line_heights": line_heights,
            "exact_letter_spacing": letter_spacing
        }
    
    def _calculate_scale_metrics(self, sizes: List[float]) -> Dict[str, Any]:
        """
        Calculate type scale ratio and consistency.
        
        Args:
            sizes: Sorted list of font sizes
        
        Returns:
            Dict with ratio_mean and ratio_consistency
        """
        if len(sizes) < 2:
            return {
                "ratio_mean": 1.25,
                "ratio_consistency": 0.5
            }
        
        # Calculate ratios between consecutive sizes
        ratios = []
        for i in range(len(sizes) - 1):
            if sizes[i] > 0:
                ratio = sizes[i + 1] / sizes[i]
                ratios.append(ratio)
        
        if not ratios:
            return {
                "ratio_mean": 1.25,
                "ratio_consistency": 0.5
            }
        
        # Mean ratio
        mean_ratio = statistics.mean(ratios)
        
        # Consistency: 1 - (std_dev / mean)
        # Higher = more consistent (all ratios similar)
        if len(ratios) > 1:
            std_dev = statistics.stdev(ratios)
            consistency = max(0.0, 1.0 - (std_dev / mean_ratio))
        else:
            consistency = 1.0
        
        return {
            "ratio_mean": round(mean_ratio, 3),
            "ratio_consistency": round(consistency, 2)
        }
    
    async def _generate_narratives_from_data(
        self,
        metrics: Dict[str, Any],
        extracted: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate rich narratives from extracted data using LLM.
        
        Args:
            metrics: Computed metrics
            extracted: Raw extracted data
        
        Returns:
            Dict with all narrative fields
        """
        try:
            # Prepare data summary for LLM
            data_summary = self._prepare_data_summary(metrics, extracted)
            
            system_prompt = """You are a typography expert analyzing a design's type system.

You have been given EXACT MEASUREMENTS extracted from the design. Your task is to generate RICH, DETAILED NARRATIVES that explain:
- The designer's typographic philosophy
- The LOGIC behind the choices (not just what they are, but WHY)
- The RELATIONSHIPS between different properties
- How these choices create hierarchy, rhythm, and meaning

Your narratives should be multi-sentence paragraphs that help an AI understand how to apply this typographic system to NEW designs.

CRITICAL: You must respond with ONLY a valid JSON object. No preamble, no explanations before or after, no markdown code blocks. Just the raw JSON."""

            user_prompt = f"""Analyze this typography data and generate rich narratives.

DATA EXTRACTED:
{data_summary}

Generate a JSON object with these narrative fields (all must be multi-sentence paragraphs explaining LOGIC and RELATIONSHIPS):

{{
  "family_usage_philosophy": "Explain why these fonts were chosen, how they're used, what character they create (modern? editorial? technical?). If single family: explain how unity is achieved. If multiple: explain the contrast or complement.",
  
  "scale_philosophy": "Explain the type scale system. Is it mathematical (ratio_consistency > 0.7) or intuitive? What does the ratio ({metrics['scale_metrics']['ratio_mean']:.3f}) reveal? How does this create hierarchy? Is it tight and compact or generous and dramatic?",
  
  "weight_hierarchy_logic": "Explain how weight creates hierarchy. Analyze the distribution: is there high contrast (few weights, big jumps) or nuanced gradation (many weights)? When is each weight used? How does this guide attention and establish importance?",
  
  "case_and_spacing_relationships": "Explain the relationship between text case and letter-spacing. Do uppercase elements get more spacing? Do headings use tight tracking? What's the typographic logic? How does this affect readability and rhythm?",
  
  "line_height_philosophy": "Explain line-height choices. How do tight vs loose line-heights create different functional zones (reading vs action vs labels)? How does this affect visual rhythm, scannability, and user experience?",
  
  "alignment_patterns": "Describe text alignment usage and logic. When is text centered vs left-aligned? How does alignment relate to hierarchy, content type, and user flow? What does the dominant alignment reveal about the design's character?",
  
  "contextual_rules": "Provide clear, actionable rules for when to apply each typographic treatment. Be specific: 'All interactive elements use [weight] with [case] and [spacing]. Hero headings use [weight] with [case] and [tracking].' Make these rules copy-pasteable into generation prompts.",
  
  "system_narrative": "Multi-paragraph synthesis. What is the overall typographic voice? How do all these choices work together? What does this reveal about the designer's values (clarity? sophistication? impact? playfulness?)? How does typography relate to the overall design language?"
}}

CRITICAL: Every field must be a rich, multi-sentence explanation of LOGIC and RELATIONSHIPS, not just descriptions."""

            # Call LLM
            response = await self.llm.generate(
                model="claude-sonnet-4.5",
                messages=[
                    Message(role=MessageRole.SYSTEM, content=system_prompt),
                    Message(role=MessageRole.USER, content=user_prompt)
                ],
                structured_output_schema={
                    "type": "object",
                    "properties": {
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
                        "family_usage_philosophy", "scale_philosophy",
                        "weight_hierarchy_logic", "case_and_spacing_relationships",
                        "line_height_philosophy", "alignment_patterns",
                        "contextual_rules", "system_narrative"
                    ]
                },
                max_tokens=4096,
                temperature=0.2
            )
            
            if response.structured_output:
                return response.structured_output
            
            # Fallback: parse JSON from text
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
                    
                    # Give up and return fallback
                    return self._generate_fallback_narratives()
                except (json.JSONDecodeError, AttributeError):
                    # Return minimal narratives if all parsing attempts fail
                    return self._generate_fallback_narratives()
        
        except Exception as e:
            # Catch ANY exception and return fallback
            print(f"ERROR in _generate_narratives_from_data: {e}")
            import traceback
            traceback.print_exc()
            return self._generate_fallback_narratives()
    
    async def _generate_narratives_hybrid(
        self,
        code_data: Dict[str, Any],
        code_extracted: Dict[str, Any],
        vision_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate narratives using both code and vision data.
        
        This gives the richest output - exact values + perceptual feedback.
        """
        try:
            # Prepare combined summary
            data_summary = self._prepare_data_summary(code_data, code_extracted)
            vision_summary = self._prepare_vision_summary(vision_data)
            
            system_prompt = """You are a typography expert analyzing a design's type system.

You have EXACT MEASUREMENTS from code extraction AND VISUAL PERCEPTION feedback from vision analysis.

Your task: Generate RICH NARRATIVES that synthesize both sources, explaining the designer's typographic logic.

CRITICAL: You must respond with ONLY a valid JSON object. No preamble, no explanations before or after, no markdown code blocks. Just the raw JSON."""

            user_prompt = f"""Analyze this typography data and generate rich narratives.

CODE EXTRACTION (exact values - ground truth):
{data_summary}

VISION ANALYSIS (perceptual feedback):
{vision_summary}

Generate narratives that combine exact precision with perceptual understanding. Same JSON structure as before."""

            # Call LLM (same as _generate_narratives_from_data)
            response = await self.llm.generate(
                model="claude-sonnet-4.5",
                messages=[
                    Message(role=MessageRole.SYSTEM, content=system_prompt),
                    Message(role=MessageRole.USER, content=user_prompt)
                ],
                structured_output_schema={
                    "type": "object",
                    "properties": {
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
                        "family_usage_philosophy", "scale_philosophy",
                        "weight_hierarchy_logic", "case_and_spacing_relationships",
                        "line_height_philosophy", "alignment_patterns",
                        "contextual_rules", "system_narrative"
                    ]
                },
                max_tokens=4096,
                temperature=0.2
            )
            
            if response.structured_output:
                return response.structured_output
            
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
                    
                    # Give up and return fallback
                    return self._generate_fallback_narratives()
                except (json.JSONDecodeError, AttributeError):
                    return self._generate_fallback_narratives()
        
        except Exception as e:
            # Catch ANY exception and return fallback
            print(f"ERROR in _generate_narratives_hybrid: {e}")
            import traceback
            traceback.print_exc()
            return self._generate_fallback_narratives()
    
    def _prepare_data_summary(
        self,
        metrics: Dict[str, Any],
        extracted: Dict[str, Any]
    ) -> str:
        """Format extracted data for LLM"""
        families = ", ".join([f["name"] for f in metrics["families"]])
        sizes = ", ".join([str(s) for s in metrics["sizes_used"]])
        
        # Format weights with contexts (now in metrics directly)
        weights = ", ".join([
            f"{w} ({metrics['weight_frequencies'][w]['frequency']} uses in {', '.join(metrics['weight_frequencies'][w]['contexts'])})"
            for w in sorted(metrics["weight_frequencies"].keys())
        ])
        
        scale = metrics["scale_metrics"]
        line_heights = ", ".join([f"{k}: {v}" for k, v in metrics["exact_line_heights"].items()])
        spacing = ", ".join([f"{k}: {v}" for k, v in metrics["exact_letter_spacing"].items()])
        
        return f"""Families: {families}
Sizes (px): {sizes}
Scale ratio: {scale['ratio_mean']:.3f} (consistency: {scale['ratio_consistency']:.2f})
Weights: {weights}
Line heights: {line_heights}
Letter spacing: {spacing}"""
    
    def _prepare_vision_summary(self, vision_data: Dict[str, Any]) -> str:
        """Format vision analysis for LLM"""
        narratives = []
        if "scale_analysis" in vision_data:
            narratives.append(f"Scale: {vision_data['scale_analysis']}")
        if "family_usage_philosophy" in vision_data:
            narratives.append(f"Family usage: {vision_data['family_usage_philosophy']}")
        
        return "\n".join(narratives)
    
    def _convert_vision_to_schema(self, vision_result: Dict[str, Any]) -> Dict[str, Any]:
        """Convert vision analyzer output to Pass3TypographyDTR schema"""
        # Extract families
        families = [
            {
                "name": f["name"],
                "weights_used": f.get("approximate_weights", [400]),
                "source": "vision"
            }
            for f in vision_result.get("families", [])
        ]
        
        # Sizes
        sizes = vision_result.get("sizes_approximate", [14, 16, 20, 24, 32])
        
        # Scale metrics (approximate)
        scale_metrics = self._calculate_scale_metrics(sizes)
        
        # Weight frequencies (estimated from vision)
        # Vision returns array: [{"weight": "400", "estimated_frequency": "high", "contexts": "..."}, ...]
        # Convert to dict: {"400": 40, "600": 20, ...}
        weight_dist_array = vision_result.get("weight_distribution", [])
        weight_frequencies = {}
        freq_map = {"high": 40, "medium": 20, "low": 5}
        
        if isinstance(weight_dist_array, list):
            for item in weight_dist_array:
                weight = item.get("weight", "400")
                est_freq = item.get("estimated_frequency", "medium")
                weight_frequencies[weight] = freq_map.get(est_freq, 20)
        
        # Line heights (convert from vision observations)
        # Vision returns array: [{"context": "hero_headings", "approximate_ratio": 1.2, "notes": "..."}, ...]
        # Convert to dict: {"hero_headings": 1.2, "body": 1.6, ...}
        line_height_array = vision_result.get("line_height_observations", [])
        exact_line_heights = {}
        
        if isinstance(line_height_array, list):
            for item in line_height_array:
                context = item.get("context", "body")
                ratio = item.get("approximate_ratio", 1.5)
                exact_line_heights[context] = ratio
        
        # Letter spacing (approximate)
        # Vision returns array: [{"context": "uppercase_text", "value": "increased", "notes": "..."}, ...]
        # Convert to dict: {"uppercase_text": "0.05em", "body": "normal", ...}
        spacing_array = vision_result.get("letter_spacing_patterns", [])
        exact_letter_spacing = {}
        
        if isinstance(spacing_array, list):
            for item in spacing_array:
                context = item.get("context", "body")
                value = item.get("value", "normal")
                # Map descriptive values to CSS values
                if value == "increased":
                    exact_letter_spacing[context] = "0.05em"
                elif value == "tight_negative":
                    exact_letter_spacing[context] = "-0.02em"
                else:
                    exact_letter_spacing[context] = "normal"
        
        # Narratives come directly from vision
        return {
            "families": families,
            "sizes_used": sizes,
            "scale_metrics": scale_metrics,
            "weight_frequencies": weight_frequencies,
            "exact_line_heights": exact_line_heights,
            "exact_letter_spacing": exact_letter_spacing,
            "family_usage_philosophy": vision_result.get("family_usage_philosophy", ""),
            "scale_philosophy": vision_result.get("scale_philosophy", ""),
            "weight_hierarchy_logic": vision_result.get("weight_hierarchy_logic", ""),
            "case_and_spacing_relationships": vision_result.get("case_and_spacing_relationships", ""),
            "line_height_philosophy": vision_result.get("line_height_philosophy", ""),
            "alignment_patterns": vision_result.get("alignment_patterns", ""),
            "contextual_rules": vision_result.get("contextual_rules", ""),
            "system_narrative": vision_result.get("system_narrative", "")
        }
    
    def _generate_fallback_narratives(self) -> Dict[str, Any]:
        """Generate minimal narratives if LLM fails"""
        return {
            "family_usage_philosophy": "Typography system uses consistent font families throughout the design.",
            "scale_philosophy": "The type scale creates clear hierarchy through size differentiation.",
            "weight_hierarchy_logic": "Font weight variations establish visual importance across the interface.",
            "case_and_spacing_relationships": "Text case and spacing are applied consistently based on context.",
            "line_height_philosophy": "Line height values support readability across different content types.",
            "alignment_patterns": "Text alignment follows functional requirements of each component.",
            "contextual_rules": "Apply typography consistently based on component type and hierarchy level.",
            "system_narrative": "The typographic system creates a cohesive visual language through systematic application of fonts, sizes, weights, and spacing."
        }


# ============================================================================
# PUBLIC API
# ============================================================================

async def run_pass_3(
    figma_json: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
    image_format: str = "png"
) -> Pass3TypographyDTR:
    """
    Run Pass 3 (Typography System) extraction.
    
    Args:
        figma_json: Optional Figma JSON document
        image_bytes: Optional image data
        image_format: Image format (png, jpg, webp)
    
    Returns:
        Pass3TypographyDTR with typography analysis
    """
    pass_3 = Pass3Typography()
    return await pass_3.execute(
        figma_json=figma_json,
        image_bytes=image_bytes,
        image_format=image_format
    )