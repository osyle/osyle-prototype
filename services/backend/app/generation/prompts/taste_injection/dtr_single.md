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

### ⚠️ SPECIAL ENFORCEMENT: SYSTEM FONT FALLBACKS

**ABSOLUTELY FORBIDDEN**:

- `-apple-system`
- `BlinkMacSystemFont`
- `"Segoe UI"`
- `Roboto` (unless explicitly in approved list)
- `Oxygen`, `Ubuntu`, `Cantarell`, `Helvetica Neue`
- ANY system font stack

**WHY**: You are CLONING a specific design. System fonts completely destroy the aesthetic.

**CORRECT APPROACH**:

```jsx
// ❌ WRONG - System fallback
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", ...

// ✅ CORRECT - Designer's exact font only
className="font-[Inter]"  // If Inter is observed in reference
```

**This is pixel-level fidelity. NO system font fallbacks under ANY circumstances.**

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

### ⚠️ SPECIAL ENFORCEMENT: ARBITRARY SPACING

**ABSOLUTELY FORBIDDEN EXAMPLES** (common violations):

- `20px` (if not observed - use exact observed values only)
- `32px` (if not observed - check what WAS observed)
- `200px` (arbitrary large value - use observed values or semantic sizing)
- `915px` (calculated height - use `h-full`, `h-screen`, or observed values)
- ANY value not explicitly observed in the reference design

**WHY YOU'RE DOING THIS**:
You are CLONING a design. Every spacing decision was intentional.

- Setting container heights: `h-[915px]` ❌ → Use `h-screen` or observed value ✅
- Large margins: `mb-[200px]` ❌ → Use observed value or combination ✅
- Random padding: `p-[32px]` ❌ → Check observed values, use exact match ✅

**CORRECT DECISION PROCESS**:

1. Need spacing of ~30px
2. Check OBSERVED values: [4, 8, 12, 16, 24, 48, 64, ...]
3. Is 32px observed? If YES → use it. If NO → use 24px or 48px (closest OBSERVED)
4. NEVER invent spacing values not in the reference

**WHEN YOU'RE TEMPTED TO CALCULATE**:

```jsx
// ❌ WRONG - Calculated arbitrary value
<div className="h-[915px]">  // Not observed in reference

// ✅ CORRECT - Use semantic sizing or observed value
<div className="h-screen">  // Full viewport
<div className="h-full">    // Fill parent
<div className="h-[640px]">  // If 640px was observed
```

**FOR LARGE SPACING NEEDS**:

```jsx
// ❌ WRONG - Invented value
<div className="mt-[200px]">

// ✅ CORRECT - Use observed value
<div className="mt-[96px]">  // If 96px was observed

// ✅ CORRECT - Combine observed values if needed
<div className="mt-[64px]">  // Closest observed value
```

**REMEMBER**: This is design cloning. Every pixel matters. Use ONLY observed spacing values.

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
{
  {
    code_example;
  }
}
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

---

# 🔥 MANDATORY PRE-GENERATION CHECKLIST 🔥

**BEFORE YOU OUTPUT ANY CODE**, mentally complete this checklist:

## Typography Check

- [ ] I have checked the OBSERVED font families from reference
- [ ] I am using ONLY fonts from that observed list
- [ ] I have NOT used `-apple-system`, `BlinkMacSystemFont`, or any system fonts
- [ ] All font weights I'm using were OBSERVED in the reference
- [ ] All font sizes I'm using were OBSERVED in the reference

## Spacing Check

- [ ] I have checked the OBSERVED spacing values from reference
- [ ] I am using ONLY values that were OBSERVED (or multiples of quantum)
- [ ] I have NOT used arbitrary values like 20px, 32px, 200px, 915px
- [ ] For heights, I'm using `h-screen`, `h-full`, or OBSERVED fixed values
- [ ] For large spacing, I'm using OBSERVED values, not invented ones

## Color Check

- [ ] I have checked the EXACT color palette from reference
- [ ] I am using ONLY hex values that were OBSERVED
- [ ] I have NOT used Tailwind defaults (bg-blue-500, text-gray-900, etc.)
- [ ] I have NOT used CSS color names
- [ ] I am using bracket notation: `bg-[#HEX]` with OBSERVED hex values

## Fidelity Check

- [ ] Every spacing value I used was OBSERVED in reference (or matches quantum)
- [ ] Every font I used was OBSERVED in reference
- [ ] Every color I used was OBSERVED in reference
- [ ] I did NOT invent ANY design tokens
- [ ] This looks like it came from the same Figma file

## Self-Correction Protocol

**IF you catch yourself about to use an un-observed value**:

1. STOP immediately
2. Check the OBSERVED list again
3. Choose the CLOSEST observed value
4. Document why (mentally): "Using 24px because it's the closest observed value to my intended 30px"

**Example thought process**:

- "I want 30px padding"
- Check OBSERVED scale: [4, 8, 12, 16, 24, 48, 64...]
- Is 30px observed? NO
- Is 32px observed? NO
- Closest observed: 24px or 48px
- Choose 24px (closer to 30px)
- Use: `p-[24px]`

**AFTER completing checklist**: Proceed with code generation.

**IF you cannot complete checklist**: Ask for clarification before generating.

**REMEMBER**: This is DESIGN CLONING. Maximum fidelity. Zero creative interpretation.
