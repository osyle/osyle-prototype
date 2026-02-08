"""
DTM Synthesizer - Pass 7 Main Orchestrator
Synthesizes multiple DTRs into a unified narrative-rich DTM
"""
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.dtr import storage as dtr_storage
from app.llm.service import LLMService
from . import storage
from . import fingerprinting
from . import consensus as consensus_module
from . import conflicts as conflicts_module
from .schemas import (
    Pass7CompleteDTM,
    StyleFingerprint,
    ConsensusNarrative,
    ConflictResolution,
    UnifiedPersonality,
    DecisionHeuristics,
    CrossResourceObsession,
    ConsolidatedTokens,
    GenerationGuidance,
    DTMMetadata
)


async def synthesize_dtm(
    taste_id: str,
    resource_ids: List[str],
    llm: Optional[LLMService] = None,
    priority_mode: bool = False,
    prioritized_resource_ids: Optional[List[str]] = None
) -> Pass7CompleteDTM:
    """
    Main Pass 7 synthesizer
    
    Steps:
    1. Load all Pass 6 DTRs
    2. Extract fingerprints (comparable data)
    3. Compute consensus
    4. Detect conflicts
    5. Resolve conflicts
    6. LLM synthesis (narrative generation)
    7. Build complete DTM
    """
    
    start_time = time.time()
    
    print(f"\n{'='*80}")
    print(f"🎨 PASS 7: DTM SYNTHESIS")
    print(f"{'='*80}")
    print(f"Taste ID: {taste_id}")
    print(f"Resources: {len(resource_ids)}")
    print(f"Priority mode: {priority_mode}")
    print(f"{'='*80}\n")
    
    # Step 1: Load all DTRs
    print("📂 Step 1: Loading DTRs...")
    dtrs = []
    for resource_id in resource_ids:
        dtr = dtr_storage.load_complete_dtr(resource_id)
        if not dtr:
            print(f"⚠️  Warning: No DTR found for resource {resource_id}")
            continue
        dtrs.append({"resource_id": resource_id, "dtr": dtr})
    
    if len(dtrs) < 2:
        raise Exception(f"Need at least 2 DTRs, found {len(dtrs)}")
    
    print(f"✅ Loaded {len(dtrs)} DTRs\n")
    
    # Step 2: Extract fingerprints
    print("🔍 Step 2: Extracting fingerprints...")
    fingerprints = []
    for item in dtrs:
        fp = fingerprinting.extract_fingerprint(item["dtr"], item["resource_id"])
        fingerprints.append(fp)
        
        # Save fingerprint
        storage.save_fingerprint(taste_id, fp)
    
    print(f"✅ Extracted {len(fingerprints)} fingerprints\n")
    
    # Step 3: Compute consensus
    print("🤝 Step 3: Computing consensus...")
    consensus = consensus_module.extract_consensus(fingerprints)
    summary = consensus_module.get_consensus_summary(consensus)
    print(f"  Invariants: {summary['invariants_count']}")
    print(f"  Strong: {summary['strong_count']}")
    print(f"  Moderate: {summary['moderate_count']}")
    print(f"  Conflicts: {summary['conflicts_count']}")
    print()
    
    # Step 4: Detect conflicts
    print("⚔️  Step 4: Detecting conflicts...")
    fingerprints_dict = [fp.model_dump() if hasattr(fp, 'model_dump') else fp.dict() for fp in fingerprints]
    conflicts = conflicts_module.detect_conflicts(fingerprints_dict, consensus)
    print(f"✅ Found {len(conflicts)} conflicts\n")
    
    # Step 5: Resolve conflicts
    print("🔧 Step 5: Resolving conflicts...")
    strategy = "priority_anchoring" if priority_mode and prioritized_resource_ids else "weighted_majority"
    resolved_conflicts = conflicts_module.resolve_conflicts(
        conflicts,
        strategy=strategy,
        priority_resource_ids=prioritized_resource_ids
    )
    print(f"✅ Resolved {len(resolved_conflicts)} conflicts using {strategy}\n")
    
    # Step 6: LLM synthesis (narrative generation)
    print("🧠 Step 6: LLM synthesis (Claude Opus)...")
    
    if llm is None:
        llm = LLMService()
    
    # Build synthesis prompt
    synthesis_prompt = _build_synthesis_prompt(dtrs, consensus, resolved_conflicts)
    
    # Call Claude Opus
    response = await llm.generate(
        model="claude-opus-4.5",
        system_prompt="You are a design analyst synthesizing multiple design resources into a unified taste model.",
        user_prompt=synthesis_prompt,
        temperature=0.3,
        max_tokens=8000
    )
    
    # Parse response (expecting JSON)
    import json
    synthesis_result = json.loads(response.strip())
    
    print("✅ LLM synthesis complete\n")
    
    # Step 7: Build complete DTM
    print("🏗️  Step 7: Building complete DTM...")
    
    dtm = _build_complete_dtm(
        taste_id=taste_id,
        resource_ids=resource_ids,
        prioritized_resource_ids=prioritized_resource_ids,
        dtrs=dtrs,
        consensus=consensus,
        resolved_conflicts=resolved_conflicts,
        synthesis_result=synthesis_result
    )
    
    # Save DTM
    storage.save_dtm(taste_id, dtm, resource_ids)
    
    # Save metadata
    duration = time.time() - start_time
    metadata = DTMMetadata(
        taste_id=taste_id,
        last_rebuild=datetime.now().isoformat(),
        resource_ids_at_rebuild=resource_ids,
        rebuild_trigger="manual",  # Will be updated by caller
        rebuild_duration_seconds=duration,
        subsets_cached=[]
    )
    storage.save_dtm_metadata(metadata)
    
    print(f"✅ DTM synthesis complete ({duration:.1f}s)\n")
    print(f"{'='*80}\n")
    
    return dtm


