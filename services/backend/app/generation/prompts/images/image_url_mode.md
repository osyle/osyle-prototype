# Images & Media (URL Mode)

When images are needed, use direct image URLs from Unsplash Source.

## Unsplash Source API

**URL Pattern:**

```
https://source.unsplash.com/[WIDTH]x[HEIGHT]/?[KEYWORDS]
```

**Examples:**

```tsx
// Product/item images
<img
  src="https://source.unsplash.com/400x400/?product,minimal,object"
  alt="Product name"
  className="w-full h-48 object-cover rounded-lg"
/>

// Hero/landscape images
<img
  src="https://source.unsplash.com/1200x600/?mountain,landscape,nature"
  alt="Mountain landscape"
  className="w-full h-96 object-cover"
/>

// Portrait/avatar images
<img
  src="https://source.unsplash.com/200x200/?portrait,professional,woman"
  alt="User profile"
  className="w-12 h-12 rounded-full object-cover"
/>
```

**How to choose keywords:**

1. Describe the content (e.g., "coffee,cup,morning")
2. Use 2-4 specific keywords
3. Separate with commas (no spaces)
4. Be contextually relevant to the UI content

**Common keyword patterns:**

- **Technology**: `technology,laptop,workspace`, `phone,modern,tech`
- **Business**: `business,meeting,professional`, `office,corporate`
- **Nature**: `nature,landscape,mountain`, `forest,trees,outdoors`
- **Food**: `food,restaurant,meal`, `coffee,cafe,drink`
- **People**: `portrait,professional,business`, `team,collaboration`
- **Fitness**: `fitness,gym,exercise`, `yoga,wellness,health`
- **Travel**: `travel,destination,adventure`, `city,architecture,urban`

## CRITICAL RULES

**✅ DO:**

- Use Unsplash Source URLs: `https://source.unsplash.com/[WIDTH]x[HEIGHT]/?[KEYWORDS]`
- Choose contextually relevant keywords (2-4 keywords, comma-separated)
- Match image dimensions to your layout needs
- Use `object-cover` to prevent stretching
- Include descriptive alt text for accessibility

**❌ NEVER:**

- Use `/api/placeholder/` URLs (they don't exist)
- Use broken or non-existent URLs
- Leave images without alt text
- Use spaces in keywords (use commas only)
