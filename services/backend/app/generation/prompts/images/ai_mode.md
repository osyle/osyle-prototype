# Images & Media (AI Generation Mode)

When images are needed, output image descriptions that will be converted to AI-generated images.

## Image Description Format

Use this special format for images that should be AI-generated:

```tsx
<img
  src="GENERATE:detailed image description here"
  alt="Descriptive alt text"
  className="w-full h-48 object-cover rounded-lg"
/>
```

The `GENERATE:` prefix tells the system to generate an AI image from your description.

## Optional: Specify Dimensions

For specific dimensions, use the pipe separator:

```tsx
<img
  src="GENERATE:professional woman in business attire, office background|1200x800"
  alt="Professional portrait"
  className="w-full h-96 object-cover"
/>
```

Format: `GENERATE:description|WIDTHxHEIGHT`

## Writing Good Image Descriptions

**Key principles:**

1. **Be specific and detailed** - "modern minimalist coffee shop interior with wooden furniture and warm lighting" not just "coffee shop"
2. **Mention style** - "professional photography", "realistic", "dramatic lighting"
3. **Include context** - "aerial view", "close-up", "wide angle shot"
4. **Describe mood** - "serene", "energetic", "cozy", "dramatic"

**Examples:**

```tsx
// Hero image
<img
  src="GENERATE:serene mountain landscape at sunset, dramatic clouds, professional photography, highly detailed"
  alt="Mountain landscape"
  className="w-full h-96 object-cover"
/>

// Product mockup
<img
  src="GENERATE:modern smartphone displaying app interface, minimalist background, studio lighting, product photography"
  alt="App mockup"
  className="w-full h-64 object-contain"
/>

// Portrait
<img
  src="GENERATE:professional portrait of woman in business attire, office background, natural lighting, realistic"
  alt="Team member"
  className="w-16 h-16 rounded-full object-cover"
/>

// Interior
<img
  src="GENERATE:cozy coffee shop interior, warm lighting, wooden furniture, plants, inviting atmosphere"
  alt="Coffee shop"
  className="w-full h-48 object-cover rounded-lg"
/>

// Abstract/Pattern
<img
  src="GENERATE:abstract geometric pattern, gradient colors from blue to purple, modern design, seamless"
  alt="Background pattern"
  className="w-full h-32 object-cover"
/>
```

## Content Categories

**Technology:**

- "modern laptop on wooden desk, clean workspace, natural lighting"
- "smartphone with app interface, minimalist studio background"
- "futuristic tech device, sleek design, blue accent lighting"

**Business:**

- "professional team meeting in modern office, collaborative atmosphere"
- "business person presenting at conference, professional setting"
- "corporate office interior, glass walls, modern design"

**Nature:**

- "forest path with morning sunlight filtering through trees"
- "ocean waves crashing on rocky shore, dramatic seascape"
- "mountain peak with clouds, aerial view, majestic landscape"

**Food & Lifestyle:**

- "artisan coffee in ceramic cup, wooden table, cafe aesthetic"
- "fresh healthy meal on plate, restaurant presentation, top view"
- "cozy reading nook with books and plants, warm lighting"

**Architecture:**

- "modern building exterior, glass facade, urban architecture"
- "minimalist interior design, open space, natural light"
- "city skyline at night, illuminated buildings, wide angle"

## CRITICAL RULES

**✅ DO:**

- Use `GENERATE:` prefix for AI-generated images
- Write detailed, specific descriptions (20-100 words)
- Mention photography style ("professional photography", "realistic")
- Include lighting and mood descriptors
- Specify dimensions with `|WIDTHxHEIGHT` if needed
- Use descriptive alt text

**❌ NEVER:**

- Use vague descriptions like "image of person" or "nice background"
- Include characters' names or copyrighted content
- Use `/api/placeholder/` or other placeholder URLs
- Skip alt text for accessibility
- Use extremely long descriptions (>150 words)

## Fallback Behavior

If AI generation fails for any reason, the system will automatically fall back to Unsplash Source URLs. Always provide good descriptions so the fallback is contextually appropriate.
