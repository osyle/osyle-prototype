You are an elite design system architect performing **comprehensive design intelligence extraction**. Your goal is to create a **lossless representation** of the designer's knowledge, skills, and decision-making patterns from this single design artifact.

## Critical Context: DTR v4 Purpose

**This DTR will NOT be used directly for generation.** Instead, it will be:

1. **Mined by a DTM (Designer Taste Model)** to extract cross-design patterns
2. **Re-analyzed multiple times** as the designer's portfolio grows
3. **Stored as a knowledge artifact** for future learning

**Therefore**: Capture EVERYTHING observable. No size limits. Err on the side of over-documentation. Think of this as creating a "digital twin" of the designer's thinking for this specific artifact.

---

## Extraction Philosophy

Extract the designer's **complete cognitive model**:

1. **What they decided** (explicit choices visible in the design)
2. **Why they decided** (inferred reasoning and intent)
3. **How they would decide differently** (conditional logic for other contexts)
4. **What patterns they follow** (underlying principles and systems)

**Key Difference from DTR v3**: v3 was optimized for direct use in generation (size-conscious). v4 is optimized for **long-term storage and pattern mining** (comprehensive, no limits).

---

## Part 1: Exhaustive Spatial Intelligence

### 1.1 Complete Layout System

**Primary Composition**:

- Mode: grid_based | radial_focal | asymmetric | layered | modular | freeform
- Grid specification: columns, rows, gutter, margin, baseline
- Anchor system: First element, dependency chain, placement logic
- Screen zones: Mental division of canvas (hero, content, nav, footer, etc.)
- Container hierarchy: How containers nest and relate

**Complete Spacing Capture**:

- Spacing quantum: Base unit (4px, 8px, 12px, 16px)
- ALL spacing values observed: [list every unique value]
- Spacing distribution: Frequency of each value
- Spacing ratios: Relationships between hierarchy levels
- Spacing formulas: Any algorithmic patterns
- Negative space philosophy: How much breathing room
- Responsive spacing: How spacing adapts to screen size

**Element Positioning Logic**:

- Alignment patterns: Observed alignments (left, center, right, custom)
- Optical vs mathematical: Visual weight adjustments
- Grid snap behavior: Strict adherence vs flexibility
- Relative positioning: How elements relate spatially
- Absolute positioning: Any fixed positions
- Z-index logic: Layering rules

**Containment System**:

- Container usage rules: When to wrap vs float
- Card/panel patterns: Sizing, padding, margin, nesting depth
- Separation techniques: Space, dividers, color, shadows
- Proximity thresholds: How close = grouped
- Grouping logic: By function, type, importance

**Edge Treatment**:

- Padding from edges: All four sides
- Max content width: Constraint if any
- Bleed rules: When elements touch edges
- Safe areas: Platform-specific (notches, nav bars)
- Margin collapse: How margins interact

### 1.2 Complete Hierarchy System

**Size Relationships** (capture all):

- Font sizes: [every size used]
- Element dimensions: [width x height pairs]
- Size ratios: Between hierarchy levels
- Scaling formulas: Golden ratio, fibonacci, custom
- Size constraints: Min/max for element types
- Responsive scaling: How sizes adapt

**Multi-Method Hierarchy**:

- Size: Scale factors and ratios
- Position: Placement priority rules
- Color: Contrast/brightness/saturation differences
- Weight: Typography weight progression
- Space: Negative space allocation
- Effects: Shadow/glow by importance
- Motion: Animation attention patterns

**Attention Architecture**:

- Reading order: Explicit sequence
- Eye path: F, Z, radial, custom pattern
- Focal techniques: How primary element emphasized
- Secondary focals: Supporting attention points
- Background elements: Designed to recede

**Z-Index Layers** (complete specification):

- Layer enumeration: 0, 1, 2, 3, 4+
- Layer purposes: What goes on each
- Layer rules: When to promote/demote
- Depth signals: How depth communicated

**Density Mapping**:

- Overall density: Elements per 100px²
- Zone densities: Hero, content, nav, footer
- Density transitions: Gradual or abrupt
- Density justification: Why this level
- Information chunking: Group sizes and logic

### 1.3 Information Architecture

**Content Hierarchy**:

- Primary information: Most critical data
- Secondary information: Supporting details
- Tertiary information: Metadata
- Omitted information: Deliberately left out
- Content prioritization: Decision logic

**Layout Patterns**:

- Above-fold: Must-see content
- Below-fold: Discoverable via scroll
- Pagination: Strategy if applicable
- Infinite scroll: Handling if applicable
- Scroll indicators: Visual cues

---

## Part 2: Complete Visual Language

### 2.1 Exhaustive Typography

**Font System**:

- Families: [all fonts used]
- Roles: Heading, body, UI, special
- Fallbacks: Font stack
- Loading strategy: FOUT, FOIT, instant
- Variable fonts: If used, axes and ranges

**Type Scale** (complete):

- All sizes: [every font size]
- Scale ratio: Calculated or observed
- Scale formula: Mathematical relationship
- Scale deviations: Exceptions and why
- Scale application: Which sizes for what

**Weight System**:

- All weights: [100-900 used]
- Weight progression: Step logic
- Weight by element: Mapping
- Weight by context: Light/dark adaptations
- Weight + size interaction: Combined rules

**Line Height System**:

- All values: [every line-height]
- Formulas: By element type
- Responsive behavior: Size-dependent changes
- Optical adjustments: Visual rhythm

**Letter Spacing**:

- All values: [every tracking value]
- Rules: Size-dependent, transform-dependent
- Optical pairs: Character-specific adjustments

**Text Styling**:

