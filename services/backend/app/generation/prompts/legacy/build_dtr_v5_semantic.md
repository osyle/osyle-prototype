# DTR v5 Semantic Analysis - Comprehensive Guide

You are analyzing a design to extract high-level semantic understanding - the designer's aesthetic signature, design philosophy, and decision-making patterns.

This is CRITICAL for generating designs that match the designer's style. Generic analysis leads to generic generation. Be specific, observant, and detailed.

---

## Input You Receive

1. **Quantitative Analysis**
   - Spacing quantum, values, distribution
   - Color palette (now includes gradient colors!)
   - Typography scale, weights, sizes
   - Corner radii, forms
2. **Visual Patterns** (ENHANCED - now with CSS!)
   - Gradients with full CSS strings
   - Glassmorphism effects with backdrop-filter
   - Blend modes (COLOR_DODGE, SCREEN, etc.)
   - Shadows with details
   - Opacity values
3. **Design Image** (if available)
   - Visual reference for validation

---

## How to Interpret Visual Pattern Data

### Gradient CSS Interpretation

When you see gradient data like:

```json
{
  "type": "GRADIENT_LINEAR",
  "css": "linear-gradient(135deg, rgb(87,100,217) 0%, rgb(217,101,254) 100%)",
  "colors": ["rgb(87,100,217)", "rgb(217,101,254)"]
}
```

**Extract:**

- **Direction**: 135deg = diagonal top-left to bottom-right (dynamic, modern)
- **Colors**: Purple (87,100,217) to pink (217,101,254) = vibrant, tech-forward
- **Transition**: Smooth gradient = polished, premium feel
- **Usage context**: If on backgrounds → atmospheric; if on UI elements → accent/highlight

**Common Gradient Signatures:**

- Purple-pink gradients (tech, modern, digital)
- Blue-green gradients (calm, professional, trustworthy)
- Orange-red gradients (energetic, bold, attention-grabbing)
- Black-transparent gradients (depth, shadows, overlays)
- Subtle grayscale gradients (sophisticated, minimal)

### Glassmorphism / Backdrop Blur

When you see:

```json
{
  "type": "blur",
  "subtype": "backdrop",
  "css": "backdrop-filter: blur(34px)",
  "radius": 34
}
```

**This indicates:**

- **Glassmorphism aesthetic** - Modern, iOS/macOS inspired
- **Blur radius 20-40px** = moderate glass effect (common in cards, modals)
- **Blur radius 40-80px** = heavy frosted glass (used for backgrounds, overlays)
- **Design philosophy**: Layering, depth, transparency, premium feel

**Signature move to note:**
"Uses backdrop-filter blur on cards for glassmorphism effect (modern, layered design)"

### Blend Modes

When you see:

```json
{
  "type": "blend_mode",
  "blend_mode": "COLOR_DODGE",
  "css": "mix-blend-mode: color-dodge"
}
```

**Interpret blend modes:**

- **COLOR_DODGE**: Creates luminous glow, highlights, light effects
- **SCREEN**: Adds brightness, subtle overlays, soft lighting
- **MULTIPLY**: Darkens, creates shadows, adds depth
- **OVERLAY**: Increases contrast, adds punch, dramatic effect
- **SOFT_LIGHT**: Gentle lighting, atmospheric effects

**If you see COLOR_DODGE or SCREEN:**
Signature move: "Uses COLOR_DODGE blend mode for luminous accent effects and atmospheric glows"

### Opacity Patterns

When you see opacity values < 1.0:

- **0.5-0.7**: Subtle layering, secondary elements
- **0.3-0.5**: Background effects, overlays
- **0.1-0.3**: Very subtle atmospherics, decorative elements

### Color Temperature & Saturation

Interpret the color palette:

**Warm palette** (reds, oranges, yellows):

- Energetic, friendly, approachable
- Common in: Marketing, food, entertainment

**Cool palette** (blues, purples, greens):

- Professional, calm, trustworthy, tech-forward
- Common in: SaaS, healthcare, finance, tech

**Neutral palette** (grays, beige, black/white):

- Sophisticated, minimal, timeless
- Common in: Luxury, editorial, professional services

**High saturation** (vibrant colors):

- Playful, energetic, attention-grabbing
- Common in: Gaming, youth brands, entertainment

**Low saturation** (muted/desaturated):

- Sophisticated, calm, understated
- Common in: Premium brands, editorial, professional

### Shadow Patterns

When you see shadows:

```json
{
  "type": "DROP_SHADOW",
  "offset_x": 0,
  "offset_y": 4,
  "radius": 12,
  "color": "rgba(0,0,0,0.1)"
}
```

**Small shadows** (radius 2-8px, offset 2-4px):

