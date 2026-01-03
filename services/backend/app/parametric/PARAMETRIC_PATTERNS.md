# Parametric Design Pattern Library

**Version:** 2.0 - Design Abstraction Focus  
**Purpose:** Reference guide for generating parametric React components with meaningful design variation

---

## Philosophy

**Traditional parametric design**: Change CSS values proportionally  
**Our approach**: Change design philosophy, structure, and experience

**Key Principle**: A parameter should represent a **design decision**, not a style property.

---

## Pattern Taxonomy

### **Category 1: Value Scales & Systems**

Numerical parameters that affect coordinated value transformations.

### **Category 2: Structural Modes**

Categorical parameters that switch between fundamentally different layouts/structures.

### **Category 3: Design Language Shifts**

Parameters that transform the entire visual/interaction system.

### **Category 4: Content Strategy**

Parameters that change what information is shown and how it's prioritized.

---

## Category 1: Value Scales & Systems

### Pattern 1.1: **Global Scale Multiplier**

**When to use**: Need proportional scaling across the entire UI while maintaining relationships.

**Design Intent**: "Make everything bigger/smaller while keeping the design balanced"

**Code Template**:

```jsx
export default function App({ parameters = {} }) {
  const scale = parameters.scale || 50;
  const scaleMultiplier = 0.7 + (scale / 100) * 0.6; // 0.7x to 1.3x

  const spacing = {
    xs: 4 * scaleMultiplier,
    sm: 8 * scaleMultiplier,
    md: 16 * scaleMultiplier,
    lg: 24 * scaleMultiplier,
    xl: 32 * scaleMultiplier,
    xxl: 48 * scaleMultiplier
  };

  const typography = {
    caption: 12 * scaleMultiplier,
    body: 14 * scaleMultiplier,
    subtitle: 18 * scaleMultiplier,
    title: 24 * scaleMultiplier,
    display: 32 * scaleMultiplier
  };

  // Use throughout component
  <div style={{ padding: `${spacing.md}px`, fontSize: `${typography.body}px` }}>
}
```

**Example Dimension**:

```json
{
  "id": "interface_scale",
  "label": "Interface Scale",
  "description": "Overall size of UI elements",
  "min_label": "Compact",
  "max_label": "Generous",
  "default_value": 50,
  "pattern": "global_scale_multiplier",
  "affects": ["spacing", "typography", "iconSizes", "hitAreas"]
}
```

---

### Pattern 1.2: **Non-Linear Emphasis Curve**

**When to use**: Want dramatic differences in hierarchy/emphasis based on parameter value.

**Design Intent**: "Subtle hierarchy vs. dramatic hierarchy"

**Code Template**:

```jsx
const emphasis = parameters.visual_hierarchy || 50;
const emphasisCurve = Math.pow(emphasis / 100, 2); // Quadratic curve

// Small heading sizes at low values, exponential growth at high values
const headingWeight = 400 + emphasisCurve * 400; // 400 to 800
const headingSize = 18 + emphasisCurve * 30; // 18px to 48px
const headingLetterSpacing = -0.02 - emphasisCurve * 0.04; // -0.02em to -0.06em

// Body text gets de-emphasized as headings get more emphasized
const bodyOpacity = 1.0 - emphasisCurve * 0.4; // 1.0 to 0.6
const bodySize = 16 - emphasisCurve * 2; // 16px to 14px

const styles = {
  heading: {
    fontSize: `${headingSize}px`,
    fontWeight: headingWeight,
    letterSpacing: `${headingLetterSpacing}em`,
    lineHeight: 1.1,
  },
  body: {
    fontSize: `${bodySize}px`,
    opacity: bodyOpacity,
    lineHeight: 1.6,
  },
};
```

**Example Dimension**:

```json
{
  "id": "hierarchy_strength",
  "label": "Hierarchy Strength",
  "description": "How dramatically headings stand out from body text",
  "min_label": "Subtle",
  "max_label": "Dramatic",
  "default_value": 50,
  "pattern": "non_linear_emphasis"
}
```

---

### Pattern 1.3: **Ratio-Based Typography System**

**When to use**: Want harmonious or dramatic type scales based on mathematical ratios.

