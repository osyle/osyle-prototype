"""
DTM Statistical Pattern Extractor
Extracts quantitative patterns from multiple DTRs using pure code (no LLM)
Fast, deterministic, scalable to many DTRs
"""
from typing import Dict, Any, List
import statistics
from collections import defaultdict, Counter


class DTMStatisticalExtractor:
    """Extract statistical patterns from multiple DTRs"""
    
    def extract_patterns(self, dtrs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Extract statistical patterns from multiple DTRs
        
        Args:
            dtrs: List of DTR v4 dictionaries
            
        Returns:
            Statistical patterns dictionary
        """
        
        patterns = {
            "spacing": self._extract_spacing_patterns(dtrs),
            "colors": self._extract_color_patterns(dtrs),
            "typography": self._extract_typography_patterns(dtrs),
            "forms": self._extract_form_patterns(dtrs),
            "gradients": self._extract_gradient_patterns(dtrs),
            "effects": self._extract_effect_patterns(dtrs),
            "metadata": {
                "total_dtrs": len(dtrs),
                "dtr_ids": [dtr.get("meta", {}).get("resource_id") for dtr in dtrs]
            }
        }
        
        return patterns
    
    def _extract_spacing_patterns(self, dtrs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract spacing patterns across DTRs"""
        
        all_quantums = []
        all_values = []
        distributions = []
        
        for dtr in dtrs:
            spacing = dtr.get("quantitative_validation", {}).get("spacing_analysis", {})
            
            if spacing.get("spacing_quantum"):
                all_quantums.append(spacing["spacing_quantum"])
            
            if spacing.get("all_spacings"):
                all_values.extend(spacing["all_spacings"])
            
            if spacing.get("spacing_distribution"):
                distributions.append(spacing["spacing_distribution"])
        
        patterns = {}
        
        # Quantum statistics
        if all_quantums:
            patterns["quantum"] = {
                "mean": statistics.mean(all_quantums),
                "median": statistics.median(all_quantums),
                "mode": Counter(all_quantums).most_common(1)[0][0] if all_quantums else None,
                "std_dev": statistics.stdev(all_quantums) if len(all_quantums) > 1 else 0,
                "range": [min(all_quantums), max(all_quantums)],
                "consistency": self._calculate_consistency(all_quantums),
                "all_observed": sorted(set(all_quantums))
            }
        
        # Value statistics
        if all_values:
            value_counts = Counter(all_values)
            patterns["common_values"] = {
                "top_10": [v for v, _ in value_counts.most_common(10)],
                "frequency": dict(value_counts.most_common(20)),
                "mean": statistics.mean(all_values),
                "median": statistics.median(all_values),
                "std_dev": statistics.stdev(all_values) if len(all_values) > 1 else 0
            }
        
        # Distribution consensus
        if distributions:
            patterns["distribution_consensus"] = self._merge_distributions(distributions)
        
        return patterns
    
    def _extract_color_patterns(self, dtrs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract color patterns across DTRs"""
        
        all_colors = []
        temp_dists = []
        sat_dists = []
        
        for dtr in dtrs:
            colors = dtr.get("quantitative_validation", {}).get("color_analysis", {})
            
            if colors.get("all_colors"):
                all_colors.extend(colors["all_colors"])
            elif colors.get("primary_palette"):
                all_colors.extend(colors["primary_palette"])
            
            if colors.get("temperature_distribution"):
                temp_dists.append(colors["temperature_distribution"])
            
            if colors.get("saturation_distribution"):
                sat_dists.append(colors["saturation_distribution"])
        
        patterns = {}
        
        # Common colors
        if all_colors:
            color_counts = Counter(all_colors)
            patterns["common_colors"] = {
                "top_20": [c for c, _ in color_counts.most_common(20)],
                "frequency": dict(color_counts.most_common(30)),
                "total_unique": len(set(all_colors)),
                "reuse_rate": len(all_colors) / len(set(all_colors)) if all_colors else 0
            }
        
        # Temperature consensus
        if temp_dists:
            patterns["temperature"] = self._average_distributions(temp_dists)
        
        # Saturation consensus
        if sat_dists:
            patterns["saturation"] = self._average_distributions(sat_dists)
        
        return patterns
    
    def _extract_typography_patterns(self, dtrs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract typography patterns across DTRs"""
        
        all_sizes = []
        all_weights = []
        scale_ratios = []
        
        for dtr in dtrs:
            typo = dtr.get("quantitative_validation", {}).get("typography_analysis", {})
            
            if typo.get("all_font_sizes"):
                all_sizes.extend(typo["all_font_sizes"])
            elif typo.get("font_sizes"):
                all_sizes.extend(typo["font_sizes"])
            
            if typo.get("all_font_weights"):
                all_weights.extend(typo["all_font_weights"])
            
            if typo.get("type_scale_ratio"):
                scale_ratios.append(typo["type_scale_ratio"])
        
        patterns = {}
        
        # Size patterns
        if all_sizes:
            size_counts = Counter(all_sizes)
            patterns["sizes"] = {
                "common_sizes": [s for s, _ in size_counts.most_common(15)],
                "frequency": dict(size_counts.most_common(20)),
                "mean": statistics.mean(all_sizes),
                "median": statistics.median(all_sizes),
                "range": [min(all_sizes), max(all_sizes)]
            }
        
        # Weight patterns
        if all_weights:
            patterns["weights"] = {
                "common_weights": sorted(set(all_weights)),
                "frequency": dict(Counter(all_weights))
            }
        
        # Scale ratio
        if scale_ratios:
            patterns["scale_ratio"] = {
                "mean": statistics.mean(scale_ratios),
                "median": statistics.median(scale_ratios),
                "std_dev": statistics.stdev(scale_ratios) if len(scale_ratios) > 1 else 0,
                "consistency": self._calculate_consistency(scale_ratios),
                "all_observed": sorted(set(scale_ratios))
            }
        
        return patterns
    
    def _extract_form_patterns(self, dtrs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract form/shape patterns across DTRs"""
        
        all_radii = []
        radius_quantums = []
        
        for dtr in dtrs:
            forms = dtr.get("quantitative_validation", {}).get("form_analysis", {})
            
            if forms.get("all_radii"):
                all_radii.extend(forms["all_radii"])
            elif forms.get("most_common_radii"):
                all_radii.extend(forms["most_common_radii"])
            
            if forms.get("radius_quantum"):
                radius_quantums.append(forms["radius_quantum"])
        
        patterns = {}
        
        # Radius patterns
        if all_radii:
            radius_counts = Counter(all_radii)
            patterns["corner_radii"] = {
                "common_radii": [r for r, _ in radius_counts.most_common(10)],
                "frequency": dict(radius_counts.most_common(15)),
                "mean": statistics.mean(all_radii),
                "median": statistics.median(all_radii)
            }
        
        # Radius quantum
        if radius_quantums:
            patterns["radius_quantum"] = {
                "mean": statistics.mean(radius_quantums),
                "mode": Counter(radius_quantums).most_common(1)[0][0],
                "consistency": self._calculate_consistency(radius_quantums)
            }
        
        return patterns
    
    def _extract_gradient_patterns(self, dtrs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract gradient usage patterns"""
        
        has_gradients = []
        gradient_types = []
        
        for dtr in dtrs:
            grads = dtr.get("quantitative_validation", {}).get("gradient_analysis", {})
            
            if grads.get("has_gradients") is not None:
                has_gradients.append(grads["has_gradients"])
            
            if grads.get("gradient_types"):
                gradient_types.extend(grads["gradient_types"])
        
        patterns = {}
        
        if has_gradients:
            patterns["usage_rate"] = sum(has_gradients) / len(has_gradients)
        
        if gradient_types:
            patterns["common_types"] = dict(Counter(gradient_types))
        
        return patterns
    
    def _extract_effect_patterns(self, dtrs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract effects (shadows, blurs) patterns"""
        
        effect_types = []
        
        for dtr in dtrs:
            effects = dtr.get("quantitative_validation", {}).get("effects_analysis", {})
            
            if effects.get("effect_types"):
                effect_types.extend(effects["effect_types"])
        
        patterns = {}
        
        if effect_types:
            patterns["common_effects"] = dict(Counter(effect_types))
        
        return patterns
    
    # Helper methods
    
    def _calculate_consistency(self, values: List[float]) -> float:
        """
        Calculate consistency score (0-1)
        1.0 = all same, 0.0 = highly variable
        """
        if not values or len(values) < 2:
            return 1.0
        
        mean_val = statistics.mean(values)
        if mean_val == 0:
            return 1.0
        
        std_dev = statistics.stdev(values)
        cv = std_dev / mean_val  # Coefficient of variation
        
        # Convert to consistency score (lower cv = higher consistency)
        consistency = max(0.0, min(1.0, 1.0 - cv))
        return round(consistency, 3)
    
    def _merge_distributions(self, distributions: List[Dict[str, float]]) -> Dict[str, float]:
        """Merge multiple distributions into consensus"""
        
        all_keys = set()
        for dist in distributions:
            all_keys.update(dist.keys())
        
        merged = {}
        for key in all_keys:
            values = [dist.get(key, 0) for dist in distributions]
            merged[key] = statistics.mean(values)
        
        return merged
    
    def _average_distributions(self, distributions: List[Dict[str, Any]]) -> Dict[str, float]:
        """Average distribution values across multiple DTRs"""
        
        all_keys = set()
        for dist in distributions:
            all_keys.update(dist.keys())
        
        averaged = {}
        for key in all_keys:
            values = [dist.get(key, 0) for dist in distributions]
            averaged[key] = round(statistics.mean(values), 3)
        
        return averaged


# Test
if __name__ == "__main__":
    extractor = DTMStatisticalExtractor()
    
    # Mock DTRs
    sample_dtrs = [
        {
            "quantitative_validation": {
                "spacing_analysis": {
                    "spacing_quantum": 8,
                    "all_spacings": [8, 16, 24, 32],
                    "spacing_distribution": {"8": 0.4, "16": 0.3, "24": 0.2}
                }
            }
        },
        {
            "quantitative_validation": {
                "spacing_analysis": {
                    "spacing_quantum": 8,
                    "all_spacings": [8, 16, 20, 24],
                    "spacing_distribution": {"8": 0.5, "16": 0.25, "20": 0.15}
                }
            }
        }
    ]
    
    patterns = extractor.extract_patterns(sample_dtrs)
    print("Spacing patterns:", patterns["spacing"])