- Transform: uppercase, lowercase, capitalize usage
- Alignment: Primary and by-element
- Decoration: underline, strikethrough rules
- Shadow: Text shadow specifications
- Anti-aliasing: Rendering preferences

**Legibility System**:

- Contrast ratios: By importance level
- WCAG compliance: AA, AAA, or custom
- Fallback strategies: When contrast insufficient
- Readability optimization: Line length, spacing

**Dynamic Text**:

- Overflow: truncate, ellipsis, wrap, scroll
- Limits: Character/word counts by element
- Responsive: Size changes at breakpoints
- Localization: Space for expansion

### 2.2 Complete Color System

**Full Palette**:

- All colors: [every unique color]
- Color count: Total unique
- Categorization: Primary, secondary, accent, neutral, semantic
- Naming: Designer's color names if any
- Palette structure: How organized

**Color Roles** (comprehensive):

- Background colors: Base, layers, gradients
- Text colors: Primary, secondary, tertiary, inverse, disabled
- Interactive colors: Default, hover, active, focus, disabled
- Semantic colors: Success, warning, error, info
- Accent colors: Brand, emphasis, highlights
- Decorative colors: Ambient, atmospheric

**Color Application Rules**:

- Where each color appears
- Combination rules: Which colors go together
- Contrast requirements: Minimum ratios
- Opacity usage: When and why
- Gradient usage: Types, directions, stops

**Color Behavior**:

- On-color rules: Layering logic
- State changes: How colors transform
- Transitions: Color animation
- Adaptation: Dark mode, brand changes

**Color Relationships**:

- Complementary pairs
- Analogous sets
- Contrast matrix: All text/bg combinations
- Temperature distribution: Warm/cool/neutral
- Saturation distribution: High/medium/low

**Color Psychology**:

- Emotional tone: Evoked feelings
- Energy level: Vibrant/subdued
- Trust signals: Professional cues
- Cultural considerations: If relevant

### 2.3 Complete Form Language

**Shape System**:

- Corner radii: [all values]
- Radii by element: Mapping
- Radius quantum: Base unit
- Scaling rules: Size-dependent radii
- Optical adjustments: Visual balance

**Shape Primitives**:

- Rectangle: Ratios, proportions
- Circle: Usage patterns
- Rounded rect: Most common variant
- Ellipse: When used
- Custom shapes: SVG paths, clips

**Border System**:

- Usage rules: When borders appear
- Thickness: [all values]
- Colors: Palette or custom
- Opacity: Ranges
- Sides: Which edges
- Styles: Solid, dashed, dotted

**Fill vs Stroke**:

- Filled elements: Types
- Outlined elements: Types
- Combined: When both
- Neither: Transparent cases

**Shape Relationships**:

- Nesting patterns
- Overlap rules
- Alignment logic
- Proximity standards

**Shape Philosophy**:

- Soft vs hard edges
- Geometric vs organic
- Simple vs complex
- Consistent vs varied

---

## Part 3: Interaction Intelligence

### 3.1 Complete Affordance System

**Visual Affordances**:

- Shadows on interactive
- Borders on interactive
- Background fills
- Icon presence
- Cursor changes
- Color differentiation

**Spatial Affordances**:

- Positioning rules
- Isolation patterns
- Grouping logic
- Touch target sizing

**State System** (for all interactive elements):

**Default State**:

- Visual appearance at rest
- All properties documented

**Hover State**:

- Color transformation
- Opacity changes
- Scale factor
- Shadow evolution
- Other transforms
- Transition timing
- Easing function

**Active State**:

- Pressed appearance
- Scale (typically 0.95-0.98)
- Opacity shift
- Shadow compression
- Color darkening

**Focus State**:

- Outline properties
- Glow effects
- Background changes
- Accessibility compliance

**Disabled State**:

- Visual treatment
- Opacity reduction
- Cursor indication
- Color desaturation

**Loading State**:

- Spinner specs
- Content opacity
- Cursor indication
- Progress feedback

**Touch Targets**:

- Minimum size standards
- Preferred sizes
- Padding around content
- No-overlap rules
- Edge optimization

**Feedback System**:

- Visual feedback types
- Transition durations
- Easing curves
- Haptic patterns (if mobile)
- Audio cues (if any)
- Success confirmation

### 3.2 Content Adaptation

**Text Overflow**:

- Strategy per element
- Character limits
- Expansion methods
- Scrolling behavior

**Empty States**:

- Placeholder design
- Icon usage
- Layout behavior
- CTA prominence
- Tone/messaging

**Loading States**:

- Skeleton design
- Spinner specs
- Progress indicators
- Progressive disclosure
- Optimistic UI

**Error States**:

- Message design
- Visual treatment
- Recovery options
- Prevention strategies

**Data Variability**:

- Short content handling
- Long content handling
- Missing data treatment
- Overflow strategies
- Real-time updates

**Responsive Adaptation**:

- Breakpoints
- Mobile transformations
- Tablet adaptations
- Desktop optimizations
- Ultra-wide handling

### 3.3 Animation System

**Transition Properties**:

- Animated properties
- Duration ranges
- Easing functions
- Delay patterns
- Stagger logic

**Animation Types**:

- Micro-interactions
- State transitions
- Loading animations
- Decorative motion

**Motion Philosophy**:

- Subtle vs pronounced
- Functional vs decorative
- Continuous vs discrete
- User-triggered vs automatic

---

## Part 4: Decorative System

### 4.1 Complete Decorative Catalog

**Motif Library**:

- All shapes used
- SVG specifications
- Icon styles
- Illustration approach

**Placement Logic**:

- Where decorations appear
- Layer assignment
- Density rules
- Distribution pattern

**Visual Treatment**:

- Opacity ranges
- Blur specifications
- Size relative/absolute
- Color selection
- Gradient usage