**Design Intent**: "Gentle progression vs. bold leaps in text sizing"

**Code Template**:

```jsx
const hierarchy = parameters.typographic_scale || 50;

// Ratio from 1.125 (Major Second) to 1.618 (Golden Ratio)
const scaleRatio = 1.125 + (hierarchy / 100) * 0.493; // 1.125 to 1.618

const baseSize = 16;
const fontSizes = {
  xs: baseSize / Math.pow(scaleRatio, 2), // Much smaller
  sm: baseSize / scaleRatio, // Smaller
  base: baseSize, // Base
  md: baseSize * scaleRatio, // Larger
  lg: baseSize * Math.pow(scaleRatio, 2), // Much larger
  xl: baseSize * Math.pow(scaleRatio, 3), // Huge
  xxl: baseSize * Math.pow(scaleRatio, 4), // Display
};

// At low ratio (1.125): sizes are 12.6, 14.2, 16, 18, 20.3, 22.8, 25.6
// At high ratio (1.618): sizes are 6.1, 9.9, 16, 25.9, 41.9, 67.8, 109.7
```

**Example Dimension**:

```json
{
  "id": "scale_drama",
  "label": "Scale Drama",
  "description": "Mathematical progression of text sizes",
  "min_label": "Gentle Steps",
  "max_label": "Bold Leaps",
  "default_value": 50,
  "pattern": "ratio_based_system"
}
```

---

### Pattern 1.4: **Multi-Parameter Formula**

**When to use**: A style property should be influenced by multiple design decisions.

**Design Intent**: "Complex design outcomes from simple parameter combinations"

**Code Template**:

```jsx
const warmth = parameters.visual_warmth || 50;
const energy = parameters.energy_level || 50;
const formality = parameters.formality || 50;

// Saturation increases with warmth and energy, decreases with formality
const saturation =
  30 + // Base saturation
  (warmth / 100) * 40 + // Warmth adds 0-40
  (energy / 100) * 20 - // Energy adds 0-20
  (formality / 100) * 30; // Formality subtracts 0-30 // Range: 20-90%

// Border radius: inverse to formality, boosted by warmth
const borderRadius =
  (1 - formality / 100) * 24 + // Less formal = rounder
  (warmth / 100) * 8; // Warmth adds softness // Range: 0-32px

// Shadow: increases with energy, softens with warmth
const shadowBlur = 12 + (energy / 100) * 28; // 12-40px
const shadowOpacity = 0.15 - (warmth / 100) * 0.1; // 0.15-0.05 (warmer = softer)
```

---

## Category 2: Structural Modes

### Pattern 2.1: **Layout Mode Switching**

**When to use**: The UI should have fundamentally different layouts based on use case.

**Design Intent**: "Different information architectures for different contexts"

**Code Template**:

```jsx
const densityMode =
  parameters.information_density < 30
    ? "focus"
    : parameters.information_density < 70
    ? "balanced"
    : "comprehensive";

const layouts = {
  focus: {
    columns: 1,
    itemsPerPage: 3,
    showMetadata: false,
    cardStyle: "expanded",
    imageSize: "hero",
  },
  balanced: {
    columns: 2,
    itemsPerPage: 6,
    showMetadata: true,
    cardStyle: "standard",
    imageSize: "medium",
  },
  comprehensive: {
    columns: 3,
    itemsPerPage: 12,
    showMetadata: true,
    cardStyle: "compact",
    imageSize: "thumbnail",
  },
};

const layout = layouts[densityMode];

return (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
      gap:
        layout.columns === 1 ? "32px" : layout.columns === 2 ? "16px" : "8px",
    }}
  >
    {items
      .slice(0, layout.itemsPerPage)
      .map((item) =>
        layout.cardStyle === "expanded" ? (
          <ExpandedCard
            {...item}
            showMeta={layout.showMetadata}
            imageSize={layout.imageSize}
          />
        ) : layout.cardStyle === "standard" ? (
          <StandardCard
            {...item}
            showMeta={layout.showMetadata}
            imageSize={layout.imageSize}
          />
        ) : (
          <CompactCard
            {...item}
            showMeta={layout.showMetadata}
            imageSize={layout.imageSize}
          />
        )
      )}
  </div>
);
```

