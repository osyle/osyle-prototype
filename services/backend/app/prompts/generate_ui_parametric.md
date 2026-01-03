# PARAMETRIC UI GENERATION TASK

You are generating a React UI component with **parametric variation dimensions**.

## YOUR JOB

Generate a parametric React component that:

1. **Analyzes the UI semantically** to identify 2-4 meaningful HIGH-LEVEL dimensions

   - Think conceptually: "Information Density", "Visual Weight", "Formality"
   - NOT low-level: "Font Size" or "Padding" (these are consequences, not controls)
   - Each dimension should affect multiple properties in a coordinated way

2. **Generates parametric React code** that accepts a `parameters` prop

   - parameters = { dimension1: 0-100, dimension2: 0-100, ... }
   - Uses interpolation functions to compute styles dynamically
   - All style properties are computed based on parameter values

3. **Defines variation dimensions** with:
   - Label and description (for UI display)
   - Min/max labels (what does 0 mean? what does 100 mean?)
   - Default value (typically 50 for balanced)
   - Which CSS properties it affects
   - Sample values at key points (0, 50, 100)

## DIMENSION EXAMPLES

For a Dashboard UI, meaningful dimensions might be:

- **Information Density**: How much data shown at once

  - 0 = Focused (large cards, 1 column, generous spacing)
  - 100 = Comprehensive (small cards, 3 columns, tight spacing)
  - Affects: grid columns, padding, font sizes, card height

- **Visual Hierarchy**: Emphasis strength
  - 0 = Flat (subtle differences, similar weights)
  - 100 = Dramatic (bold headings, clear contrast)
  - Affects: heading sizes, font weights, color contrasts

For a Landing Page:

- **Emotional Intensity**: Energy level

  - 0 = Calm (muted colors, gentle gradients)
  - 100 = Energetic (vibrant colors, bold contrasts)
  - Affects: color saturation, gradient strength

- **Call-to-Action Strength**:
  - 0 = Subtle (integrated CTAs, soft emphasis)
  - 100 = Aggressive (prominent buttons, urgent emphasis)
  - Affects: button sizes, colors, positioning

## CRITICAL REQUIREMENTS

✓ Generate 2-4 dimensions (not more, not less)
✓ Each dimension must be semantically meaningful for THIS specific UI
✓ Dimensions should be conceptually independent (orthogonal)
✓ All parameter combinations must maintain usability
✓ Interpolate smoothly between min and max values
✓ Apply the designer's learned taste at all parameter values

## OUTPUT FORMAT

Return TWO sections:

### 1. VARIATION_SPACE (JSON)

```json
{
  "dimensions": [
    {
      "id": "information_density",
      "label": "Information Density",
      "description": "How much data is shown at once",
      "min_label": "Focused",
      "max_label": "Comprehensive",
      "default_value": 50,
      "affects": ["gridColumns", "cardPadding", "fontSize", "cardHeight"],
      "property_mappings": [
        {
          "property": "gridColumns",
          "min_value": 1,
          "max_value": 3,
          "interpolation_type": "linear"
        },
        {
          "property": "cardPadding",
          "min_value": "32px",
          "max_value": "16px",
          "interpolation_type": "linear"
        }
      ],
      "sample_values": {
        "0": { "gridColumns": 1, "cardPadding": "32px", "fontSize": "18px" },
        "50": { "gridColumns": 2, "cardPadding": "24px", "fontSize": "16px" },
        "100": { "gridColumns": 3, "cardPadding": "16px", "fontSize": "14px" }
      }
    }
  ],
  "metadata": {
    "ui_type": "dashboard",
    "generated_at": "2026-01-02T12:00:00Z",
    "task_context": "your task description"
  }
}
```

### 2. UI_CODE (React Component)

```jsx
export default function App({ onTransition, parameters = {} }) {
  // Extract parameters with defaults
  const { information_density = 50, visual_hierarchy = 50 } = parameters;

  // Compute all styles using interpolation
  const styles = {
    container: {
      display: "grid",
      gridTemplateColumns: `repeat(${Math.round(
        interpolate(information_density, {
          0: 1,
          50: 2,
          100: 3,
        })
      )}, 1fr)`,
      gap: interpolate(information_density, {
        0: "32px",
        50: "24px",
        100: "16px",
      }),
      padding: interpolate(information_density, {
        0: "32px",
        50: "24px",
        100: "16px",
      }),
    },

    heading: {
      fontSize: interpolate(visual_hierarchy, {
        0: "24px",
        50: "32px",
        100: "48px",
      }),
      fontWeight: Math.round(
        interpolate(visual_hierarchy, {
          0: 400,
          50: 600,
          100: 700,
        })
      ),
    },
  };

  return (
    <div
      style={{
        width: "390px",
        height: "844px",
        ...styles.container,
      }}
    >
      <h1 style={styles.heading}>Dashboard</h1>
      {/* Rest of UI */}
    </div>
  );
}
```

### INTERPOLATION UTILITIES

You have access to these utility functions (they're automatically available - just call them):

**`interpolate(value, points)`** - Interpolate numeric or string values

- Example: `interpolate(50, {0: '16px', 50: '24px', 100: '32px'})` → `'24px'`
- Works with: numbers, px, rem, em, %, etc.

**`interpolateColor(value, points)`** - Interpolate hex colors

- Example: `interpolateColor(50, {0: '#FF0000', 100: '#0000FF'})` → `'#800080'`

**DO NOT define these functions** - they are injected automatically. Just use them in your component.

## IMPORTANT NOTES

- NO import statements (React hooks are already available)
- Function must be named "App" (not MyComponent or similar)
- Root div must match device dimensions exactly
- Accept onTransition prop for navigation (if flow)
- Use inline styles for all styling
- Ensure accessibility at all parameter values

Return your response in this format:
VARIATION_SPACE:
[JSON here]

UI_CODE:
[React code here]
