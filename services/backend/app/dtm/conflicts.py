"""
Conflict Detection and Resolution
"""
from typing import List, Dict, Any, Optional


def detect_conflicts(
    fingerprints: List[Dict[str, Any]],
    consensus: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Extract conflicts from consensus analysis
    Returns list of conflicts with metadata
    """
    conflicts = consensus.get("conflicts", [])
    
    # Enrich conflicts with resource mapping
    enriched_conflicts = []
    
    for conflict in conflicts:
        enriched = _enrich_conflict(conflict, fingerprints)
        enriched_conflicts.append(enriched)
    
    return enriched_conflicts


def _enrich_conflict(
    conflict: Dict[str, Any],
    fingerprints: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Add resource mapping to conflict"""
    
    feature = conflict["feature"]
    conflict_type = conflict["type"]
    
    # Map which resources use which values
    resource_mapping = {}
    
    if conflict_type == "numerical":
        values = conflict.get("values", [])
        
        # Group similar values (within 10% tolerance)
        value_groups = _group_similar_values(values)
        
        for group_val, indices in value_groups.items():
            resource_ids = [fingerprints[i]["resource_id"] for i in indices if i < len(fingerprints)]
            resource_mapping[str(group_val)] = resource_ids
    
    elif conflict_type == "categorical":
        distribution = conflict.get("distribution", {})
        
        for value, count in distribution.items():
            # Find which resources have this value
            resource_ids = []
            for i, fp in enumerate(fingerprints):
                # This is simplified - in real implementation, check actual fingerprint
                resource_ids.append(fp.get("resource_id", f"resource_{i}"))
            
            resource_mapping[str(value)] = resource_ids[:count]
    
    conflict["resources_involved"] = resource_mapping
    
    return conflict


def _group_similar_values(values: List[float], tolerance: float = 0.1) -> Dict[float, List[int]]:
    """Group numerical values that are similar"""
    groups = {}
    
    for i, val in enumerate(values):
        # Find existing group
        found_group = False
        for group_val in groups.keys():
            if abs(val - group_val) / max(abs(group_val), 0.01) <= tolerance:
                groups[group_val].append(i)
                found_group = True
                break
        
        if not found_group:
            groups[val] = [i]
    
    return groups


def resolve_conflicts(
    conflicts: List[Dict[str, Any]],
    strategy: str = "weighted_majority",
    priority_resource_ids: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Resolve conflicts using specified strategy
    
    Strategies:
    - weighted_majority: Use most common value
    - priority_anchoring: Prioritize specific resources
    - hybrid_composition: Allow compatible values to coexist
    """
    
    resolved = []
    
    for conflict in conflicts:
        if strategy == "weighted_majority":
            resolution = _resolve_weighted_majority(conflict)
        elif strategy == "priority_anchoring" and priority_resource_ids:
            resolution = _resolve_priority_anchoring(conflict, priority_resource_ids)
        else:
            resolution = _resolve_weighted_majority(conflict)
        
        resolved.append(resolution)
    
    return resolved


def _resolve_weighted_majority(conflict: Dict[str, Any]) -> Dict[str, Any]:
    """Resolve by picking the most common value"""
    
    dimension = conflict.get("feature", "Unknown")
    conflict_type = conflict.get("type", "unknown")
    
    if conflict_type == "numerical":
        values = conflict.get("values", [])
        mean_val = conflict.get("mean")
        std_dev = conflict.get("std_dev", 0)
        
        # Use mean as resolved value
        resolved_value = mean_val
        confidence = 0.5  # Moderate confidence due to conflict
        
        # Find alternative values (distinct values far from mean)
        alternatives = []
        for val in set(values):
            if abs(val - mean_val) > std_dev:
                count = values.count(val)
                support = count / len(values)
                alternatives.append({
                    "value": val,
                    "support": support
                })
    
    elif conflict_type == "categorical":
        distribution = conflict.get("distribution", {})
        most_common = conflict.get("most_common")
        agreement_rate = conflict.get("agreement_rate", 0.5)
        
        resolved_value = most_common
        confidence = agreement_rate
        
        # Find alternatives
        alternatives = []
        for value, count in distribution.items():
            if value != most_common:
                support = count / sum(distribution.values())
                alternatives.append({
                    "value": value,
                    "support": support
                })
    
    else:
        resolved_value = None
        confidence = 0.0
        alternatives = []
    
    return {
        "dimension": dimension,
        "resources_involved": conflict.get("resources_involved", {}),
        "resolution_narrative": f"Conflict on {dimension}. Using weighted majority approach.",
        "resolved_approach": str(resolved_value),
        "confidence": confidence,
        "alternatives": str(alternatives) if alternatives else None
    }


def _resolve_priority_anchoring(
    conflict: Dict[str, Any],
    priority_resource_ids: List[str]
) -> Dict[str, Any]:
    """Resolve by anchoring to priority resource"""
    
    dimension = conflict.get("feature", "Unknown")
    resources_involved = conflict.get("resources_involved", {})
    
    # Find value used by first priority resource
    anchor_value = None
    for value, resource_ids in resources_involved.items():
        if priority_resource_ids[0] in resource_ids:
            anchor_value = value
            break
    
    if anchor_value is None:
        # Fall back to weighted majority
        return _resolve_weighted_majority(conflict)
    
    # Count how many other resources agree
    anchor_resources = resources_involved.get(anchor_value, [])
    total_resources = sum(len(ids) for ids in resources_involved.values())
    agreement_rate = len(anchor_resources) / total_resources if total_resources > 0 else 0
    
    # Find alternatives
    alternatives = []
    for value, resource_ids in resources_involved.items():
        if value != anchor_value:
            support = len(resource_ids) / total_resources if total_resources > 0 else 0
            alternatives.append({
                "value": value,
                "support": support
            })
    
    return {
        "dimension": dimension,
        "resources_involved": resources_involved,
        "resolution_narrative": f"Conflict on {dimension}. Anchoring to priority resource.",
        "resolved_approach": str(anchor_value),
        "confidence": 1.0,  # High confidence due to explicit priority
        "alternatives": str(alternatives) if alternatives else None
    }