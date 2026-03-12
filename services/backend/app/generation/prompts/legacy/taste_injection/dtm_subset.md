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

### ⚠️ SPECIAL ENFORCEMENT: SYSTEM FONT FALLBACKS

**ABSOLUTELY FORBIDDEN**:

- `-apple-system`
- `BlinkMacSystemFont`
- `"Segoe UI"`
- `Roboto` (unless explicitly in approved list)
- `Oxygen`, `Ubuntu`, `Cantarell`, `Helvetica Neue`
- ANY system font stack

**WHY**: These create generic, default-looking UIs. This designer has a SPECIFIC font choice. Using system fonts destroys their aesthetic.

**CORRECT APPROACH**:

```jsx
// ❌ WRONG - System fallback
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", ...

// ✅ CORRECT - Designer's exact font only
className="font-[Inter]"  // If Inter is approved
```

**If the designer's font fails to load**: That's a deployment issue, not a generation issue. DO NOT add system fallbacks.

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

### ⚠️ SPECIAL ENFORCEMENT: ARBITRARY SPACING

**ABSOLUTELY FORBIDDEN EXAMPLES** (common violations):

- `20px` (if not in scale - likely should be 16px or 24px)
- `32px` (if not in scale - check what IS approved)
- `200px` (arbitrary large value - use combination of approved values)
- `915px` (calculated height - use `h-full`, `h-screen`, or approved values)
- `50px`, `75px`, `100px` (round numbers that don't match quantum)

**WHY YOU'RE DOING THIS**:

- Setting container heights: `h-[915px]` ❌ → Use `h-screen` or `min-h-screen` ✅
- Large margins: `mb-[200px]` ❌ → Use largest approved value or combination ✅
- Random padding: `p-[32px]` ❌ → Check scale, use approved value ✅

**CORRECT DECISION PROCESS**:

1. Need spacing of ~30px
2. Check approved scale: [4, 8, 12, 16, 24, 32, 48, ...]
3. Is 32px in scale? If YES → use it. If NO → use 24px or 48px (closest approved)

**WHEN YOU'RE TEMPTED TO CALCULATE**:

```jsx
// ❌ WRONG - Calculated arbitrary value
<div className="h-[915px]">  // Where did 915px come from?

// ✅ CORRECT - Use semantic sizing
<div className="h-screen">  // Full viewport height
<div className="h-full">    // Fill parent
<div className="min-h-[{approved}px]">  // Minimum with approved value
```

**FOR LARGE SPACING NEEDS**:

```jsx
// ❌ WRONG
<div className="mt-[200px]">

// ✅ CORRECT - Use largest approved value
<div className="mt-[96px]">  // If 96px is in scale

// ✅ CORRECT - Combine semantic + approved
<div className="mt-[96px] lg:mt-[128px]">  // Responsive with approved values
```

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
{
  {
    code_example;
  }
}
```

{{/selected_components}}

Other examples:

{{#other_components}}

## {{component_name}}

```jsx
{
  {
    code_example;
  }
}
```

{{/other_components}}

---

# SUBSET DTM GUIDANCE

When making decisions:

1. **First priority**: Patterns from selected resources
2. **Second priority**: Overall taste consensus
3. **Always**: Stay within Layer 1 hard constraints

The user chose these specific resources for a reason. Respect that choice by emphasizing their patterns while maintaining overall coherence.

---

# 🔥 MANDATORY PRE-GENERATION CHECKLIST 🔥

**BEFORE YOU OUTPUT ANY CODE**, mentally complete this checklist:

## Typography Check

- [ ] I have checked the approved font families list
- [ ] I am using ONLY fonts from that list
- [ ] I have NOT used `-apple-system`, `BlinkMacSystemFont`, or any system fonts
- [ ] All font weights I'm using are in the approved weights list
- [ ] All font sizes I'm using are from the approved scale

## Spacing Check

- [ ] I have checked the approved spacing scale
- [ ] I am using ONLY values from that scale (or multiples of quantum)
- [ ] I have NOT used arbitrary values like 20px, 32px, 200px, 915px
- [ ] For heights, I'm using `h-screen`, `h-full`, or approved fixed values
- [ ] For large spacing, I'm using the largest approved value, not arbitrary numbers

## Color Check

- [ ] I have checked the approved color palette
- [ ] I am using ONLY hex values from that palette
- [ ] I have NOT used Tailwind defaults (bg-blue-500, text-gray-900, etc.)
- [ ] I have NOT used CSS color names
- [ ] I am using bracket notation: `bg-[#HEX]`, not Tailwind classes

## Self-Correction Protocol

**IF you catch yourself about to use an unapproved value**:

1. STOP immediately
2. Check the approved list again
3. Choose the CLOSEST approved value
4. Document why you chose it (mentally)

**Example thought process**:

- "I want 30px padding"
- Check scale: [4, 8, 12, 16, 24, 32, 48...]
- Is 30px there? NO
- Closest approved: 24px or 32px
- Choose 32px (erring on the side of more spacing)
- Use: `p-[32px]` (if 32px is in scale)

**AFTER completing checklist**: Proceed with code generation.

**IF you cannot complete checklist**: Ask for clarification before generating.
