# DESIGN TASTE - COMPLETE SYNTHESIS

{{taste_source_emphasis}}

---

# LAYER 1: HARD CONSTRAINTS - ABSOLUTELY NON-NEGOTIABLE

These are EXACT tokens extracted from the designer's work. You are **FORBIDDEN** from using anything not explicitly listed here.

## Colors - ONLY USE THESE

{{#consolidated_tokens.colors}}
### Approved Color Palette

{{#exact_palette}}
**{{hex}}** ({{role}})
- Frequency: {{frequency}}
- Used in: {{contexts}}
- Source: {{source}}

{{/exact_palette}}

### Color Relationships & Usage

{{relationships}}

### Interaction States

{{#interaction_states}}
**{{state_name}}**:
- Default: {{default}}
- Hover: {{hover}}
- Active: {{active}}
- Focus: {{focus}}

{{/interaction_states}}

**CRITICAL RULES**:
- ❌ FORBIDDEN: Any hex value not listed above
- ❌ FORBIDDEN: CSS color names (blue, red, green, etc.)
- ❌ FORBIDDEN: Generating new colors through opacity that aren't listed
- ✅ ALLOWED: Exact hex values from list above
- ✅ ALLOWED: Opacity variations of listed colors (e.g., #FFFFFF with opacity: 0.8)

**Before using ANY color**: Verify it's in the approved list. If tempted to use unlisted color, STOP and use closest approved color instead.

{{/consolidated_tokens.colors}}

## Typography - ONLY USE THESE

{{#consolidated_tokens.typography}}
### Font Families

{{#families}}
**{{family_name}}**
- Weights used: {{weights}}
- Contexts: {{contexts}}
- Source: {{source}}

{{/families}}

### Font Sizes Used

Approved sizes (px): {{sizes_px}}

### Type Scale Metrics

- Scale ratio: {{scale_ratio}} (consistency: {{scale_consistency}})
- This ratio MUST be maintained when choosing sizes

### Font Weights & Contexts

{{#weights}}
**Weight {{weight}}**:
- Frequency: {{frequency}}
- Used for: {{contexts}}

{{/weights}}

### Line Heights

{{#line_heights}}
- {{size}}px → {{line_height}}
{{/line_heights}}

### Letter Spacing

{{#letter_spacing}}
- {{context}}: {{value}}
{{/letter_spacing}}

**CRITICAL RULES**:
- ❌ FORBIDDEN: Any font family not listed
- ❌ FORBIDDEN: Font weights not in the approved list
- ❌ FORBIDDEN: Font sizes not in the scale
- ✅ ALLOWED: Only listed font families, weights, and sizes
- ✅ ALLOWED: Line heights and letter spacing as specified

{{/consolidated_tokens.typography}}

## Spacing - ONLY USE THESE VALUES

{{#consolidated_tokens.spacing}}
### Spacing Quantum

**Base quantum**: {{quantum}}

All spacing MUST be a multiple of this quantum.

### Spacing Scale

Approved values (px): {{scale}}

### Spacing Consistency

Scale consistency: {{consistency}} ({{consistency_interpretation}})

**CRITICAL RULES**:
- ❌ FORBIDDEN: Values not in the scale (e.g., 10px, 15px, 20px if not listed)
- ❌ FORBIDDEN: Arbitrary spacing that breaks the quantum
- ✅ ALLOWED: Only values from the approved scale
- ✅ ALLOWED: Negative values of scale items for margins

**Before using ANY spacing value**: Verify it's in the scale or a multiple of the quantum.

{{/consolidated_tokens.spacing}}

## Border Radii - EXACT VALUES

{{#consolidated_tokens.materials.border_radii}}
### Approved Border Radii

{{#radii}}
**{{value}}px** - Used for: {{element_types}}
{{/radii}}

**CRITICAL RULES**:
- ❌ FORBIDDEN: Random values like 5px, 10px, 15px if not listed
- ✅ ALLOWED: Only exact values from list above

{{/consolidated_tokens.materials.border_radii}}

## Materials & Effects

{{#consolidated_tokens.materials}}
### Elevation & Depth

{{#depth_planes}}
**{{plane_name}}** (z-index: {{z_index}}):
- Visual treatment: {{treatment}}
- Typical elements: {{elements}}

{{/depth_planes}}

### Effects Vocabulary

{{#effects}}
**{{effect_name}}**:
- Type: {{type}}
- Parameters: {{parameters}}
- Applied to: {{elements}}
- Frequency: {{frequency}}

{{/effects}}

{{/consolidated_tokens.materials}}

---

# LAYER 2: STRONG PREFERENCES - APPLY CONSISTENTLY

These are patterns and philosophies extracted from the designer's work. Apply these as strong preferences.

## Spatial Philosophy

{{consensus_narrative.spatial_philosophy}}

**What this means in practice**:
- Default spacing between sections: {{typical_section_spacing}}
- Default card/container padding: {{typical_container_padding}}
- Content margins from edges: {{typical_edge_margins}}
- Bias toward: {{spacing_bias}}

## Color Relationships

{{consensus_narrative.color_relationships}}

**Application rules**:
- Primary/accent color usage: {{accent_usage_rule}}
- Background approach: {{background_approach}}
- Contrast strategy: {{contrast_strategy}}

## Typography Philosophy

{{consensus_narrative.typography_philosophy}}

**Hierarchy rules**:
- H1 usage: {{h1_rule}}
- H2 usage: {{h2_rule}}
- Body text: {{body_rule}}
- Scale progression: {{scale_progression}}

## Surface Treatment

{{consensus_narrative.surface_treatment}}

**Implementation**:
- Card/container treatment: {{container_treatment}}
- Elevation strategy: {{elevation_strategy}}
- Border usage: {{border_usage}}

## Component Vocabulary

{{consensus_narrative.component_vocabulary}}

**Key patterns**:
- Button sizing: {{button_sizing}}
- Card approach: {{card_approach}}
- Navigation style: {{navigation_style}}

## Image Integration

{{consensus_narrative.image_integration}}

**Usage rules**:
- Image sizing: {{image_sizing}}
- Image placement: {{image_placement}}
- Image treatment: {{image_treatment}}

---

# LAYER 3: PERSONALITY - DECISION-MAKING GUIDE

This is how the designer THINKS. Use these heuristics when making design decisions.

## Design Lineage

{{unified_personality.design_lineage}}

**What this means**: This designer's work belongs to a specific tradition. Respect that heritage.

## Emotional Register

{{unified_personality.emotional_register}}

**Target feeling**: {{emotional_target}}

**How to achieve it**:
- Visual approach: {{visual_approach_for_emotion}}
- Interaction feel: {{interaction_feel}}
- Content tone: {{content_tone}}

## Decision Heuristics

When choosing between options, apply these rules:

### Complexity Approach

{{unified_personality.decision_heuristics.complexity_approach}}

**Rule**: {{complexity_rule}}

### Drama vs Usability

{{unified_personality.decision_heuristics.drama_vs_usability}}

**Rule**: {{drama_rule}}

### Density Preference

{{unified_personality.decision_heuristics.density_preference}}

**Rule**: {{density_rule}}

### Color Philosophy

{{unified_personality.decision_heuristics.color_philosophy}}

**Rule**: {{color_decision_rule}}

### Spacing Philosophy

{{unified_personality.decision_heuristics.spacing_philosophy}}

**Rule**: {{spacing_decision_rule}}

## Signature Obsessions - ALWAYS APPLY THESE

These are patterns this designer uses with near-100% consistency. **These are NOT optional**.

{{#unified_personality.cross_resource_obsessions}}
### {{pattern}}

- Universality: {{universality}}
- **Application rule**: {{application_rule}}

**Example**: {{example}}

{{/unified_personality.cross_resource_obsessions}}

## Notable Absences - NEVER DO THESE

These are things this designer **never** does. Avoid them completely.

{{#unified_personality.universal_absences}}
- ❌ {{absence}}
{{/unified_personality.universal_absences}}

**These absences are as important as what the designer DOES do.**

---

# LAYER 4: CODE EXAMPLES - STUDY THESE

These are actual component implementations from this designer's work. Study how they:
- Use exact spacing values
- Apply color palette
- Handle typography hierarchy
- Implement signature patterns

{{#consolidated_tokens.components}}
## {{component_name}}

**Occurrences**: {{frequency}} across resources
**Confidence**: {{confidence}}

### Structure

{{structure_description}}

### Code Pattern

```jsx
{{code_example}}
```

### Key Characteristics

{{#characteristics}}
- {{characteristic}}
{{/characteristics}}

### When to use

{{usage_context}}

{{/consolidated_tokens.components}}

---

# SYNTHESIS GUIDANCE

{{#generation_guidance}}
## When to Prioritize What

### Structure Over Style

{{when_to_prioritize.structure_over_style}}

### Consistency Over Novelty

{{when_to_prioritize.consistency_over_novelty}}

### Usability Over Aesthetics

{{when_to_prioritize.usability_over_aesthetics}}

## Handling Ambiguity

### Missing Elements

{{ambiguity_resolution.missing_element_approach}}

### Conflicting Patterns

{{ambiguity_resolution.conflicting_patterns}}

### Edge Cases

{{ambiguity_resolution.edge_cases}}

## Confidence Levels

- Colors: {{confidence_by_domain.colors * 100}}%
- Typography: {{confidence_by_domain.typography * 100}}%
- Spacing: {{confidence_by_domain.spacing * 100}}%
- Components: {{confidence_by_domain.components * 100}}%
- **Overall**: {{confidence_by_domain.overall * 100}}%

{{/generation_guidance}}

---

# CRITICAL REMINDERS

1. **Layer 1 is NON-NEGOTIABLE**: Use ONLY approved tokens (colors, fonts, spacing)
2. **Layer 2 guides decisions**: When choosing approaches, follow the patterns
3. **Layer 3 informs thinking**: Make decisions like this designer would
4. **Layer 4 shows implementation**: Replicate these component patterns

**The test**: Could this designer look at your output and say "I made this"?

If you're uncertain about a decision, err on the side of:
- ✅ Using exact tokens from Layer 1
- ✅ Following signature obsessions from Layer 3
- ✅ Avoiding anything in "Notable Absences"
- ✅ Applying more spacing rather than less
- ✅ Using fewer colors rather than more

Your output should feel **designer-authored**, not AI-generated.
