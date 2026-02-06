"""
DTR (Design Taste Representation) Schemas

Pydantic models for all pass outputs and the complete DTR.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal


# ============================================================================
# PASS 1: STRUCTURAL SKELETON
# ============================================================================

class LayoutSchema(BaseModel):
    """Layout structure information"""
    type: str = Field(..., description="Layout pattern: sidebar_content, hero_sections, card_grid, etc.")
    columns: Optional[Dict[str, Any]] = Field(None, description="Column configuration")
    direction: str = Field("vertical", description="Primary layout direction")
    nesting_depth: int = Field(..., description="Maximum nesting depth in the structure")


class HierarchyLevel(BaseModel):
    """Single level in the visual hierarchy"""
    rank: int = Field(..., description="Hierarchy rank (1 = highest)")
    elements: List[str] = Field(..., description="Element types at this level")
    established_by: str = Field(..., description="How hierarchy is established: size, weight, position, etc.")


class HierarchySchema(BaseModel):
    """Visual hierarchy information"""
    levels: List[HierarchyLevel] = Field(..., description="Ordered list of hierarchy levels")


class DensitySection(BaseModel):
    """Density information for a section"""
    section: str = Field(..., description="Section identifier")
    density: float = Field(..., description="Content density ratio (0-1)")


class DensitySchema(BaseModel):
    """Content density information"""
    global_density: float = Field(..., alias="global", description="Overall content density")
    per_section: List[DensitySection] = Field(..., description="Per-section density breakdown")
    
    class Config:
        populate_by_name = True


class SpacingSchema(BaseModel):
    """Spacing system information"""
    quantum: str = Field(..., description="Base spacing unit (e.g., '8px', '4px')")
    scale: List[int] = Field(..., description="Spacing scale values used")
    consistency: float = Field(..., description="How consistently the scale is applied (0-1)")


class Pass1StructureDTR(BaseModel):
    """
    Pass 1: Structural Skeleton
    
    Extracts layout topology, hierarchy, density, and spacing system.
    Captures the designer's spatial thinking and structural philosophy.
    """
    authority: Literal["code", "vision", "hybrid"] = Field(
        ..., 
        description="Source of extraction: code (Figma JSON), vision (image), or hybrid (both)"
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    layout: LayoutSchema
    hierarchy: HierarchySchema
    density: DensitySchema
    spacing: SpacingSchema
    
    # Rich contextual analysis - captures the designer's structural thinking
    spatial_philosophy: str = Field(
        ...,
        description="Multi-sentence description of how this designer thinks about space, breathing room, and layout rhythm"
    )
    
    whitespace_ratios: Optional[str] = Field(
        default=None,
        description="Relationships between padding, margins, and content sizing. How spacing scales with hierarchy."
    )
    
    hierarchy_logic: str = Field(
        ...,
        description="Rich description of WHY this hierarchy system works and how it guides attention"
    )
    
    rhythm_description: str = Field(
        ...,
        description="How density variations, spacing, and nesting create visual rhythm and guide the eye through the design"
    )
    
    # Metadata
    extracted_at: Optional[str] = None
    extraction_time_ms: Optional[int] = None


# ============================================================================
# PASS 2: SURFACE TREATMENT
# ============================================================================

class ColorEntry(BaseModel):
    """Single color in the palette"""
    hex: str = Field(..., description="Hex color value")
    role: str = Field(..., description="Semantic role: background, surface, primary_accent, etc.")
    frequency: int = Field(..., description="Number of times this color appears")
    contexts: List[str] = Field(default_factory=list, description="Where this color is used: text, fill, border, shadow")
    source: Literal["figma", "vision", "kmeans"] = Field(..., description="Extraction source")


class ColorSystem(BaseModel):
    """Complete color system analysis"""
    exact_palette: List[ColorEntry] = Field(..., description="All colors found in the design")
    temperature: str = Field(..., description="Rich description of color temperature distribution")
    saturation_profile: str = Field(..., description="Rich description of saturation characteristics")
    relationships: str = Field(..., description="Multi-sentence narrative describing how colors interact")
    interaction_states: Optional[Dict[str, str]] = Field(
        default=None,
        description="Interaction state variants: primary-hover, primary-active, etc."
    )
    transformation_rules: Optional[str] = Field(
        default=None,
        description="How colors transform for interaction states"
    )


class DepthPlane(BaseModel):
    """Single depth plane in the visual hierarchy"""
    level: int = Field(..., description="Depth level (0 = background, higher = more elevated)")
    treatment: str = Field(..., description="Treatment name: solid_background, frosted_surface, elevated_card, etc.")
    css: str = Field(..., description="Complete CSS implementation for this plane")


class MaterialSystem(BaseModel):
    """Material and depth system"""
    primary_language: str = Field(..., description="Rich description of material language used")
    depth_planes: List[DepthPlane] = Field(..., description="Ordered depth planes from back to front")


class Effect(BaseModel):
    """Visual effect with complete CSS"""
    type: str = Field(..., description="Effect type: shadow, blur, gradient, border, overlay, etc.")
    css: str = Field(..., description="Complete CSS implementation")
    usage: str = Field(..., description="Where this effect is used")
    source: Literal["figma", "vision"] = Field(..., description="Extraction source")
    params: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Structured parameters (for gradients: stops, angle; for shadows: x, y, blur, spread, color)"
    )


class Pass2SurfaceDTR(BaseModel):
    """
    Pass 2: Surface Treatment
    
    Extracts colors, materials, depth, atmosphere, and effects.
    Captures the visual treatment layer that gives design its emotional quality.
    """
    authority: Literal["code", "vision", "hybrid"] = Field(
        ...,
        description="Source of extraction: code (Figma JSON), vision (image), or hybrid (both)"
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    
    colors: ColorSystem
    materials: MaterialSystem
    effects_vocabulary: List[Effect] = Field(..., description="All visual effects found")
    atmosphere: str = Field(..., description="Multi-sentence description of overall visual feeling")
    
    # Metadata
    extracted_at: Optional[str] = None
    extraction_time_ms: Optional[int] = None


# ============================================================================
# PASS 3: TYPOGRAPHY SYSTEM (TODO)
# ============================================================================

class Pass3TypographyDTR(BaseModel):
    """Pass 3: Typography System - TODO"""
    pass


# ============================================================================
# PASS 4: COMPONENT VOCABULARY (TODO)
# ============================================================================

class Pass4ComponentsDTR(BaseModel):
    """Pass 4: Component Vocabulary - TODO"""
    pass


# ============================================================================
# PASS 4B: IMAGE USAGE (TODO)
# ============================================================================

class Pass4bImagesDTR(BaseModel):
    """Pass 4b: Image Usage Patterns - TODO"""
    pass


# ============================================================================
# PASS 5: PERSONALITY (TODO)
# ============================================================================

class Pass5PersonalityDTR(BaseModel):
    """Pass 5: Personality and Philosophy - TODO"""
    pass


# ============================================================================
# COMPLETE DTR (TODO)
# ============================================================================

class CompleteDTR(BaseModel):
    """
    Complete DTR from all passes
    
    This will be populated after all passes are implemented.
    """
    resource_id: str
    taste_id: str
    
    # Pass outputs
    pass_1_structure: Optional[Pass1StructureDTR] = None
    pass_2_surface: Optional[Pass2SurfaceDTR] = None
    pass_3_typography: Optional[Pass3TypographyDTR] = None
    pass_4_components: Optional[Pass4ComponentsDTR] = None
    pass_4b_images: Optional[Pass4bImagesDTR] = None
    pass_5_personality: Optional[Pass5PersonalityDTR] = None
    
    # Metadata
    extraction_tier: Literal["base", "corrected", "approved"] = "base"
    completed_at: Optional[str] = None