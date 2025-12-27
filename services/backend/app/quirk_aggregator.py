"""
DTM Builder v3 - Quirk-Enhanced Designer Taste Model

Aggregates quirks from multiple DTR v6 resources to identify consistent
unconventional patterns that define a designer's unique voice.

Key Changes from v2:
- Aggregates quirk_patterns from multiple resources
- Identifies consistent quirks (appear in 60%+ of resources)
- Creates quirk_signatures (quirks that truly define the designer)

Created: December 27, 2025
"""

from typing import Dict, Any, List
from collections import Counter, defaultdict
import json


class QuirkAggregator:
    """Aggregates quirks from multiple DTRs into DTM quirk signatures"""
    
    def aggregate_quirks(
        self,
        dtrs: List[Dict[str, Any]],
        min_frequency: float = 0.6
    ) -> Dict[str, Any]:
        """
        Aggregate quirks from multiple DTRs
        
        Args:
            dtrs: List of DTR v6 dictionaries
            min_frequency: Minimum frequency (0-1) for quirk to be considered signature
            
        Returns:
            Dict of quirk signatures
        """
        
        if len(dtrs) < 2:
            print("  Note: Single resource - all quirks become signatures")
            return self._single_resource_quirks(dtrs[0]) if dtrs else {}
        
        print(f"\n  Aggregating quirks from {len(dtrs)} resources...")
        
        # Collect quirks by category
        all_quirks = defaultdict(list)
        
        for dtr in dtrs:
            quirks = dtr.get("quirk_patterns", {})
            
            for category, category_data in quirks.items():
                if isinstance(category_data, dict):
                    all_quirks[category].append(category_data)
        
        # Find consistent quirks
        signatures = {}
        
        # Process each category
        for category, quirk_list in all_quirks.items():
            category_signatures = self._find_category_signatures(
                category, quirk_list, len(dtrs), min_frequency
            )
            
            if category_signatures:
                signatures[category] = category_signatures
        
        return signatures
    
    def _single_resource_quirks(self, dtr: Dict[str, Any]) -> Dict[str, Any]:
        """For single resource, return all quirks as signatures"""
        
        quirks = dtr.get("quirk_patterns", {})
        
        # Add frequency = 1.0 to all
        signatures = {}
        for category, data in quirks.items():
            if isinstance(data, dict):
                # Add metadata
                signatures[category] = {
                    **data,
                    "frequency": 1.0,
                    "note": "Single resource - all quirks are signatures"
                }
        
        return signatures
    
    def _find_category_signatures(
        self,
        category: str,
        quirk_list: List[Dict],
        total_resources: int,
        min_frequency: float
    ) -> Dict[str, Any]:
        """Find consistent quirks in a category"""
        
        # Strategy depends on category structure
        
        if category == "obsessions":
            return self._aggregate_obsessions(quirk_list, total_resources, min_frequency)
        
        elif category == "rule_breaking":
            return self._aggregate_rule_breaking(quirk_list, total_resources, min_frequency)
        
        elif category == "personality":
            return self._aggregate_personality(quirk_list, total_resources)
        
        elif category == "micro_signatures":
            return self._aggregate_micro_signatures(quirk_list, total_resources, min_frequency)
        
        elif category == "compositional":
            return self._aggregate_compositional(quirk_list, total_resources, min_frequency)
        
        else:
            # Generic aggregation
            return self._aggregate_generic(quirk_list, total_resources, min_frequency)
    
    def _aggregate_obsessions(
        self,
        quirk_list: List[Dict],
        total: int,
        min_freq: float
    ) -> Dict[str, Any]:
        """Aggregate obsession patterns"""
        
        # Count "always_uses" patterns
        pattern_counts = Counter()
        
        for quirks in quirk_list:
            always_uses = quirks.get("always_uses", [])
            for item in always_uses:
                if isinstance(item, dict):
                    pattern = item.get("pattern")
                    if pattern:
                        pattern_counts[pattern] += 1
        
        # Filter by frequency
        signatures = []
        for pattern, count in pattern_counts.items():
            freq = count / total
            if freq >= min_freq:
                signatures.append({
                    "pattern": pattern,
                    "frequency": freq,
                    "appears_in": f"{count}/{total} resources",
                    "note": "Consistent signature obsession"
                })
        
        return {"signature_obsessions": signatures} if signatures else {}
    
    def _aggregate_rule_breaking(
        self,
        quirk_list: List[Dict],
        total: int,
        min_freq: float
    ) -> Dict[str, Any]:
        """Aggregate rule-breaking patterns"""
        
        # Check for neon color usage
        neon_count = sum(1 for q in quirk_list if q.get("neon_colors", {}).get("uses_neon"))
        
        signatures = {}
        
        if neon_count / total >= min_freq:
            # Collect all neon colors
            all_neon = []
            for q in quirk_list:
                neon_data = q.get("neon_colors", {})
                if neon_data.get("uses_neon"):
                    all_neon.extend(neon_data.get("neon_palette", []))
            
            signatures["neon_color_rebellion"] = {
                "frequency": neon_count / total,
                "common_neon_colors": list(set(all_neon))[:5],
                "note": "Consistently uses neon/bright colors"
            }
        
        return signatures
    
    def _aggregate_personality(
        self,
        quirk_list: List[Dict],
        total: int
    ) -> Dict[str, Any]:
        """Aggregate personality scores (average)"""
        
        # Average personality scores
        scores = defaultdict(list)
        
        for quirks in quirk_list:
            for trait, value in quirks.items():
                if isinstance(value, (int, float)) and trait not in ["note"]:
                    scores[trait].append(value)
        
        # Calculate averages
        avg_scores = {}
        for trait, values in scores.items():
            if values:
                avg_scores[trait] = sum(values) / len(values)
        
        # Find dominant traits (score > 0.6)
        dominant = [trait for trait, score in avg_scores.items() if score > 0.6]
        
        return {
            **avg_scores,
            "dominant_traits": dominant,
            "consistency": len(quirk_list) / total,
            "note": f"Averaged from {len(quirk_list)} resources"
        }
    
    def _aggregate_micro_signatures(
        self,
        quirk_list: List[Dict],
        total: int,
        min_freq: float
    ) -> Dict[str, Any]:
        """Aggregate micro-signature patterns"""
        
        signatures = {}
        
        # Check for heavy elevation (deep shadows)
        heavy_elev_count = sum(1 for q in quirk_list if q.get("heavy_elevation", {}).get("uses_deep_shadows"))
        
        if heavy_elev_count / total >= min_freq:
            signatures["deep_shadow_signature"] = {
                "frequency": heavy_elev_count / total,
                "note": "Consistently uses heavy material-style shadows"
            }
        
        # Check for blend mode usage
        blend_count = sum(1 for q in quirk_list if q.get("blend_mode_signature", {}).get("uses_blend_modes"))
        
        if blend_count / total >= min_freq:
            # Collect all blend modes
            all_modes = []
            for q in quirk_list:
                blend_data = q.get("blend_mode_signature", {})
                if blend_data.get("uses_blend_modes"):
                    all_modes.extend(blend_data.get("modes", []))
            
            signatures["blend_mode_signature"] = {
                "frequency": blend_count / total,
                "common_modes": list(set(all_modes)),
                "note": "Consistently uses non-standard blend modes"
            }
        
        return signatures
    
    def _aggregate_compositional(
        self,
        quirk_list: List[Dict],
        total: int,
        min_freq: float
    ) -> Dict[str, Any]:
        """Aggregate compositional patterns"""
        
        signatures = {}
        
        # Check for glassmorphism
        glass_count = sum(1 for q in quirk_list if "glassmorphism" in q)
        
        if glass_count / total >= min_freq:
            signatures["glassmorphism_signature"] = {
                "frequency": glass_count / total,
                "structure": "backdrop_blur_96px + low_opacity_bg + gradient_overlay",
                "note": "Signature glassmorphic treatment"
            }
        
        # Check for deep layering
        layer_count = sum(1 for q in quirk_list if "deep_layering" in q)
        
        if layer_count / total >= min_freq:
            signatures["complex_layering"] = {
                "frequency": layer_count / total,
                "note": "Complex z-axis with multiple depth cues"
            }
        
        return signatures
    
    def _aggregate_generic(
        self,
        quirk_list: List[Dict],
        total: int,
        min_freq: float
    ) -> Dict[str, Any]:
        """Generic aggregation for unknown categories"""
        
        # Just report consistency
        return {
            "note": f"Category found in {len(quirk_list)}/{total} resources",
            "frequency": len(quirk_list) / total
        }


# Export
__all__ = ["QuirkAggregator"]