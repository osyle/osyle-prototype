# DESIGN TASTE - SINGLE RESOURCE (MAXIMUM FIDELITY)

**SOURCE**: Single design resource (DTR)

**EMPHASIS**: **MAXIMUM FIDELITY** to this ONE design. Your goal is to replicate this designer's approach as closely as possible within the task constraints. Every decision should match this specific reference.

---

# LAYER 1: HARD CONSTRAINTS - ABSOLUTELY NON-NEGOTIABLE

These are EXACT tokens extracted from THIS specific design resource.

## Colors - ONLY USE THESE

{{#exact_tokens.colors}}
### Exact Color Palette

Every color used in the reference design:

{{#exact_palette}}
**{{hex}}** ({{role}})
- Frequency in reference: {{frequency}}
- Contexts: {{contexts}}
- Source: {{source}}

{{/exact_palette}}

### Color Temperature & Saturation

{{temperature}}

{{saturation_profile}}

### Color Relationships

{{relationships}}

### Interaction States

{{#interaction_states}}
**{{state_name}}**:
- Default: {{default}}
- Hover: {{hover}}
- Active: {{active}}
- Focus: {{focus}}

{{/interaction_states}}

**CRITICAL RULES FOR SINGLE RESOURCE**:
- ❌ FORBIDDEN: **ANY** color not in this exact list
- ❌ FORBIDDEN: "Close enough" colors - must be exact hex
- ✅ REQUIRED: Use these colors in the same contexts as the reference
- ✅ REQUIRED: Match the color relationships observed

**This is pixel-level fidelity - no approximations.**

{{/exact_tokens.colors}}

## Typography - ONLY USE THESE

{{#exact_tokens.typography}}
### Font Families

Exact fonts from reference:

{{#families}}
**{{family_name}}**
- Weights used: {{weights}}
- Character count: {{character_count}}
- Contexts: {{contexts}}

{{/families}}

### Font Sizes

Exact sizes used (px): {{sizes_px}}

### Font Weights

{{#weights}}
**Weight {{weight}}**:
- Frequency: {{frequency}}
- Used for: {{contexts}}

{{/weights}}

### Line Heights

{{#line_heights}}
- {{size}}px → Line height: {{line_height}}
{{/line_heights}}

### Letter Spacing

{{#letter_spacing}}
- {{context}}: {{value}}
{{/letter_spacing}}

**CRITICAL RULES FOR SINGLE RESOURCE**:
- ❌ FORBIDDEN: Any font not in this design
- ❌ FORBIDDEN: Any weight not observed
- ❌ FORBIDDEN: Font sizes outside the observed scale
- ✅ REQUIRED: Match exact typography hierarchy

{{/exact_tokens.typography}}

## Spacing - ONLY USE THESE EXACT VALUES

{{#exact_tokens.spacing}}
### Spacing Quantum

**Base quantum**: {{quantum}}

Every spacing value MUST be a multiple of this.

### Observed Spacing Values

Exact values used (px): {{scale}}

### Spacing Consistency

Adherence to quantum: {{consistency}}

**CRITICAL RULES FOR SINGLE RESOURCE**:
- ❌ FORBIDDEN: Any spacing not observed in reference
- ✅ REQUIRED: Use exact spacing values from the design
- ✅ REQUIRED: Maintain the spacing quantum religiously

{{/exact_tokens.spacing}}

## Materials & Effects - EXACT REPLICATION

{{#exact_tokens.materials}}
### Border Radii

{{#border_radii}}
**{{value}}px** - Used for: {{element_types}}
- Frequency: {{frequency}}

{{/border_radii}}

### Depth & Elevation

{{#depth_planes}}
**{{plane_name}}** (z-index: {{z_index}}):
- Treatment: {{treatment}}
- Elements: {{elements}}

{{/depth_planes}}

### Effects Vocabulary

{{#effects_vocabulary}}
**{{effect_name}}**:
- Type: {{type}}
- Parameters: {{parameters}}
- Applied to: {{elements}}

{{/effects_vocabulary}}

**CRITICAL**: Replicate these effects exactly.

{{/exact_tokens.materials}}

---

# LAYER 2: PATTERNS - OBSERVED IN REFERENCE

These are NOT suggestions - these are **observed patterns** from the reference design.

## Spatial Patterns

{{cross_cutting_patterns.spatial_patterns}}

**Implementation**: Replicate this exact spatial approach.

## Color Usage Patterns

{{cross_cutting_patterns.color_patterns}}

**Implementation**: Use colors in the same manner as observed.

## Typography Patterns

{{cross_cutting_patterns.typography_patterns}}

**Implementation**: Match the typographic hierarchy exactly.

## Layout Patterns

{{cross_cutting_patterns.layout_patterns}}

**Implementation**: Follow the same layout structure.

## Component Patterns

{{cross_cutting_patterns.component_patterns}}

**Implementation**: Build components with the same anatomy.

---

# LAYER 3: DESIGNER THINKING - REVERSE ENGINEERED

From analyzing THIS specific design, we can infer how the designer thinks:

## Design Philosophy

{{personality.design_philosophy}}

**What this means**: When making decisions not explicit in the reference, think like THIS designer would think.

## Decision Patterns

{{personality.decision_patterns}}

**Application**: Use these heuristics for edge cases.

## Signature Moves

{{#personality.signature_moves}}
### {{move_name}}

{{description}}

**Frequency in reference**: {{frequency}}

**Application rule**: {{rule}}

{{/personality.signature_moves}}

## What This Designer NEVER Does

{{#personality.absences}}
- ❌ {{absence}} - Never observed in this design
{{/personality.absences}}

---

# LAYER 4: CODE EXAMPLES - EXACT PATTERNS

These are actual component implementations from THIS reference design.

{{#exact_tokens.components}}
## {{component_name}}

**Occurrences in reference**: {{frequency}}
**Confidence**: {{confidence}}

### Exact Structure

{{structure_description}}

### Code Pattern (Observed)

```jsx
{{code_example}}
```

### Critical Characteristics

{{#characteristics}}
- {{characteristic}}
{{/characteristics}}

### When to Use

{{usage_context}}

**Replication**: Build components following this EXACT pattern.

{{/exact_tokens.components}}

---

# SINGLE RESOURCE FIDELITY CHECKLIST

Before generating ANY code, verify:

- [ ] **Colors**: Using ONLY colors from exact palette
- [ ] **Fonts**: Using ONLY observed fonts and weights  
- [ ] **Spacing**: Using ONLY observed spacing values
- [ ] **Effects**: Replicating exact blur, shadow, opacity values
- [ ] **Patterns**: Following observed layout and component patterns
- [ ] **Hierarchy**: Matching observed information hierarchy
- [ ] **Atmosphere**: Matching observed visual atmosphere

**The goal**: Someone looking at your output should think it came from the same Figma file.

**NOT acceptable**:
- "Similar" colors
- "Close enough" spacing
- "Inspired by" patterns
- "In the spirit of" decisions

**ONLY acceptable**:
- Exact replication within task constraints
- Pixel-perfect fidelity to observed patterns
- Direct application of reverse-engineered thinking

This is NOT creative interpretation. This is **design cloning** - maximum fidelity to a single reference.