- Subtle elevation, modern, flat-ish design
- Common in: Material Design, modern web

**Medium shadows** (radius 12-24px, offset 4-8px):

- Clear elevation, card-based layouts
- Common in: Dashboards, SaaS applications

**Large shadows** (radius 32+px, offset 8+px):

- Dramatic depth, floating elements
- Common in: Landing pages, hero sections

**No shadows**:

- Flat design, brutalist, minimalist
- Common in: Editorial, print-inspired

---

## Aesthetic Signature Categories (20+ Examples)

Choose the most accurate 2-3 word descriptor. Be specific!

### Modern/Tech Aesthetics

1. **"modern_glassmorphism"**
   - Backdrop blur on cards/modals
   - Transparent overlays with blur
   - Soft shadows, rounded corners (12-24px)
   - Light color palette or dark with vibrant accents
2. **"cyberpunk_gradient"**
   - Bold purple/pink/blue gradients
   - COLOR_DODGE blend modes for glow
   - Dark backgrounds (near-black)
   - High contrast, neon-like accents
3. **"neomorphic_soft"**
   - Subtle inner/outer shadows
   - Monochromatic or muted palette
   - Medium corner radii (8-16px)
   - Low contrast, gentle depth
4. **"brutalist_tech"**

   - Sharp corners (0-4px radii) or no radius
   - Bold typography, large sizes
   - High contrast (black/white)
   - No gradients, no shadows
   - Grid-based layouts

5. **"sleek_minimal_dark"**
   - Dark background (rgb < 30,30,30)
   - Minimal color palette (2-3 colors)
   - Subtle shadows or no shadows
   - Generous spacing (16px+ quantum)
   - Clean typography

### Business/Professional Aesthetics

6. **"corporate_clean"**

   - Blue primary color
   - Conservative spacing (8px quantum)
   - Medium shadows for cards
   - Professional sans-serif typography
   - Symmetrical layouts

7. **"data_dense_minimal"**

   - Tight spacing (4px quantum)
   - Monochrome or single accent color
   - Small typography (12-14px base)
   - Tables, grids, structured layouts
   - Minimal decoration

8. **"enterprise_dashboard"**
   - Multiple data visualization elements
   - Muted color palette
   - Card-based layouts with shadows
   - Consistent spacing system
   - Information hierarchy emphasis

### Creative/Editorial Aesthetics

9. **"editorial_magazine"**

   - Large typography (scale ratio 1.5+)
   - Lots of whitespace
   - Serif or mixed typefaces
   - Asymmetric layouts
   - Image-first design

10. **"playful_rounded"**

    - Large corner radii (16-32px)
    - Vibrant, saturated colors
    - Cheerful illustrations/graphics
    - Generous spacing
    - Friendly, approachable feel

11. **"artistic_experimental"**
    - Unusual color combinations
    - Asymmetric, broken grid
    - Mixed effects (gradients, blurs, blend modes)
    - Variable spacing
    - Expressive, non-conventional

### E-commerce/Marketing Aesthetics

12. **"premium_luxury"**

    - Gold/silver accent colors
    - Large whitespace
    - Serif typography or elegant sans
    - Subtle shadows or no shadows
    - Sophisticated, restrained

13. **"conversion_optimized"**

    - High contrast CTAs
    - Orange/red accent colors
    - Clear hierarchy
    - Medium spacing
    - Action-oriented design

14. **"brand_vibrant"**
    - Distinctive brand colors
    - Consistent use of gradients
    - Bold shapes and forms
    - Energetic, eye-catching
    - Strong visual identity

### Specialized Aesthetics

15. **"fintech_trustworthy"**

    - Blue/green color palette
    - Clean, structured layouts
    - Medium shadows for depth
    - Professional, secure feeling
    - Conservative design choices

16. **"health_wellness"**

    - Soft greens, blues, earth tones
    - Rounded corners
    - Calm, spacious layouts
    - Gentle shadows
    - Approachable, caring feel

17. **"gaming_immersive"**

    - Dark backgrounds
    - Vibrant neon accents
    - Dynamic gradients
    - Glow effects (COLOR_DODGE)
    - High energy, atmospheric

18. **"saas_modern"**

    - Purple/blue primary colors
    - Card-based layouts
    - Glassmorphism or shadows
    - Clean, contemporary
    - Tech-forward feel

19. **"content_reader"**

    - Large readable typography (16-18px base)
    - Serif or comfortable sans
    - Maximum line length ~70ch
    - Generous line-height
    - Reading-optimized

20. **"mobile_first_simple"**
    - Large touch targets (44px+)
    - Bottom navigation
    - Card-based, vertical flow
    - Minimal decoration
    - Thumb-zone optimized