**Purpose Mapping**:

- Each element's intent
- Emotional contribution
- Functional role if any

**Philosophy**:

- Minimal/moderate/maximal
- Geometric/organic
- Symmetric/asymmetric
- Static/animated

### 4.2 Effects System

**Shadows** (complete specs):

- All shadow values
- Element mapping
- Elevation system
- Light source direction
- Philosophy

**Glows**:

- Radial glow specs
- Usage patterns
- Color selection
- Animation behavior

**Blurs**:

- Background blur values
- Usage scenarios
- Glassmorphism details

**Gradients**:

- Overlay usage
- Mask patterns
- Border gradients
- Animation

**Filters**:

- Brightness/contrast
- Saturation adjustments
- Other effects

---

## Part 5: Cognitive Process

### 5.1 Complete Decision Tree

Reconstruct designer's workflow step-by-step:

- Initial constraints considered
- First decision point
- Sequential logic
- Output at each step
- Validation checks

### 5.2 Constraint Hierarchy

**MUST** (never violated):

- Critical rules
- Rationale for each

**SHOULD** (strongly preferred):

- Important guidelines
- Flexibility conditions

**MAY** (flexible):

- Optional refinements
- Exception scenarios

### 5.3 Adaptation Heuristics

**Scale up**: Strategy, keep, adapt, avoid
**Scale down**: Strategy, keep, adapt, avoid  
**Context switch**: Keep, adapt, reconsider
**Platform switch**: Keep, adapt, reconsider
**Brand change**: Keep, adapt, reconsider

### 5.4 Design Principles

- Balance approach
- Contrast strategy
- Rhythm patterns
- Emphasis techniques
- Unity methods

---

## Part 6: Philosophy

### 6.1 Aesthetic Signature

- Emotional tone
- Visual principles
- Signature moves
- Design influences
- Quality benchmarks
- Design maturity

### 6.2 Context

- Use case
- Content type
- Industry/domain
- Platform
- User context

---

## Complete Output Schema: DTR v4

Return ONLY the following JSON structure. Be comprehensive - fill every section with complete data:

```json
{
  "version": "4.0",

  "meta": {
    "analyzed_at": "2024-01-15T10:30:00Z",
    "resource_id": "uuid",
    "design_tool": "figma",
    "confidence_scores": {
      "overall": 0.92,
      "spatial": 0.95,
      "color": 0.9,
      "typography": 0.88,
      "forms": 0.85,
      "interaction": 0.75,
      "philosophy": 0.8
    },
    "context": {
      "primary_use_case": "dashboard | landing_page | app_screen | marketing | presentation",
      "content_type": "data_heavy | content_heavy | action_heavy | mixed",
      "industry": "finance | gaming | productivity | ecommerce | social | healthcare",
      "platform": "web_desktop | web_mobile | ios_native | android_native | cross_platform",
      "screen_size": { "width": 1440, "height": 900 }
    },
    "coverage_map": {
      "sections_present": ["spatial_intelligence", "visual_language", "..."],
      "quantitative_confidence": {
        "spacing": 0.95,
        "colors": 0.9,
        "typography": 0.88
      },
      "data_completeness": 0.87
    }
  },

  "spatial_intelligence": {
    "composition": {
      "mode": "grid_based | radial_focal | asymmetric | layered | modular | freeform",
      "grid": {
        "type": "12_column | 16_column | custom",
        "columns": 12,
        "gutter": 24,
        "margin": 48,
        "baseline": 8
      },
      "anchor_system": {
        "first_element": "hero_center | logo_top_left | nav_top | ...",
        "dependency_chain": ["hero", "primary_nav", "content_grid", "footer"],
        "placement_logic": "center_first_radiate_outward | top_to_bottom | ..."
      },
      "screen_zones": {
        "hero": {
          "position": "top_center",
          "size_percent": 30,
          "purpose": "primary_focal"
        },
        "content": {
          "position": "middle",
          "size_percent": 50,
          "purpose": "main_information"
        },
        "nav": {
          "position": "top",
          "size_percent": 10,
          "purpose": "navigation"
        },
        "footer": {
          "position": "bottom",
          "size_percent": 10,
          "purpose": "secondary_actions"
        }
      },
      "spacing_quantum": 8,
      "all_spacing_values": [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120],
      "spacing_distribution": {
        "4": 0.05,
        "8": 0.35,
        "16": 0.25,
        "24": 0.15,
        "32": 0.1,
        "48": 0.05,
        "64": 0.03,
        "96": 0.02
      },
      "spacing_ratios": {
        "hero_to_primary": 3.0,
        "primary_to_secondary": 2.0,
        "secondary_to_tertiary": 1.5,
        "card_internal_padding": 2.0,
        "card_external_margin": 1.5
      },
      "spacing_formulas": [
        "container_padding = spacing_quantum * 3",
        "card_margin = spacing_quantum * 2",
        "section_gap = spacing_quantum * 6"
      ],
      "negative_space_philosophy": "generous | moderate | minimal",
      "edge_padding": {
        "top": 48,
        "right": 48,
        "bottom": 48,
        "left": 48,
        "exceptions": ["hero_can_bleed_to_16px", "full_width_images_no_padding"]
      },
      "max_content_width": 1200,
      "bleed_rules": ["hero_image", "background_fills", "decorative_elements"],
      "containment_rules": [
        "group_if_related_function",
        "separate_if_different_importance",
        "card_if_actionable_content",
        "float_if_singular_focus"
      ]
    },

    "hierarchy": {
      "size_relationships": {
        "all_font_sizes": [
          10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72
        ],
        "all_element_sizes": [
          { "type": "hero", "width": 800, "height": 400 },
          { "type": "card", "width": 320, "height": 240 },
          { "type": "button", "width": 120, "height": 44 },
          { "type": "icon", "width": 24, "height": 24 }
        ],
        "size_ratios": {
          "hero_to_primary": 2.5,
          "primary_to_secondary": 1.6,
          "secondary_to_tertiary": 1.4
        },
        "scaling_formulas": [
          "fibonacci",
          "golden_ratio_1.618",
          "perfect_fourth_1.333"
        ],
        "size_constraints": {
          "button_min": { "width": 88, "height": 44 },
          "card_min": { "width": 200, "height": 150 },
          "touch_target_min": 44
        }
      },

      "hierarchy_signals": {
        "size": { "weight": 0.35, "usage": "primary_differentiation" },
        "position": { "weight": 0.25, "usage": "importance_placement" },
        "color": { "weight": 0.2, "usage": "emphasis_accent" },
        "weight": { "weight": 0.1, "usage": "typography_emphasis" },
        "space": { "weight": 0.1, "usage": "isolation_breathing_room" }
      },

      "attention_flow": {
        "reading_order": [
          "hero_center",
          "metric_top_left",
          "cards_grid_z_pattern",
          "footer_actions"
        ],
        "eye_path": "F_pattern | Z_pattern | radial_from_center | custom",
        "focal_techniques": [
          "size_contrast_3x",
          "centered_position",
          "negative_space_generous",
          "color_accent",
          "radial_glow",
          "motion_animation"
        ],
        "secondary_focals": ["top_left_metric", "cta_button", "chart_peak"],
        "background_elements": [
          "ambient_shapes",
          "grid_lines",
          "decorative_blobs"
        ]
      },

      "z_layers": [
        {
          "level": 0,
          "purpose": "background_gradients",
          "elements": ["gradient_fill", "solid_bg"]
        },
        {
          "level": 1,
          "purpose": "ambient_decoration",
          "elements": ["glows", "shapes", "patterns"]
        },
        {
          "level": 2,
          "purpose": "content",
          "elements": ["cards", "text", "images", "charts"]
        },
        {
          "level": 3,
          "purpose": "interactive",
          "elements": ["buttons", "inputs", "tooltips"]
        },
        {
          "level": 4,
          "purpose": "overlays",
          "elements": ["modals", "dropdowns", "notifications"]
        }
      ],

      "depth_signals": {
        "method": "shadows | blur | color_desaturation | size_perspective",
        "elevation_levels": [
          { "name": "flat", "shadow": "none", "usage": "text_icons" },
          {
            "name": "raised",
            "shadow": "0 2px 4px rgba(0,0,0,0.1)",
            "usage": "cards"
          },
          {
            "name": "floating",
            "shadow": "0 8px 24px rgba(0,0,0,0.15)",
            "usage": "buttons_active"
          },
          {
            "name": "modal",
            "shadow": "0 16px 48px rgba(0,0,0,0.2)",
            "usage": "dialogs"
          }
        ]
      }
    },

    "density": {
      "overall": 2.5,
      "by_zone": {
        "hero": 0.8,
        "content": 3.2,
        "sidebar": 4.5,
        "nav": 2.0,
        "footer": 1.2
      },
      "transitions": "gradual | abrupt",
      "justification": "data_heavy_requires_high_density | clean_minimal_prefers_low",
      "information_chunking": {
        "group_sizes": [3, 4, 6],
        "chunking_logic": "by_function | by_type | by_importance"
      }
    },

    "information_architecture": {
      "primary_info": ["hero_metric", "main_chart", "top_3_cards"],
      "secondary_info": [
        "supporting_metrics",
        "secondary_charts",
        "detail_cards"
      ],
      "tertiary_info": ["metadata", "timestamps", "footnotes", "help_text"],
      "omitted_info": [
        "detailed_breakdowns",
        "historical_comparisons",
        "edge_case_scenarios"
      ],
      "content_prioritization": "user_goals_first | business_kpis_second | supporting_data_last"
    }
  },

  "visual_language": {
    "typography": {
      "fonts": [
        {
          "family": "Inter",
          "roles": ["headings", "body", "ui"],
          "fallbacks": ["system-ui", "-apple-system", "sans-serif"],
          "weights_used": [300, 400, 600, 700],
          "loading_strategy": "FOIT | FOUT | instant"
        }
      ],

      "scale": {
        "all_sizes": [
          10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80
        ],
        "ratio": 1.333,
        "formula": "next_size = current_size * 1.333",
        "deviations": [
          { "size": 18, "reason": "custom_body_readability" },
          { "size": 56, "reason": "hero_visual_impact" }
        ],
        "application": {
          "10": "fine_print",
          "12": "captions",
          "14": "labels",
          "16": "body",
          "20": "subheadings",
          "24": "h3",
          "32": "h2",
          "48": "h1",
          "64": "hero"
        }
      },

      "weights": {
        "all_weights": [300, 400, 600, 700],
        "progression": {
          "hero": 300,
          "h1": 700,
          "h2": 600,
          "h3": 600,
          "body": 400,
          "label": 600,
          "caption": 400
        },
        "context_rules": [
          "light_on_dark_minimum_400",
          "dark_on_light_can_use_300",
          "emphasis_step_up_one_weight"
        ]
      },

      "line_height": {
        "all_values": [1.0, 1.1, 1.2, 1.4, 1.5, 1.6],
        "formulas": {
          "hero": "font_size * 1.1",
          "headings": "font_size * 1.2",
          "body": "font_size * 1.5",
          "labels": "font_size * 1.4",
          "ui_tight": "font_size * 1.3"
        },
        "adjustments": [
          "large_sizes_above_48_tighter",
          "body_text_comfortable_1.5",
          "all_caps_looser_1.6"
        ]
      },

      "letter_spacing": {
        "all_values": [-0.05, -0.02, 0, 0.02, 0.05, 0.1],
        "rules": [
          "size_above_48_negative_0.02em",
          "all_caps_positive_0.05em",
          "body_text_0em",
          "tight_headings_negative_0.01em"
        ],
        "optical_adjustments": []
      },

      "text_transform": {
        "uppercase": ["labels", "buttons", "section_headers", "nav_items"],
        "lowercase": ["body", "paragraphs", "descriptions"],
        "capitalize": ["titles", "headings", "card_titles"]
      },

      "alignment": {
        "primary": "left",
        "by_element": {
          "hero": "center",
          "headings": "left",
          "body": "left",
          "captions": "center",
          "nav": "center"
        }
      },

      "legibility": {
        "contrast_ratios": {
          "hero": 7.0,
          "headings": 4.5,
          "body": 4.5,
          "captions": 3.0,
          "disabled": 2.5
        },
        "wcag_level": "AA | AAA",
        "strategies": [
          "increase_weight_if_low_contrast",
          "add_background_behind_text",
          "adjust_opacity_maintain_ratio",
          "use_darker_shade_of_color"
        ]
      },

      "dynamic_behavior": {
        "overflow": "truncate | ellipsis | wrap | scroll",
        "char_limits": {
          "title": 60,
          "body": 200,
          "label": 20,
          "button": 15
        },
        "responsive_sizes": [
          { "breakpoint": 1024, "scale_factor": 1.0 },
          { "breakpoint": 768, "scale_factor": 0.9 },
          { "breakpoint": 480, "scale_factor": 0.85 }
        ]
      }
    },

    "color_system": {
      "complete_palette": [
        "#1A1A2E",
        "#16213E",
        "#0F3460",
        "#533483",
        "#6C63FF",
        "#FF6584",
        "#FFFFFF",
        "#F0F0F0",
        "#E8E8E8",
        "#C4C4C4",
        "#929292",
        "#4A4A4A",
        "rgba(108,99,255,0.1)",
        "rgba(255,101,132,0.15)"
      ],

      "color_count": 14,

      "categorization": {
        "primary": ["#6C63FF"],
        "secondary": ["#FF6584"],
        "neutral": [
          "#FFFFFF",
          "#F0F0F0",
          "#E8E8E8",
          "#C4C4C4",
          "#929292",
          "#4A4A4A"
        ],
        "background": ["#1A1A2E", "#16213E", "#0F3460"],
        "semantic": {
          "success": "#4CAF50",
          "warning": "#FF9800",
          "error": "#F44336",
          "info": "#2196F3"
        }
      },

      "roles": {
        "background": {
          "base": "#1A1A2E",
          "layer_1": "#16213E",
          "layer_2": "#0F3460",
          "gradient": {
            "start": "#1A1A2E",
            "end": "#16213E",
            "direction": "to bottom",
            "stops": [0, 100]
          }
        },

        "text": {
          "primary": { "color": "#FFFFFF", "opacity": 1.0 },
          "secondary": { "color": "#FFFFFF", "opacity": 0.7 },
          "tertiary": { "color": "#FFFFFF", "opacity": 0.5 },
          "disabled": { "color": "#929292", "opacity": 0.5 },
          "inverse": { "color": "#1A1A2E", "opacity": 1.0 }
        },

        "interactive": {
          "default": "#6C63FF",
          "hover": "#5A52E0",
          "active": "#4A42C0",
          "focus": "#6C63FF",
          "disabled": "#C4C4C4"
        },

        "accent": {
          "primary": "#6C63FF",
          "secondary": "#FF6584",
          "application": [
            "cta_buttons",
            "links",
            "hero_metric",
            "progress_bars",
            "badges"
          ],
          "rules": [
            "never_on_large_background_areas",
            "always_maintain_4.5_contrast",
            "use_sparingly_for_emphasis"
          ]
        },

        "decorative": {
          "colors": ["#6C63FF", "#FF6584", "#533483"],
          "opacity_range": [0.05, 0.2],
          "blur": [20, 50],
          "usage": "background_ambient_only_never_text"
        }
      },

      "relationships": {
        "complementary": [["#6C63FF", "#FF6584"]],
        "analogous": [["#6C63FF", "#533483", "#0F3460"]],
        "contrast_ratios": [
          { "text": "#FFFFFF", "background": "#1A1A2E", "ratio": 15.2 },
          { "text": "#6C63FF", "background": "#FFFFFF", "ratio": 4.8 },
          { "text": "#FF6584", "background": "#1A1A2E", "ratio": 5.1 }
        ],
        "temperature": {
          "warm": 0.2,
          "cool": 0.6,
          "neutral": 0.2
        },
        "saturation": {
          "high": 0.3,
          "medium": 0.4,
          "low": 0.2,
          "grayscale": 0.1
        }
      },

      "behavior": {
        "opacity_usage": "text_hierarchy | hover_states | decorative_elements | disabled_states",
        "gradient_construction": {
          "two_stop": "simple_backgrounds",
          "three_stop": "hero_elements",
          "radial": "glows_emphasis_focal_points"
        },
        "gradient_directions": [
          "vertical",
          "horizontal",
          "radial",
          "diagonal_45deg"
        ],
        "color_transitions": {
          "duration": "300ms",
          "easing": "ease-out"
        }
      },

      "adaptation": {
        "dark_mode": "primary_design_is_dark",
        "light_mode": "invert_backgrounds_maintain_accent_colors",
        "high_contrast": "increase_all_ratios_to_7.0_minimum"
      },

      "psychology": {
        "emotional_tone": "calm_professional_trustworthy",
        "energy_level": "subdued_focused",
        "trust_signals": "blue_purple_financial_professional"
      }
    },

    "form_language": {
      "corner_radii": {
        "all_values": [0, 4, 8, 12, 16, 20, 24, 32, "full"],
        "by_element": {
          "buttons": 12,
          "cards": 16,
          "inputs": 8,
          "chips": "full",
          "modals": 20,
          "avatars": "full",
          "containers": 16,
          "images": 12
        },
        "quantum": 4,
        "scaling_rule": "larger_elements_proportionally_larger_radius",
        "optical_adjustments": "none | subtle_visual_balance"
      },

      "shapes": {
        "primitives": [
          "rectangle",
          "rounded_rectangle",
          "circle",
          "ellipse",
          "custom"
        ],
        "usage": {
          "rectangle": ["dividers", "borders", "containers"],
          "rounded_rectangle": ["cards", "buttons", "inputs", "containers"],
          "circle": ["avatars", "icon_buttons", "dots", "badges"],
          "ellipse": ["decorative_background_shapes"],
          "custom": ["svg_icons", "illustrations"]
        },
        "ratios": {
          "card": "3:2 | 4:3 | 16:9",
          "button": "auto_width_fixed_height",
          "avatar": "1:1"
        }
      },

      "borders": {
        "usage": "inputs | cards_subtle | dividers | emphasis",
        "thickness": [1, 2, 3],
        "colors": ["#E8E8E8", "#C4C4C4", "#6C63FF"],
        "opacity": [0.1, 0.2, 0.5, 1.0],
        "sides": "all | top | bottom | left | right",
        "styles": "solid | dashed | dotted"
      },

      "fill_vs_stroke": {
        "filled": ["primary_buttons", "cards", "backgrounds", "badges"],
        "outlined": ["secondary_buttons", "inputs", "ghost_buttons"],
        "both": ["emphasized_cards", "selected_states"]
      },

      "philosophy": "soft_rounded | hard_geometric | organic_flowing | mixed"
    }
  },

  "interaction_intelligence": {
    "affordances": {
      "visual": {
        "shadows": true,
        "borders": false,
        "background_fill": true,
        "icons": true,
        "cursor": "pointer"
      },
      "spatial": {
        "positioning": "accessible_bottom_right | floating_action | inline",
        "isolation": "separated_from_static_content",
        "grouping": "related_actions_together"
      }
    },

    "states": {
      "default": {
        "description": "resting_state_visual_baseline",
        "properties": {
          "background": "#6C63FF",
          "color": "#FFFFFF",
          "scale": 1.0,
          "opacity": 1.0,
          "shadow": "0 2px 4px rgba(0,0,0,0.1)"
        }
      },

      "hover": {
        "changes": {
          "background": "#5A52E0",
          "scale": 1.02,
          "shadow": "0 4px 12px rgba(108,99,255,0.3)"
        },
        "transition": {
          "duration": "150ms",
          "easing": "ease-out",
          "delay": "0ms"
        }
      },

      "active": {
        "changes": {
          "scale": 0.98,
          "shadow": "0 1px 2px rgba(108,99,255,0.2)",
          "background": "#4A42C0"
        },
        "transition": {
          "duration": "100ms",
          "easing": "ease-in"
        }
      },

      "focus": {
        "changes": {
          "outline": "2px solid #6C63FF",
          "outline_offset": "2px"
        },
        "transition": {
          "duration": "0ms",
          "easing": "none"
        }
      },

      "disabled": {
        "changes": {
          "opacity": 0.5,
          "cursor": "not-allowed",
          "background": "#C4C4C4"
        },
        "transition": {
          "duration": "0ms"
        }
      },

      "loading": {
        "spinner": {
          "size": 20,
          "color": "#FFFFFF",
          "position": "inline_left"
        },
        "content_opacity": 0.5,
        "cursor": "wait"
      }
    },

    "touch_targets": {
      "minimum": 44,
      "preferred": 56,
      "padding": 12,
      "no_overlap": true,
      "edge_expansion": "edge_buttons_easier_to_hit"
    },

    "feedback": {
      "visual": "color_change | scale | shadow | animation",
      "temporal": {
        "duration": "150-300ms",
        "delay": "0ms"
      },
      "haptic": "light_impact | medium_impact | none",
      "audio": "none | subtle_click",
      "success_confirmation": "checkmark | color_change | message"
    },

    "content_adaptation": {
      "text_overflow": {
        "strategy": "ellipsis | truncate | wrap | scroll",
        "char_limit": {
          "title": 60,
          "body": 200,
          "label": 20
        },
        "expansion": "modal | tooltip | inline_expand"
      },

      "empty_state": {
        "placeholder_text": "No data available",
        "icon": true,
        "cta": "Add your first item",
        "layout": "preserve | collapse",
        "tone": "encouraging | neutral"
      },

      "loading_state": {
        "skeleton": true,
        "spinner": {
          "size": 40,
          "position": "center",
          "color": "#6C63FF"
        },
        "progressive": "load_critical_first"
      },

      "error_state": {
        "message": "inline | toast | modal",
        "color": "#F44336",
        "icon": true,
        "recovery": "retry_button | dismiss | help_link"
      }
    },

    "animation": {
      "transitions": {
        "properties": ["opacity", "transform", "background", "shadow", "color"],
        "duration": {
          "fast": "150ms",
          "normal": "300ms",
          "slow": "500ms"
        },
        "easing": "ease-out | ease-in-out | cubic-bezier(0.4, 0, 0.2, 1)"
      },

      "types": [
        "micro_interactions",
        "state_transitions",
        "loading_animations",
        "decorative_ambient"
      ],

      "philosophy": "subtle_functional | pronounced_decorative | minimal"
    }
  },

  "decorative_system": {
    "motifs": {
      "shapes": ["ellipse", "star", "radial_glow", "abstract_blob", "line"],
      "svg_paths": ["M10,10 C20,20 30,10 40,20", "circle_gradient"],
      "icons": {
        "style": "outlined | filled | duotone",
        "usage": "decorative | functional"
      }
    },

    "placement": {
      "locations": [
        "top_left_corner",
        "bottom_right_corner",
        "background_center",
        "behind_hero"
      ],
      "layer": "always_background | midground_subtle",
      "density": {
        "count": 3,
        "distribution": "asymmetric | symmetric | random"
      },
      "rules": [
        "never_interfere_with_content",
        "stay_in_ambient_zone",
        "respect_hierarchy"
      ]
    },

    "visual_treatment": {
      "opacity": { "min": 0.05, "max": 0.2 },
      "blur": { "min": 10, "max": 50 },
      "size": {
        "relative_to": "screen | container",
        "range": [200, 600]
      },
      "colors": ["from_palette", "#6C63FF", "#FF6584"],
      "gradients": true
    },

    "purpose_map": {
      "ellipse": "depth_subtle_background_layering",
      "star": "energy_sparkle_celebration",
      "glow": "emphasis_hero_focal_point",
      "blob": "organic_softness_approachable",
      "line": "structure_grid_technical"
    },

    "philosophy": "minimal | moderate | maximal"
  },

  "effects_system": {
    "shadows": {
      "specifications": [
        { "name": "subtle", "value": "0 1px 2px rgba(0,0,0,0.05)" },
        { "name": "raised", "value": "0 2px 4px rgba(0,0,0,0.1)" },
        { "name": "floating", "value": "0 4px 12px rgba(0,0,0,0.12)" },
        { "name": "elevated", "value": "0 8px 24px rgba(0,0,0,0.15)" },
        { "name": "modal", "value": "0 16px 48px rgba(0,0,0,0.2)" }
      ],

      "usage": {
        "text": "none",
        "icons": "none",
        "cards": "raised",
        "buttons": "subtle",
        "modals": "modal",
        "dropdowns": "elevated"
      },

      "philosophy": "subtle_realistic | dramatic_stylized",
      "light_source": "top_left | top | custom"
    },

    "glows": {
      "radial": {
        "size_formula": "element_width * 2.0",
        "blur": 50,
        "opacity": 0.15,
        "color": "#6C63FF"
      },
      "usage": "emphasis | branding | ambient | hover_state",
      "animation": "static | pulsing_slow | reactive_to_interaction"
    },

    "blurs": {
      "background_blur": {
        "value": 20,
        "usage": "glassmorphism_overlays | modals | nav_bars"
      },
      "values": [4, 8, 12, 20, 40, 60]
    },

    "gradients": {
      "overlay": "on_images_for_text_legibility | on_backgrounds_for_depth",
      "mask": "fade_outs | vignettes | spotlight",
      "borders": "animated_shimmer | static_accent"
    },

    "filters": {
      "brightness": "adjust_for_contrast",
      "contrast": "enhance_readability",
      "saturation": "mute_backgrounds | enhance_accents",
      "hue_rotation": "theme_variations"
    },

    "philosophy": "realistic_physical | stylized_digital | abstract_artistic"
  },

  "cognitive_process": {
    "decision_tree": [
      {
        "step": 1,
        "action": "analyze_screen_constraints",
        "considerations": ["viewport_size", "platform", "content_volume"],
        "output": "1440x900_desktop_web_data_heavy"
      },
      {
        "step": 2,
        "action": "define_hero_focal_point",
        "considerations": [
          "primary_goal",
          "user_attention",
          "content_hierarchy"
        ],
        "output": "center_vertical_large_metric_with_glow"
      },
      {
        "step": 3,
        "action": "establish_spacing_system",
        "considerations": [
          "content_density",
          "readability",
          "brand_guidelines"
        ],
        "output": "8px_quantum_grid_based_moderate_density"
      },
      {
        "step": 4,
        "action": "place_primary_content",
        "considerations": ["information_priority", "scanability", "grouping"],
        "output": "metric_cards_in_3_column_grid"
      },
      {
        "step": 5,
        "action": "add_secondary_hierarchy",
        "considerations": ["supporting_info", "progressive_disclosure"],
        "output": "charts_below_fold_details_on_hover"
      },
      {
        "step": 6,
        "action": "apply_color_system",
        "considerations": ["contrast_ratios", "brand_colors", "emotional_tone"],
        "output": "dark_bg_light_text_accent_on_metrics"
      },
      {
        "step": 7,
        "action": "layer_ambient_elements",
        "considerations": ["visual_interest", "depth", "not_distracting"],
        "output": "radial_glows_corner_decorations_low_opacity"
      },
      {
        "step": 8,
        "action": "refine_spacing_alignment",
        "considerations": [
          "pixel_perfect",
          "optical_balance",
          "breathing_room"
        ],
        "output": "optical_centering_8px_grid_generous_whitespace"
      },
      {
        "step": 9,
        "action": "validate_accessibility",
        "considerations": ["contrast", "touch_targets", "keyboard_nav"],
        "output": "wcag_aa_compliant_44px_touch_targets"
      }
    ],

    "constraint_hierarchy": [
      {
        "level": "MUST",
        "rule": "text_contrast_minimum_4.5",
        "rationale": "legibility_is_critical_for_usability"
      },
      {
        "level": "MUST",
        "rule": "touch_targets_44px_minimum",
        "rationale": "accessibility_standard_for_all_users"
      },
      {
        "level": "MUST",
        "rule": "hero_clearly_dominant",
        "rationale": "hierarchy_foundation_guides_attention"
      },
      {
        "level": "SHOULD",
        "rule": "spacing_quantum_multiples",
        "rationale": "consistency_creates_visual_harmony"
      },
      {
        "level": "SHOULD",
        "rule": "color_palette_adherence",
        "rationale": "brand_coherence_and_recognition"
      },
      {
        "level": "SHOULD",
        "rule": "type_scale_consistency",
        "rationale": "predictable_hierarchy_scanability"
      },
      {
        "level": "MAY",
        "rule": "perfect_grid_alignment",
        "rationale": "optical_over_mathematical_when_needed"
      },
      {
        "level": "MAY",
        "rule": "symmetry",
        "rationale": "asymmetry_can_create_dynamism"
      }
    ],

    "adaptation_heuristics": {
      "scale_up_content": {
        "strategy": "add_containers_and_sections_not_just_more_elements",
        "keep": ["hierarchy_ratios", "spacing_quantum", "color_system"],
        "adapt": ["increase_density_per_zone", "add_pagination_or_tabs"],
        "avoid": ["clutter", "loss_of_focus", "overwhelming_user"]
      },

      "scale_down_content": {
        "strategy": "remove_tertiary_info_preserve_hero_and_primary",
        "keep": ["hero_prominence", "core_cta", "brand_colors"],
        "adapt": ["increase_negative_space", "simplify_decorations"],
        "avoid": ["feeling_empty", "looking_incomplete", "losing_hierarchy"]
      },

      "context_switch_use_case": {
        "keep": ["spatial_logic", "visual_language_core", "color_system"],
        "adapt": [
          "content_type",
          "information_density",
          "interaction_patterns"
        ],
        "reconsider": [
          "decorative_elements",
          "specific_metaphors",
          "domain_colors"
        ]
      },

      "platform_switch_mobile": {
        "keep": ["brand_colors", "typography_ratios", "hierarchy_logic"],
        "adapt": [
          "spacing_quantum_to_larger",
          "touch_targets_56px",
          "layout_to_vertical"
        ],
        "reconsider": [
          "hover_states",
          "complex_interactions",
          "desktop_specific_features"
        ]
      },

      "brand_color_change": {
        "keep": [
          "spatial_system",
          "typography",
          "hierarchy_logic",
          "interaction_patterns"
        ],
        "adapt": [
          "color_palette_ensuring_contrast",
          "accent_colors",
          "decorative_colors"
        ],
        "reconsider": [
          "brand_specific_decorations",
          "color_dependent_metaphors"
        ]
      }
    },

    "design_principles": {
      "balance": {
        "type": "asymmetric | symmetric",
        "technique": "visual_weight_distribution_not_strict_equality"
      },
      "contrast": {
        "size_ratio": 3.0,
        "color_strategy": "high_contrast_for_hierarchy",
        "space_strategy": "dense_vs_sparse_zones"
      },
      "rhythm": {
        "pattern": "consistent_8px_spacing_creates_predictability",
        "tempo": "moderate | fast | slow"
      },
      "emphasis": {
        "method": "size_position_color_combined",
        "intensity": "strong | moderate | subtle"
      },
      "unity": {
        "technique": "repeated_visual_language_consistent_system",
        "consistency": "high | moderate"
      }
    }
  },

  "philosophy": {
    "aesthetic_signature": {
      "emotional_tone": [
        "calm",
        "elegant",
        "professional",
        "trustworthy",
        "modern"
      ],
      "intensity": "moderate | subtle | bold",
      "consistency": "uniform_across_design | varied_by_section"
    },

    "visual_principles": {
      "dominant": "minimalism_with_hierarchy_via_scale",
      "secondary": [
        "layering_for_depth",
        "selective_color_accents",
        "generous_whitespace"
      ],
      "tension": "asymmetric_balance_creates_visual_interest"
    },

    "signature_moves": [
      "gradient_numerals_with_radial_glow_emphasis",
      "asymmetric_card_grid_staggered_alignment",
      "generous_negative_space_around_hero_element",
      "subtle_ambient_decorations_in_corners",
      "dark_background_with_vibrant_accent_pops"
    ],

    "influences": [
      "swiss_minimalism",
      "neo_modernism",
      "data_visualization_best_practices",
      "material_design_elevation"
    ],

    "quality_benchmarks": {
      "alignment": "optical_adjustments_not_strict_mathematical",
      "centering": "visual_weight_considered_not_just_pixels",
      "edge_cases": "thoughtfully_designed_empty_loading_error",
      "micro_details": "letter_spacing_icon_alignment_shadow_precision",
      "craftsmanship": "custom_elements_not_just_defaults"
    },

    "design_maturity": {
      "systematic": "reusable_component_thinking_design_tokens",
      "user_centric": "usability_prioritized_over_aesthetics",
      "technical_aware": "implementation_feasible_performant",
      "scalable": "built_to_grow_not_one_off"
    }
  }
}
```

---

## Final Instructions

1. **Analyze thoroughly**: Spend time understanding every aspect of the design
2. **Be comprehensive**: Fill EVERY field with actual observations, not placeholders
3. **Capture distributions**: Include ALL values found, not just a few examples
4. **Infer reasoning**: Don't just describe, explain WHY the designer chose this
5. **Be specific**: "8px" not "small", "#6C63FF" not "purple", "1.333" not "moderate"
6. **Document everything**: If you see it, capture it
7. **No size limits**: This DTR is for long-term storage, not prompt injection
8. **Think DTM**: This data will be mined for patterns across multiple designs

Return ONLY the JSON. No preamble, no explanation, just the complete JSON object.
