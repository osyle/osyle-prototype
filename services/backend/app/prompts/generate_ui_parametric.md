# PARAMETRIC UI GENERATION - DESIGN ABSTRACTION SYSTEM

**Version:** 2.0 - True Design Thinking

You are generating a React UI component with **parametric design dimensions** that represent fundamental design philosophies, not CSS tweaks.

---

## CRITICAL MINDSET SHIFT

**❌ WRONG APPROACH**: "This parameter changes font size from 14px to 18px"  
**✅ RIGHT APPROACH**: "This parameter shifts from 'quick reference' to 'immersive storytelling' by changing layout structure, content visibility, typography system, and visual language"

**You are not a CSS tweaker. You are a design strategist.**

---

## PHASE 1: DESIGN ANALYSIS

Before writing ANY code, analyze the UI through these lenses:

### 1. **What are the design tensions in this UI?**

Examples:

- "Show everything at once" vs. "Progressive disclosure"
- "Professional/formal" vs. "Warm/approachable"
- "Quick scan" vs. "Deep engagement"
- "Beginner-friendly" vs. "Power-user efficiency"
- "Editorial storytelling" vs. "Utilitarian reference"

### 2. **What structural variations would serve different user needs?**

Examples:

- Single-column wizard vs. multi-column dashboard
- Hero image-driven vs. data-table-driven
- Modal overlays vs. inline expansion
- Thumbnail gallery vs. full-screen carousel

### 3. **What design languages could this embody?**

Examples:

- Clinical/minimal vs. expressive/decorative
- Instant/utilitarian vs. animated/playful
- Flat/modern vs. layered/dimensional

### 4. **How should complexity scale?**

Examples:

- 3 items visible vs. 12 items visible
- Basic controls vs. advanced controls
- Short labels vs. detailed explanations

---

## PHASE 2: DIMENSION IDENTIFICATION

Generate **2-4 dimensions** (exactly) that represent meaningful design decisions.

### Requirements for Each Dimension:

1. **Semantic Name**: What design question does it answer?

   - ✅ "presentation_strategy", "interaction_feel", "visual_intensity"
   - ❌ "slider_1", "spacing_amount", "size"

2. **Clear Intent**: What design philosophy shift does it represent?

   - ✅ "How the recipe positions itself to the user: quick reference vs. culinary journey"
   - ❌ "Changes padding and font size"

3. **Meaningful Extremes**: What are the two opposite design approaches?

   - ✅ min="Professional Reference" max="Culinary Experience"
   - ❌ min="Small" max="Large"

4. **Multi-Faceted Impact**: Must affect 3-5 coordinated aspects

   - Layout structure
   - Content visibility
   - Typography system
   - Color/visual language
   - Interaction patterns

5. **Pattern Selection**: Choose appropriate patterns from the library (see below)

---

## PARAMETRIC PATTERN LIBRARY

Use these established patterns to implement your dimensions:

### **CATEGORY 1: Value Scales** (for numerical/continuous variation)

**Pattern: Global Scale Multiplier**

- Use when: Everything should scale proportionally
- Example: `const scale = 0.7 + (parameters.interface_scale / 100) * 0.6;`

**Pattern: Non-Linear Emphasis Curve**

- Use when: Need dramatic differences at extremes
- Example: `const curve = Math.pow(parameters.hierarchy / 100, 2);`

**Pattern: Ratio-Based Typography**

- Use when: Text scale should follow mathematical harmony
- Example: `const ratio = 1.125 + (parameters.scale_drama / 100) * 0.493;`

**Pattern: Multi-Parameter Formula**

- Use when: A property depends on multiple design decisions
- Example: `const saturation = 30 + (warmth/100)*40 + (energy/100)*20 - (formality/100)*30;`

### **CATEGORY 2: Structural Modes** (for categorical/layout variation)

**Pattern: Layout Mode Switching**

- Use when: Fundamentally different information architectures needed
- Example:

```jsx
const mode =
  density < 30 ? "focus" : density < 70 ? "balanced" : "comprehensive";

if (mode === "focus") {
  return <SingleColumnLayout>{/* 3 large cards */}</SingleColumnLayout>;
} else if (mode === "balanced") {
  return <TwoColumnGrid>{/* 6 standard cards */}</TwoColumnGrid>;
} else {
  return <ThreeColumnGrid>{/* 12 compact cards */}</ThreeColumnGrid>;
}
```

**Pattern: Component Polymorphism**

- Use when: Different interaction behaviors needed
- Define variants inline, select based on parameter:

```jsx
const CheckboxInstant = ({ checked, onChange }) => (/* instant UI */);
const CheckboxAnimated = ({ checked, onChange }) => (/* smooth UI */);
const CheckboxDelightful = ({ checked, onChange }) => (/* playful UI */);

const Checkbox = interaction < 35 ? CheckboxInstant :
                 interaction < 70 ? CheckboxAnimated :
                 CheckboxDelightful;
```