**Example Dimension**:

```json
{
  "id": "presentation_density",
  "label": "Presentation Density",
  "description": "How much information is shown simultaneously",
  "min_label": "Focused View",
  "max_label": "Comprehensive Grid",
  "default_value": 50,
  "pattern": "layout_mode_switching",
  "states": ["focus", "balanced", "comprehensive"]
}
```

---

### Pattern 2.2: **Component Polymorphism**

**When to use**: Different interaction patterns require different component implementations.

**Design Intent**: "Instant vs. smooth vs. delightful interactions"

**Code Template**:

```jsx
// Define component variants inline
const CheckboxInstant = ({ checked, onChange, label }) => (
  <div
    onClick={onChange}
    style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
  >
    <div
      style={{
        width: "20px",
        height: "20px",
        border: "2px solid #333",
        backgroundColor: checked ? "#333" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && <span style={{ color: "#fff" }}>✓</span>}
    </div>
    <span style={{ marginLeft: "8px" }}>{label}</span>
  </div>
);

const CheckboxAnimated = ({ checked, onChange, label }) => (
  <div
    onClick={onChange}
    style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
  >
    <div
      style={{
        width: "20px",
        height: "20px",
        border: "2px solid #333",
        backgroundColor: checked ? "#333" : "transparent",
        transition: "all 0.3s ease",
        borderRadius: "4px",
        transform: checked ? "scale(1.1)" : "scale(1)",
      }}
    >
      {checked && <span style={{ color: "#fff" }}>✓</span>}
    </div>
    <span style={{ marginLeft: "8px" }}>{label}</span>
  </div>
);

const CheckboxDelightful = ({ checked, onChange, label }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onClick={onChange}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          border: "2px solid #333",
          backgroundColor: checked ? "#333" : "transparent",
          transition: "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
          borderRadius: checked ? "50%" : "4px",
          transform: isHovered
            ? "scale(1.2) rotate(10deg)"
            : checked
            ? "scale(1.1)"
            : "scale(1)",
          boxShadow: checked ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
        }}
      >
        {checked && <span style={{ color: "#fff", fontSize: "14px" }}>✓</span>}
      </div>
      <span style={{ marginLeft: "10px", transition: "all 0.2s" }}>
        {label}
      </span>
    </div>
  );
};

// Select component based on parameter
const interactionStyle = parameters.interaction_style || 50;
const CheckboxComponent =
  interactionStyle < 35
    ? CheckboxInstant
    : interactionStyle < 70
    ? CheckboxAnimated
    : CheckboxDelightful;

// Use polymorphic component
<CheckboxComponent checked={checked} onChange={toggle} label="Remember me" />;
```

---

### Pattern 2.3: **Content Visibility Cascading**

**When to use**: Different detail levels should show/hide information progressively.

**Design Intent**: "Essential only vs. everything visible"

**Code Template**:

```jsx
const detailLevel = parameters.detail_level || 50;

// Progressive disclosure thresholds
const showBasic = true; // Always show
const showStandard = detailLevel > 25; // Show at 25%+
const showAdvanced = detailLevel > 50; // Show at 50%+
const showComprehensive = detailLevel > 75; // Show at 75%+

return (
  <div>
    {/* Always visible */}
    <h1>{recipe.title}</h1>
    <img src={recipe.image} />

    {/* Standard detail */}
    {showStandard && (
      <div>
        <p>{recipe.description}</p>
        <div>
          ⏱ {recipe.time} | 🍽 {recipe.servings} servings
        </div>
      </div>
    )}

    {/* Advanced detail */}
    {showAdvanced && (
      <div>
        <h3>Ingredients</h3>
        <ul>
          {recipe.ingredients.map((ing) => (
            <li>{ing}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Comprehensive detail */}
    {showComprehensive && (
      <div>
        <h3>Nutrition Facts</h3>
        <NutritionTable {...recipe.nutrition} />
        <h3>Chef's Notes</h3>
        <p>{recipe.notes}</p>
        <h3>Substitutions</h3>
        <p>{recipe.substitutions}</p>
      </div>
    )}
  </div>
);
```

