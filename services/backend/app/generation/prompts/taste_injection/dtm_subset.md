# DESIGN TASTE - SUBSET DTM (SELECTED RESOURCES PRIORITIZED)

**SOURCE**: Subset DTM (user-selected resources)

**EMPHASIS**: These specific resources were chosen by the user. **Prioritize patterns and tokens from these selected resources** over the full taste. When conflicts arise, defer to these selections.

---

# LAYER 1: HARD CONSTRAINTS - ABSOLUTELY NON-NEGOTIABLE

These are EXACT tokens extracted from the designer's work, **with emphasis on the selected resources**.

## Colors - ONLY USE THESE

{{#consolidated_tokens.colors}}
### Approved Color Palette

**Priority colors** (from selected resources):

{{#priority_palette}}
**{{hex}}** ({{role}}) **← SELECTED RESOURCE**
- Frequency: {{frequency}}
- Used in: {{contexts}}
- Source: {{source}}

{{/priority_palette}}

Other approved colors:

{{#other_palette}}
**{{hex}}** ({{role}})
- Frequency: {{frequency}}
- Used in: {{contexts}}

{{/other_palette}}

### Color Relationships & Usage

{{relationships}}

**CRITICAL RULES**:
- ❌ FORBIDDEN: Any hex value not listed above
- ❌ FORBIDDEN: CSS color names (blue, red, green, etc.)
- ✅ ALLOWED: Exact hex values from list above
- ✅ PRIORITY: Use colors from selected resources when possible

{{/consolidated_tokens.colors}}

## Typography - ONLY USE THESE

{{#consolidated_tokens.typography}}
### Font Families

**Priority fonts** (from selected resources):

{{#priority_families}}
**{{family_name}}** **← SELECTED RESOURCE**
- Weights used: {{weights}}
- Contexts: {{contexts}}

{{/priority_families}}

Other approved fonts:

{{#other_families}}
**{{family_name}}**
- Weights used: {{weights}}

{{/other_families}}

### Font Sizes (px)

Approved sizes: {{sizes_px}}

**CRITICAL RULES**:
- ❌ FORBIDDEN: Any font family not listed
- ✅ PRIORITY: Use fonts from selected resources when applicable

{{/consolidated_tokens.typography}}

## Spacing - ONLY USE THESE VALUES

{{#consolidated_tokens.spacing}}
### Spacing Quantum

**Base quantum**: {{quantum}}

### Spacing Scale

Approved values (px): {{scale}}

**CRITICAL RULES**:
- ❌ FORBIDDEN: Values not in the scale
- ✅ ALLOWED: Only values from approved scale

{{/consolidated_tokens.spacing}}

## Materials & Effects

{{#consolidated_tokens.materials}}
### Priority Effects (from selected resources)

{{#priority_effects}}
**{{effect_name}}** **← SELECTED RESOURCE**
- Type: {{type}}
- Parameters: {{parameters}}

{{/priority_effects}}

{{/consolidated_tokens.materials}}

---

# LAYER 2: STRONG PREFERENCES - APPLY CONSISTENTLY

**Note**: These patterns emphasize the selected resources while maintaining overall coherence.

## Spatial Philosophy

{{consensus_narrative.spatial_philosophy}}

**Selected resources emphasis**: {{selected_spatial_notes}}

## Color Relationships

{{consensus_narrative.color_relationships}}

**Selected resources emphasis**: {{selected_color_notes}}

## Typography Philosophy

{{consensus_narrative.typography_philosophy}}

**Selected resources emphasis**: {{selected_typography_notes}}

## Surface Treatment

{{consensus_narrative.surface_treatment}}

## Component Vocabulary

{{consensus_narrative.component_vocabulary}}

## Image Integration

{{consensus_narrative.image_integration}}

---

# LAYER 3: PERSONALITY - DECISION-MAKING GUIDE

## Design Lineage

{{unified_personality.design_lineage}}

## Emotional Register

{{unified_personality.emotional_register}}

## Decision Heuristics

### Complexity Approach

{{unified_personality.decision_heuristics.complexity_approach}}

### Drama vs Usability

{{unified_personality.decision_heuristics.drama_vs_usability}}

### Density Preference

{{unified_personality.decision_heuristics.density_preference}}

### Color Philosophy

{{unified_personality.decision_heuristics.color_philosophy}}

### Spacing Philosophy

{{unified_personality.decision_heuristics.spacing_philosophy}}

## Signature Obsessions - ALWAYS APPLY

{{#unified_personality.cross_resource_obsessions}}
### {{pattern}}

- Universality: {{universality}}
- **Application rule**: {{application_rule}}

{{/unified_personality.cross_resource_obsessions}}

## Notable Absences - NEVER DO THESE

{{#unified_personality.universal_absences}}
- ❌ {{absence}}
{{/unified_personality.universal_absences}}

---

# LAYER 4: CODE EXAMPLES - STUDY THESE

**Priority examples** (from selected resources):

{{#selected_components}}
## {{component_name}} **← SELECTED RESOURCE**

**Occurrences**: {{frequency}}

### Code Pattern

```jsx
{{code_example}}
```

{{/selected_components}}

Other examples:

{{#other_components}}
## {{component_name}}

```jsx
{{code_example}}
```

{{/other_components}}

---

# SUBSET DTM GUIDANCE

When making decisions:

1. **First priority**: Patterns from selected resources
2. **Second priority**: Overall taste consensus
3. **Always**: Stay within Layer 1 hard constraints

The user chose these specific resources for a reason. Respect that choice by emphasizing their patterns while maintaining overall coherence.