def _build_synthesis_prompt(
    dtrs: List[Dict[str, Any]],
    consensus: Dict[str, Any],
    resolved_conflicts: List[Dict[str, Any]]
) -> str:
    """Build comprehensive synthesis prompt for Claude Opus"""
    
    # Extract key info from each DTR
    dtr_summaries = []
    for item in dtrs:
        resource_id = item["resource_id"]
        dtr = item["dtr"]
        
        # Get personality
        personality = dtr.get("personality", {})
        
        summary = f"""
Resource {resource_id}:
- Design Lineage: {personality.get('lineage', 'N/A')[:200]}...
- Emotional Register: {personality.get('emotional_register', 'N/A')[:200]}...
- Key Obsessions: {len(personality.get('obsessions', []))} patterns
- Notable Absences: {len(personality.get('notable_absences', []))} items
"""
        dtr_summaries.append(summary)
    
    prompt = f"""You are synthesizing {len(dtrs)} design resources into a unified Design Taste Model (DTM).

=== INDIVIDUAL RESOURCES ===
{''.join(dtr_summaries)}

=== CONSENSUS ANALYSIS ===
Invariants (90%+ agreement): {len(consensus.get('invariants', {}))} properties
Strong consensus (70-90%): {len(consensus.get('strong', {}))} properties
Moderate consensus (50-70%): {len(consensus.get('moderate', {}))} properties
Conflicts detected: {len(consensus.get('conflicts', []))} properties

=== RESOLVED CONFLICTS ===
{len(resolved_conflicts)} conflicts were resolved.

=== YOUR TASK ===
Synthesize a unified narrative DTM that captures:
1. What is UNIVERSALLY TRUE across all resources (invariants)
2. What is USUALLY TRUE (strong/moderate consensus)
3. How CONFLICTS were resolved (with explanations)
4. A UNIFIED PERSONALITY that blends all resources

OUTPUT FORMAT (JSON):
{{
  "consensus_narrative": {{
    "spatial_philosophy": "Multi-paragraph narrative about spacing, layout, density...",
    "color_relationships": "Multi-paragraph narrative about color usage...",
    "typography_philosophy": "Multi-paragraph narrative about typography...",
    "surface_treatment": "Multi-paragraph narrative about materials, effects...",
    "component_vocabulary": "Multi-paragraph narrative about components...",
    "image_integration": "Multi-paragraph narrative about image usage..."
  }},
  
  "conflict_resolutions_narrative": [
    {{
      "dimension": "Conflict name",
      "resolution_narrative": "Multi-paragraph explanation of conflict and resolution"
    }}
  ],
  
  "unified_personality": {{
    "design_lineage": "Multi-paragraph synthesis of design traditions",
    "emotional_register": "Multi-paragraph synthesis of emotional intent",
    "decision_heuristics": {{
      "complexity_approach": "Free-form paragraph",
      "drama_vs_usability": "Free-form paragraph",
      "density_preference": "Free-form paragraph",
      "color_philosophy": "Free-form paragraph",
      "spacing_philosophy": "Free-form paragraph"
    }},
    "cross_resource_obsessions": [
      {{
        "pattern": "Description",
        "universality": "X of Y designs",
        "application_rule": "When/how to apply"
      }}
    ],
    "universal_absences": ["Thing no resource does"]
  }},
  
  "generation_guidance": {{
    "priority_framework": "Multi-paragraph guidance",
    "ambiguity_resolution": "How to handle unknowns",
    "conflict_handling": "How to apply resolved conflicts"
  }}
}}

BE SPECIFIC. BE NARRATIVE. NO GENERIC STATEMENTS.
"""
    
    return prompt


