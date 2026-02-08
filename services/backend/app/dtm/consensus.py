"""
Consensus Extraction - Find agreement across DTRs
"""
from typing import List, Dict, Any, Optional
from collections import Counter
from .schemas import StyleFingerprint


def extract_consensus(fingerprints: List[StyleFingerprint]) -> Dict[str, Any]:
    """
    Extract consensus from multiple style fingerprints
    
    Returns:
    {
        "invariants": {},       # 90-100% agreement
        "strong": {},           # 70-90% agreement  
        "moderate": {},         # 50-70% agreement
        "conflicts": []         # <50% agreement
    }
    """
    
    if len(fingerprints) < 2:
        return {
            "invariants": {},
            "strong": {},
            "moderate": {},
            "conflicts": []
        }
    
    consensus = {
        "invariants": {},
        "strong": {},
        "moderate": {},
        "conflicts": []
    }
    
    # Analyze comparable tokens
    _analyze_numerical_features(fingerprints, consensus)
    
    # Analyze pattern flags
    _analyze_categorical_features(fingerprints, consensus)
    
    return consensus


def _analyze_numerical_features(
    fingerprints: List[StyleFingerprint],
    consensus: Dict[str, Any]
):
    """Analyze numerical features for consensus"""
    
    numerical_features = [
        "spacing_quantum",
        "spacing_scale_ratio",
        "type_scale_ratio",
        "primary_font_weight_avg",
        "border_radius_min",
        "border_radius_max",
        "border_radius_avg",
        "component_density_score",
        "primary_color_hue",
        "primary_color_saturation",
        "primary_color_lightness",
        "background_lightness"
    ]
    
    for feature in numerical_features:
        values = []
        
        for fp in fingerprints:
            val = getattr(fp.comparable_tokens, feature, None)
            if val is not None:
                values.append(val)
        
        if not values:
            continue
        
        # Calculate statistics
        mean_val = sum(values) / len(values)
        
        if len(values) > 1:
            variance = sum((x - mean_val) ** 2 for x in values) / len(values)
            std_dev = variance ** 0.5
            
            # Coefficient of variation
            if mean_val != 0:
                cv = std_dev / abs(mean_val)
            else:
                cv = float('inf')
        else:
            cv = 0.0
        
        # Classify by coefficient of variation
        if cv < 0.1:
            consensus["invariants"][feature] = {
                "value": mean_val,
                "confidence": 1.0 - cv,
                "std_dev": std_dev if len(values) > 1 else 0.0
            }
        elif cv < 0.3:
            consensus["strong"][feature] = {
                "value": mean_val,
                "confidence": 0.8,
                "std_dev": std_dev if len(values) > 1 else 0.0
            }
        elif cv < 0.5:
            consensus["moderate"][feature] = {
                "value": mean_val,
                "confidence": 0.6,
                "std_dev": std_dev if len(values) > 1 else 0.0
            }
        else:
            # High variance - conflict
            consensus["conflicts"].append({
                "feature": feature,
                "type": "numerical",
                "values": values,
                "mean": mean_val,
                "std_dev": std_dev if len(values) > 1 else 0.0,
                "coefficient_of_variation": cv
            })


def _analyze_categorical_features(
    fingerprints: List[StyleFingerprint],
    consensus: Dict[str, Any]
):
    """Analyze categorical/boolean features for consensus"""
    
    categorical_features = [
        "uses_uppercase_labels",
        "uses_shadows",
        "uses_blur_effects",
        "uses_gradients",
        "uses_illustrations",
        "uses_photos"
    ]
    
    frequency_features = [
        "shadow_frequency",
        "blur_frequency"
    ]
    
    # Analyze boolean patterns
    for feature in categorical_features:
        values = []
        
        for fp in fingerprints:
            val = getattr(fp.patterns, feature, None)
            if val is not None:
                values.append(val)
        
        if not values:
            continue
        
        # Count occurrences
        counter = Counter(values)
        most_common_value, count = counter.most_common(1)[0]
        agreement_rate = count / len(values)
        
        # Classify by agreement rate
        if agreement_rate >= 0.9:
            consensus["invariants"][feature] = {
                "value": most_common_value,
                "confidence": agreement_rate
            }
        elif agreement_rate >= 0.7:
            consensus["strong"][feature] = {
                "value": most_common_value,
                "confidence": agreement_rate
            }
        elif agreement_rate >= 0.5:
            consensus["moderate"][feature] = {
                "value": most_common_value,
                "confidence": agreement_rate
            }
        else:
            # Conflict
            distribution = dict(counter)
            consensus["conflicts"].append({
                "feature": feature,
                "type": "categorical",
                "distribution": distribution,
                "most_common": most_common_value,
                "agreement_rate": agreement_rate
            })
    
    # Analyze frequency features (treat as numerical)
    for feature in frequency_features:
        values = []
        
        for fp in fingerprints:
            val = getattr(fp.patterns, feature, None)
            if val is not None:
                values.append(val)
        
        if not values:
            continue
        
        mean_val = sum(values) / len(values)
        
        # All frequencies should be high consensus if present
        if mean_val >= 0.7:
            consensus["strong"][feature] = {
                "value": mean_val,
                "confidence": 0.8
            }
        elif mean_val >= 0.3:
            consensus["moderate"][feature] = {
                "value": mean_val,
                "confidence": 0.6
            }


def get_consensus_summary(consensus: Dict[str, Any]) -> Dict[str, int]:
    """Get a summary of consensus strength"""
    return {
        "invariants_count": len(consensus.get("invariants", {})),
        "strong_count": len(consensus.get("strong", {})),
        "moderate_count": len(consensus.get("moderate", {})),
        "conflicts_count": len(consensus.get("conflicts", []))
    }