"""
DTR Utilities - Extract generative rules from DTR for UI generation
Handles v2, v3, and v4 DTR formats with version compatibility
"""
from typing import Dict, Any, Optional
import json


def extract_generative_rules(dtr_json: Dict[str, Any]) -> str:
    """
    Extract generative rules from DTR for UI generation prompt
    Handles DTR v2, v3, and v4 formats
    
    Args:
        dtr_json: DTR dictionary
    
    Returns:
        Formatted string of generative rules for LLM prompt
    """
    version = dtr_json.get("version", "2.0")
    
    if version == "4.0":
        return _extract_v4_rules(dtr_json)
    elif version == "3.0":
        return _extract_v3_rules(dtr_json)
    else:
        return _extract_v2_rules(dtr_json)


def _extract_v4_rules(dtr: Dict[str, Any]) -> str:
    """
    Extract rules from DTR v4 (comprehensive format)
    
    DTR v4 is large and comprehensive, so we extract SELECTIVELY
    based on what's relevant for the current generation task.
    
    This is where context-aware filtering happens!
    """
    
    rules = []
    
    # Header
    rules.append("=== Designer Taste Representation (DTR v4 - Comprehensive) ===\n")
    
    # Confidence and coverage
    if "meta" in dtr:
        meta = dtr["meta"]
        if "confidence_scores" in meta:
            scores = meta["confidence_scores"]
            rules.append(f"Confidence: Overall {scores.get('overall', 0):.2f}, "
                        f"Spatial {scores.get('spatial', 0):.2f}, "
                        f"Color {scores.get('color', 0):.2f}, "
                        f"Typography {scores.get('typography', 0):.2f}\n")
        
        if "coverage_map" in meta:
            coverage = meta["coverage_map"]
            rules.append(f"Data Completeness: {coverage.get('data_completeness', 0):.2f}\n")
    
    # 1. Spatial Intelligence (same as v3 extraction)
    if "spatial_intelligence" in dtr:
        rules.append("\n## Spatial Intelligence ##\n")
        spatial = dtr["spatial_intelligence"]
        
        # Composition
        if "composition" in spatial:
            comp = spatial["composition"]
            rules.append(f"Composition Mode: {comp.get('mode', 'unknown')}")
            rules.append(f"Spacing Quantum: {comp.get('spacing_quantum', 8)}px")
            
            if "spacing_ratios" in comp:
                rules.append("Spacing Ratios:")
                for key, value in comp["spacing_ratios"].items():
                    rules.append(f"  - {key}: {value}")
        
        # Hierarchy
        if "hierarchy" in spatial:
            hier = spatial["hierarchy"]
            if "size_scaling" in hier:
                rules.append("\nSize Scaling:")
                for level, scale in hier["size_scaling"].items():
                    rules.append(f"  - {level}: {scale}")
    
    # 2. Visual Language (same as v3 extraction)
    if "visual_language" in dtr:
        rules.append("\n## Visual Language ##\n")
        visual = dtr["visual_language"]
        
        # Typography
        if "typography" in visual:
            typo = visual["typography"]
            rules.append("Typography:")
            rules.append(f"  - Scale Ratio: {typo.get('scale_ratio', 1.5)}")
            
            if "weight_progression" in typo:
                rules.append("  - Weight Progression:")
                for level, weight in typo["weight_progression"].items():
                    rules.append(f"    • {level}: {weight}")
        
        # Color System
        if "color_system" in visual:
            color_sys = visual["color_system"]
            rules.append("\nColor System:")
            
            if "roles" in color_sys:
                rules.append("Color Roles:")
                for role, data in color_sys["roles"].items():
                    if isinstance(data, dict):
                        base = data.get("base", "N/A")
                        rules.append(f"  - {role}: {base}")
    
    # 3. Cognitive Process (same as v3)
    if "cognitive_process" in dtr:
        rules.append("\n## Cognitive Process ##\n")
        cognitive = dtr["cognitive_process"]
        
        if "decision_tree" in cognitive:
            rules.append("Decision Tree:")
            for i, step in enumerate(cognitive["decision_tree"], 1):
                rules.append(f"  {i}. {step}")
        
        if "constraint_hierarchy" in cognitive:
            rules.append("\nConstraint Hierarchy:")
            for constraint in cognitive["constraint_hierarchy"]:
                level = constraint.get("level", "SHOULD")
                rule = constraint.get("rule", "")
                rules.append(f"  [{level}] {rule}")
    
    # 4. Statistical Patterns (v4 ADDITION - for DTM but can inform generation)
    if "statistical_patterns" in dtr:
        rules.append("\n## Statistical Patterns (Verified) ##\n")
        patterns = dtr["statistical_patterns"]
        
        if "spacing" in patterns:
            spacing_pat = patterns["spacing"]
            if spacing_pat.get("quantum"):
                rules.append(f"Spacing Quantum (statistical): {spacing_pat['quantum']}px")
        
        if "colors" in patterns:
            color_pat = patterns["colors"]
            rules.append(f"Unique Colors: {color_pat.get('total_unique', 0)}")
        
        if "typography" in patterns:
            typo_pat = patterns["typography"]
            if typo_pat.get("scale_ratio"):
                rules.append(f"Type Scale Ratio (statistical): {typo_pat['scale_ratio']}")
    
    # 5. Note about comprehensive data
    rules.append("\n## Note ##")
    rules.append("This DTR v4 contains comprehensive quantitative data.")
    rules.append("Full statistical patterns available in 'quantitative_validation' section.")
    
    return "\n".join(rules)