def _build_complete_dtm(
    taste_id: str,
    resource_ids: List[str],
    prioritized_resource_ids: Optional[List[str]],
    dtrs: List[Dict[str, Any]],
    consensus: Dict[str, Any],
    resolved_conflicts: List[Dict[str, Any]],
    synthesis_result: Dict[str, Any]
) -> Pass7CompleteDTM:
    """Build final Pass7CompleteDTM object"""
    
    # Extract narratives from synthesis
    consensus_narrative = ConsensusNarrative(**synthesis_result.get("consensus_narrative", {}))
    
    # Build conflict resolutions
    conflict_resolutions = []
    conflicts_narrative = synthesis_result.get("conflict_resolutions_narrative", [])
    
    for i, resolved in enumerate(resolved_conflicts):
        narrative = conflicts_narrative[i] if i < len(conflicts_narrative) else {}
        
        conflict_res = ConflictResolution(
            dimension=resolved.get("dimension", "Unknown"),
            resources_involved=resolved.get("resources_involved", {}),
            resolution_narrative=narrative.get("resolution_narrative", resolved.get("resolution_narrative", "")),
            resolved_approach=resolved.get("resolved_approach", ""),
            confidence=resolved.get("confidence", 0.5),
            alternatives=resolved.get("alternatives")
        )
        conflict_resolutions.append(conflict_res)
    
    # Build unified personality
    personality_data = synthesis_result.get("unified_personality", {})
    heuristics_data = personality_data.get("decision_heuristics", {})
    
    heuristics = DecisionHeuristics(
        complexity_approach=heuristics_data.get("complexity_approach", ""),
        drama_vs_usability=heuristics_data.get("drama_vs_usability", ""),
        density_preference=heuristics_data.get("density_preference", ""),
        color_philosophy=heuristics_data.get("color_philosophy", ""),
        spacing_philosophy=heuristics_data.get("spacing_philosophy", "")
    )
    
    obsessions = [
        CrossResourceObsession(**obs)
        for obs in personality_data.get("cross_resource_obsessions", [])
    ]
    
    unified_personality = UnifiedPersonality(
        design_lineage=personality_data.get("design_lineage", ""),
        emotional_register=personality_data.get("emotional_register", ""),
        decision_heuristics=heuristics,
        cross_resource_obsessions=obsessions,
        universal_absences=personality_data.get("universal_absences", [])
    )
    
    # Consolidate tokens from all DTRs
    consolidated_tokens = _consolidate_tokens(dtrs)
    
    # Build generation guidance
    guidance_data = synthesis_result.get("generation_guidance", {})
    generation_guidance = GenerationGuidance(
        priority_framework=guidance_data.get("priority_framework", ""),
        ambiguity_resolution=guidance_data.get("ambiguity_resolution", ""),
        conflict_handling=guidance_data.get("conflict_handling", ""),
        confidence_by_domain={
            "colors": 0.8,
            "typography": 0.8,
            "spacing": 0.8,
            "components": 0.7,
            "overall": 0.75
        }
    )
    
    # Build DTM
    dtm = Pass7CompleteDTM(
        taste_id=taste_id,
        resource_ids=resource_ids,
        prioritized_resource_ids=prioritized_resource_ids,
        authority="multi_resource_synthesis",
        created_at=datetime.now().isoformat(),
        mode="explicit_resolution" if len(resource_ids) <= 5 else "clustered",
        consensus_narrative=consensus_narrative,
        conflict_resolutions=conflict_resolutions,
        unified_personality=unified_personality,
        consolidated_tokens=consolidated_tokens,
        generation_guidance=generation_guidance,
        clusters=None  # TODO: Implement clustering for 6+ resources
    )
    
    return dtm


def _consolidate_tokens(dtrs: List[Dict[str, Any]]) -> ConsolidatedTokens:
    """Consolidate exact tokens from all DTRs"""
    
    # Merge tokens from all DTRs
    all_colors = []
    all_typography = []
    all_spacing = []
    all_materials = []
    all_components = []
    
    for item in dtrs:
        dtr = item["dtr"]
        exact_tokens = dtr.get("exact_tokens", {})
        
        if exact_tokens.get("colors"):
            all_colors.append(exact_tokens["colors"])
        if exact_tokens.get("typography"):
            all_typography.append(exact_tokens["typography"])
        if exact_tokens.get("spacing"):
            all_spacing.append(exact_tokens["spacing"])
        if exact_tokens.get("materials"):
            all_materials.append(exact_tokens["materials"])
        if exact_tokens.get("components"):
            all_components.extend(exact_tokens["components"])
    
    # Merge (simple approach - take first for now, TODO: smarter merging)
    return ConsolidatedTokens(
        colors=all_colors[0] if all_colors else {},
        typography=all_typography[0] if all_typography else {},
        spacing=all_spacing[0] if all_spacing else {},
        materials=all_materials[0] if all_materials else {},
        components=all_components
    )