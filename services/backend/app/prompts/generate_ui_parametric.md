# PARAMETRIC UI GENERATION WITH DESIGNER TASTE - V2.1

**Mission:** Generate parametric React components that embody the master designer's visual intelligence while enabling meaningful design exploration.

---

## CRITICAL FOUNDATIONS

### **1. Designer Taste is PRIMARY**

You will receive a **Designer Taste Model (DTM v2)** that defines this designer's signature:

- **Spacing quantum** and rhythm systems
- **Typography scale** and weight preferences
- **Color palette** and temperature preferences
- **Form language** (corner radii, borders, shadows)
- **Signature patterns** (glassmorphism, gradients, effects)

**The generated UI MUST embody this designer's taste at ALL parameter values.**

Parameters control DESIGN PHILOSOPHY, not whether to use DTM. DTM is constant.

### **2. Design Thinking Over CSS Tweaking**

❌ WRONG: "This parameter changes blur from 20px to 40px"  
✅ RIGHT: "This parameter shifts design philosophy from 'clinical utility' to 'immersive experience' by coordinating layout, content, blur, spacing, and shadows"

---

## PHASE 1: DESIGN ANALYSIS

### **Understand the Design Space**

Before generating code, analyze THIS SPECIFIC UI to identify genuinely meaningful design tensions:

**Ask yourself:**

1. **What are the competing design philosophies for THIS task?**

   - "Quick control" vs. "Immersive listening" (music player)
   - "Data density" vs. "Breathing room" (dashboard)
   - "Beginner guidance" vs. "Power user efficiency" (form)

2. **What structural variations would genuinely serve different user contexts?**

   - Compact bar vs. expanded card vs. fullscreen hero
   - List view vs. grid view vs. kanban board
   - Wizard flow vs. single page vs. tabs

3. **Which aspects of THIS design could meaningfully vary?**
   - Information architecture
   - Content visibility/priority
   - Interaction model
   - Visual atmosphere

**CRITICAL**: Only identify dimensions where the extremes represent **fundamentally different design approaches** for this specific use case.

### **Quality Filter: Is This Dimension Worth Including?**

Before adding a dimension, ask:

✅ **INCLUDE if:**

- The extremes represent different design philosophies for THIS task
- Moving the slider creates a noticeably different user experience
- The dimension coordinates 3+ aspects of the design
- It's specific to this UI type (not generic)

❌ **EXCLUDE if:**

- It just changes generic style properties (blur, shadow, animation speed)
- It could apply to ANY UI with the same result
- The extremes are "less" vs. "more" of the same thing
- It's filling a slot to hit a target count

**Example for a music card:**

- ✅ INCLUDE: "Presentation Strategy" (utility player ↔ album showcase) - Specific to music!
- ❌ EXCLUDE: "Visual Depth" (flat ↔ layered) - Could apply to ANY card
- ❌ EXCLUDE: "Animation Speed" (instant ↔ smooth) - Generic, not music-specific

---

## PHASE 2: DIMENSION IDENTIFICATION

### **Flexible Dimension Count**

**Generate 1-6 dimensions** based on what THIS UI genuinely needs:

- **Simple UIs** (single-purpose cards, minimal controls): 1-2 dimensions
- **Standard UIs** (typical screens, moderate complexity): 2-3 dimensions
- **Complex UIs** (dashboards, multi-function tools): 3-5 dimensions
- **Very complex UIs** (design tools, advanced editors): 4-6 dimensions

**DO NOT force 3-4 dimensions if the design doesn't warrant it.**

### **Dimension Requirements**

Each dimension MUST have:

1. **Semantic ID**: `presentation_strategy`, `information_architecture`, `user_expertise_level`

   - ❌ NOT: `visual_style`, `spacing_amount`, `blur_intensity`

2. **Clear Design Intent**:

   - ✅ "How the recipe positions itself: quick reference for cooks vs. culinary journey for enthusiasts"
   - ❌ "Changes spacing and font size"

3. **Contextually Meaningful Extremes**:

   - ✅ min="Utility Player" max="Album Experience" (for music card)
   - ✅ min="Quick Reference" max="Culinary Journey" (for recipe)
   - ❌ min="Minimal" max="Rich"

4. **Multi-Faceted Impact** (affects 3-5 coordinated aspects):

   - Layout structure
   - Content visibility
   - Typography treatment
   - Visual atmosphere (using DTM patterns!)
   - Interaction model

5. **Pattern Selection**: Choose from library (see below)

### **Apply DTM Throughout**

**CRITICAL**: At EVERY parameter value, the UI must show the designer's taste:

```jsx
// WRONG - Abandoning DTM at extremes
if (materiality < 30) {
  // Generic minimal style, no DTM
  blur = 0;
  shadow = "none";
  colors = generic;
}

// RIGHT - DTM taste at all parameter values
if (materiality < 30) {
  // Clinical version of DTM style
  blur = dtm.minimal_blur; // DTM's version of "minimal"
  shadow = dtm.subtle_shadow; // DTM's version of "subtle"
  colors = dtm.palette; // Always DTM colors
  corners = dtm.radii; // Always DTM corners
}
```

**The designer's signature should be recognizable at 0%, 50%, AND 100%.**

---

## PARAMETRIC PATTERN LIBRARY

Use these patterns, but **always apply DTM styling**:

### **CATEGORY 1: Value Scales** (continuous variation)

**Pattern: Global Scale Multiplier**

```jsx
const scale = 0.7 + (parameters.interface_scale / 100) * 0.6;
const spacing = {
  xs: dtm.spacing.quantum * 0.5 * scale, // DTM quantum!
  sm: dtm.spacing.quantum * scale,
  md: dtm.spacing.quantum * 2 * scale,
  // ...
};
```

**Pattern: Non-Linear Emphasis Curve**

```jsx
const curve = Math.pow(emphasis / 100, 2);
const headingSize = dtm.typography.sizes.h2 + curve * 20; // DTM base!
const headingWeight = dtm.typography.weights.medium + curve * 200;
```

### **CATEGORY 2: Structural Modes** (categorical variation)

**Pattern: Layout Mode Switching**

```jsx
const mode =
  density < 30 ? "focus" : density < 70 ? "balanced" : "comprehensive";

// Each mode uses DTM styling!
if (mode === "focus") {
  return (
    <SingleColumn
      spacing={dtm.spacing.quantum * 4} // DTM!
      corners={dtm.form.radii.large} // DTM!
      colors={dtm.colors} // DTM!
    >
      {/* Large cards with DTM treatment */}
    </SingleColumn>
  );
}
```

**Pattern: Component Polymorphism**

```jsx
// Define variants - all with DTM styling!
const ButtonInstant = ({ ...props }) => (
  <button
    style={{
      background: dtm.colors.primary, // DTM!
      borderRadius: dtm.form.radii.small, // DTM!
      padding: dtm.spacing.quantum, // DTM!
      transition: "none", // This varies
    }}
  >
    {props.children}
  </button>
);

const ButtonSmooth = ({ ...props }) => (
  <button
    style={{
      background: dtm.colors.primary, // DTM!
      borderRadius: dtm.form.radii.small, // DTM!
      padding: dtm.spacing.quantum, // DTM!
      transition: "all 0.3s ease", // This varies
    }}
  >
    {props.children}
  </button>
);
```

### **CATEGORY 3: Design Language Shifts**

**Pattern: Design System Presets**

```jsx
const getAtmosphere = (intensity) => {
  if (intensity < 33) {
    return {
      name: "clinical",
      blur: dtm.effects.blur.minimal, // DTM minimal
      shadow: dtm.effects.shadow.subtle, // DTM subtle
      gradient: dtm.signature.gradient.light, // DTM signature!
      opacity: 0.05,
      corners: dtm.form.radii.small,
    };
  } else if (intensity < 66) {
    return {
      name: "balanced",
      blur: dtm.effects.blur.standard, // DTM standard
      shadow: dtm.effects.shadow.medium, // DTM medium
      gradient: dtm.signature.gradient.standard,
      opacity: 0.15,
      corners: dtm.form.radii.medium,
    };
  } else {
    return {
      name: "immersive",
      blur: dtm.effects.blur.heavy, // DTM heavy
      shadow: dtm.effects.shadow.dramatic, // DTM dramatic
      gradient: dtm.signature.gradient.rich,
      opacity: 0.25,
      corners: dtm.form.radii.large,
    };
  }
};
```

**CRITICAL**: All presets use DTM values, just different intensities of the same design language.

---

## PHASE 3: CODE GENERATION

### **Structure Requirements**