---

## Category 3: Design Language Shifts

### Pattern 3.1: **Design System Presets**

**When to use**: The entire visual language should shift based on context/mood.

**Design Intent**: "Clinical vs. balanced vs. expressive design languages"

**Code Template**:

```jsx
const mood = parameters.visual_mood || 50;

const getDesignSystem = (moodValue) => {
  if (moodValue < 33) {
    return {
      name: "clinical",
      colors: {
        primary: "#2C3E50",
        secondary: "#7F8C8D",
        accent: "#95A5A6",
        background: "#ECF0F1",
        text: "#2C3E50",
      },
      borderRadius: 0,
      shadows: {
        sm: "none",
        md: "none",
        lg: "none",
      },
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
      fontWeights: { normal: 400, medium: 500, bold: 600 },
      spacing: 1.0,
      iconStyle: "outlined",
      transitions: "none",
    };
  } else if (moodValue < 66) {
    return {
      name: "balanced",
      colors: {
        primary: "#3498DB",
        secondary: "#2ECC71",
        accent: "#E74C3C",
        background: "#FFFFFF",
        text: "#2C3E50",
      },
      borderRadius: 8,
      shadows: {
        sm: "0 1px 3px rgba(0,0,0,0.1)",
        md: "0 4px 12px rgba(0,0,0,0.1)",
        lg: "0 8px 24px rgba(0,0,0,0.12)",
      },
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeights: { normal: 400, medium: 600, bold: 700 },
      spacing: 1.0,
      iconStyle: "filled",
      transitions: "all 0.2s ease",
    };
  } else {
    return {
      name: "expressive",
      colors: {
        primary: "#9B59B6",
        secondary: "#F39C12",
        accent: "#E91E63",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        text: "#FFFFFF",
      },
      borderRadius: 24,
      shadows: {
        sm: "0 4px 12px rgba(155, 89, 182, 0.3)",
        md: "0 8px 24px rgba(155, 89, 182, 0.4)",
        lg: "0 16px 48px rgba(155, 89, 182, 0.5)",
      },
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeights: { normal: 400, medium: 700, bold: 900 },
      spacing: 1.2,
      iconStyle: "illustrated",
      transitions: "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    };
  }
};

const system = getDesignSystem(mood);

// Apply system throughout
const styles = {
  card: {
    backgroundColor: system.colors.background,
    borderRadius: `${system.borderRadius}px`,
    boxShadow: system.shadows.md,
    fontFamily: system.fontFamily,
    color: system.colors.text,
    padding: `${16 * system.spacing}px`,
    transition: system.transitions,
  },
  button: {
    backgroundColor: system.colors.primary,
    color: "#FFFFFF",
    borderRadius: `${system.borderRadius}px`,
    boxShadow: system.shadows.sm,
    fontWeight: system.fontWeights.bold,
    transition: system.transitions,
  },
};
```

---

### Pattern 3.2: **Interaction Timing Orchestra**

**When to use**: Animation and interaction speeds should coordinate across the UI.

**Design Intent**: "Instant responsiveness vs. graceful animations vs. playful physics"

**Code Template**:

```jsx
const interactionSpeed = parameters.interaction_feel || 50;

const timing = {
  instant: {
    duration: 0,
    easing: 'linear',
    hoverScale: 1.0,
    ripple: false
  },
  smooth: {
    duration: 250,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    hoverScale: 1.05,
    ripple: true
  },
  playful: {
    duration: 500,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    hoverScale: 1.1,
    ripple: true
  }
};

const t = interactionSpeed < 33 ? timing.instant :
          interactionSpeed < 66 ? timing.smooth :
          timing.playful;

const transition = t.duration > 0 ? `all ${t.duration}ms ${t.easing}` : 'none';

<button
  style={{ transition }}
  onMouseEnter={(e) => {
    if (t.hoverScale > 1.0) {
      e.currentTarget.style.transform = `scale(${t.hoverScale})`;
    }
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'scale(1)';
  }}
>
```

---

## Category 4: Content Strategy

### Pattern 4.1: **Text Verbosity Levels**

**When to use**: Different contexts need different amounts of explanatory text.

