"""
DTR Validators

Validation utilities for DTR schemas and data quality.
"""
from typing import Dict, Any, List
from pydantic import ValidationError
from ..schemas import Pass1StructureDTR


def validate_pass_1(data: Dict[str, Any]) -> tuple[bool, List[str]]:
    """
    Validate Pass 1 data against schema
    
    Args:
        data: Pass 1 data dict
    
    Returns:
        Tuple of (is_valid, error_messages)
    """
    try:
        Pass1StructureDTR(**data)
        return True, []
    except ValidationError as e:
        errors = [str(err) for err in e.errors()]
        return False, errors


def validate_confidence_score(score: float) -> bool:
    """
    Validate confidence score is in valid range
    
    Args:
        score: Confidence score
    
    Returns:
        True if valid (0.0-1.0)
    """
    return 0.0 <= score <= 1.0


def validate_spacing_scale(scale: List[int]) -> tuple[bool, str]:
    """
    Validate spacing scale is reasonable
    
    Checks:
    - Values are positive
    - Values are in ascending order
    - Values follow a reasonable progression
    
    Args:
        scale: List of spacing values
    
    Returns:
        Tuple of (is_valid, message)
    """
    if not scale:
        return False, "Spacing scale is empty"
    
    # Check positive
    if any(v <= 0 for v in scale):
        return False, "Spacing scale contains non-positive values"
    
    # Check ascending
    if scale != sorted(scale):
        return False, "Spacing scale is not in ascending order"
    
    # Check reasonable values (not too large)
    if any(v > 500 for v in scale):
        return False, "Spacing scale contains unreasonably large values (>500px)"
    
    return True, "Valid"


def validate_density(density: float) -> bool:
    """
    Validate density is in valid range (0-1)
    
    Args:
        density: Density score
    
    Returns:
        True if valid
    """
    return 0.0 <= density <= 1.0


def check_data_completeness(data: Dict[str, Any], required_keys: List[str]) -> float:
    """
    Check completeness of extracted data
    
    Args:
        data: Data dictionary
        required_keys: List of required keys
    
    Returns:
        Completeness ratio (0-1)
    """
    if not required_keys:
        return 1.0
    
    present_keys = sum(1 for key in required_keys if key in data and data[key] is not None)
    
    return present_keys / len(required_keys)