```jsx
export default function App({ onTransition, parameters = {} }) {
  // 1. EXTRACT DTM (passed via parameters)
  const dtm = parameters.__dtm__ || DEFAULT_DTM;

  // 2. EXTRACT PARAMETER VALUES
  const {
    presentation_strategy = 50,
    visual_intensity = 50,
    // ...
  } = parameters;

  // 3. COMPUTE MODES/SYSTEMS using DTM
  const presentationMode =
    presentation_strategy < 30
      ? "compact"
      : presentation_strategy < 70
      ? "standard"
      : "immersive";

  const atmosphere = getAtmosphere(visual_intensity, dtm); // Pass DTM!

  // 4. BUILD STYLES using DTM
  const styles = {
    container: {
      padding: dtm.spacing.quantum * 2,
      borderRadius: dtm.form.radii.medium,
      background: dtm.colors.surface,
      // Apply signature patterns!
      backdropFilter: `blur(${atmosphere.blur}px)`,
      boxShadow: atmosphere.shadow,
    },
  };

  // 5. DEFINE HELPER COMPONENTS **INSIDE App FUNCTION**
  // NOT outside! This prevents Babel transpilation issues.
  const Card = ({ children }) => (
    <div
      style={{
        background: dtm.colors.card,
        borderRadius: dtm.form.radii.medium,
        padding: dtm.spacing.quantum * 3,
        boxShadow: dtm.effects.shadow.medium,
      }}
    >
      {children}
    </div>
  );

  // 6. APPLY SIGNATURE PATTERNS
  // If DTM has signature patterns, USE THEM at appropriate parameter values
  const applySignatureBlur = visual_intensity > 30;
  const applySignatureGradient = presentation_strategy > 50;

  // 7. RENDER with DTM throughout
  return (
    <div style={styles.container}>{/* Content using DTM everywhere */}</div>
  );
}
```

### **Critical Rules**

✓ **Use DTM at all parameter values** - Signature must be recognizable  
✓ **Define helper components INSIDE App function** - Prevents warnings  
✓ **Apply signature patterns from DTM** - Glassmorphism, gradients, etc.  
✓ **Use DTM spacing quantum throughout**  
✓ **Use DTM typography scale**  
✓ **Use DTM color palette**  
✓ **Use DTM corner radii**  
✓ **NO import statements** (React hooks already available)  
✓ **Function must be named "App"**  
✓ **Root div matches device dimensions**  
✓ **Accept onTransition prop**

---

## PHASE 4: VARIATION_SPACE DEFINITION

```json
{
  "dimensions": [
    {
      "id": "presentation_strategy",
      "label": "Presentation Strategy",
      "description": "How this music player balances utility vs. immersive experience",

      "min_label": "Quick Control",
      "max_label": "Album Showcase",
      "default_value": 50,

      "pattern": "layout_mode_switching",
      "type": "categorical",

      "affects": [
        "layoutStructure",
        "artworkProminence",
        "metadataVisibility",
        "spacingScale",
        "dtmSignatureIntensity"
      ],

      "quality_indicators": {
        "task_specific": true,
        "design_philosophy_shift": true,
        "multi_faceted": true,
        "dtm_maintained": true
      },

      "philosophical_extremes": {
        "0": {
          "name": "Quick Control",
          "intent": "Minimal utility player for background listening",
          "characteristics": [
            "Compact horizontal bar layout",
            "Small album thumbnail",
            "Essential controls only",
            "DTM minimal glass treatment",
            "DTM spacing: tight quantum multiples"
          ]
        },
        "100": {
          "name": "Album Showcase",
          "intent": "Immersive experience for active music appreciation",
          "characteristics": [
            "Vertical hero layout",
            "Dominant album artwork",
            "Full metadata + context",
            "DTM rich glass treatment",
            "DTM spacing: generous quantum multiples"
          ]
        }
      },

      "sample_values": {
        "0": {
          "layout": "horizontal_bar",
          "artworkSize": "56px",
          "dtmBlur": "12px",
          "dtmShadow": "subtle",
          "spacing": "1x quantum"
        },
        "50": {
          "layout": "card_balanced",
          "artworkSize": "200px",
          "dtmBlur": "24px",
          "dtmShadow": "medium",
          "spacing": "2x quantum"
        },
        "100": {
          "layout": "immersive_hero",
          "artworkSize": "360px",
          "dtmBlur": "40px",
          "dtmShadow": "dramatic",
          "spacing": "3x quantum"
        }
      }
    }
  ],
  "metadata": {
    "ui_type": "music_player_card",
    "generated_at": "2026-01-03T12:00:00Z",
    "task_context": "Music card with DTM glassmorphic treatment",
    "dtm_applied": true,
    "dimension_count": 1,
    "dimension_count_rationale": "Music card is simple single-purpose UI - only one genuinely meaningful dimension (utility vs showcase). Other aspects (blur, animation) are consequences of this primary tension, not separate dimensions."
  }
}
```

**Required Fields:**

- `id`: Snake_case, task-specific name
- `label`: Human-readable
- `description`: What design question this answers FOR THIS TASK
- `min_label` / `max_label`: Contextually meaningful (not "Low/High")
- `pattern`: Which pattern from library
- `type`: "categorical", "continuous", or "hybrid"
- `affects`: High-level design aspects (include "dtmSignatureIntensity"!)
- `quality_indicators`: Self-assessment of dimension quality
- `philosophical_extremes`: Design intent at each end
- `sample_values`: Concrete examples showing DTM application

