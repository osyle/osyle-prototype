"""
DTM Builder - Smart DTM retrieval and generation
Handles single resource (DTR), full taste (global DTM), and subsets (cached DTMs)
"""
import time
from typing import List, Optional, Dict, Any
from app.dtr import storage as dtr_storage
from app.dtr.schemas import Pass6CompleteDTR
from app.db import list_resources_for_taste
from . import storage
from . import synthesizer
from .schemas import Pass7CompleteDTM


async def get_or_build_dtm(
    taste_id: str,
    resource_ids: List[str],
    mode: str = "auto"
) -> Dict[str, Any]:
    """
    Smart DTM retrieval/generation for UI generation.
    
    Modes:
    - auto: Choose based on resource count
    - full: Use taste-level DTM (all resources)
    - subset: Build/load subset DTM (specific resources)
    - single: Use DTR directly (single resource, wrapped in DTM-like format)
    
    Returns:
        Dict with:
        - mode: str (what mode was used)
        - dtm: Pass7CompleteDTM (the actual DTM)
        - hash: Optional[str] (subset hash if applicable)
        - was_cached: bool (whether loaded from cache)
        - build_time_ms: int (time taken to build/load)
    """
    start_time = time.time()
    
    # Determine mode
    actual_mode = _determine_mode(taste_id, resource_ids, mode)
    
    print(f"\n{'='*70}")
    print(f"DTM Builder: taste_id={taste_id}")
    print(f"Resources requested: {len(resource_ids)}")
    print(f"Mode: {actual_mode} (requested: {mode})")
    print(f"{'='*70}\n")
    
    result = {
        "mode": actual_mode,
        "dtm": None,
        "hash": None,
        "was_cached": False,
        "build_time_ms": 0,
        "resource_ids": resource_ids
    }
    
    # Single resource: Use DTR directly
    if actual_mode == "single":
        print(f"📄 Single resource mode: Loading DTR for {resource_ids[0]}")
        dtr = dtr_storage.load_complete_dtr(resource_ids[0])
        if not dtr:
            raise ValueError(f"No DTR found for resource {resource_ids[0]}")
        
        # Convert DTR to DTM format (wrapper)
        dtm = _convert_dtr_to_dtm(taste_id, resource_ids[0], dtr)
        result["dtm"] = dtm
        result["was_cached"] = True  # DTR is cached
    
    # Full taste: Load pre-computed global DTM
    elif actual_mode == "full":
        print(f"🌍 Full taste mode: Loading global DTM")
        dtm = storage.load_dtm(taste_id)
        
        if not dtm:
            # Build if missing
            print(f"⚠️  Global DTM not found, building...")
            dtm = await synthesizer.synthesize_dtm(taste_id, resource_ids)
            storage.save_dtm(taste_id, dtm, resource_ids)
            result["was_cached"] = False
        else:
            print(f"✅ Loaded global DTM from cache")
            result["was_cached"] = True
        
        result["dtm"] = dtm
    
    # Subset: Check cache, build if missing
    elif actual_mode == "subset":
        subset_hash = storage.compute_subset_hash(resource_ids)
        print(f"🔍 Subset mode: Hash = {subset_hash}")
        
        # Try to load from cache
        cached_dtm = storage.load_subset_dtm(taste_id, resource_ids)
        
        if cached_dtm:
            print(f"✅ Using cached subset DTM")
            result["dtm"] = cached_dtm
            result["hash"] = subset_hash
            result["was_cached"] = True
        else:
            # Build new subset DTM
            print(f"🔨 Building new subset DTM for {len(resource_ids)} resources...")
            subset_dtm = await synthesizer.synthesize_dtm(taste_id, resource_ids)
            
            # Cache it
            storage.save_subset_dtm(taste_id, resource_ids, subset_dtm)
            print(f"💾 Cached subset DTM: {subset_hash}")
            
            result["dtm"] = subset_dtm
            result["hash"] = subset_hash
            result["was_cached"] = False
    
    # Calculate build time
    build_time = (time.time() - start_time) * 1000  # Convert to ms
    result["build_time_ms"] = int(build_time)
    
    print(f"\n{'='*70}")
    print(f"✅ DTM Builder complete:")
    print(f"   Mode: {actual_mode}")
    print(f"   Cached: {result['was_cached']}")
    print(f"   Time: {result['build_time_ms']}ms")
    print(f"{'='*70}\n")
    
    return result