**Design Intent**: "Quick scan vs. detailed explanation"

**Code Template**:

```jsx
const verbosity = parameters.text_verbosity || 50;

const getContent = (minimal, standard, verbose) => {
  if (verbosity < 33) return minimal;
  if (verbosity < 66) return standard;
  return verbose;
};

return (
  <div>
    <h2>{item.title}</h2>
    <p>
      {getContent(
        item.tagline, // Minimal: just tagline
        item.description, // Standard: full description
        `${item.description} ${item.details} ${item.context}` // Verbose: everything
      )}
    </p>
    {verbosity > 50 && <Tips tips={item.tips} />}
    {verbosity > 75 && <Examples examples={item.examples} />}
  </div>
);
```

---

## Pattern 4.2: **Adaptive Complexity**

**When to use**: UI should adapt between simple/advanced user needs.

**Design Intent**: "Beginner-friendly vs. power-user interface"

**Code Template**:

```jsx
const complexity = parameters.ui_complexity || 50;

const isSimple = complexity < 40;
const isAdvanced = complexity > 60;

return (
  <div>
    {/* Simple mode: wizard-style */}
    {isSimple && (
      <WizardFlow>
        <Step1 />
        <Step2 />
        <Step3 />
      </WizardFlow>
    )}

    {/* Balanced mode: tabbed interface */}
    {!isSimple && !isAdvanced && (
      <TabbedInterface>
        <Tab name="Basic">
          <BasicSettings />
        </Tab>
        <Tab name="Advanced">
          <AdvancedSettings />
        </Tab>
      </TabbedInterface>
    )}

    {/* Advanced mode: all-at-once dashboard */}
    {isAdvanced && (
      <Dashboard>
        <BasicSettings />
        <AdvancedSettings />
        <ExpertSettings />
        <RealTimePreview />
      </Dashboard>
    )}
  </div>
);
```

---

## Best Practices

### 1. **Semantic Naming**

❌ Bad: `slider_1`, `value_a`, `parameter_x`  
✅ Good: `visual_hierarchy`, `interaction_feel`, `presentation_density`

### 2. **Design-Centric Descriptions**

❌ Bad: "Changes font size and padding"  
✅ Good: "How much information is shown at once"

### 3. **Meaningful Extremes**

❌ Bad: min="Low", max="High"  
✅ Good: min="Quick Reference", max="Rich Storytelling"

### 4. **Coordinated Changes**

A single parameter should affect 3-5 related properties that together create a coherent design change.

### 5. **Threshold-Based Logic**

Use clear thresholds (< 33, 33-66, > 66) rather than continuous interpolation for structural changes.

### 6. **State Machine Thinking**

For categorical changes, explicitly define modes/states and their characteristics.

---

## Anti-Patterns to Avoid

### ❌ **Single-Property Parameters**

```jsx
// BAD: Just changing one thing
const fontSize = interpolate(parameters.size, { 0: 14, 100: 18 });
```

### ❌ **Code-Centric Names**

```jsx
// BAD: Thinking in CSS properties
{
  "id": "padding_amount",
  "label": "Padding Amount"
}
```

### ❌ **Arbitrary Thresholds**

```jsx
// BAD: Magic numbers with no design logic
const mode = value < 47 ? "a" : value < 83 ? "b" : "c";
```

### ❌ **Disconnected Changes**

```jsx
// BAD: Changing unrelated things together
const param = parameters.misc || 50;
const buttonColor = interpolateColor(param, { 0: "red", 100: "blue" });
const shadowBlur = interpolate(param, { 0: 10, 100: 30 });
// These have no semantic relationship!
```

---

## Validation Checklist

Before generating parametric code, ensure:

- [ ] 2-4 dimensions identified (not more, not less)
- [ ] Each dimension has a clear **design intent** (not just "changes X property")
- [ ] Min/max labels are **contextually meaningful** (not "Low/High")
- [ ] Each dimension affects **3-5 coordinated properties**
- [ ] At least one dimension uses **structural mode switching**
- [ ] Parameter changes create **visibly different experiences**, not just tweaks
- [ ] Extremes (0 and 100) represent **coherent design philosophies**

---

**End of Pattern Library**
