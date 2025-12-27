"""
Quirk Analyzer - Detects Unconventional Design Signatures

This module analyzes designs to find the idiosyncratic patterns that make
a designer's work uniquely recognizable. Goes beyond conventional design
system metrics to capture personality, rebellion, obsessions, and emotional
architecture.

Created: December 27, 2025
"""

from typing import Dict, Any, List, Optional
import re
from collections import Counter


class QuirkAnalyzer:
    """Analyzes designs for unconventional patterns and quirks"""
    
    def __init__(self, llm_client):
        """
        Args:
            llm_client: LLM service for semantic quirk detection
        """
        self.llm = llm_client
    
    async def analyze_quirks(
        self,
        quantitative: Dict[str, Any],
        visual_patterns: List[Dict[str, Any]],
        figma_json: Dict[str, Any],
        image_base64: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze design for quirks and unconventional patterns
        
        Args:
            quantitative: Quantitative metrics (colors, spacing, typography)
            visual_patterns: Visual effects (gradients, shadows, blur)
            figma_json: Raw Figma structure
            image_base64: Screenshot for visual analysis
            
        Returns:
            Dict of detected quirks organized by category
        """
        
        print(f"\n{'='*60}")
        print(f"ANALYZING QUIRKS - Unconventional Pattern Detection")
        print(f"{'='*60}")
        
        quirks = {}
        
        # Category 1: Rule-breaking patterns
        print("\n[1/8] Detecting rule-breaking patterns...")
        quirks["rule_breaking"] = self._detect_rule_breaking(quantitative, visual_patterns)
        
        # Category 2: Signature obsessions
        print("\n[2/8] Detecting signature obsessions...")
        quirks["obsessions"] = self._detect_obsessions(quantitative, visual_patterns)
        
        # Category 3: Spatial philosophy
        print("\n[3/8] Analyzing spatial philosophy...")
        quirks["spatial_philosophy"] = self._analyze_spatial_philosophy(figma_json, quantitative)
        
        # Category 4: Proportion quirks
        print("\n[4/8] Detecting proportion quirks...")
        quirks["proportions"] = self._detect_proportion_quirks(quantitative, figma_json)
        
        # Category 5: Micro-signatures
        print("\n[5/8] Finding micro-signatures...")
        quirks["micro_signatures"] = self._detect_micro_signatures(visual_patterns, quantitative)
        
        # Category 6: Content treatment
        print("\n[6/8] Analyzing content treatment...")
        quirks["content_treatment"] = self._analyze_content_treatment(figma_json)
        
        # Category 7: Compositional patterns
        print("\n[7/8] Detecting compositional patterns...")
        quirks["compositional"] = self._detect_compositional_patterns(visual_patterns, figma_json)
        
        # Category 8: LLM-based personality & emotional patterns
        print("\n[8/8] Analyzing personality & emotion with LLM...")
        llm_quirks = await self._llm_analyze_quirks(
            quantitative, visual_patterns, image_base64
        )
        quirks["personality"] = llm_quirks.get("personality", {})
        quirks["emotional_architecture"] = llm_quirks.get("emotional_architecture", {})
        
        return quirks
    
    def _detect_rule_breaking(
        self,
        quantitative: Dict[str, Any],
        visual_patterns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect where designer breaks conventional rules"""
        
        breaking = {}
        
        # Color rebellion - using unexpected colors
        colors = quantitative.get("colors", {})
        palette = colors.get("primary_palette", [])
        
        # Check if using neon/bright colors (saturation check)
        bright_colors = []
        for color in palette[:10]:
            match = re.match(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', color)
            if match:
                r, g, b = int(match.group(1)), int(match.group(2)), int(match.group(3))
                max_val = max(r, g, b)
                min_val = min(r, g, b)
                saturation = (max_val - min_val) / max_val if max_val > 0 else 0
                
                if saturation > 0.7 and max_val > 200:
                    bright_colors.append(color)
        
        if bright_colors:
            breaking["neon_colors"] = {
                "uses_neon": True,
                "neon_palette": bright_colors[:3],
                "note": "Uses highly saturated bright colors"
            }
        
        # Check for unconventional gradients (very high opacity differences)
        gradients = [p for p in visual_patterns if p.get("type") == "gradient"]
        if gradients:
            # Check for aggressive opacity transitions
            aggressive_gradients = []
            for grad in gradients:
                impl = grad.get("implementation", {})
                css = impl.get("css", "")
                if "rgba" in css and "0)" in css:  # Fades to transparent
                    aggressive_gradients.append(css)
            
            if aggressive_gradients:
                breaking["aggressive_gradients"] = {
                    "uses_heavy_fades": True,
                    "count": len(aggressive_gradients),
                    "note": "Uses aggressive transparency gradients"
                }
        
        return breaking
    
    def _detect_obsessions(
        self,
        quantitative: Dict[str, Any],
        visual_patterns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect what designer obsessively uses"""
        
        obsessions = {
            "always_uses": [],
            "never_uses": [],
            "signature_combinations": []
        }
        
        # Shape obsession - analyze corner radii
        forms = quantitative.get("forms", {})
        radii = forms.get("common_radii", [])
        
        if radii:
            # Check for pill obsession (very high radii)
            if any(r >= 40 for r in radii):
                obsessions["always_uses"].append({
                    "pattern": "pill_shapes",
                    "evidence": f"High border radii: {[r for r in radii if r >= 40]}px",
                    "strength": "high"
                })
            
            # Check for sharp corner obsession
            if 0 in radii and radii.count(0) / len(radii) > 0.5:
                obsessions["always_uses"].append({
                    "pattern": "sharp_corners",
                    "evidence": f"{radii.count(0)}/{len(radii)} radii are 0px",
                    "strength": "high"
                })
        
        # Blur obsession
        blurs = [p for p in visual_patterns if p.get("type") == "blur"]
        if blurs:
            heavy_blurs = [b for b in blurs if b.get("implementation", {}).get("radius", 0) > 50]
            if heavy_blurs:
                obsessions["always_uses"].append({
                    "pattern": "glassmorphism",
                    "evidence": f"Heavy backdrop blur: {[b.get('implementation', {}).get('radius') for b in heavy_blurs]}px",
                    "strength": "high"
                })
        
        # Gradient obsession
        gradients = [p for p in visual_patterns if p.get("type") == "gradient"]
        if len(gradients) >= 3:
            obsessions["always_uses"].append({
                "pattern": "gradients_everywhere",
                "evidence": f"{len(gradients)} gradient patterns detected",
                "strength": "medium"
            })
        
        # Check for signature color combinations
        colors = quantitative.get("colors", {})
        palette = colors.get("primary_palette", [])
        
        # Detect color pairings from gradients
        color_pairs = []
        for grad in gradients:
            impl = grad.get("implementation", {})
            grad_colors = impl.get("colors", [])
            if len(grad_colors) >= 2:
                color_pairs.append(f"{grad_colors[0]} → {grad_colors[-1]}")
        
        if color_pairs:
            # Find most common pairing
            common_pairs = Counter(color_pairs).most_common(2)
            if common_pairs[0][1] >= 2:  # Used at least twice
                obsessions["signature_combinations"].append({
                    "pattern": "gradient_color_pairing",
                    "combination": common_pairs[0][0],
                    "frequency": common_pairs[0][1],
                    "note": "Signature gradient color combination"
                })
        
        return obsessions
    
    def _analyze_spatial_philosophy(
        self,
        figma_json: Dict[str, Any],
        quantitative: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze designer's relationship with space"""
        
        philosophy = {}
        
        # Analyze spacing quantum and distribution
        spacing = quantitative.get("spacing", {})
        quantum = spacing.get("quantum", 8)
        all_values = spacing.get("all_values", [])
        
        if all_values:
            # Calculate spacing density
            avg_spacing = sum(all_values) / len(all_values)
            
            if avg_spacing < 12:
                density = "tight"
            elif avg_spacing < 24:
                density = "medium"
            else:
                density = "loose"
            
            philosophy["density_preference"] = {
                "information_density": density,
                "avg_spacing": avg_spacing,
                "quantum": quantum
            }
            
            # Check for awkward gaps (spacing values not in quantum)
            non_quantum_values = [v for v in all_values if v % quantum != 0]
            if len(non_quantum_values) / len(all_values) > 0.3:
                philosophy["breaks_spacing_system"] = {
                    "breaks_quantum": True,
                    "frequency": len(non_quantum_values) / len(all_values),
                    "note": "Often breaks own spacing system"
                }
        
        # Analyze asymmetry from layout structure
        # (This would require deeper Figma analysis - simplified here)
        philosophy["asymmetry_hint"] = {
            "note": "Requires deeper layout analysis",
            "detected": False
        }
        
        return philosophy
    
    def _detect_proportion_quirks(
        self,
        quantitative: Dict[str, Any],
        figma_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect mathematical proportion obsessions"""
        
        quirks = {}
        
        # Check type scale for golden ratio or fibonacci
        typography = quantitative.get("typography", {})
        scale_ratio = typography.get("scale_ratio", 1.5)
        
        # Golden ratio is ~1.618
        if abs(scale_ratio - 1.618) < 0.1:
            quirks["golden_ratio_type"] = {
                "uses_golden_ratio": True,
                "ratio": scale_ratio,
                "note": "Typography follows golden ratio"
            }
        
        # Check for odd/even number preferences
        sizes = typography.get("common_sizes", [])
        if sizes:
            odd_count = sum(1 for s in sizes if s % 2 != 0)
            even_count = len(sizes) - odd_count
            
            if odd_count / len(sizes) > 0.7:
                quirks["odd_number_preference"] = {
                    "prefers_odd": True,
                    "ratio": odd_count / len(sizes),
                    "note": "Strongly prefers odd number sizing"
                }
            elif even_count / len(sizes) > 0.7:
                quirks["even_number_preference"] = {
                    "prefers_even": True,
                    "ratio": even_count / len(sizes),
                    "note": "Strongly prefers even number sizing"
                }
        
        return quirks
    
    def _detect_micro_signatures(
        self,
        visual_patterns: List[Dict[str, Any]],
        quantitative: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect tiny signature details"""
        
        signatures = {}
        
        # Corner quirks - mixed radii on same element
        forms = quantitative.get("forms", {})
        radii = forms.get("common_radii", [])
        
        if len(set(radii)) > 5:  # Lots of different radii
            signatures["mixed_radii"] = {
                "uses_varied_radii": True,
                "unique_values": len(set(radii)),
                "note": "Uses many different corner radii (not systematic)"
            }
        
        # Shadow patterns
        shadows = [p for p in visual_patterns if p.get("type") == "shadow"]
        if shadows:
            # Check for heavy shadows
            heavy_shadows = []
            for shadow in shadows:
                impl = shadow.get("implementation", {})
                radius = impl.get("radius", 0)
                if radius > 20:
                    heavy_shadows.append(shadow)
            
            if heavy_shadows:
                signatures["heavy_elevation"] = {
                    "uses_deep_shadows": True,
                    "avg_blur": sum(s.get("implementation", {}).get("radius", 0) for s in heavy_shadows) / len(heavy_shadows),
                    "note": "Material-style deep elevation"
                }
        
        # Blend mode patterns (very signature)
        blend_modes = [p for p in visual_patterns if p.get("type") == "blend_mode"]
        if blend_modes:
            mode_types = [b.get("pattern_subtype") for b in blend_modes]
            signatures["blend_mode_signature"] = {
                "uses_blend_modes": True,
                "modes": list(set(mode_types)),
                "note": "Uses non-standard blend modes for visual interest"
            }
        
        return signatures
    
    def _analyze_content_treatment(
        self,
        figma_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze how designer treats different content types"""
        
        treatment = {}
        
        # This would require analyzing actual Figma nodes
        # For now, provide structure
        treatment["image_philosophy"] = {
            "note": "Requires Figma node analysis",
            "detected": False
        }
        
        treatment["text_hierarchy"] = {
            "note": "Requires Figma node analysis",
            "detected": False
        }
        
        return treatment
    
    def _detect_compositional_patterns(
        self,
        visual_patterns: List[Dict[str, Any]],
        figma_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect compositional and layout patterns"""
        
        patterns = {}
        
        # Detect glassmorphism pattern
        heavy_blur = any(
            p.get("type") == "blur" and p.get("implementation", {}).get("radius", 0) > 50
            for p in visual_patterns
        )
        
        transparent_gradients = any(
            p.get("type") == "gradient" and "rgba" in p.get("implementation", {}).get("css", "")
            for p in visual_patterns
        )
        
        if heavy_blur and transparent_gradients:
            patterns["glassmorphism"] = {
                "structure": "backdrop_blur_96px + low_opacity_bg + gradient_overlay",
                "confidence": "high",
                "note": "Classic glassmorphic card treatment"
            }
        
        # Detect layering complexity from multiple shadows/blurs
        shadows = [p for p in visual_patterns if p.get("type") == "shadow"]
        blurs = [p for p in visual_patterns if p.get("type") == "blur"]
        
        if len(shadows) > 2 or len(blurs) > 1:
            patterns["deep_layering"] = {
                "z_axis_complexity": "deep",
                "shadow_count": len(shadows),
                "blur_count": len(blurs),
                "note": "Complex z-axis layering with multiple depth cues"
            }
        
        return patterns
    
    async def _llm_analyze_quirks(
        self,
        quantitative: Dict[str, Any],
        visual_patterns: List[Dict[str, Any]],
        image_base64: Optional[str]
    ) -> Dict[str, Any]:
        """Use LLM to detect personality and emotional patterns"""
        
        # Build context
        context_parts = []
        
        context_parts.append("DESIGN ANALYSIS FOR QUIRK DETECTION")
        context_parts.append("="*50)
        context_parts.append("")
        
        # Colors
        colors = quantitative.get("colors", {})
        palette = colors.get("primary_palette", [])[:8]
        context_parts.append(f"COLOR PALETTE: {palette}")
        
        # Temperature
        temp = colors.get("temperature", {})
        context_parts.append(f"Color Temperature: {temp.get('warm', 0)*100:.0f}% warm, {temp.get('cool', 0)*100:.0f}% cool, {temp.get('neutral', 0)*100:.0f}% neutral")
        
        # Saturation
        sat = colors.get("saturation", {})
        context_parts.append(f"Color Saturation: {sat.get('high', 0)*100:.0f}% high, {sat.get('medium', 0)*100:.0f}% medium, {sat.get('low', 0)*100:.0f}% low")
        context_parts.append("")
        
        # Visual patterns
        context_parts.append("VISUAL EFFECTS:")
        for pattern in visual_patterns[:8]:
            ptype = pattern.get("type")
            subtype = pattern.get("subtype") or pattern.get("pattern_subtype")
            impact = pattern.get("visual_impact")
            context_parts.append(f"- {ptype}" + (f" ({subtype})" if subtype else "") + f" - {impact} impact")
        context_parts.append("")
        
        # Typography
        typo = quantitative.get("typography", {})
        context_parts.append(f"TYPOGRAPHY:")
        context_parts.append(f"Scale ratio: {typo.get('scale_ratio', 'N/A')}")
        context_parts.append(f"Common sizes: {typo.get('common_sizes', [])[:6]}")
        context_parts.append("")
        
        # Build message
        message_content = []
        
        message_content.append({
            "type": "text",
            "text": "\n".join(context_parts)
        })
        
        if image_base64:
            message_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": image_base64
                }
            })
        
        # Call LLM
        try:
            response = await self.llm.call_claude(
                prompt_name="analyze_design_quirks",
                user_message=message_content,
                max_tokens=2000,
                parse_json=True
            )
            
            return response.get("json", {})
            
        except Exception as e:
            print(f"Warning: LLM quirk analysis failed: {e}")
            return {
                "personality": {},
                "emotional_architecture": {},
                "note": "LLM analysis unavailable"
            }


# Export
__all__ = ["QuirkAnalyzer"]