**Metadata additions:**

- `dtm_applied`: Confirm DTM was used
- `dimension_count`: How many dimensions generated
- `dimension_count_rationale`: WHY this count (not forced to 3-4)

---

## VALIDATION CHECKLIST

Before submitting, verify:

- [ ] **DTM APPLIED**: Designer's signature visible at 0%, 50%, 100%
- [ ] **TASK-SPECIFIC**: Dimensions are specific to THIS UI type
- [ ] **QUALITY OVER QUANTITY**: Only included truly meaningful dimensions (1-6)
- [ ] **DESIGN PHILOSOPHY**: Each dimension represents competing philosophies
- [ ] **MULTI-FACETED**: Each dimension affects 3+ coordinated aspects
- [ ] **STRUCTURAL VARIATION**: At least one mode switch OR value scale
- [ ] **HELPER COMPONENTS INSIDE**: No components defined outside App
- [ ] **ALL COMBINATIONS USABLE**: Every parameter combo maintains DTM signature

---

## OUTPUT FORMAT

````
VARIATION_SPACE:
```json
{
  "dimensions": [...],
  "metadata": {
    "dtm_applied": true,
    "dimension_count": 2,
    "dimension_count_rationale": "..."
  }
}
````

UI_CODE:

```jsx
export default function App({ onTransition, parameters = {} }) {
  const dtm = parameters.__dtm__ || DEFAULT_DTM;

  // Helper components INSIDE App
  const Card = () => {
    /* using DTM */
  };

  // All styling uses DTM
  const styles = {
    container: {
      padding: dtm.spacing.quantum * 2,
      // ...
    },
  };

  return <div style={styles.container}>...</div>;
}

// Interpolation functions auto-injected (don't define)
```

````

---

## EXAMPLES OF EXCELLENT DIMENSIONS

### ✅ Good: Task-Specific + DTM Throughout

```json
{
  "id": "recipe_engagement_level",
  "label": "Recipe Engagement",
  "description": "How the recipe card serves quick cooks vs. culinary learners",
  "min_label": "Quick Reference",
  "max_label": "Culinary Journey",
  "philosophical_extremes": {
    "0": {
      "name": "Quick Reference",
      "intent": "Fast ingredient list for experienced cooks",
      "characteristics": [
        "Compact checklist layout",
        "Ingredient names only",
        "DTM minimal card treatment",
        "DTM tight spacing (1x quantum)",
        "DTM subtle shadow"
      ]
    },
    "100": {
      "name": "Culinary Journey",
      "intent": "Educational experience with context and techniques",
      "characteristics": [
        "Expanded storytelling layout",
        "Ingredient details + substitutions",
        "DTM rich glass treatment",
        "DTM generous spacing (3x quantum)",
        "DTM dramatic shadow"
      ]
    }
  }
}
````

**Why this is excellent:**

- ✅ Specific to recipes (not generic)
- ✅ Clear design philosophies (quick vs. learning)
- ✅ DTM maintained at both extremes
- ✅ Affects layout, content, and DTM intensity

### ❌ Bad: Generic + No DTM Consideration

```json
{
  "id": "visual_depth",
  "label": "Visual Depth",
  "description": "Amount of depth effects",
  "min_label": "Flat",
  "max_label": "Layered"
}
```

**Why this is bad:**

- ❌ Could apply to ANY UI
- ❌ Just changes blur/shadow amounts
- ❌ No design philosophy
- ❌ Doesn't mention DTM

---

## CRITICAL REMINDERS

### **Designer Taste is Non-Negotiable**

Even when parameters create variation, the designer's signature must shine through:

- **Spacing**: Always based on DTM quantum, just different multiples
- **Colors**: Always from DTM palette, just different opacities/combinations
- **Corners**: Always from DTM radii set, just different selections
- **Shadows**: Always DTM shadow formulas, just different intensities
- **Patterns**: Always DTM signature patterns (glass, gradients), just different prominence

**At every parameter value, a designer should recognize their work.**

### **Quality Over Quantity**

Better to have 1 excellent dimension than 3 mediocre ones:

- 1 dimension is fine for simple UIs
- 2 dimensions is typical for standard UIs
- 3+ dimensions only for genuinely complex UIs

**Don't force dimensions to hit a target count.**

### **Task-Specific Thinking**

Ask for EVERY dimension:

- "Is this specific to a music player?" or "Could ANY UI have this?"
- "Does this create different design philosophies?" or "Is it just more/less of same thing?"

---

**Begin your analysis. Apply DTM. Identify genuine design tensions. Create meaningful variation.**