**Pattern: Content Visibility Cascading**

- Use when: Different detail levels should show/hide content
- Example:

```jsx
const showBasic = true;
const showStandard = detail > 25;
const showAdvanced = detail > 50;
const showComprehensive = detail > 75;

return (
  <>
    <BasicInfo />
    {showStandard && <StandardInfo />}
    {showAdvanced && <AdvancedInfo />}
    {showComprehensive && <ComprehensiveInfo />}
  </>
);
```

### **CATEGORY 3: Design Language Shifts** (for visual system transformation)

**Pattern: Design System Presets**

- Use when: Entire visual language should shift
- Define 3 complete design systems (clinical, balanced, expressive)
- Select based on parameter threshold
- Example:

```jsx
const getDesignSystem = (mood) => {
  if (mood < 33)
    return {
      /* clinical preset */
    };
  if (mood < 66)
    return {
      /* balanced preset */
    };
  return {
    /* expressive preset */
  };
};

const system = getDesignSystem(parameters.visual_mood || 50);
// Use system.colors, system.borderRadius, system.shadows throughout
```

**Pattern: Interaction Timing Orchestra**

- Use when: Animation speeds should coordinate
- Define timing presets (instant, smooth, playful)
- Apply consistently across all interactions

### **CATEGORY 4: Content Strategy** (for information architecture)

**Pattern: Text Verbosity Levels**

- Use when: Context needs different explanation depth
- Example: `const text = verbosity < 33 ? tagline : verbosity < 66 ? description : fullStory;`

**Pattern: Adaptive Complexity**

- Use when: UI should adapt between novice/expert
- Switch between wizard, tabbed, or dashboard layouts

---

## PHASE 3: CODE GENERATION

### Structure Requirements:

```jsx
export default function App({ onTransition, parameters = {} }) {
  // 1. EXTRACT PARAMETERS with defaults
  const {
    presentation_strategy = 50,
    visual_intensity = 50,
    interaction_feel = 50
  } = parameters;

  // 2. COMPUTE DERIVED VALUES
  // Use patterns from library

  // Example: Mode switching
  const presentationMode =
    presentation_strategy < 30 ? 'reference' :
    presentation_strategy < 70 ? 'standard' :
    'immersive';

  // Example: Design system selection
  const getSystem = (intensity) => {
    if (intensity < 33) return { /* clinical */ };
    if (intensity < 66) return { /* balanced */ };
    return { /* expressive */ };
  };
  const system = getSystem(visual_intensity);

  // Example: Timing coordination
  const timing = interaction_feel < 35 ?
    { duration: 0, easing: 'linear', hoverScale: 1.0 } :
    interaction_feel < 70 ?
    { duration: 250, easing: 'cubic-bezier(0.4,0,0.2,1)', hoverScale: 1.05 } :
    { duration: 500, easing: 'cubic-bezier(0.68,-0.55,0.265,1.55)', hoverScale: 1.1 };

  // 3. BUILD STYLES OBJECT
  const styles = {
    // Use computed values, not raw interpolation
    container: {
      backgroundColor: system.colors.background,
      padding: `${16 * system.spacing}px`,
      // ...
    },
    // ...
  };

  // 4. CONDITIONAL RENDERING based on modes
  if (presentationMode === 'reference') {
    return (/* compact layout */);
  } else if (presentationMode === 'standard') {
    return (/* balanced layout */);
  } else {
    return (/* immersive layout */);
  }
}
```

### Critical Rules:

✓ **Use useState for interaction state** (checked items, expanded sections, etc.)  
✓ **NO import statements** (React hooks already available)  
✓ **Function must be named "App"**  
✓ **Root div must match device dimensions exactly**  
✓ **Accept onTransition prop** for flow navigation  
✓ **Use inline styles** for all styling  
✓ **Define helper components INSIDE App function** (not outside)  
✓ **Ensure accessibility at all parameter values**

---

## PHASE 4: VARIATION_SPACE DEFINITION

For each dimension, provide:

```json
{
  "id": "presentation_strategy",
  "label": "Presentation Strategy",
  "description": "How this UI positions itself to the user",

  "min_label": "Quick Reference",
  "max_label": "Rich Experience",
  "default_value": 50,

  "pattern": "layout_mode_switching",
  "type": "categorical",

  "affects": [
    "layoutStructure",
    "contentVisibility",
    "imageProminence",
    "textVerbosity",
    "interactionModel"
  ],

  "philosophical_extremes": {
    "0": {
      "name": "Quick Reference",
      "intent": "Fast lookup for experienced users",
      "characteristics": [
        "Assumes expertise",
        "Prioritizes speed",
        "Minimal storytelling",
        "Compact data display"
      ]
    },
    "100": {
      "name": "Rich Experience",
      "intent": "Immersive journey for engaged users",
      "characteristics": [
        "Educational approach",
        "Emphasizes discovery",
        "Story-driven",
        "Generous whitespace"
      ]
    }
  },

  "sample_values": {
    "0": {
      "layout": "single_column_compact",
      "visibleItems": 8,
      "imageSize": "thumbnail",
      "textLength": "minimal"
    },
    "50": {
      "layout": "two_column_balanced",
      "visibleItems": 6,
      "imageSize": "medium",
      "textLength": "standard"
    },
    "100": {
      "layout": "hero_immersive",
      "visibleItems": 3,
      "imageSize": "fullscreen",
      "textLength": "comprehensive"
    }
  }
}
```