**If none fit perfectly**, create a new 2-3 word descriptor that accurately captures the aesthetic.

---

## Design Philosophy Examples

Choose the philosophy that best matches the decision-making:

- **"form_follows_function"** - Prioritizes usability, minimal decoration, clear purpose
- **"beauty_in_simplicity"** - Minimalist, generous whitespace, restrained palette
- **"rich_complexity"** - Layered, detailed, information-rich, multiple visual elements
- **"emotional_storytelling"** - Narrative-driven, atmospheric, evocative
- **"data_driven_clarity"** - Information-first, clear hierarchy, functional
- **"playful_experimentation"** - Creative, unconventional, expressive
- **"premium_craftsmanship"** - Polished, detailed, high-quality feeling
- **"accessible_inclusive"** - High contrast, clear labels, inclusive design
- **"brand_expression"** - Strong visual identity, distinctive, memorable

---

## Decision Patterns - Detailed Guide

### Hierarchy Method

How does the design create visual hierarchy?

- **"size_and_weight"** - Larger, bolder text for headers
- **"color_contrast"** - Bright colors vs muted for emphasis
- **"size_and_blur_depth"** - Combines scale with layering/depth
- **"position_and_whitespace"** - Uses space and layout position
- **"color_and_motion"** (if animations present)

### Emphasis Technique

How are important elements highlighted?

- **"bold_accent_colors"** - Bright, saturated color on key elements
- **"dramatic_scale"** - Very large elements (2x-3x base size)
- **"isolation_and_space"** - Lots of whitespace around focal point
- **"gradient_highlights"** - Gradients draw attention
- **"glow_effects"** - COLOR_DODGE or shadows for luminous emphasis
- **"motion_and_animation"** (if present)

### Balance Approach

How is visual weight distributed?

- **"symmetrical"** - Centered, mirrored, formal
- **"asymmetric_subtle"** - Slightly off-center, still balanced
- **"asymmetric_dynamic"** - Strong asymmetry, visual tension
- **"grid_structured"** - Rigid grid, equal distribution
- **"organic_flow"** - Natural, flowing, non-rigid

### Decoration Level

How much visual ornamentation?

- **"minimal"** - Little to no decoration, functional only
- **"moderate"** - Some shadows, gradients, effects - balanced
- **"rich"** - Multiple effects, layered, visually complex
- **"maximal"** - Heavy decoration, ornamental, abundant

---

## Signature Moves - Examples

Be VERY specific. Good signature moves reference exact values and techniques.

### Good Examples:

✅ "Dark background (rgb(26,28,39)) with radial gradients for ambient glow"

- Specific color value
- Specific effect (radial gradient)
- Purpose (ambient glow)

✅ "Purple gradient accents (rgb(87,100,217) → rgb(217,101,254)) at 135deg on progress bars and decorative elements"

- Specific colors
- Specific angle
- Specific usage contexts

✅ "Backdrop blur (34px) on glassmorphic cards with 60% opacity backgrounds"

- Specific blur radius
- Specific opacity
- Specific application

✅ "COLOR_DODGE blend mode on purple ellipses for luminous glow effects in decorative layers"

- Specific blend mode
- Specific purpose
- Specific context

✅ "Tight 4px spacing quantum throughout for precise, data-dense layouts"

- Specific quantum value
- Purpose/outcome

### Bad Examples:

❌ "Uses gradients" - Too vague
❌ "Has blur effects" - Not specific enough
❌ "Dark color scheme" - What dark? How dark?
❌ "Nice spacing" - Meaningless

### How to Extract Signature Moves:

1. **Look for patterns that repeat** 2+ times
2. **Reference specific values** from quantitative data
3. **Connect visual patterns to their purpose**
4. **Be descriptive, not generic**

**From gradient data:**

- What colors? (specific RGB values)
- What direction? (degrees)
- Where used? (backgrounds, accents, overlays)

**From blur data:**

- Radius value?
- Backdrop or layer blur?
- Applied to what? (cards, modals, backgrounds)

**From color data:**

- What's the dominant palette?
- Any distinctive accent colors?
- High/low saturation?

**From spacing:**

- Quantum value?
- Tight or generous?
- Consistent or varied?

---

## Context Assessment

Be accurate about what the design is optimized for:

### data_oriented: true

Indicators:

- Tight spacing (4px quantum)
- Tables, grids, charts visible
- Monochrome or minimal color
- Small-medium typography
- Information density high
- Dashboard/analytics feel

### marketing_focused: true

Indicators:

- Hero sections, large imagery
- High contrast CTAs
- Emotional/storytelling elements
- Larger spacing (16px+ quantum)
- Vibrant colors
- Call-to-action emphasis

### content_heavy: true

Indicators:

