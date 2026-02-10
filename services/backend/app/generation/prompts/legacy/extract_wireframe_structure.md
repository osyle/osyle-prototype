# Extract Wireframe Structure from Design

You are analyzing a UI design to extract **ONLY** structural and content information for wireframing purposes.

Your goal is to create a text-based wireframe description that captures:

- What components exist (buttons, inputs, text, icons, etc.)
- What text/labels they contain
- How they're arranged (layout structure)
- Their relative importance (hierarchy)

**CRITICAL**: You must be completely blind to visual styling. Do not mention colors, fonts, spacing values, shadows, or any aesthetic properties.

---

## What to Extract

### 1. Components (Top to Bottom Order)

For each UI element, identify:

- **Type**: BUTTON, INPUT, TEXT, ICON, IMAGE, LINK, CARD, HEADER, etc.
- **Content/Label**: The actual text shown (exact quote)
- **Position**: Where it appears (top/center/bottom, left/center/right)
- **Hierarchy**: Visual prominence (primary/secondary/tertiary)
- **Size Category**: Relative size (small/medium/large)

### 2. Layout Structure

Describe how elements are arranged:

- **Pattern**: Vertical stack? Horizontal row? Grid? Mixed?
- **Grouping**: Which elements are visually grouped together?
- **Alignment**: How are elements aligned (centered, left, right)?
- **Flow**: What's the natural reading order?

### 3. Interactions

Identify interactive elements:

- **Primary action**: Main CTA (usually most prominent button)
- **Secondary actions**: Other buttons or links
- **Input fields**: What data is being collected?

---

## What to IGNORE

**DO NOT mention ANY of these:**

- ❌ Color names or hex values (e.g., "blue", "#4A90E2")
- ❌ Font names or typography (e.g., "Roboto", "bold", "16px")
- ❌ Spacing measurements (e.g., "24px margin", "8px padding")
- ❌ Border radius (e.g., "rounded corners", "20px radius")
- ❌ Shadows or effects (e.g., "drop shadow", "blur")
- ❌ Visual style descriptions (e.g., "modern", "clean", "minimalist")
- ❌ Gradients or backgrounds
- ❌ Opacity or transparency

If you're about to mention styling, STOP. Focus only on structure and content.

---

## Output Format

Use this exact markdown structure:

```markdown
# Screen: [Screen Name/Purpose]

## Components (Top to Bottom)

1. **[TYPE]** "[Text/Label]"

   - Position: [top/center/bottom] / [left/center/right]
   - Hierarchy: [primary/secondary/tertiary]
   - Size: [small/medium/large]
   - Notes: [any functional notes, e.g., "required field", "optional"]

2. **[TYPE]** "[Text/Label]"
   - Position: [position]
   - Hierarchy: [hierarchy]
   - Size: [size]
   - Notes: [notes]

[Continue for all components...]

## Layout

- **Structure**: [vertical stack / horizontal row / grid / mixed]
- **Grouping**: [describe which elements are grouped]
- **Alignment**: [describe alignment patterns]
- **Content Flow**: [describe reading order]

## Interactions

- **Primary Action**: "[button/link label]" - [what it does]
- **Secondary Actions**: [list other interactive elements]
- **Input Fields**: [list all inputs and what they collect]

## Additional Context

[Any other structural notes that help understand the layout]
```

---

## Examples

### Good Wireframe Description:

```markdown
# Screen: Login

## Components (Top to Bottom)

1. **BUTTON** "← Back"

   - Position: top-left corner
   - Hierarchy: tertiary
   - Size: small
   - Notes: Navigation back button

2. **TEXT** "Login"

   - Position: top-center
   - Hierarchy: primary
   - Size: large
   - Notes: Screen title

3. **ICON** "Bird illustration"

   - Position: center
   - Hierarchy: secondary
   - Size: large
   - Notes: App branding/logo

4. **INPUT** "Email address"

   - Position: center, full width
   - Hierarchy: primary
   - Size: medium
   - Notes: Required field, email input

5. **INPUT** "Password"

   - Position: center, full width
   - Hierarchy: primary
   - Size: medium
   - Notes: Required field, password input

6. **BUTTON** "Login →"

   - Position: center, full width
   - Hierarchy: primary
   - Size: large
   - Notes: Main action button with arrow icon

7. **LINK** "Forgot Password"
   - Position: bottom-center
   - Hierarchy: tertiary
   - Size: small
   - Notes: Helper link

## Layout

- **Structure**: Single-column vertical stack
- **Grouping**: Input fields grouped together, button below inputs
- **Alignment**: All elements centered horizontally
- **Content Flow**: Top to bottom: Title → Branding → Inputs → Action → Helper

## Interactions

- **Primary Action**: "Login" button - submits credentials
- **Secondary Actions**: "Back" button (navigation), "Forgot Password" link
- **Input Fields**: Email (text), Password (password type)

## Additional Context

Simple authentication screen with clear hierarchy. Logo provides brand identity. All content centered for mobile-first design.
```

### Bad Wireframe Description (mentions styling):

```markdown
# Screen: Login

The screen has a beautiful blue gradient background with... ❌ NO STYLING
The title is in a modern sans-serif font... ❌ NO FONTS
There's a 24px margin around the form... ❌ NO SPACING VALUES
The button has rounded corners and a shadow... ❌ NO VISUAL EFFECTS
```

---

## Critical Reminders

1. **Be Specific About Content**: Quote exact text labels, button names, placeholder text
2. **Preserve Order**: List components in the order they appear visually (top to bottom, left to right)
3. **Identify All Interactive Elements**: Every button, link, input must be listed
4. **No Styling Mentions**: If you're describing how it looks, you're doing it wrong
5. **Functional Over Visual**: Focus on what it does, not how it looks

---

## Your Task

Analyze the provided design image and create a complete wireframe description following the format above. Focus exclusively on structure, content, and function. Be blind to all styling.
