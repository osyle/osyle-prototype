"""
Style Fingerprinting - Extract comparable representations from DTRs
"""
from datetime import datetime
from typing import Optional, Dict, Any
from .schemas import StyleFingerprint, ComparableTokens, PatternFlags


def extract_fingerprint(dtr: Dict[str, Any], resource_id: str) -> StyleFingerprint:
    """
    Extract a comparable style fingerprint from a Pass 6 DTR
    
    This creates a structured, comparable representation for:
    - Consensus detection
    - Conflict identification  
    - Clustering (if many resources)
    """
    
    # Extract exact tokens
    exact_tokens = dtr.get("exact_tokens", {})
    
    # Build comparable tokens
    comparable = _extract_comparable_tokens(exact_tokens)
    
    # Build pattern flags
    patterns = _extract_pattern_flags(exact_tokens)
    
    # Create fingerprint
    fingerprint = StyleFingerprint(
        resource_id=resource_id,
        comparable_tokens=comparable,
        patterns=patterns,
        embedding=None,  # TODO: Generate embedding for clustering if needed
        created_at=datetime.now().isoformat()
    )
    
    return fingerprint


def _extract_comparable_tokens(exact_tokens: Dict[str, Any]) -> ComparableTokens:
    """Extract structured, comparable token values"""
    
    # Spacing
    spacing = exact_tokens.get("spacing", {})
    spacing_quantum = _safe_parse_spacing_quantum(spacing.get("quantum"))
    spacing_scale_ratio = _safe_parse_scale_ratio(spacing.get("scale", []))
    
    # Colors
    colors = exact_tokens.get("colors", {})
    primary_color = _extract_primary_color_hsl(colors)
    background_lightness = _extract_background_lightness(colors)
    
    # Typography
    typography = exact_tokens.get("typography", {})
    type_scale_ratio = _safe_parse_type_scale_ratio(typography)
    font_weight_avg = _calculate_avg_font_weight(typography)
    
    # Materials (for border radius)
    materials = exact_tokens.get("materials", {})
    border_radius_stats = _extract_border_radius_stats(materials)
    
    # Components (for density)
    components = exact_tokens.get("components", [])
    density_score = _estimate_density_score(exact_tokens)
    
    return ComparableTokens(
        spacing_quantum=spacing_quantum,
        spacing_scale_ratio=spacing_scale_ratio,
        primary_color_hue=primary_color.get("hue"),
        primary_color_saturation=primary_color.get("saturation"),
        primary_color_lightness=primary_color.get("lightness"),
        background_lightness=background_lightness,
        type_scale_ratio=type_scale_ratio,
        primary_font_weight_avg=font_weight_avg,
        border_radius_min=border_radius_stats.get("min"),
        border_radius_max=border_radius_stats.get("max"),
        border_radius_avg=border_radius_stats.get("avg"),
        component_density_score=density_score
    )


def _extract_pattern_flags(exact_tokens: Dict[str, Any]) -> PatternFlags:
    """Extract binary/frequency pattern flags"""
    
    typography = exact_tokens.get("typography", {})
    materials = exact_tokens.get("materials", {})
    image_usage = exact_tokens.get("image_usage", {})
    
    # Check for uppercase usage
    uses_uppercase = _check_uppercase_usage(typography)
    
    # Check for effects
    effects_vocab = materials.get("effects_vocabulary", [])
    uses_shadows = any("shadow" in str(e).lower() for e in effects_vocab)
    uses_blur = any("blur" in str(e).lower() for e in effects_vocab)
    uses_gradients = any("gradient" in str(e).lower() for e in effects_vocab)
    
    # Calculate frequencies
    shadow_freq = _calculate_effect_frequency(effects_vocab, "shadow")
    blur_freq = _calculate_effect_frequency(effects_vocab, "blur")
    
    # Check image usage
    images = image_usage or {}
    uses_illustrations = images.get("style_distribution", {}).get("illustration", 0) > 0
    uses_photos = images.get("style_distribution", {}).get("photo", 0) > 0
    
    return PatternFlags(
        uses_uppercase_labels=uses_uppercase,
        uses_shadows=uses_shadows,
        uses_blur_effects=uses_blur,
        uses_gradients=uses_gradients,
        uses_illustrations=uses_illustrations,
        uses_photos=uses_photos,
        shadow_frequency=shadow_freq,
        blur_frequency=blur_freq
    )


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _safe_parse_spacing_quantum(quantum_str: Optional[str]) -> Optional[int]:
    """Parse spacing quantum from string like '8px' to int"""
    if not quantum_str:
        return None
    
    try:
        # Remove 'px' suffix if present
        quantum_str = str(quantum_str).replace("px", "").strip()
        return int(float(quantum_str))
    except (ValueError, AttributeError):
        return None


