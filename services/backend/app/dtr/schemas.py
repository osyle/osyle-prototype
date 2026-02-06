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
    
    # Metadata
    extracted_at: Optional[str] = None
    extraction_time_ms: Optional[int] = None


# ============================================================================
# PASS 2: SURFACE TREATMENT (TODO)
# ============================================================================

class Pass2SurfaceDTR(BaseModel):
    """Pass 2: Surface Treatment - TODO"""
    pass


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
