"""
Unified DTR Builder v3 for Osyle Figma Plugin Format
Merges code-based quantitative analysis with LLM semantic analysis
Optimized for plugin v3 output (already compressed, intelligence-preserving)
"""
import json
from typing import Dict, Any, List


def extract_llm_context(code_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract filtered context from code analysis for LLM prompt
    
    This gives the LLM quantitative ground truth to reason from, reducing hallucination
    and anchoring semantic analysis in hard measurements.
    
    Args:
        code_analysis: Full code analysis from code_based_analyzer
    
    Returns:
        Filtered context dict optimized for LLM understanding
    """
    
    context = {
        "_note": "Quantitative measurements from code analysis (ground truth)"
    }
    
    # === SPACING SYSTEM ===
    spacing = code_analysis.get('spacing_analysis', {})
    if spacing and spacing.get('spacing_quantum'):
        context["spacing_system"] = {
            "quantum": spacing['spacing_quantum'],
            "common_values": spacing.get('most_common_spacings', [])[:6],
            "distribution": spacing.get('spacing_distribution', {}),
            "confidence": spacing.get('confidence', 0)
        }
    
    # === COLOR PALETTE ===
    colors = code_analysis.get('color_analysis', {})
    if colors and colors.get('primary_palette'):
        context["color_system"] = {
            "palette": colors['primary_palette'][:8],
            "total_unique": colors.get('total_colors', 0),
            "contexts": colors.get('color_contexts', {}),
            "has_transparency": colors.get('has_transparency', False),
            "temperature": colors.get('temperature_distribution', {}),
            "confidence": colors.get('confidence', 0)
        }
    
    # === TYPOGRAPHY SCALE ===
    typography = code_analysis.get('typography_analysis', {})
    if typography and typography.get('font_sizes'):
        context["typography_system"] = {
            "sizes": typography['font_sizes'][:8],
            "scale_ratio": typography.get('type_scale_ratio'),
            "weights": typography.get('font_weights', {}),
            "has_varied_weights": typography.get('has_varied_weights', False),
            "confidence": typography.get('confidence', 0)
        }
    
    # === FORM LANGUAGE ===
    forms = code_analysis.get('form_analysis', {})
    if forms and forms.get('most_common_radii'):
        context["form_system"] = {
            "corner_radii": forms['most_common_radii'][:5],
            "has_variety": forms.get('has_varied_radii', False),
            "radius_quantum": forms.get('radius_quantum')
        }
    
    # === GRADIENTS ===
    gradients = code_analysis.get('gradient_analysis', {})
    if gradients and gradients.get('has_gradients'):
        context["gradients"] = {
            "types": gradients.get('gradient_types', []),
            "average_stops": gradients.get('average_stops', 0)
        }
    
    # === EFFECTS (SHADOWS, BLURS) ===
    effects = code_analysis.get('effects_analysis', {})
    if effects and effects.get('has_effects'):
        context["effects"] = {
            "types": effects.get('effect_types', [])
        }
    
    # === LAYOUT PATTERNS ===
    layout = code_analysis.get('layout_analysis', {})
    if layout:
        context["layout_patterns"] = {
            "uses_auto_layout": layout.get('uses_auto_layout', False),
            "modes": layout.get('layout_modes', {}),
            "sizing": layout.get('sizing_modes', {}),
            "structure": layout.get('structure', {})
        }
    
    # === OVERALL CONFIDENCE ===
    context["overall_confidence"] = code_analysis.get('overall_confidence', 0)
    
    return context


def format_llm_context_for_prompt(llm_context: Dict[str, Any]) -> str:
    """
    Format LLM context as readable text for prompt injection
    
    Args:
        llm_context: Context dict from extract_llm_context()
    
    Returns:
        Formatted string ready for prompt
    """
    
    lines = []
    lines.append("=== QUANTITATIVE ANALYSIS (Code-Extracted Ground Truth) ===\n")
    
    # Overall confidence
    confidence = llm_context.get('overall_confidence', 0)
    lines.append(f"Overall Analysis Confidence: {confidence:.2f}\n")
    
    # Spacing system
    if 'spacing_system' in llm_context:
        spacing = llm_context['spacing_system']
        lines.append("## Spacing System ##")
        lines.append(f"  Quantum: {spacing['quantum']}px (confidence: {spacing['confidence']:.2f})")
        lines.append(f"  Common values: {', '.join(map(str, spacing['common_values']))}px")
        if spacing.get('distribution'):
            lines.append(f"  Distribution: {spacing['distribution']}")
        lines.append("")
    
    # Color system
    if 'color_system' in llm_context:
        colors = llm_context['color_system']
        lines.append("## Color System ##")
        lines.append(f"  Palette ({colors['total_unique']} unique): {', '.join(colors['palette'][:6])}")
        lines.append(f"  Temperature: {colors['temperature']}")
        lines.append(f"  Has transparency: {colors['has_transparency']}")
        if colors.get('contexts'):
            lines.append(f"  Usage contexts: {list(colors['contexts'].keys())}")
        lines.append(f"  Confidence: {colors['confidence']:.2f}")
        lines.append("")
    
    # Typography
    if 'typography_system' in llm_context:
        typo = llm_context['typography_system']
        lines.append("## Typography System ##")
        lines.append(f"  Sizes: {', '.join(map(str, typo['sizes']))}px")
        if typo.get('scale_ratio'):
            lines.append(f"  Scale ratio: {typo['scale_ratio']}")
        lines.append(f"  Weights: {typo['weights']}")
        lines.append(f"  Confidence: {typo['confidence']:.2f}")
        lines.append("")
    
    # Forms
    if 'form_system' in llm_context:
        forms = llm_context['form_system']
        lines.append("## Form System ##")
        lines.append(f"  Corner radii: {', '.join(map(str, forms['corner_radii']))}px")
        if forms.get('radius_quantum'):
            lines.append(f"  Radius quantum: {forms['radius_quantum']}px")
        lines.append("")
    
    # Gradients
    if 'gradients' in llm_context:
        grad = llm_context['gradients']
        lines.append("## Gradients ##")
        lines.append(f"  Types: {', '.join(grad['types'])}")
        lines.append(f"  Average stops: {grad['average_stops']}")
        lines.append("")
    
    # Effects
    if 'effects' in llm_context:
        eff = llm_context['effects']
        lines.append("## Effects ##")
        lines.append(f"  Types: {', '.join(eff['types'])}")
        lines.append("")
    
    # Layout
    if 'layout_patterns' in llm_context:
        layout = llm_context['layout_patterns']
        lines.append("## Layout Patterns ##")
        lines.append(f"  Uses auto layout: {layout['uses_auto_layout']}")
        if layout.get('modes'):
            lines.append(f"  Layout modes: {layout['modes']}")
        struct = layout.get('structure', {})
        if struct:
            lines.append(f"  Structure: {struct['total_nodes']} nodes, {struct['text_nodes']} text, depth {struct['max_depth']}")
        lines.append("")
    
    return "\n".join(lines)


def prepare_figma_for_llm(figma_json: Dict[str, Any], max_depth: int = 4) -> str:
    """
    Prepare Figma JSON for LLM consumption
    
    Plugin v3 already outputs compressed format, but we can:
    1. Add depth limiting for very complex designs
    2. Truncate long text content
    3. Format for readability
    
    Args:
        figma_json: JSON from plugin v3
        max_depth: Maximum tree depth to include
    
    Returns:
        JSON string ready for LLM
    """
    
    def truncate_node(node: Dict[str, Any], depth: int = 0) -> Dict[str, Any]:
        """Recursively truncate deep nodes"""
        
        if depth > max_depth:
            return {
                "type": node.get("type"),
                "name": node.get("name", "..."),
                "_truncated": f"depth > {max_depth}"
            }
        
        # Copy node
        truncated = {}
        for key, value in node.items():
            if key == "text" and isinstance(value, str) and len(value) > 150:
                # Truncate long text
                truncated[key] = value[:150] + "..."
            elif key == "children" and isinstance(value, list):
                # Recursively truncate children
                truncated[key] = [truncate_node(child, depth + 1) for child in value]
            else:
                truncated[key] = value
        
        return truncated
    
    # Extract design node
    if "design" in figma_json:
        design = figma_json["design"]
    elif "type" in figma_json:
        design = figma_json
    else:
        return json.dumps(figma_json, indent=2)
    
    # Truncate if needed
    truncated_design = truncate_node(design)
    
    # Add metadata if present
    output = {}
    if "metadata" in figma_json:
        output["metadata"] = figma_json["metadata"]
    output["design"] = truncated_design
    
    return json.dumps(output, indent=2)


def build_unified_dtr(llm_dtr: Dict[str, Any], code_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build unified DTR v3 by merging LLM semantic analysis with code quantitative analysis
    
    Process:
    1. Start with LLM's semantic DTR (the "why" and "how")
    2. Validate against code measurements (the "what")
    3. Inject quantitative validation section
    4. Calculate confidence scores based on agreement
    5. Reconcile discrepancies (code measurements take precedence)
    
    Args:
        llm_dtr: DTR from LLM semantic analysis
        code_analysis: Quantitative analysis from code
    
    Returns:
        Unified DTR v3 with validation and confidence scores
    """
    
    # Start with LLM DTR structure
    unified = llm_dtr.copy() if llm_dtr else {}
    unified['version'] = '3.0'
    
    # Ensure meta section exists
    if 'meta' not in unified:
        unified['meta'] = {}
    
    # Calculate confidence scores
    confidence_scores = _calculate_confidence_scores(llm_dtr, code_analysis)
    unified['meta']['confidence_scores'] = confidence_scores
    unified['meta']['analysis_method'] = 'hybrid_code_llm'
    unified['meta']['code_confidence'] = code_analysis.get('overall_confidence', 0)
    
    # Add quantitative validation section
    unified['quantitative_validation'] = _build_validation_section(code_analysis)
    
    # Reconcile analyses (code measurements override LLM if conflicting)
    unified = _reconcile_analyses(unified, code_analysis)
    
    return unified


def _calculate_confidence_scores(llm_dtr: Dict[str, Any], code_analysis: Dict[str, Any]) -> Dict[str, float]:
    """
    Calculate confidence scores by domain
    
    High confidence = LLM found patterns AND code validated them
    Medium confidence = LLM found patterns OR code validated them
    Low confidence = Neither found clear patterns
    """
    
    scores = {
        'overall': 0.0,
        'spatial': 0.0,
        'color': 0.0,
        'typography': 0.0,
        'forms': 0.0
    }
    
    # === SPATIAL CONFIDENCE ===
    code_spacing_conf = code_analysis.get('spacing_analysis', {}).get('confidence', 0)
    has_llm_spatial = bool(llm_dtr.get('spatial_intelligence', {}).get('composition'))
    
    if code_spacing_conf > 0.7 and has_llm_spatial:
        scores['spatial'] = 0.95  # High agreement
    elif code_spacing_conf > 0.5 and has_llm_spatial:
        scores['spatial'] = 0.85  # Good agreement
    elif code_spacing_conf > 0.5 or has_llm_spatial:
        scores['spatial'] = 0.65  # One source confident
    else:
        scores['spatial'] = 0.40  # Low confidence
    
    # === COLOR CONFIDENCE ===
    code_color_conf = code_analysis.get('color_analysis', {}).get('confidence', 0)
    has_llm_colors = bool(llm_dtr.get('visual_language', {}).get('color_system'))
    
    if code_color_conf > 0.7 and has_llm_colors:
        scores['color'] = 0.95
    elif code_color_conf > 0.5 and has_llm_colors:
        scores['color'] = 0.85
    elif code_color_conf > 0.5 or has_llm_colors:
        scores['color'] = 0.65
    else:
        scores['color'] = 0.40
    
    # === TYPOGRAPHY CONFIDENCE ===
    code_type_conf = code_analysis.get('typography_analysis', {}).get('confidence', 0)
    has_llm_typo = bool(llm_dtr.get('visual_language', {}).get('typography'))
    
    if code_type_conf > 0.7 and has_llm_typo:
        scores['typography'] = 0.95
    elif code_type_conf > 0.5 and has_llm_typo:
        scores['typography'] = 0.85
    elif code_type_conf > 0.5 or has_llm_typo:
        scores['typography'] = 0.65
    else:
        scores['typography'] = 0.40
    
    # === FORMS CONFIDENCE ===
    has_code_forms = len(code_analysis.get('form_analysis', {}).get('most_common_radii', [])) >= 2
    has_llm_forms = bool(llm_dtr.get('visual_language', {}).get('form_language'))
    
    if has_code_forms and has_llm_forms:
        scores['forms'] = 0.90
    elif has_code_forms or has_llm_forms:
        scores['forms'] = 0.70
    else:
        scores['forms'] = 0.40
    
    # === OVERALL (weighted average) ===
    scores['overall'] = (
        scores['spatial'] * 0.30 +
        scores['color'] * 0.30 +
        scores['typography'] * 0.25 +
        scores['forms'] * 0.15
    )
    
    # Round all scores
    for key in scores:
        scores[key] = round(scores[key], 2)
    
    return scores


def _build_validation_section(code_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Build the quantitative validation section from code analysis"""
    
    validation = {}
    
    # Spacing
    spacing = code_analysis.get('spacing_analysis', {})
    if spacing:
        validation['spacing'] = {
            'quantum': spacing.get('spacing_quantum'),
            'confidence': spacing.get('confidence', 0),
            'common_values': spacing.get('most_common_spacings', [])[:5]
        }
    
    # Colors
    colors = code_analysis.get('color_analysis', {})
    if colors:
        validation['colors'] = {
            'palette': colors.get('primary_palette', [])[:8],
            'total_unique': colors.get('total_colors', 0),
            'confidence': colors.get('confidence', 0)
        }
    
    # Typography
    typography = code_analysis.get('typography_analysis', {})
    if typography:
        validation['typography'] = {
            'sizes': typography.get('font_sizes', []),
            'scale_ratio': typography.get('type_scale_ratio'),
            'confidence': typography.get('confidence', 0)
        }
    
    # Forms
    forms = code_analysis.get('form_analysis', {})
    if forms:
        validation['forms'] = {
            'corner_radii': forms.get('most_common_radii', []),
            'radius_quantum': forms.get('radius_quantum')
        }
    
    # Layout
    layout = code_analysis.get('layout_analysis', {})
    if layout:
        validation['layout'] = {
            'uses_auto_layout': layout.get('uses_auto_layout', False),
            'structure': layout.get('structure', {})
        }
    
    return validation


def _reconcile_analyses(unified_dtr: Dict[str, Any], code_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reconcile LLM and code findings
    
    Rule: Code measurements take precedence for quantitative values
    LLM provides semantic interpretation and generative rules
    """
    
    # === RECONCILE SPACING QUANTUM ===
    code_quantum = code_analysis.get('spacing_analysis', {}).get('spacing_quantum')
    llm_quantum = (unified_dtr.get('spatial_intelligence', {})
                   .get('composition', {})
                   .get('spacing_quantum'))
    
    if code_quantum and llm_quantum:
        # If significantly different, use code value
        if abs(code_quantum - llm_quantum) > 4:
            _ensure_path(unified_dtr, ['spatial_intelligence', 'composition'])
            unified_dtr['spatial_intelligence']['composition']['spacing_quantum'] = code_quantum
            unified_dtr['spatial_intelligence']['composition']['_quantum_source'] = 'code_override'
    elif code_quantum:
        # LLM didn't find it, add from code
        _ensure_path(unified_dtr, ['spatial_intelligence', 'composition'])
        unified_dtr['spatial_intelligence']['composition']['spacing_quantum'] = code_quantum
        unified_dtr['spatial_intelligence']['composition']['_quantum_source'] = 'code_only'
    
    # === RECONCILE TYPE SCALE RATIO ===
    code_scale = code_analysis.get('typography_analysis', {}).get('type_scale_ratio')
    llm_scale = (unified_dtr.get('visual_language', {})
                 .get('typography', {})
                 .get('scale_ratio'))
    
    if code_scale and llm_scale:
        # If significantly different, use code value
        if abs(code_scale - llm_scale) > 0.25:
            _ensure_path(unified_dtr, ['visual_language', 'typography'])
            unified_dtr['visual_language']['typography']['scale_ratio'] = code_scale
            unified_dtr['visual_language']['typography']['_scale_source'] = 'code_override'
    elif code_scale:
        # LLM didn't find it, add from code
        _ensure_path(unified_dtr, ['visual_language', 'typography'])
        unified_dtr['visual_language']['typography']['scale_ratio'] = code_scale
        unified_dtr['visual_language']['typography']['_scale_source'] = 'code_only'
    
    # === RECONCILE CORNER RADII ===
    code_radii = code_analysis.get('form_analysis', {}).get('most_common_radii', [])
    if code_radii:
        _ensure_path(unified_dtr, ['visual_language', 'form_language'])
        if 'corner_radius' not in unified_dtr['visual_language']['form_language']:
            unified_dtr['visual_language']['form_language']['corner_radius'] = {}
        
        # Add code-verified radii
        unified_dtr['visual_language']['form_language']['_verified_radii'] = code_radii[:3]
    
    return unified_dtr


def _ensure_path(data: Dict, path: List[str]):
    """Ensure nested dict path exists"""
    current = data
    for key in path:
        if key not in current:
            current[key] = {}
        current = current[key]


# ============================================================================
# TEST
# ============================================================================

if __name__ == "__main__":
    # Sample code analysis
    sample_code_analysis = {
        "spacing_analysis": {
            "spacing_quantum": 8,
            "most_common_spacings": [8, 16, 24, 32],
            "confidence": 0.9
        },
        "color_analysis": {
            "primary_palette": ["rgb(26,26,46)", "rgb(255,255,255)", "rgb(108,99,255)"],
            "total_colors": 3,
            "confidence": 0.85
        },
        "typography_analysis": {
            "font_sizes": [14, 16, 24, 36],
            "type_scale_ratio": 1.5,
            "confidence": 0.88
        },
        "overall_confidence": 0.87
    }
    
    # Extract LLM context
    llm_context = extract_llm_context(sample_code_analysis)
    print("=== LLM Context ===")
    print(json.dumps(llm_context, indent=2))
    
    print("\n=== Formatted for Prompt ===")
    print(format_llm_context_for_prompt(llm_context))
