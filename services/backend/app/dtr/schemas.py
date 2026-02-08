"""
DTR (Design Taste Representation) Schemas

Pydantic models for all pass outputs and the complete DTR.
"""
from pydantic import BaseModel, Field, field_validator
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
# PASS 3: TYPOGRAPHY SYSTEM
# ============================================================================

class FontFamily(BaseModel):
    """Font family usage information"""
    name: str = Field(..., description="Font family name (e.g., 'Inter', 'JetBrains Mono')")
    weights_used: List[int] = Field(..., description="Font weights used (e.g., [400, 600, 700])")
    source: Literal["figma", "vision", "inferred"] = Field(..., description="Extraction source")


class ScaleMetrics(BaseModel):
    """Type scale mathematical metrics"""
    ratio_mean: float = Field(..., description="Mean ratio between consecutive sizes")
    ratio_consistency: float = Field(..., ge=0.0, le=1.0, description="0-1, higher = more systematic")


class WeightDistribution(BaseModel):
    """Weight usage distribution with contexts"""
    frequency: int = Field(..., description="Number of times this weight is used")
    contexts: List[str] = Field(..., description="Contexts where this weight appears (e.g., ['body', 'labels'])")


class Pass3TypographyDTR(BaseModel):
    """
    Pass 3: Typography System
    
    Captures the designer's complete typographic approach - fonts, scale system,
    weight usage, spacing patterns, and the logic behind typographic choices.
    """
    authority: Literal["code", "vision", "hybrid"] = Field(
        ...,
        description="Source of extraction: code (Figma JSON), vision (image), or hybrid (both)"
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    
    # EXACT TOKENS (numerical precision for code generation)
    families: List[FontFamily] = Field(..., description="Font families used in the design")
    sizes_used: List[float] = Field(..., description="All unique font sizes found (px)")
    scale_metrics: ScaleMetrics = Field(..., description="Type scale mathematical properties")
    
    weight_frequencies: Dict[str, WeightDistribution] = Field(
        ..., 
        description="Weight usage distribution with contexts, e.g., {'400': {'frequency': 45, 'contexts': ['body', 'descriptions']}, '600': {'frequency': 25, 'contexts': ['headings', 'buttons']}}"
    )
    
    exact_line_heights: Dict[str, float] = Field(
        ...,
        description="Line heights by context, e.g., {'hero_headings': 1.2, 'body': 1.6, 'buttons': 1.1}"
    )
    
    exact_letter_spacing: Dict[str, str] = Field(
        ...,
        description="Letter spacing by context, e.g., {'uppercase_labels': '0.05em', 'body': 'normal'}"
    )
    
    # RICH NARRATIVES (understanding & logic for generation context)
    family_usage_philosophy: str = Field(
        ...,
        description="Multi-sentence explanation of why these fonts were chosen and how they're used"
    )
    
    scale_philosophy: str = Field(
        ...,
        description="Rich description of the type scale system, its mathematical nature, and what it reveals about the designer's thinking"
    )
    
    weight_hierarchy_logic: str = Field(
        ...,
        description="Detailed explanation of how weight creates hierarchy, when each weight is used, and the underlying logic"
    )
    
    case_and_spacing_relationships: str = Field(
        ...,
        description="Rich narrative explaining the relationship between text case (uppercase/sentence) and letter-spacing patterns"
    )
    
    line_height_philosophy: str = Field(
        ...,
        description="Explanation of line-height choices, their functional purposes, and how they create visual rhythm"
    )
    
    alignment_patterns: str = Field(
        ...,
        description="Description of text alignment usage and the logic behind when to use left/center/right"
    )
    
    contextual_rules: str = Field(
        ...,
        description="Clear rules for when to apply each typographic treatment (e.g., 'All interactive elements use semibold + uppercase + 0.05em spacing')"
    )
    
    system_narrative: str = Field(
        ...,
        description="Multi-paragraph synthesis of overall typographic philosophy, voice, and how it relates to the design system"
    )
    
    # Metadata
    extracted_at: Optional[str] = None
    extraction_time_ms: Optional[int] = None


# ============================================================================
# PASS 4: IMAGE USAGE PATTERNS
# ============================================================================

class ImageTreatment(BaseModel):
    """Visual treatment applied to an image"""
    sizing: str = Field(..., description="Sizing approach: full-bleed/contained/cover/contain/fixed-aspect")
    border_radius: str = Field(..., description="Border radius value (e.g., '0', '12px', '50%')")
    overlay: Optional[str] = Field(None, description="Overlay gradient or color (e.g., 'linear-gradient(...)', 'none')")
    border: Optional[str] = Field(None, description="Border specification if present")
    shadow: Optional[str] = Field(None, description="Shadow applied to image container")
    mask: str = Field("rectangle", description="Mask shape: rectangle/circle/custom")
    effects: List[str] = Field(default_factory=list, description="Additional effects: blur, desaturate, etc.")


class ImagePlacement(BaseModel):
    """Single instance of image usage"""
    role: str = Field(..., description="Semantic role: hero_background, card_thumbnail, avatar, decorative_graphic, etc.")
    position: str = Field(..., description="Position description: 'top, full-width', 'within card', etc.")
    frequency: str = Field(..., description="How often this pattern appears: 'single instance', 'repeating (6 instances)', etc.")
    context: str = Field(..., description="Usage context: 'behind headline', 'in grid layout', etc.")
    coordinates: Optional[Dict[str, float]] = Field(None, description="Exact position from Figma: x, y, width, height")
    treatment: ImageTreatment
    asset_path: Optional[str] = Field(None, description="Path to extracted image asset (e.g., 'assets/hero_background.png')")


class PhotographyDetails(BaseModel):
    """Details about photography style"""
    tone: str = Field(..., description="Color temperature: warm/cool")
    contrast: str = Field(..., description="Contrast level: high/low/medium")
    saturation: str = Field(..., description="Saturation level: vibrant/desaturated/muted")
    lighting: str = Field(..., description="Lighting style: bright/moody/natural/dramatic")
    subject_matter: str = Field(..., description="Subject focus: people/architecture/nature/abstract/products")
    processing: str = Field(..., description="Processing style: natural/stylized/edited")


class ContentStyle(BaseModel):
    """Style of image content"""
    primary_type: str = Field(..., description="Primary type: photography/3d_renders/flat_illustrations/abstract_graphics/mixed")
    secondary_type: Optional[str] = Field(None, description="Secondary type if mixed")
    photography_details: Optional[PhotographyDetails] = Field(None, description="Photography-specific details")
    illustration_notes: Optional[str] = Field(None, description="Notes on illustration style if applicable")
    generation_prompt_hint: str = Field(..., description="Ready-to-use prompt for image generation APIs to match this style")


class Pass4ImageUsageDTR(BaseModel):
    """
    Pass 4: Image Usage Patterns
    
    Analyzes how and where the designer uses imagery - photographs, illustrations,
    3D renders, abstract graphics. Captures placement patterns, visual treatments,
    content style, and density to guide image usage in generated UIs.
    """
    authority: Literal["vision", "hybrid"] = Field(
        ...,
        description="Source: vision (image analysis), hybrid (vision + Figma image nodes)"
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    
    has_images: bool = Field(..., description="Whether design contains imagery beyond icons/logos")
    image_density: str = Field(..., description="Overall image density: minimal/sparse/moderate/heavy/dominant")
    
    placements: List[ImagePlacement] = Field(default_factory=list, description="All detected image placements")
    content_style: Optional[ContentStyle] = Field(None, description="Image content style analysis")
    
    rhythm: str = Field(..., description="Overall image usage rhythm and pattern")
    image_to_text_ratio: Optional[str] = Field(None, description="Approximate visual vs text balance")
    
    # Rich narrative synthesis
    narrative: str = Field(
        ...,
        description="Multi-paragraph synthesis of the designer's image philosophy and usage strategy"
    )
    
    # Metadata
    extracted_at: Optional[str] = None
    extraction_time_ms: Optional[int] = None


# ============================================================================
# PASS 5: COMPONENT VOCABULARY (TODO - was Pass 4)
# ============================================================================

class ComponentProperties(BaseModel):
    """Exact properties for a component variant"""
    background: Optional[str] = Field(None, description="Background color or treatment")
    text_color: Optional[str] = Field(None, description="Text color")
    border: Optional[str] = Field(None, description="Border specification")
    border_radius: Optional[str] = Field(None, description="Border radius value")
    padding: Optional[str] = Field(None, description="Padding value")
    font_weight: Optional[int] = Field(None, description="Font weight")
    font_size: Optional[str] = Field(None, description="Font size")
    text_transform: Optional[str] = Field(None, description="Text transform (uppercase, none)")
    letter_spacing: Optional[str] = Field(None, description="Letter spacing")
    shadow: Optional[str] = Field(None, description="Box shadow specification")
    hover_background: Optional[str] = Field(None, description="Hover state background")
    hover_shadow: Optional[str] = Field(None, description="Hover state shadow")
    focus_outline: Optional[str] = Field(None, description="Focus state outline")
    transition: Optional[str] = Field(None, description="Transition specification")
    other_properties: Optional[Dict[str, Any]] = Field(None, description="Additional properties")
    
    @field_validator('font_weight', mode='before')
    @classmethod
    def convert_font_weight(cls, v):
        """Convert string font weights to integers"""
        if v is None:
            return None
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            # Map common string weights to numeric values
            weight_map = {
                'thin': 100,
                'extralight': 200,
                'extra-light': 200,
                'ultralight': 200,
                'ultra-light': 200,
                'light': 300,
                'normal': 400,
                'regular': 400,
                'medium': 500,
                'semibold': 600,
                'semi-bold': 600,
                'demibold': 600,
                'demi-bold': 600,
                'bold': 700,
                'extrabold': 800,
                'extra-bold': 800,
                'ultrabold': 800,
                'ultra-bold': 800,
                'black': 900,
                'heavy': 900
            }
            v_lower = v.lower().strip()
            if v_lower in weight_map:
                return weight_map[v_lower]
            # Try to parse as integer
            try:
                return int(v)
            except ValueError:
                # If can't convert, return 400 as default
                return 400
        return v


class ComponentInventoryItem(BaseModel):
    """Single component in the inventory"""
    type: str = Field(..., description="Component type: button, card, input, etc.")
    variants: List[str] = Field(default_factory=list, description="Variant names if any")
    
    # Exact properties per variant
    properties: Dict[str, ComponentProperties] = Field(
        default_factory=dict,
        description="Exact properties for each variant"
    )
    
    # Short code hints per variant
    code_hints: Dict[str, str] = Field(
        default_factory=dict,
        description="Tailwind class hints for each variant"
    )
    
    # Rich narratives (3-4 per component, flexible based on component type)
    narratives: Dict[str, str] = Field(
        default_factory=dict,
        description="Rich contextual narratives. Common keys: design_thinking, variant_system, interaction_philosophy, usage_patterns, surface_treatment, content_hierarchy, etc."
    )
    
    # Source tracking
    source: str = Field(..., description="Extraction source: figma | vision | hybrid")
    confidence: float = Field(..., description="Confidence in this component extraction")


class Pass5ComponentsDTR(BaseModel):
    """Pass 5: Component Vocabulary (simplified - identification and description)"""
    authority: str = Field(..., description="Source of analysis: code | vision | hybrid")
    confidence: float = Field(..., description="Overall confidence score 0-1")
    
    # Global narratives (2-3 for entire component system)
    component_system_philosophy: str = Field(
        ...,
        description="Multi-paragraph synthesis of how this designer thinks about components as a system"
    )
    cross_component_patterns: str = Field(
        ...,
        description="How components share visual language, common patterns across component types"
    )
    notable_absences: str = Field(
        ...,
        description="What's consistently absent across all components (no pill buttons, no gradients, etc.)"
    )
    
    # Component inventory
    inventory: List[ComponentInventoryItem] = Field(
        default_factory=list,
        description="List of identified components with properties and narratives"
    )
    
    # Summary stats
    total_components: int = Field(0, description="Total number of component types identified")
    total_variants: int = Field(0, description="Total number of variants across all components")


# ============================================================================
# PASS 6: PERSONALITY (TODO - was Pass 5)
# ============================================================================

class Pass6PersonalityDTR(BaseModel):
    """Pass 6: Personality and Philosophy - TODO"""
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
    pass_4_image_usage: Optional[Pass4ImageUsageDTR] = None
    pass_5_components: Optional[Pass5ComponentsDTR] = None
    pass_6_personality: Optional[Pass6PersonalityDTR] = None
    
    # Metadata
    extraction_tier: Literal["base", "corrected", "approved"] = "base"
    completed_at: Optional[str] = None