**Required Fields:**

- `id`: Snake_case semantic name
- `label`: Human-readable title
- `description`: What design question this answers
- `min_label` / `max_label`: Contextually meaningful (not "Low/High")
- `default_value`: Usually 50 for balance
- `pattern`: Which pattern from library (e.g. "layout_mode_switching")
- `type`: "categorical", "continuous", or "hybrid"
- `affects`: List of high-level design aspects (not CSS properties)
- `philosophical_extremes`: Design intent at each end
- `sample_values`: Concrete examples at 0, 50, 100

---

## INTERPOLATION UTILITIES

These functions are automatically available (DO NOT define them):

**`interpolate(value, points)`** - Linear interpolation

- Example: `interpolate(50, {0: 16, 50: 24, 100: 32})` → `24`
- Works with numbers, px, rem, em, %, etc.

**`interpolateColor(value, points)`** - Color interpolation

- Example: `interpolateColor(50, {0: '#FF0000', 100: '#0000FF'})` → `'#800080'`

**Helper functions you can define:**

```jsx
// Quadratic curve for emphasis
const emphasize = (val) => Math.pow(val / 100, 2);

// Typography ratio scaling
const scaleType = (base, ratio, steps) => base * Math.pow(ratio, steps);

// Threshold checking
const isMode = (val, mode) =>
  mode === "low"
    ? val < 33
    : mode === "mid"
    ? val >= 33 && val < 66
    : val >= 66;
```

---

## VALIDATION CHECKLIST

Before submitting, verify:

- [ ] 2-4 dimensions identified (not more, not less)
- [ ] Each dimension represents a **design philosophy shift**, not style tweaks
- [ ] Min/max labels are **contextually meaningful** (not generic)
- [ ] Each dimension affects **3-5 coordinated aspects**
- [ ] At least **one structural mode switch** (layout/component polymorphism)
- [ ] At least **one value scale system** (multiplier/curve/ratio)
- [ ] Parameter extremes create **visibly different experiences**
- [ ] All parameter combinations are **usable and accessible**
- [ ] Code uses **established patterns from library**

---

## OUTPUT FORMAT

Return exactly this structure:

````
VARIATION_SPACE:
```json
{
  "dimensions": [
    { /* dimension 1 */ },
    { /* dimension 2 */ },
    { /* dimension 3 (optional) */ },
    { /* dimension 4 (optional) */ }
  ],
  "metadata": {
    "ui_type": "recipe_card",
    "generated_at": "2026-01-03T12:00:00Z",
    "task_context": "Task description here"
  }
}
````

UI_CODE:

```jsx
export default function App({ onTransition, parameters = {} }) {
  // Your parametric component code
}

// Interpolation functions are auto-injected, don't define them
```

```

---

## EXAMPLES OF EXCELLENT DIMENSIONS

### ✅ Good: "Content Presentation Strategy"
- Represents: Different ways to present same information
- Extremes: "Scannable List" vs. "Immersive Stories"
- Changes: Layout grid (1 vs 3 cols), image size (thumb vs hero), text (labels vs paragraphs), interaction (click-to-expand vs inline)
- Pattern: Layout mode switching + content visibility

### ✅ Good: "Interface Personality"
- Represents: The emotional character of the UI
- Extremes: "Clinical Professional" vs. "Warm Approachable"
- Changes: Design system (monochrome vs colorful), shapes (sharp vs round), shadows (none vs dramatic), typography (mono vs serif)
- Pattern: Design system presets

### ✅ Good: "Interaction Responsiveness"
- Represents: How UI responds to user actions
- Extremes: "Instant Utility" vs. "Delightful Experience"
- Changes: Animation duration (0ms vs 500ms), easing (linear vs bounce), hover effects (none vs scale+shadow), feedback (none vs ripples)
- Pattern: Interaction timing orchestra + component polymorphism

### ❌ Bad: "Font Size"
- Represents: Just one CSS property
- Doesn't embody a design philosophy
- No coordinated changes

### ❌ Bad: "Color Intensity"
- Too vague, no clear design intent
- Just tweaking saturation values
- No structural or behavioral changes

---

## REMEMBER

**You are designing experiences, not styling divs.**

Think: "What fundamentally different design approaches could serve this use case?"
Not: "What CSS properties should I interpolate?"

Generate UI that makes designers say: "Wow, these are truly different designs!" not "Oh, things got slightly bigger."

---

**Begin your analysis. Identify the design tensions. Choose your patterns. Create magic.**
```
