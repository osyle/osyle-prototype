"""
Code-Based Design Analyzer v3 for Osyle Figma Plugin Format
Analyzes the compressed, intelligence-preserving format from Figma plugin v3
"""
import json
import re
from typing import Dict, List, Any, Tuple, Optional
from collections import Counter, defaultdict
from dataclasses import dataclass
from math import gcd
from functools import reduce


@dataclass
class ColorInfo:
    """Color information with usage context"""
    color_string: str  # rgb(...) or rgba(...)
    rgb: Tuple[int, int, int]
    opacity: float
    context: str  # 'fill', 'stroke', 'text', 'gradient'


class CodeBasedDesignAnalyzer:
    """
    Analyzes compressed Figma JSON from Osyle plugin v3
    
    Expected format:
    {
      "version": "3.0",
      "metadata": {...},
      "design": {
        "type": "FRAME",
        "name": "...",
        "layout": {"mode": "VERTICAL", "spacing": 16, "padding": [...]},
        "style": {"fill": "rgb(...)", "corner_radius": 8, "font_size": 16},
        "children": [...]
      }
    }
    """
    
    def __init__(self):
        """Initialize analyzer with empty data stores"""
        # Data stores
        self.colors: List[ColorInfo] = []
        self.spacing_values: List[int] = []
        self.font_sizes: List[int] = []
        self.font_weights: List[str] = []
        self.corner_radii: List[int] = []
        self.gradients: List[Dict] = []
        self.effects: List[Dict] = []
        
        # Structural analysis
        self.layout_modes: List[str] = []
        self.sizing_modes: List[str] = []
        self.total_nodes = 0
        self.text_nodes = 0
        self.max_depth = 0
        
    def analyze(self, figma_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run full analysis on Figma JSON from plugin v3
        
        Args:
            figma_json: JSON from Osyle Figma plugin (version 3.0)
        
        Returns:
            Comprehensive analysis dict
        """
        # Extract root design node
        design = self._extract_design_node(figma_json)
        
        if not design:
            return self._empty_analysis()
        
        # Traverse and collect data
        self._traverse_node(design, depth=0)
        
        # Run analyses
        return {
            "color_analysis": self._analyze_colors(),
            "spacing_analysis": self._analyze_spacing(),
            "typography_analysis": self._analyze_typography(),
            "form_analysis": self._analyze_forms(),
            "gradient_analysis": self._analyze_gradients(),
            "effects_analysis": self._analyze_effects(),
            "layout_analysis": self._analyze_layout(),
            "overall_confidence": self._calculate_confidence()
        }
    
    def _extract_design_node(self, figma_json: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract the root design node from plugin output"""
        
        # Plugin v3 format
        if "design" in figma_json:
            return figma_json["design"]
        
        # Legacy format (direct node)
        if "type" in figma_json and "name" in figma_json:
            return figma_json
        
        return None
    
    def _traverse_node(self, node: Dict[str, Any], depth: int = 0):
        """
        Recursively traverse node tree and extract measurements
        
        Args:
            node: Current node
            depth: Current tree depth
        """
        self.total_nodes += 1
        self.max_depth = max(self.max_depth, depth)
        
        # Extract from current node
        self._extract_colors_from_node(node)
        self._extract_spacing_from_node(node)
        self._extract_typography_from_node(node)
        self._extract_forms_from_node(node)
        self._extract_gradients_from_node(node)
        self._extract_effects_from_node(node)
        self._extract_layout_from_node(node)
        
        # Recurse to children
        if "children" in node and isinstance(node["children"], list):
            for child in node["children"]:
                self._traverse_node(child, depth + 1)
    
    # ========================================================================
    # EXTRACTION METHODS
    # ========================================================================
    
    def _extract_colors_from_node(self, node: Dict[str, Any]):
        """Extract colors from style.fill, style.color, style.stroke"""
        
        if "style" not in node:
            return
        
        style = node["style"]
        
        # Fill color
        fill = style.get("fill")
        if fill and fill != "null":
            color_info = self._parse_color(fill, context="fill")
            if color_info:
                self.colors.append(color_info)
        
        # Text color (separate from fill)
        color = style.get("color")
        if color and color != "null" and color != fill:
            color_info = self._parse_color(color, context="text")
            if color_info:
                self.colors.append(color_info)
        
        # Stroke color
        stroke = style.get("stroke")
        if stroke and isinstance(stroke, dict):
            stroke_color = stroke.get("color")
            if stroke_color and stroke_color != "null":
                color_info = self._parse_color(stroke_color, context="stroke")
                if color_info:
                    self.colors.append(color_info)
    
    def _extract_spacing_from_node(self, node: Dict[str, Any]):
        """Extract spacing from layout.spacing and layout.padding"""
        
        if "layout" not in node:
            return
        
        layout = node["layout"]
        
        # Gap/spacing between children
        spacing = layout.get("spacing")
        if spacing and isinstance(spacing, (int, float)) and spacing > 0:
            self.spacing_values.append(int(spacing))
        
        # Padding values
        padding = layout.get("padding")
        if padding and isinstance(padding, list):
            for p in padding:
                if p and isinstance(p, (int, float)) and p > 0:
                    self.spacing_values.append(int(p))
    
    def _extract_typography_from_node(self, node: Dict[str, Any]):
        """Extract typography from TEXT nodes"""
        
        if node.get("type") != "TEXT":
            return
        
        self.text_nodes += 1
        
        if "style" not in node:
            return
        
        style = node["style"]
        
        # Font size
        font_size = style.get("font_size")
        if font_size and isinstance(font_size, (int, float)) and font_size > 0:
            self.font_sizes.append(int(font_size))
        
        # Font weight (might be string like "Regular", "Bold", or number)
        font_weight = style.get("font_weight")
        if font_weight:
            self.font_weights.append(str(font_weight))
    
    def _extract_forms_from_node(self, node: Dict[str, Any]):
        """Extract corner radius from style"""
        
        if "style" not in node:
            return
        
        style = node["style"]
        
        # Single corner radius
        corner_radius = style.get("corner_radius")
        if corner_radius and isinstance(corner_radius, (int, float)) and corner_radius > 0:
            self.corner_radii.append(int(corner_radius))
        
        # Individual corner radii
        corner_radii = style.get("corner_radii")
        if corner_radii and isinstance(corner_radii, list):
            for radius in corner_radii:
                if radius and isinstance(radius, (int, float)) and radius > 0:
                    self.corner_radii.append(int(radius))
    
    def _extract_gradients_from_node(self, node: Dict[str, Any]):
        """Extract gradient information"""
        
        if "style" not in node:
            return
        
        style = node["style"]
        gradient = style.get("gradient")
        
        if gradient and isinstance(gradient, dict):
            self.gradients.append({
                "type": gradient.get("type"),
                "stops_count": len(gradient.get("stops", [])),
                "angle": gradient.get("angle")
            })
    
    def _extract_effects_from_node(self, node: Dict[str, Any]):
        """Extract effects (shadows, blurs)"""
        
        if "style" not in node:
            return
        
        style = node["style"]
        effects = style.get("effects")
        
        if effects and isinstance(effects, list):
            for effect in effects:
                if isinstance(effect, dict):
                    self.effects.append({
                        "type": effect.get("type"),
                        "radius": effect.get("radius")
                    })
    
    def _extract_layout_from_node(self, node: Dict[str, Any]):
        """Extract layout mode information"""
        
        if "layout" not in node:
            return
        
        layout = node["layout"]
        
        # Layout mode
        mode = layout.get("mode")
        if mode:
            self.layout_modes.append(mode)
        
        # Sizing modes
        primary_sizing = layout.get("primary_sizing")
        if primary_sizing:
            self.sizing_modes.append(primary_sizing)
        
        counter_sizing = layout.get("counter_sizing")
        if counter_sizing:
            self.sizing_modes.append(counter_sizing)
    
    # ========================================================================
    # ANALYSIS METHODS
    # ========================================================================
    
    def _analyze_colors(self) -> Dict[str, Any]:
        """Analyze color palette and usage patterns"""
        
        if not self.colors:
            return {
                "primary_palette": [],
                "total_colors": 0,
                "color_contexts": {},
                "has_transparency": False,
                "temperature_distribution": {},
                "confidence": 0.0
            }
        
        # Count unique colors (by color string, not opacity)
        color_counts = Counter([self._normalize_color(c.color_string) for c in self.colors])
        most_common = color_counts.most_common(10)
        
        # Analyze contexts (where colors are used)
        context_map = defaultdict(list)
        for color_info in self.colors:
            normalized = self._normalize_color(color_info.color_string)
            if normalized not in context_map[color_info.context]:
                context_map[color_info.context].append(normalized)
        
        # Check for transparency
        has_transparency = any(c.opacity < 1.0 for c in self.colors)
        
        # Temperature analysis
        warm = cool = neutral = 0
        for color_info in self.colors:
            r, g, b = color_info.rgb
            if r > g and r > b:
                warm += 1
            elif b > r and b > g:
                cool += 1
            else:
                neutral += 1
        
        # Confidence
        num_colors = len(color_counts)
        if 3 <= num_colors <= 12:
            confidence = 0.9
        elif num_colors > 0:
            confidence = 0.6
        else:
            confidence = 0.0
        
        return {
            "primary_palette": [color for color, _ in most_common],
            "total_colors": num_colors,
            "color_contexts": {k: v[:5] for k, v in context_map.items()},
            "has_transparency": has_transparency,
            "temperature_distribution": {
                "warm": warm,
                "cool": cool,
                "neutral": neutral
            },
            "confidence": round(confidence, 2)
        }
    
    def _analyze_spacing(self) -> Dict[str, Any]:
        """Detect spacing quantum using GCD approach"""
        
        if not self.spacing_values:
            return {
                "spacing_quantum": None,
                "most_common_spacings": [],
                "spacing_distribution": {},
                "confidence": 0.0
            }
        
        # Remove duplicates but keep for distribution
        unique_spacings = list(set(self.spacing_values))
        unique_spacings.sort()
        
        # Detect quantum
        quantum = self._detect_spacing_quantum(unique_spacings)
        
        # Most common spacings
        spacing_counts = Counter(self.spacing_values)
        most_common = spacing_counts.most_common(8)
        
        # Distribution (multiples of quantum)
        distribution = {}
        if quantum:
            for spacing in unique_spacings:
                multiple = spacing / quantum
                if multiple == int(multiple):
                    distribution[f"{int(multiple)}x"] = spacing
        
        # Confidence
        if quantum and len(unique_spacings) >= 3:
            # Check how many values are quantum multiples
            multiples = sum(1 for s in unique_spacings if s % quantum == 0)
            confidence = (multiples / len(unique_spacings)) * 0.9
        elif len(unique_spacings) >= 2:
            confidence = 0.5
        else:
            confidence = 0.3
        
        return {
            "spacing_quantum": quantum,
            "most_common_spacings": [s for s, _ in most_common],
            "spacing_distribution": distribution,
            "confidence": round(confidence, 2)
        }
    
    def _analyze_typography(self) -> Dict[str, Any]:
        """Analyze type scale and patterns"""
        
        if not self.font_sizes:
            return {
                "font_sizes": [],
                "type_scale_ratio": None,
                "font_weights": {},
                "has_varied_weights": False,
                "confidence": 0.0
            }
        
        # Unique sizes sorted
        unique_sizes = sorted(list(set(self.font_sizes)))
        
        # Detect type scale ratio
        scale_ratio = self._detect_type_scale_ratio(unique_sizes)
        
        # Weight analysis
        weight_counts = Counter(self.font_weights)
        has_varied_weights = len(weight_counts) >= 2
        
        # Confidence
        if scale_ratio and len(unique_sizes) >= 3:
            confidence = 0.9
        elif len(unique_sizes) >= 2:
            confidence = 0.6
        else:
            confidence = 0.3
        
        return {
            "font_sizes": unique_sizes,
            "type_scale_ratio": scale_ratio,
            "font_weights": dict(weight_counts),
            "has_varied_weights": has_varied_weights,
            "confidence": round(confidence, 2)
        }
    
    def _analyze_forms(self) -> Dict[str, Any]:
        """Analyze corner radius patterns"""
        
        if not self.corner_radii:
            return {
                "most_common_radii": [],
                "has_varied_radii": False,
                "radius_quantum": None
            }
        
        # Count unique radii
        radius_counts = Counter(self.corner_radii)
        most_common = radius_counts.most_common(5)
        
        # Try to detect radius quantum
        unique_radii = sorted(list(set(self.corner_radii)))
        radius_quantum = None
        if len(unique_radii) >= 2:
            radius_quantum = reduce(gcd, unique_radii)
            if radius_quantum < 2 or radius_quantum > 16:
                radius_quantum = None
        
        return {
            "most_common_radii": [r for r, _ in most_common],
            "has_varied_radii": len(most_common) > 2,
            "radius_quantum": radius_quantum
        }
    
    def _analyze_gradients(self) -> Dict[str, Any]:
        """Analyze gradient usage"""
        
        if not self.gradients:
            return {
                "has_gradients": False,
                "gradient_types": [],
                "average_stops": 0
            }
        
        types = [g["type"] for g in self.gradients if g.get("type")]
        avg_stops = sum(g["stops_count"] for g in self.gradients) / len(self.gradients)
        
        return {
            "has_gradients": True,
            "gradient_types": list(set(types)),
            "average_stops": round(avg_stops, 1)
        }
    
    def _analyze_effects(self) -> Dict[str, Any]:
        """Analyze shadow and blur effects"""
        
        if not self.effects:
            return {
                "has_effects": False,
                "effect_types": []
            }
        
        types = [e["type"] for e in self.effects if e.get("type")]
        
        return {
            "has_effects": True,
            "effect_types": list(set(types))
        }
    
    def _analyze_layout(self) -> Dict[str, Any]:
        """Analyze layout patterns"""
        
        mode_counts = Counter(self.layout_modes)
        sizing_counts = Counter(self.sizing_modes)
        
        return {
            "uses_auto_layout": len(self.layout_modes) > 0,
            "layout_modes": dict(mode_counts),
            "sizing_modes": dict(sizing_counts),
            "structure": {
                "total_nodes": self.total_nodes,
                "text_nodes": self.text_nodes,
                "max_depth": self.max_depth
            }
        }
    
    def _calculate_confidence(self) -> float:
        """Calculate overall confidence based on data completeness"""
        
        has_colors = len(self.colors) >= 3
        has_spacing = len(self.spacing_values) >= 3
        has_typography = len(self.font_sizes) >= 2
        has_forms = len(self.corner_radii) >= 2
        has_structure = self.total_nodes >= 5
        
        confidence = (
            (0.9 if has_colors else 0.3) * 0.25 +
            (0.9 if has_spacing else 0.3) * 0.25 +
            (0.9 if has_typography else 0.3) * 0.20 +
            (0.8 if has_forms else 0.3) * 0.15 +
            (0.8 if has_structure else 0.3) * 0.15
        )
        
        return round(confidence, 2)
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def _detect_spacing_quantum(self, spacings: List[int]) -> Optional[int]:
        """
        Detect spacing quantum using GCD
        
        Args:
            spacings: Sorted list of unique spacing values
        
        Returns:
            Detected quantum or None
        """
        if len(spacings) < 2:
            return 8  # Default
        
        # Calculate GCD of all spacings
        quantum = reduce(gcd, spacings)
        
        # Validate: should be 4-16px
        if 4 <= quantum <= 16:
            return quantum
        elif quantum < 4 and quantum > 0:
            # Try doubling
            doubled = quantum * 2
            if 4 <= doubled <= 16:
                return doubled
        
        # Fallback: test common quantums
        for candidate in [8, 4, 16, 12]:
            if sum(1 for s in spacings if s % candidate == 0) >= len(spacings) * 0.6:
                return candidate
        
        return 8  # Safe default
    
    def _detect_type_scale_ratio(self, sizes: List[int]) -> Optional[float]:
        """
        Detect type scale ratio from font sizes
        
        Args:
            sizes: Sorted list of font sizes
        
        Returns:
            Detected ratio or None
        """
        if len(sizes) < 2:
            return None
        
        # Calculate ratios between consecutive sizes
        ratios = []
        for i in range(len(sizes) - 1):
            if sizes[i] > 0:
                ratio = sizes[i + 1] / sizes[i]
                if 1.1 <= ratio <= 2.0:
                    ratios.append(ratio)
        
        if not ratios:
            return None
        
        # Average ratio
        avg_ratio = sum(ratios) / len(ratios)
        
        # Round to common type scales
        common_scales = [1.125, 1.2, 1.25, 1.333, 1.414, 1.5, 1.618, 1.667, 2.0]
        closest = min(common_scales, key=lambda x: abs(x - avg_ratio))
        
        # Return if close enough
        if abs(closest - avg_ratio) < 0.15:
            return closest
        
        return round(avg_ratio, 3)
    
    def _parse_color(self, color_str: str, context: str = "unknown") -> Optional[ColorInfo]:
        """
        Parse color string like 'rgb(124,154,231)' or 'rgba(124,154,231,0.5)'
        
        Args:
            color_str: Color string
            context: Usage context ('fill', 'stroke', 'text', etc.)
        
        Returns:
            ColorInfo or None
        """
        if not color_str or color_str == "null":
            return None
        
        # Extract numbers
        numbers = re.findall(r'\d+\.?\d*', color_str)
        
        if len(numbers) >= 3:
            r = int(float(numbers[0]))
            g = int(float(numbers[1]))
            b = int(float(numbers[2]))
            opacity = float(numbers[3]) if len(numbers) >= 4 else 1.0
            
            return ColorInfo(
                color_string=color_str,
                rgb=(r, g, b),
                opacity=opacity,
                context=context
            )
        
        return None
    
    def _normalize_color(self, color_str: str) -> str:
        """Normalize color string to rgb() format (remove alpha)"""
        if not color_str:
            return ""
        
        numbers = re.findall(r'\d+', color_str)
        if len(numbers) >= 3:
            return f"rgb({numbers[0]},{numbers[1]},{numbers[2]})"
        
        return color_str
    
    def _empty_analysis(self) -> Dict[str, Any]:
        """Return empty analysis structure"""
        return {
            "color_analysis": {
                "primary_palette": [],
                "total_colors": 0,
                "color_contexts": {},
                "has_transparency": False,
                "temperature_distribution": {},
                "confidence": 0.0
            },
            "spacing_analysis": {
                "spacing_quantum": None,
                "most_common_spacings": [],
                "spacing_distribution": {},
                "confidence": 0.0
            },
            "typography_analysis": {
                "font_sizes": [],
                "type_scale_ratio": None,
                "font_weights": {},
                "has_varied_weights": False,
                "confidence": 0.0
            },
            "form_analysis": {
                "most_common_radii": [],
                "has_varied_radii": False,
                "radius_quantum": None
            },
            "gradient_analysis": {
                "has_gradients": False,
                "gradient_types": [],
                "average_stops": 0
            },
            "effects_analysis": {
                "has_effects": False,
                "effect_types": []
            },
            "layout_analysis": {
                "uses_auto_layout": False,
                "layout_modes": {},
                "sizing_modes": {},
                "structure": {
                    "total_nodes": 0,
                    "text_nodes": 0,
                    "max_depth": 0
                }
            },
            "overall_confidence": 0.0
        }


# ============================================================================
# CONVENIENCE FUNCTION
# ============================================================================

def analyze_figma_design(figma_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze Figma JSON from Osyle plugin v3
    
    Args:
        figma_json: JSON output from plugin
    
    Returns:
        Comprehensive design analysis
    """
    analyzer = CodeBasedDesignAnalyzer()
    return analyzer.analyze(figma_json)


# ============================================================================
# TEST
# ============================================================================

if __name__ == "__main__":
    # Sample plugin v3 format
    sample = {
        "version": "3.0",
        "metadata": {
            "name": "Test Design",
            "dimensions": {"width": 390, "height": 844}
        },
        "design": {
            "type": "FRAME",
            "name": "Screen",
            "layout": {
                "mode": "VERTICAL",
                "spacing": 16,
                "padding": [24, 24, 24, 24]
            },
            "style": {
                "fill": "rgb(26,26,46)"
            },
            "children": [
                {
                    "type": "TEXT",
                    "name": "Title",
                    "style": {
                        "color": "rgb(255,255,255)",
                        "font_size": 36,
                        "font_weight": "Bold"
                    },
                    "text": "Hello World"
                },
                {
                    "type": "TEXT",
                    "name": "Body",
                    "style": {
                        "color": "rgba(255,255,255,0.7)",
                        "font_size": 16,
                        "font_weight": "Regular"
                    },
                    "text": "Some body text"
                }
            ]
        }
    }
    
    result = analyze_figma_design(sample)
    print(json.dumps(result, indent=2))
