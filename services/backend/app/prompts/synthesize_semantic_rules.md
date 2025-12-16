# DTM Semantic Rule Synthesis Prompt

You are analyzing statistical design patterns extracted from multiple designs by the same designer. Your task is to synthesize **high-level semantic rules** that capture the designer's cognitive patterns, not just numerical averages.

## Input Context

You will receive:

1. **Statistical patterns** (quantitative data from code analysis)
2. **Sample DTR excerpts** (semantic reasoning from 2-3 representative designs)

## Your Goal

Extract **3 types of rules**:

### 1. Invariants (MUST rules)

Patterns that are **consistent across ALL designs** with high confidence.

**Examples**:

- "Always uses 8px spacing quantum" (if quantum consistency > 0.95)
- "Dark backgrounds in all contexts" (if temperature always cool)
- "Generous negative space philosophy" (if spacing always above median)

**Criteria**:

- Appears in 100% of designs OR
- Consistency score > 0.95 OR
- Statistical std_dev very low

### 2. Contextual Rules

Patterns that **vary by design context** with clear triggers.

**Format**:

```json
{
  "context": {
    "screen_type": "dashboard",
    "content_density": "high"
  },
  "rules": {
    "spacing_quantum": 8,
    "decoration_level": "minimal"
  },
  "confidence": 0.85,
  "evidence_count": 3
}
```

**Examples**:

- "Data-heavy screens: smaller spacing quantum, minimal decoration"
- "Marketing pages: larger spacing, vibrant accents"
- "Mobile: touch targets 56px, simpler layouts"

**Criteria**:

- Pattern diverges by context
- Can identify trigger conditions
- Multiple examples support rule

### 3. Meta-Rules (HOW designer thinks)

High-level decision-making patterns and philosophies.

**Examples**:

- "Prioritizes hierarchy over symmetry - willing to break grid for emphasis"
- "Spacing decisions driven by content density, not fixed rules"
- "Color strategy: dark base + single vibrant accent for focus"
- "Typography: scale ratio varies by screen size (mobile: 1.25, desktop: 1.5)"

**Criteria**:

- Explains WHY patterns exist
- Captures decision-making logic
- Helps apply taste to new contexts

## Critical Rules

### ✅ DO:

- Extract rules grounded in statistical evidence
- Identify context triggers explicitly
- Capture decision-making patterns (why, not just what)
- Use specific thresholds ("spacing > 32px" not "generous spacing")
- Note confidence levels

### ❌ DON'T:

- Hallucinate rules not supported by data
- Create vague rules ("uses good spacing")
- Ignore statistical variance (if std_dev high, it's contextual not invariant)
- Mix correlation with causation without evidence

## Input Format

```
=== STATISTICAL PATTERNS ===

Spacing:
- Quantum: mean=8.2, median=8, mode=8, std_dev=0.4, consistency=0.98
- Common values: [8, 16, 24, 32, 48] (frequency: 8→0.45, 16→0.30, 24→0.15)
- Distribution: {8: 0.45, 16: 0.30, 24: 0.15, 32: 0.07, 48: 0.03}

Colors:
- Common colors: ["#1A1A2E", "#FFFFFF", "#6C63FF"] (appears in 5/5 designs)
- Temperature: {warm: 0.15, cool: 0.70, neutral: 0.15}
- Saturation: {high: 0.25, medium: 0.40, low: 0.35}

Typography:
- Scale ratio: mean=1.42, median=1.5, std_dev=0.12, consistency=0.88
- Common sizes: [14, 16, 18, 24, 32, 48]
- Weights: [400, 600, 700] (consistency: 1.0)

Forms:
- Corner radii: [0, 8, 12, 16, 24] (8→0.35, 16→0.40, 24→0.15)
- Radius quantum: mean=4, consistency=0.95

=== SAMPLE DTR EXCERPTS ===

[Include 2-3 DTR cognitive_process sections showing designer reasoning]

DTR 1 (Dashboard - data-heavy):
cognitive_process.decision_tree: [
  "establish_8px_grid_for_density",
  "prioritize_data_hierarchy_over_decoration",
  "minimal_spacing_between_related_metrics"
]
cognitive_process.constraint_hierarchy: [
  {level: "MUST", rule: "8px_spacing_quantum"},
  {level: "SHOULD", rule: "dark_background_for_readability"}
]

DTR 2 (Landing page - marketing):
cognitive_process.decision_tree: [
  "establish_16px_grid_for_breathing_room",
  "generous_spacing_for_premium_feel",
  "accent_color_for_cta_emphasis"
]

DTR 3 (Mobile app):
cognitive_process.decision_tree: [
  "establish_8px_grid_but_larger_touch_targets",
  "vertical_flow_single_column",
  "simplified_decoration_for_performance"
]
```

## Output Format

Return ONLY this JSON:

```json
{
  "invariants": [
    {
      "rule": "spacing_quantum_always_8px",
      "description": "Always uses 8px as base spacing unit",
      "confidence": 0.98,
      "evidence": "quantum consistency 0.98 across all 5 designs",
      "type": "spatial"
    },
    {
      "rule": "dark_cool_backgrounds",
      "description": "Backgrounds always dark with cool temperature (blues, grays)",
      "confidence": 0.95,
      "evidence": "Temperature 70% cool, 100% dark values in all designs",
      "type": "color"
    }
  ],

  "contextual_rules": [
    {
      "context": {
        "screen_type": "dashboard",
        "content_density": "high"
      },
      "rules": {
        "spacing_multiplier": "1x (tight)",
        "decoration_level": "minimal",
        "hierarchy_method": "size_and_weight"
      },
      "confidence": 0.85,
      "evidence_dtrs": ["dtr_1", "dtr_4"]
    },
    {
      "context": {
        "screen_type": "marketing",
        "content_density": "low"
      },
      "rules": {
        "spacing_multiplier": "2x (generous)",
        "decoration_level": "moderate",
        "hierarchy_method": "size_and_space"
      },
      "confidence": 0.8,
      "evidence_dtrs": ["dtr_2"]
    }
  ],

  "meta_rules": [
    {
      "rule": "hierarchy_trumps_consistency",
      "description": "Designer breaks spacing grid when hierarchy demands it - emphasis matters more than mathematical perfection",
      "evidence": "Observed 8px quantum but 10px, 20px deviations for focal elements",
      "application": "When generating UI, prioritize clear hierarchy over strict grid adherence"
    },
    {
      "rule": "content_density_drives_spacing",
      "description": "Spacing decisions directly correlate with information density - more data = tighter spacing",
      "evidence": "Dashboard: 8-16px gaps, Marketing: 24-48px gaps",
      "application": "Analyze content density of new screen and adjust spacing scale accordingly"
    },
    {
      "rule": "single_accent_philosophy",
      "description": "Uses dark base + single vibrant accent color for all emphasis - never multiple accent colors",
      "evidence": "Consistent dark bg + #6C63FF accent across all designs",
      "application": "In new designs, identify ONE accent color and use sparingly for focus"
    }
  ]
}
```

## Instructions

1. **Analyze statistical patterns** for consistency vs variance
2. **Extract invariants** from high-consistency patterns (>0.95)
3. **Identify contextual rules** from variance patterns
4. **Synthesize meta-rules** from decision trees and constraint hierarchies
5. **Ground everything in data** - cite evidence
6. **Be concise** - 3-5 invariants, 3-7 contextual rules, 3-5 meta-rules

Return ONLY the JSON. No preamble, no explanation.