- Large readable typography (16-18px+)
- Long-form text blocks
- Comfortable line-height (1.5+)
- Serif or reading-optimized font
- Content hierarchy (h1, h2, h3...)
- Article/blog layout patterns

**Multiple can be true!** A dashboard can be data_oriented AND content_heavy.

---

## Analysis Examples

### Example 1: Cyberpunk Dashboard

**Input Data:**

```json
{
  "colors": ["rgb(26,28,39)", "rgb(87,100,217)", "rgb(217,101,254)"],
  "gradients": [
    {
      "css": "linear-gradient(135deg, rgb(87,100,217) 0%, rgb(217,101,254) 100%)"
    }
  ],
  "effects": [
    {
      "type": "BACKGROUND_BLUR",
      "css": "backdrop-filter: blur(34px)",
      "is_glassmorphism": true
    },
    {
      "blend_mode": "COLOR_DODGE"
    }
  ],
  "spacing": { "quantum": 8 },
  "corner_radii": [4, 8, 64]
}
```

**Good Analysis:**

```json
{
  "aesthetic_signature": "dark_cyberpunk_glass",
  "design_philosophy": "atmospheric_immersion",
  "decision_patterns": {
    "hierarchy_method": "color_and_blur_depth",
    "emphasis_technique": "gradient_highlights",
    "balance_approach": "asymmetric_dynamic",
    "decoration_level": "rich"
  },
  "signature_moves": [
    "Dark background (rgb(26,28,39)) with vibrant purple-pink gradients (87,100,217 → 217,101,254)",
    "Glassmorphic cards using backdrop-filter blur(34px) for layered depth",
    "COLOR_DODGE blend mode on accent elements for luminous glow effects",
    "Widget-style card layouts with varied radii (4px for data, 64px for avatars)"
  ],
  "context_assessment": {
    "data_oriented": true,
    "marketing_focused": false,
    "content_heavy": false
  }
}
```

**Why it's good:**

- Specific color values referenced
- Exact CSS values cited (blur 34px)
- Descriptive signature moves
- Accurate context assessment

### Example 2: Clean SaaS Landing

**Input Data:**

```json
{
  "colors": ["rgb(255,255,255)", "rgb(51,0,255)", "rgb(245,244,236)"],
  "gradients": [],
  "shadows": [{ "offset_y": 4, "radius": 12, "color": "rgba(0,0,0,0.08)" }],
  "spacing": { "quantum": 16 },
  "corner_radii": [12, 12, 20],
  "typography": { "scale_ratio": 1.5 }
}
```

**Good Analysis:**

```json
{
  "aesthetic_signature": "clean_minimal_saas",
  "design_philosophy": "beauty_in_simplicity",
  "decision_patterns": {
    "hierarchy_method": "size_and_weight",
    "emphasis_technique": "bold_accent_colors",
    "balance_approach": "symmetrical",
    "decoration_level": "minimal"
  },
  "signature_moves": [
    "Generous 16px spacing quantum for breathing room and clarity",
    "Vibrant purple accent (rgb(51,0,255)) for CTAs and interactive elements",
    "Subtle shadows (4px offset, 12px blur, 8% opacity) for gentle elevation",
    "Consistent 12px corner radii on cards for soft, friendly feel",
    "Large typography scale (1.5 ratio) for clear hierarchy"
  ],
  "context_assessment": {
    "data_oriented": false,
    "marketing_focused": true,
    "content_heavy": false
  }
}
```

---

## Output Format

Return ONLY valid JSON. No preamble, no markdown code fences, no explanations.

```json
{
  "aesthetic_signature": "string (2-3 words, descriptive)",
  "design_philosophy": "string (1-3 words with underscores)",
  "decision_patterns": {
    "hierarchy_method": "string",
    "emphasis_technique": "string",
    "balance_approach": "string",
    "decoration_level": "minimal | moderate | rich"
  },
  "signature_moves": [
    "Specific move 1 with exact values",
    "Specific move 2 with exact values",
    "Specific move 3 with exact values",
    "Specific move 4 with exact values (if applicable)"
  ],
  "context_assessment": {
    "data_oriented": boolean,
    "marketing_focused": boolean,
    "content_heavy": boolean
  }
}
```

---

## Critical Reminders

1. **Be specific** - Reference exact values (colors, blur radius, spacing quantum)
2. **Look at the data** - Gradients, effects, colors are now rich with detail
3. **Connect patterns to purpose** - Why is this gradient used? What does blur achieve?
4. **Create accurate descriptors** - Don't force-fit into examples; create new ones if needed
5. **Signature moves are EVIDENCE-BASED** - Only cite what you can see in the data

**Your semantic analysis directly impacts generation quality. Generic analysis = generic output.**

Be thorough, specific, and observant.
