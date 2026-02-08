"""
DTM (Design Taste Model) Schemas - Pass 7
Multi-resource synthesis with narrative-rich outputs
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# STYLE FINGERPRINT (Internal comparison)
# ============================================================================

class ComparableTokens(BaseModel):
    """Structured values for algorithmic comparison"""
    # Spacing
    spacing_quantum: Optional[int] = None
    spacing_scale_ratio: Optional[float] = None
    
    # Colors
    primary_color_hue: Optional[float] = None  # 0-360
    primary_color_saturation: Optional[float] = None  # 0-100
    primary_color_lightness: Optional[float] = None  # 0-100
    background_lightness: Optional[float] = None  # 0-100
    
    # Typography
    type_scale_ratio: Optional[float] = None
    primary_font_weight_avg: Optional[int] = None
    
    # Borders
    border_radius_min: Optional[float] = None
    border_radius_max: Optional[float] = None
    border_radius_avg: Optional[float] = None
    
    # Layout
    component_density_score: Optional[float] = None  # 0-1 (sparse to dense)


class PatternFlags(BaseModel):
    """Binary/frequency pattern detection"""
    uses_uppercase_labels: bool = False
    uses_shadows: bool = False
    uses_blur_effects: bool = False
    uses_gradients: bool = False
    uses_illustrations: bool = False
    uses_photos: bool = False
    
    shadow_frequency: float = 0.0  # 0-1
    blur_frequency: float = 0.0  # 0-1


class StyleFingerprint(BaseModel):
    """
    Comparable representation of a DTR for consensus/conflict detection
    Used internally - not part of final DTM output
    """
    resource_id: str
    
    # Structured tokens for comparison
    comparable_tokens: ComparableTokens
    
    # Pattern flags
    patterns: PatternFlags
    
    # Embedding for clustering (optional)
    embedding: Optional[List[float]] = None
    
    # Metadata
    created_at: str


# ============================================================================
# CONSENSUS & CONFLICTS
# ============================================================================

class ConsensusNarrative(BaseModel):
    """Narrative synthesis of consensus patterns"""
    spatial_philosophy: str = Field(
        description="Multi-paragraph narrative about spacing, layout, density patterns"
    )
    color_relationships: str = Field(
        description="Multi-paragraph narrative about color usage, palettes, roles"
    )
    typography_philosophy: str = Field(
        description="Multi-paragraph narrative about font choices, scales, hierarchy"
    )
    surface_treatment: str = Field(
        description="Multi-paragraph narrative about materials, effects, depth"
    )
    component_vocabulary: str = Field(
        description="Multi-paragraph narrative about component patterns, styles"
    )
    image_integration: str = Field(
        description="Multi-paragraph narrative about image usage patterns"
    )


class ConflictResolution(BaseModel):
    """Narrative explanation of a resolved conflict"""
    dimension: str = Field(
        description="What aspect conflicts (e.g., 'Background Mode', 'Border Radius')"
    )
    resources_involved: Dict[str, List[str]] = Field(
        description="Map of value → list of resource_ids using that value"
    )
    resolution_narrative: str = Field(
        description="Multi-paragraph explanation of the conflict and how it was resolved"
    )
    resolved_approach: str = Field(
        description="Final decision / guidance for generation"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence in this resolution (0-1)"
    )
    alternatives: Optional[str] = Field(
        None,
        description="When/how to use alternative values"
    )


class DecisionHeuristics(BaseModel):
    """Free-form heuristics for design decisions"""
    complexity_approach: str = Field(
        description="How designer handles complexity (simplify vs organize)"
    )
    drama_vs_usability: str = Field(
        description="Balance between visual drama and usability"
    )
    density_preference: str = Field(
        description="Spacing density preferences"
    )
    color_philosophy: str = Field(
        description="Color usage philosophy"
    )
    spacing_philosophy: str = Field(
        description="Spacing and rhythm approach"
    )


class CrossResourceObsession(BaseModel):
    """Pattern that appears across all/most resources"""
    pattern: str = Field(
        description="Description of the obsessive pattern"
    )
    universality: str = Field(
        description="How universal (e.g., '100% of designs', '4 of 5 designs')"
    )
    application_rule: str = Field(
        description="When and how to apply this pattern"
    )


class UnifiedPersonality(BaseModel):
    """Synthesized personality across all resources"""
    design_lineage: str = Field(
        description="Multi-paragraph analysis of design traditions/influences"
    )
    emotional_register: str = Field(
        description="Multi-paragraph description of emotional intent"
    )
    decision_heuristics: DecisionHeuristics
    cross_resource_obsessions: List[CrossResourceObsession] = []
    universal_absences: List[str] = Field(
        default=[],
        description="Things NO resource does"
    )


class ConsolidatedTokens(BaseModel):
    """Exact tokens consolidated from all DTRs"""
    colors: Dict[str, Any] = {}
    typography: Dict[str, Any] = {}
    spacing: Dict[str, Any] = {}
    materials: Dict[str, Any] = {}
    components: List[Dict[str, Any]] = []


class GenerationGuidance(BaseModel):
    """How to use this DTM during generation"""
    priority_framework: str = Field(
        description="Free-form guidance on prioritization during generation"
    )
    ambiguity_resolution: str = Field(
        description="How to handle ambiguous situations"
    )
    conflict_handling: str = Field(
        description="How to apply resolved conflicts"
    )
    confidence_by_domain: Dict[str, float] = Field(
        default={
            "colors": 0.0,
            "typography": 0.0,
            "spacing": 0.0,
            "components": 0.0,
            "overall": 0.0
        }
    )


# ============================================================================
# CLUSTERING (Optional)
# ============================================================================

class ClusterDefinition(BaseModel):
    """A sub-style cluster"""
    cluster_id: str
    resource_ids: List[str]
    name: str = Field(description="Human-readable cluster name")
    description: str = Field(description="Multi-paragraph cluster description")
    unified_tokens: ConsolidatedTokens
    personality_narrative: str = Field(
        description="Cluster-specific personality synthesis"
    )


class ClusteringInfo(BaseModel):
    """Clustering metadata and results"""
    method: str = Field(description="Clustering method used")
    n_clusters: int
    cluster_definitions: List[ClusterDefinition]
    global_centroid_description: str = Field(
        description="Overall taste default narrative"
    )


# ============================================================================
# MAIN DTM SCHEMA
# ============================================================================

class Pass7CompleteDTM(BaseModel):
    """
    Complete Design Taste Model from multiple resources
    Narrative-rich, ready for UI generation
    """
    # Metadata
    taste_id: str
    resource_ids: List[str]
    prioritized_resource_ids: Optional[List[str]] = None
    authority: str = "multi_resource_synthesis"
    created_at: str
    mode: str = Field(
        description="Execution mode: explicit_resolution | clustered | statistical"
    )
    
    # Consensus (narrative-rich)
    consensus_narrative: ConsensusNarrative
    
    # Conflicts (narrative explanations)
    conflict_resolutions: List[ConflictResolution] = []
    
    # Unified personality
    unified_personality: UnifiedPersonality
    
    # Consolidated exact tokens
    consolidated_tokens: ConsolidatedTokens
    
    # Generation guidance
    generation_guidance: GenerationGuidance
    
    # Clustering (optional)
    clusters: Optional[ClusteringInfo] = None


# ============================================================================
# DTM METADATA
# ============================================================================

class SubsetCacheEntry(BaseModel):
    """Cache entry for a subset DTM"""
    resource_ids: List[str]
    hash: str
    created_at: str


class DTMMetadata(BaseModel):
    """Metadata about DTM rebuilds and cache"""
    taste_id: str
    last_rebuild: str
    resource_ids_at_rebuild: List[str]
    rebuild_trigger: str  # "resource_added" | "resource_deleted" | "resource_updated"
    rebuild_duration_seconds: float
    subsets_cached: List[SubsetCacheEntry] = []