def _safe_parse_scale_ratio(scale_list: list) -> Optional[float]:
    """Calculate average scale ratio from spacing scale"""
    if not scale_list or len(scale_list) < 2:
        return None
    
    try:
        # Calculate ratios between consecutive values
        ratios = []
        for i in range(1, len(scale_list)):
            if scale_list[i-1] > 0:
                ratio = scale_list[i] / scale_list[i-1]
                ratios.append(ratio)
        
        if ratios:
            return sum(ratios) / len(ratios)
    except (TypeError, ZeroDivisionError):
        pass
    
    return None


def _extract_primary_color_hsl(colors: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """Extract primary color as HSL values"""
    primary_accent = colors.get("primary_accent")
    
    if not primary_accent:
        return {"hue": None, "saturation": None, "lightness": None}
    
    # If it's a hex color, convert to HSL
    # For now, return None - TODO: implement hex to HSL conversion if needed
    return {"hue": None, "saturation": None, "lightness": None}


def _extract_background_lightness(colors: Dict[str, Any]) -> Optional[float]:
    """Extract background lightness (0-100)"""
    backgrounds = colors.get("backgrounds", [])
    
    if not backgrounds:
        return None
    
    # TODO: Parse background colors and calculate average lightness
    # For now, estimate based on color names
    first_bg = str(backgrounds[0]).lower() if backgrounds else ""
    
    if "white" in first_bg or "light" in first_bg:
        return 95.0
    elif "dark" in first_bg or "black" in first_bg:
        return 10.0
    
    return 50.0  # Default mid-tone


def _safe_parse_type_scale_ratio(typography: Dict[str, Any]) -> Optional[float]:
    """Calculate type scale ratio from scale metrics"""
    scale_metrics = typography.get("scale_metrics", {})
    return scale_metrics.get("ratio_mean")


def _calculate_avg_font_weight(typography: Dict[str, Any]) -> Optional[int]:
    """Calculate average font weight"""
    weights = typography.get("weights", {})
    
    if not weights:
        return None
    
    try:
        total_weight = 0
        total_freq = 0
        
        for weight_str, info in weights.items():
            weight = int(weight_str)
            frequency = info.get("frequency", 1)
            total_weight += weight * frequency
            total_freq += frequency
        
        if total_freq > 0:
            return int(total_weight / total_freq)
    except (ValueError, TypeError):
        pass
    
    return None


def _extract_border_radius_stats(materials: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """Extract border radius statistics"""
    # TODO: Parse from materials/effects_vocabulary
    # For now, return None
    return {"min": None, "max": None, "avg": None}


def _estimate_density_score(exact_tokens: Dict[str, Any]) -> Optional[float]:
    """Estimate component density score (0-1)"""
    spacing = exact_tokens.get("spacing", {})
    quantum = _safe_parse_spacing_quantum(spacing.get("quantum"))
    
    if not quantum:
        return None
    
    # Rough heuristic: smaller quantum = denser
    if quantum <= 4:
        return 0.8  # Dense
    elif quantum <= 8:
        return 0.5  # Moderate
    else:
        return 0.2  # Sparse


def _check_uppercase_usage(typography: Dict[str, Any]) -> bool:
    """Check if uppercase labels are used"""
    # TODO: Parse from typography data
    # For now, return False
    return False


def _calculate_effect_frequency(effects_vocab: list, effect_type: str) -> float:
    """Calculate how frequently an effect type appears"""
    if not effects_vocab:
        return 0.0
    
    count = sum(1 for e in effects_vocab if effect_type.lower() in str(e).lower())
    return count / len(effects_vocab) if effects_vocab else 0.0