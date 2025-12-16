"""
Unified DTR Builder v4 for Osyle - Comprehensive Edition
Merges code-based quantitative analysis with LLM semantic analysis
Optimized for DTM pattern mining - captures ALL data without filtering
"""
import json
from typing import Dict, Any, List


def extract_llm_context(code_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract COMPLETE context from code analysis for LLM prompt (v4)
    
    CHANGE from v3: Pass ALL data without heavy filtering
    Goal: Comprehensive capture for DTM pattern mining
    
    Args:
        code_analysis: Full code analysis from code_based_analyzer
    
    Returns:
        Complete context dict with all quantitative measurements
    """
    
    context = {
        "_note": "Complete quantitative measurements from code analysis (v4)",
        "_version": "4.0"
    }
    
    # === SPACING SYSTEM (COMPLETE) ===
    spacing = code_analysis.get('spacing_analysis', {})
    if spacing and spacing.get('spacing_quantum'):
        context["spacing_system"] = {
            "quantum": spacing['spacing_quantum'],
            "all_values": spacing.get('all_spacings', []),  # v4: ALL values
            "common_values": spacing.get('most_common_spacings', []),  # v3: top values
            "distribution": spacing.get('spacing_distribution', {}),
            "percentiles": spacing.get('spacing_percentiles', {}),  # v4: NEW
            "confidence": spacing.get('confidence', 0),
            "metadata": spacing.get('metadata', {})  # v4: NEW
        }
    
    # === COLOR PALETTE (COMPLETE) ===
    colors = code_analysis.get('color_analysis', {})
    if colors and colors.get('primary_palette'):
        context["color_system"] = {
            "complete_palette": colors.get('all_colors', []),  # v4: ALL colors
            "palette": colors['primary_palette'],  # v3: top colors
            "total_unique": colors.get('total_colors', 0),
            "contexts": colors.get('color_contexts', {}),
            "frequency": colors.get('color_frequency', {}),  # v4: NEW
            "has_transparency": colors.get('has_transparency', False),
            "temperature": colors.get('temperature_distribution', {}),
            "saturation_distribution": colors.get('saturation_distribution', {}),  # v4: NEW
            "brightness_distribution": colors.get('brightness_distribution', {}),  # v4: NEW
            "confidence": colors.get('confidence', 0)
        }
    
    # === TYPOGRAPHY SCALE (COMPLETE) ===
    typography = code_analysis.get('typography_analysis', {})
    if typography and typography.get('font_sizes'):
        context["typography_system"] = {
            "all_sizes": typography.get('all_font_sizes', []),  # v4: ALL sizes
            "sizes": typography['font_sizes'],  # v3: top sizes
            "scale_ratio": typography.get('type_scale_ratio'),
            "weights": typography.get('font_weights', {}),
            "all_weights": typography.get('all_font_weights', []),  # v4: NEW
            "has_varied_weights": typography.get('has_varied_weights', False),
            "line_heights": typography.get('line_heights', []),  # v4: NEW
            "letter_spacings": typography.get('letter_spacings', []),  # v4: NEW
            "size_frequency": typography.get('size_frequency', {}),  # v4: NEW
            "confidence": typography.get('confidence', 0)
        }
    
    # === FORM LANGUAGE (COMPLETE) ===
    forms = code_analysis.get('form_analysis', {})
    if forms and forms.get('most_common_radii'):
        context["form_system"] = {
            "all_radii": forms.get('all_radii', []),  # v4: ALL radii
            "corner_radii": forms['most_common_radii'],  # v3: top radii
            "has_variety": forms.get('has_varied_radii', False),
            "radius_quantum": forms.get('radius_quantum'),
            "radius_distribution": forms.get('radius_distribution', {}),  # v4: NEW
            "border_widths": forms.get('border_widths', []),  # v4: NEW
            "shape_types": forms.get('shape_types', {})  # v4: NEW
        }
    
    # === GRADIENTS (COMPLETE) ===
    gradients = code_analysis.get('gradient_analysis', {})
    if gradients and gradients.get('has_gradients'):
        context["gradients"] = {
            "types": gradients.get('gradient_types', []),
            "average_stops": gradients.get('average_stops', 0),
            "all_gradients": gradients.get('all_gradients', []),  # v4: NEW
            "directions": gradients.get('gradient_directions', []),  # v4: NEW
            "color_pairs": gradients.get('common_color_pairs', [])  # v4: NEW
        }
    
    # === EFFECTS (COMPLETE) ===
    effects = code_analysis.get('effects_analysis', {})
    if effects and effects.get('has_effects'):
        context["effects"] = {
            "types": effects.get('effect_types', []),
            "shadow_values": effects.get('shadow_values', []),  # v4: NEW
            "blur_values": effects.get('blur_values', []),  # v4: NEW
            "opacity_values": effects.get('opacity_values', [])  # v4: NEW
        }
    
    # === LAYOUT PATTERNS (COMPLETE) ===
    layout = code_analysis.get('layout_analysis', {})
    if layout:
        context["layout_patterns"] = {
            "uses_auto_layout": layout.get('uses_auto_layout', False),
            "modes": layout.get('layout_modes', {}),
            "sizing": layout.get('sizing_modes', {}),
            "structure": layout.get('structure', {}),
            "alignment_patterns": layout.get('alignment_patterns', {}),  # v4: NEW
            "spacing_patterns": layout.get('spacing_patterns', {}),  # v4: NEW
            "nesting_depth": layout.get('nesting_depth', {})  # v4: NEW
        }
    
    # === ELEMENT DIMENSIONS (v4: NEW) ===
    dimensions = code_analysis.get('dimension_analysis', {})
    if dimensions:
        context["dimensions"] = {
            "element_sizes": dimensions.get('element_sizes', []),
            "aspect_ratios": dimensions.get('aspect_ratios', []),
            "size_categories": dimensions.get('size_categories', {})
        }
    
    # === INTERACTION PATTERNS (v4: NEW) ===
    interactions = code_analysis.get('interaction_analysis', {})
    if interactions:
        context["interactions"] = {
            "interactive_elements": interactions.get('interactive_elements', []),
            "button_sizes": interactions.get('button_sizes', []),
            "touch_targets": interactions.get('touch_targets', {})
        }
    
    # === OVERALL CONFIDENCE ===
    context["overall_confidence"] = code_analysis.get('overall_confidence', 0)
    
    return context


def format_llm_context_for_prompt(llm_context: Dict[str, Any]) -> str:
    """
    Format LLM context as readable text for prompt injection (v4 - comprehensive)
    
    CHANGE from v3: Show ALL data, less truncation
    
    Args:
        llm_context: Context dict from extract_llm_context()
    
    Returns:
        Formatted string ready for prompt
    """
    
    lines = []
    lines.append("=== QUANTITATIVE ANALYSIS (Code-Extracted Ground Truth - DTR v4) ===\n")
    
    # Overall confidence
    confidence = llm_context.get('overall_confidence', 0)
    lines.append(f"Overall Analysis Confidence: {confidence:.2f}\n")
    
    # Spacing system (COMPLETE)
    if 'spacing_system' in llm_context:
        spacing = llm_context['spacing_system']
        lines.append("## Spacing System (Complete) ##")
        lines.append(f"  Quantum: {spacing['quantum']}px (confidence: {spacing['confidence']:.2f})")
        lines.append(f"  All values: {spacing.get('all_values', [])}px")  # v4: show all
        lines.append(f"  Most common: {spacing['common_values']}px")
        if spacing.get('distribution'):
            lines.append(f"  Distribution: {spacing['distribution']}")
        if spacing.get('percentiles'):
            lines.append(f"  Percentiles: {spacing['percentiles']}")
        lines.append("")
    
    # Color system (COMPLETE)
    if 'color_system' in llm_context:
        colors = llm_context['color_system']
        lines.append("## Color System (Complete) ##")
        lines.append(f"  Total unique: {colors['total_unique']}")
        lines.append(f"  Complete palette: {colors.get('complete_palette', [])}")  # v4: all colors
        lines.append(f"  Primary palette: {colors['palette']}")
        lines.append(f"  Temperature: {colors['temperature']}")
        if colors.get('saturation_distribution'):
            lines.append(f"  Saturation: {colors['saturation_distribution']}")
        if colors.get('brightness_distribution'):
            lines.append(f"  Brightness: {colors['brightness_distribution']}")
        lines.append(f"  Has transparency: {colors['has_transparency']}")
        if colors.get('contexts'):
            lines.append(f"  Usage contexts: {list(colors['contexts'].keys())}")
        if colors.get('frequency'):
            lines.append(f"  Frequency: {colors['frequency']}")
        lines.append(f"  Confidence: {colors['confidence']:.2f}")
        lines.append("")
    
    # Typography (COMPLETE)
    if 'typography_system' in llm_context:
        typo = llm_context['typography_system']
        lines.append("## Typography System (Complete) ##")
        lines.append(f"  All sizes: {typo.get('all_sizes', [])}px")  # v4: all sizes
        lines.append(f"  Primary sizes: {typo['sizes']}px")
        if typo.get('scale_ratio'):
            lines.append(f"  Scale ratio: {typo['scale_ratio']}")
        lines.append(f"  Weights: {typo['weights']}")
        if typo.get('all_weights'):
            lines.append(f"  All weights: {typo['all_weights']}")
        if typo.get('line_heights'):
            lines.append(f"  Line heights: {typo['line_heights']}")
        if typo.get('letter_spacings'):
            lines.append(f"  Letter spacings: {typo['letter_spacings']}")
        if typo.get('size_frequency'):
            lines.append(f"  Size frequency: {typo['size_frequency']}")
        lines.append(f"  Confidence: {typo['confidence']:.2f}")
        lines.append("")
    
    # Forms (COMPLETE)
    if 'form_system' in llm_context:
        forms = llm_context['form_system']
        lines.append("## Form System (Complete) ##")
        lines.append(f"  All radii: {forms.get('all_radii', [])}px")  # v4: all radii
        lines.append(f"  Most common: {forms['corner_radii']}px")
        if forms.get('radius_quantum'):
            lines.append(f"  Radius quantum: {forms['radius_quantum']}px")
        if forms.get('radius_distribution'):
            lines.append(f"  Distribution: {forms['radius_distribution']}")
        if forms.get('border_widths'):
            lines.append(f"  Border widths: {forms['border_widths']}px")
        if forms.get('shape_types'):
            lines.append(f"  Shape types: {forms['shape_types']}")
        lines.append("")
    
    # Gradients (COMPLETE)
    if 'gradients' in llm_context:
        grad = llm_context['gradients']
        lines.append("## Gradients (Complete) ##")
        lines.append(f"  Types: {', '.join(grad['types'])}")
        lines.append(f"  Average stops: {grad['average_stops']}")
        if grad.get('all_gradients'):
            lines.append(f"  All gradients: {len(grad['all_gradients'])} found")
        if grad.get('directions'):
            lines.append(f"  Directions: {grad['directions']}")
        if grad.get('color_pairs'):
            lines.append(f"  Color pairs: {grad['color_pairs']}")
        lines.append("")
    
    # Effects (COMPLETE)
    if 'effects' in llm_context:
        eff = llm_context['effects']
        lines.append("## Effects (Complete) ##")
        lines.append(f"  Types: {', '.join(eff['types'])}")
        if eff.get('shadow_values'):
            lines.append(f"  Shadows: {eff['shadow_values']}")
        if eff.get('blur_values'):
            lines.append(f"  Blurs: {eff['blur_values']}")
        if eff.get('opacity_values'):
            lines.append(f"  Opacity range: {eff['opacity_values']}")
        lines.append("")
    
    # Layout (COMPLETE)
    if 'layout_patterns' in llm_context:
        layout = llm_context['layout_patterns']
        lines.append("## Layout Patterns (Complete) ##")
        lines.append(f"  Uses auto layout: {layout['uses_auto_layout']}")
        if layout.get('modes'):
            lines.append(f"  Layout modes: {layout['modes']}")
        if layout.get('alignment_patterns'):
            lines.append(f"  Alignments: {layout['alignment_patterns']}")
        if layout.get('spacing_patterns'):
            lines.append(f"  Spacing patterns: {layout['spacing_patterns']}")
        struct = layout.get('structure', {})
        if struct:
            lines.append(f"  Structure: {struct['total_nodes']} nodes, {struct['text_nodes']} text, depth {struct['max_depth']}")
        lines.append("")
    
    # Dimensions (v4 NEW)
    if 'dimensions' in llm_context:
        dims = llm_context['dimensions']
        lines.append("## Element Dimensions ##")
        lines.append(f"  Sizes: {dims.get('element_sizes', [])}")
        lines.append(f"  Aspect ratios: {dims.get('aspect_ratios', [])}")
        lines.append("")
    
    # Interactions (v4 NEW)
    if 'interactions' in llm_context:
        inter = llm_context['interactions']
        lines.append("## Interaction Patterns ##")
        lines.append(f"  Interactive elements: {inter.get('interactive_elements', [])}")
        lines.append(f"  Button sizes: {inter.get('button_sizes', [])}")
        lines.append("")
    
    return "\n".join(lines)


def prepare_figma_for_llm(figma_json: Dict[str, Any], max_depth: int = 6) -> str:
    """
    Prepare Figma JSON for LLM consumption (v4 - less aggressive truncation)
    
    CHANGE from v3: Higher max_depth (6 vs 4), longer text (500 vs 150)
    
    Plugin v3 already outputs compressed format, but we can:
    1. Add depth limiting for very complex designs
    2. Truncate long text content
    3. Format for readability
    
    Args:
        figma_json: JSON from plugin v3
        max_depth: Maximum tree depth to include (v4: 6, v3: 4)
    
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
            if key == "text" and isinstance(value, str) and len(value) > 500:
                # Truncate long text (v4: 500 chars, v3: 150 chars)
                truncated[key] = value[:500] + "..."
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
    Build unified DTR v4 by merging LLM semantic analysis with code quantitative analysis
    
    CHANGES from v3:
    - Store COMPLETE code_analysis (not filtered summary)
    - Add statistical_patterns section for DTM mining
    - Add coverage_map for data quality tracking
    - Version 4.0 for DTM optimization
    
    Process:
    1. Start with LLM's semantic DTR (the "why" and "how")
    2. Validate against code measurements (the "what")
    3. Inject COMPLETE quantitative validation section (v4: all data)
    4. Add statistical patterns for DTM (v4: NEW)
    5. Calculate confidence scores based on agreement
    6. Reconcile discrepancies (code measurements take precedence)
    7. Add coverage map (v4: NEW)
    
    Args:
        llm_dtr: DTR from LLM semantic analysis
        code_analysis: Complete quantitative analysis from code
    
    Returns:
        Unified DTR v4 optimized for DTM pattern mining
    """
    
    # Start with LLM DTR structure
    unified = llm_dtr.copy() if llm_dtr else {}
    unified['version'] = '4.0'  # v4
    
    # Ensure meta section exists
    if 'meta' not in unified:
        unified['meta'] = {}
    
    # v4: Mark as comprehensive
    unified['meta']['comprehensive'] = True
    unified['meta']['optimized_for'] = 'dtm_mining'
    
    # Calculate confidence scores
    confidence_scores = _calculate_confidence_scores(llm_dtr, code_analysis)
    unified['meta']['confidence_scores'] = confidence_scores
    unified['meta']['analysis_method'] = 'hybrid_code_llm_v4'
    unified['meta']['code_confidence'] = code_analysis.get('overall_confidence', 0)
    
    # v4: Store COMPLETE code_analysis (not just summary)
    unified['quantitative_validation'] = code_analysis
    
    # v4: Add statistical patterns for DTM mining
    unified['statistical_patterns'] = _build_statistical_patterns(code_analysis)
    
    # Reconcile analyses (code measurements override LLM if conflicting)
    unified = _reconcile_analyses(unified, code_analysis)
    
    # v4: Add coverage map
    unified['meta']['coverage_map'] = _build_coverage_map(unified, code_analysis)
    
    return unified


def _build_statistical_patterns(code_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build statistical patterns for DTM mining (v4 NEW)
    
    Extract distribution statistics that DTM will use to find cross-design patterns
    """
    
    patterns = {}
    
    # Spacing distributions
    spacing = code_analysis.get('spacing_analysis', {})
    if spacing.get('spacing_distribution'):
        patterns['spacing'] = {
            'distribution': spacing['spacing_distribution'],
            'quantum': spacing.get('spacing_quantum'),
            'mean': spacing.get('mean_spacing'),
            'std_dev': spacing.get('std_dev'),
            'mode': spacing.get('mode_spacing')
        }
    
    # Color distributions
    colors = code_analysis.get('color_analysis', {})
    if colors:
        patterns['colors'] = {
            'total_unique': colors.get('total_colors', 0),
            'temperature_dist': colors.get('temperature_distribution', {}),
            'saturation_dist': colors.get('saturation_distribution', {}),
            'brightness_dist': colors.get('brightness_distribution', {}),
            'frequency': colors.get('color_frequency', {})
        }
    
    # Typography distributions
    typo = code_analysis.get('typography_analysis', {})
    if typo:
        patterns['typography'] = {
            'size_distribution': typo.get('size_frequency', {}),
            'weight_distribution': typo.get('weight_distribution', {}),
            'scale_ratio': typo.get('type_scale_ratio')
        }
    
    # Form distributions
    forms = code_analysis.get('form_analysis', {})
    if forms:
        patterns['forms'] = {
            'radius_distribution': forms.get('radius_distribution', {}),
            'radius_quantum': forms.get('radius_quantum')
        }
    
    return patterns


def _build_coverage_map(unified_dtr: Dict[str, Any], code_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build coverage map - what data did we capture? (v4 NEW)
    
    Helps DTM understand data quality and completeness per DTR
    """
    
    coverage = {
        "sections_present": [],
        "quantitative_confidence": {},
        "data_completeness": 0.0
    }
    
    # Track which sections are present
    sections = ["spatial_intelligence", "visual_language", "interaction_intelligence",
                "ambient_system", "cognitive_process", "philosophy"]
    coverage["sections_present"] = [s for s in sections if s in unified_dtr and unified_dtr[s]]
    
    # Track quantitative confidence by domain
    if 'spacing_analysis' in code_analysis:
        coverage["quantitative_confidence"]["spacing"] = code_analysis['spacing_analysis'].get('confidence', 0)
    if 'color_analysis' in code_analysis:
        coverage["quantitative_confidence"]["colors"] = code_analysis['color_analysis'].get('confidence', 0)
    if 'typography_analysis' in code_analysis:
        coverage["quantitative_confidence"]["typography"] = code_analysis['typography_analysis'].get('confidence', 0)
    if 'form_analysis' in code_analysis:
        coverage["quantitative_confidence"]["forms"] = code_analysis.get('form_analysis', {}).get('confidence', 0.7)
    
    # Overall completeness score
    present_count = len(coverage["sections_present"])
    total_sections = len(sections)
    coverage["data_completeness"] = present_count / total_sections if total_sections > 0 else 0.0
    
    return coverage


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