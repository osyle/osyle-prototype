"""
Confidence Scoring

Utilities for calculating and adjusting confidence scores for DTR extraction.
"""
from typing import Dict, Any, Literal


def calculate_pass_confidence(
    authority: Literal["code", "vision", "hybrid"],
    has_validation: bool = False,
    data_quality: float = 1.0
) -> float:
    """
    Calculate confidence score for a pass
    
    Args:
        authority: Source of extraction (code, vision, hybrid)
        has_validation: Whether validation was performed
        data_quality: Quality factor (0-1) based on data completeness
    
    Returns:
        Confidence score (0-1)
    """
    # Base confidence by authority
    base_confidence = {
        "code": 0.90,      # High: exact values from Figma
        "vision": 0.65,    # Medium: LLM vision approximations
        "hybrid": 0.95     # Highest: code + vision validation
    }[authority]
    
    # Adjust for validation
    if has_validation and authority == "hybrid":
        base_confidence = min(0.98, base_confidence + 0.03)
    
    # Adjust for data quality
    final_confidence = base_confidence * data_quality
    
    # Clamp to valid range
    return max(0.0, min(1.0, final_confidence))


def aggregate_confidence(scores: list[float]) -> float:
    """
    Aggregate multiple confidence scores
    
    Uses weighted average with higher weight on lower scores
    (conservative approach).
    
    Args:
        scores: List of confidence scores
    
    Returns:
        Aggregated confidence score
    """
    if not scores:
        return 0.5
    
    # Weight lower scores more heavily (conservative)
    weights = [1.0 / (1.0 + score) for score in scores]
    
    weighted_sum = sum(s * w for s, w in zip(scores, weights))
    weight_sum = sum(weights)
    
    return weighted_sum / weight_sum if weight_sum > 0 else 0.5


def adjust_confidence_for_completeness(
    confidence: float,
    expected_fields: int,
    present_fields: int
) -> float:
    """
    Adjust confidence based on data completeness
    
    Args:
        confidence: Base confidence score
        expected_fields: Number of expected fields
        present_fields: Number of fields actually present
    
    Returns:
        Adjusted confidence score
    """
    if expected_fields == 0:
        return confidence
    
    completeness = present_fields / expected_fields
    
    # Reduce confidence if incomplete
    return confidence * completeness