def _extract_v3_rules(dtr: Dict[str, Any]) -> str:
    """Extract rules from DTR v3 (generative format)"""
    
    rules = []
    
    # Header
    rules.append("=== Designer Taste Representation (DTR v3) ===\n")
    
    # Confidence scores
    if "meta" in dtr and "confidence_scores" in dtr["meta"]:
        scores = dtr["meta"]["confidence_scores"]
        rules.append(f"Confidence: Overall {scores.get('overall', 0):.2f}, "
                    f"Spatial {scores.get('spatial', 0):.2f}, "
                    f"Color {scores.get('color', 0):.2f}, "
                    f"Typography {scores.get('typography', 0):.2f}\n")
    
    # 1. Spatial Intelligence
    if "spatial_intelligence" in dtr:
        rules.append("\n## Spatial Intelligence ##\n")
        spatial = dtr["spatial_intelligence"]
        
        # Composition
        if "composition" in spatial:
            comp = spatial["composition"]
            rules.append(f"Composition Mode: {comp.get('mode', 'unknown')}")
            rules.append(f"Spacing Quantum: {comp.get('spacing_quantum', 8)}px")
            
            if "spacing_ratios" in comp:
                rules.append("Spacing Ratios:")
                for key, value in comp["spacing_ratios"].items():
                    rules.append(f"  - {key}: {value}")
            
            if "anchor_sequence" in comp:
                rules.append(f"Anchor Sequence: {', '.join(comp['anchor_sequence'])}")
        
        # Hierarchy
        if "hierarchy" in spatial:
            hier = spatial["hierarchy"]
            rules.append("\nHierarchy:")
            
            if "size_scaling" in hier:
                rules.append("Size Scaling:")
                for level, scale in hier["size_scaling"].items():
                    rules.append(f"  - {level}: {scale}")
            
            if "focal_point" in hier:
                rules.append(f"Focal Point: {hier['focal_point']}")
        
        # Density
        if "density" in spatial:
            density = spatial["density"]
            rules.append("\nDensity by Zone:")
            for zone, value in density.items():
                rules.append(f"  - {zone}: {value} elements/100px²")
    
    # 2. Visual Language
    if "visual_language" in dtr:
        rules.append("\n## Visual Language ##\n")
        visual = dtr["visual_language"]
        
        # Typography
        if "typography" in visual:
            typo = visual["typography"]
            rules.append("Typography:")
            rules.append(f"  - Scale Ratio: {typo.get('scale_ratio', 1.5)}")
            
            if "line_height_formula" in typo:
                rules.append(f"  - Line Height: {typo['line_height_formula']}")
            
            if "weight_progression" in typo:
                rules.append("  - Weight Progression:")
                for level, weight in typo["weight_progression"].items():
                    rules.append(f"    • {level}: {weight}")
        
        # Color System
        if "color_system" in visual:
            color_sys = visual["color_system"]
            rules.append("\nColor System:")
            
            if "roles" in color_sys:
                rules.append("Color Roles:")
                for role, data in color_sys["roles"].items():
                    if isinstance(data, dict):
                        base = data.get("base", "N/A")
                        rules.append(f"  - {role}: {base}")
            
            if "application_rules" in color_sys:
                rules.append("Application Rules:")
                for rule in color_sys["application_rules"]:
                    rules.append(f"  - {rule}")
        
        # Form Language
        if "form_language" in visual:
            forms = visual["form_language"]
            rules.append("\nForm Language:")
            
            if "corner_radius" in forms:
                rules.append("Corner Radii:")
                for element, radius in forms["corner_radius"].items():
                    rules.append(f"  - {element}: {radius}px")
            
            if "shape_philosophy" in forms:
                rules.append(f"Shape Philosophy: {forms['shape_philosophy']}")
    
    # 3. Cognitive Process
    if "cognitive_process" in dtr:
        rules.append("\n## Cognitive Process ##\n")
        cognitive = dtr["cognitive_process"]
        
        # Decision Tree
        if "decision_tree" in cognitive:
            rules.append("Decision Tree:")
            for i, step in enumerate(cognitive["decision_tree"], 1):
                rules.append(f"  {i}. {step}")
        
        # Constraint Hierarchy
        if "constraint_hierarchy" in cognitive:
            rules.append("\nConstraint Hierarchy:")
            for constraint in cognitive["constraint_hierarchy"]:
                level = constraint.get("level", "SHOULD")
                rule = constraint.get("rule", "")
                rules.append(f"  [{level}] {rule}")
        
        # Adaptation Heuristics
        if "adaptation_heuristics" in cognitive:
            heuristics = cognitive["adaptation_heuristics"]
            rules.append("\nAdaptation Heuristics:")
            for situation, approach in heuristics.items():
                rules.append(f"  - {situation}: {approach}")
    
    # 4. Quantitative Validation (if present)
    if "quantitative_validation" in dtr:
        rules.append("\n## Quantitative Validation ##\n")
        quant = dtr["quantitative_validation"]
        
        if "spacing_analysis" in quant:
            spacing = quant["spacing_analysis"]
            if spacing.get("spacing_quantum"):
                rules.append(f"Verified Spacing Quantum: {spacing['spacing_quantum']}px")
        
        if "color_analysis" in quant:
            colors = quant["color_analysis"]
            palette = colors.get("primary_palette", [])[:6]
            if palette:
                rules.append(f"Verified Color Palette: {', '.join(palette)}")
        
        if "typography_analysis" in quant:
            typo = quant["typography_analysis"]
            if typo.get("type_scale_ratio"):
                rules.append(f"Verified Type Scale: {typo['type_scale_ratio']}")
    
    return "\n".join(rules)