def _determine_mode(taste_id: str, resource_ids: List[str], mode: str) -> str:
    """
    Determine which mode to use based on resource count.
    
    Args:
        taste_id: Taste identifier
        resource_ids: List of selected resource IDs
        mode: Requested mode ("auto", "single", "subset", "full")
    
    Returns:
        Actual mode to use
    """
    if mode != "auto":
        return mode
    
    # Get total resources in taste
    all_resources = list_resources_for_taste(taste_id)
    total_resources = len(all_resources)
    selected_count = len(resource_ids)
    
    print(f"Mode determination: {selected_count} selected / {total_resources} total")
    
    if selected_count == 1:
        return "single"
    elif selected_count == total_resources:
        return "full"
    else:
        return "subset"


def _convert_dtr_to_dtm(taste_id: str, resource_id: str, dtr: Dict[str, Any]) -> Pass7CompleteDTM:
    """
    Convert a single DTR to DTM format for consistency.
    This is a lightweight wrapper - no synthesis needed.
    
    Args:
        taste_id: Taste identifier
        resource_id: Resource identifier
        dtr: Complete DTR from Pass 6
    
    Returns:
        DTM with single resource
    """
    from datetime import datetime
    from .schemas import (
        ConsensusNarrative,
        UnifiedPersonality,
        DecisionHeuristics,
        ConsolidatedTokens,
        GenerationGuidance
    )
    
    # Extract personality from DTR
    dtr_personality = dtr.get("personality", {})
    
    # Create unified personality from single resource
    unified_personality = UnifiedPersonality(
        design_lineage=dtr_personality.get("design_lineage", ""),
        emotional_register=dtr_personality.get("emotional_register", ""),
        decision_heuristics=DecisionHeuristics(
            complexity_approach=dtr_personality.get("decision_heuristics", {}).get("complexity_approach", ""),
            drama_vs_usability=dtr_personality.get("decision_heuristics", {}).get("drama_vs_usability", ""),
            density_preference=dtr_personality.get("decision_heuristics", {}).get("density_preference", ""),
            color_philosophy=dtr_personality.get("decision_heuristics", {}).get("color_philosophy", ""),
            spacing_philosophy=dtr_personality.get("decision_heuristics", {}).get("spacing_philosophy", "")
        ),
        cross_resource_obsessions=[],  # Single resource, no cross-resource patterns
        universal_absences=dtr_personality.get("notable_absences", [])
    )
    
    # Extract cross-cutting patterns from DTR
    patterns = dtr.get("cross_cutting_patterns", {})
    
    # Create consensus narrative from DTR patterns
    consensus_narrative = ConsensusNarrative(
        spatial_philosophy=patterns.get("spatial_philosophy", ""),
        color_relationships=patterns.get("color_relationships", ""),
        typography_philosophy=patterns.get("typography_philosophy", ""),
        surface_treatment=patterns.get("surface_treatment", ""),
        component_vocabulary=patterns.get("component_system_philosophy", ""),
        image_integration=patterns.get("image_integration_approach", "")
    )
    
    # Extract exact tokens from DTR
    exact_tokens = dtr.get("exact_tokens", {})
    consolidated_tokens = ConsolidatedTokens(
        colors=exact_tokens.get("colors", {}),
        typography=exact_tokens.get("typography", {}),
        spacing=exact_tokens.get("spacing", {}),
        materials=exact_tokens.get("materials", {}),
        components=exact_tokens.get("components", [])
    )
    
    # Extract generation guidance from DTR
    dtr_guidance = dtr.get("generation_guidance", {})
    generation_guidance = GenerationGuidance(
        priority_framework=dtr_guidance.get("when_to_prioritize", {}).get("structure_over_style", ""),
        ambiguity_resolution=dtr_guidance.get("ambiguity_resolution", {}).get("missing_element_approach", ""),
        conflict_handling="No conflicts - single resource",
        confidence_by_domain=dtr_guidance.get("confidence_by_domain", {
            "colors": 0.9,
            "typography": 0.9,
            "spacing": 0.9,
            "components": 0.9,
            "overall": 0.9
        })
    )
    
    # Create DTM
    dtm = Pass7CompleteDTM(
        taste_id=taste_id,
        resource_ids=[resource_id],
        authority="single_resource_wrapper",
        created_at=datetime.now().isoformat(),
        mode="single_resource",
        consensus_narrative=consensus_narrative,
        conflict_resolutions=[],  # No conflicts with single resource
        unified_personality=unified_personality,
        consolidated_tokens=consolidated_tokens,
        generation_guidance=generation_guidance
    )
    
    return dtm