def _extract_v2_rules(dtr: Dict[str, Any]) -> str:
    """
    Extract rules from DTR v2 (descriptive format)
    Fallback for older DTRs
    """
    rules = []
    
    rules.append("=== Designer Taste Representation (DTR v2) ===\n")
    rules.append("Note: This is an older DTR format. Interpreting descriptively.\n")
    
    # Extract whatever structure is available
    if "colors" in dtr:
        rules.append("## Colors ##")
        if isinstance(dtr["colors"], dict):
            for key, value in dtr["colors"].items():
                rules.append(f"  - {key}: {value}")
        elif isinstance(dtr["colors"], list):
            rules.append(f"  Palette: {', '.join(dtr['colors'][:8])}")
    
    if "typography" in dtr:
        rules.append("\n## Typography ##")
        typo = dtr["typography"]
        if isinstance(typo, dict):
            for key, value in typo.items():
                rules.append(f"  - {key}: {value}")
    
    if "spacing" in dtr:
        rules.append("\n## Spacing ##")
        spacing = dtr["spacing"]
        if isinstance(spacing, dict):
            for key, value in spacing.items():
                rules.append(f"  - {key}: {value}")
    
    if "hierarchy" in dtr:
        rules.append("\n## Hierarchy ##")
        rules.append(f"  {dtr['hierarchy']}")
    
    if "composition" in dtr:
        rules.append("\n## Composition ##")
        rules.append(f"  {dtr['composition']}")
    
    # Add raw JSON as fallback
    rules.append("\n## Raw DTR Data ##")
    rules.append(json.dumps(dtr, indent=2))
    
    return "\n".join(rules)


def get_dtr_version(dtr_json: Dict[str, Any]) -> str:
    """Get DTR version"""
    return dtr_json.get("version", "2.0")


def is_dtr_v4(dtr_json: Dict[str, Any]) -> bool:
    """Check if DTR is version 4"""
    return get_dtr_version(dtr_json) == "4.0"


def is_dtr_v3(dtr_json: Dict[str, Any]) -> bool:
    """Check if DTR is version 3"""
    return get_dtr_version(dtr_json) == "3.0"


def get_dtr_confidence(dtr_json: Dict[str, Any]) -> Optional[float]:
    """Get overall confidence score from DTR"""
    if is_dtr_v4(dtr_json) or is_dtr_v3(dtr_json):
        return dtr_json.get("meta", {}).get("confidence_scores", {}).get("overall")
    return None