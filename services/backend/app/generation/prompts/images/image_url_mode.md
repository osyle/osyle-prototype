# Images & Media (URL Mode)

When images are needed, use `picsum.photos` with a descriptive seed for consistent, contextually labeled images.

## URL Pattern

```
https://picsum.photos/seed/[SEED]/[WIDTH]/[HEIGHT]
```

The seed should be a short, descriptive word or phrase (no spaces) derived from the content — this makes images consistent and identifiable.

## Examples

```tsx
// Destination / landscape card
<img
  src="https://picsum.photos/seed/tokyo-city/400/300"
  alt="Tokyo city"
  className="w-full h-48 object-cover rounded-lg"
/>

// Hero image
<img
  src="https://picsum.photos/seed/mountain-hero/1200/600"
  alt="Mountain landscape"
  className="w-full h-96 object-cover"
/>

// Avatar / portrait
<img
  src="https://picsum.photos/seed/user-avatar/200/200"
  alt="User profile"
  className="w-12 h-12 rounded-full object-cover"
/>

// Product card
<img
  src="https://picsum.photos/seed/product-minimal/400/400"
  alt="Product"
  className="w-full h-48 object-cover"
/>
```

## Choosing a Seed

- Use the subject/context: `tokyo-street`, `bali-beach`, `swiss-alps`, `moroccan-market`
- Keep it short and hyphen-separated (no spaces)
- Be specific: `sunset-beach` not just `beach`
- Same seed = same image every render (good for consistency)

## Dimensions

Match to your layout:

- Square thumbnails: `/200/200`, `/400/400`
- Landscape cards: `/400/300`, `/800/400`
- Hero banners: `/1200/600`, `/1200/800`
- Portrait/tall: `/400/600`

## CRITICAL RULES

**✅ DO:**

- Use `https://picsum.photos/seed/[descriptive-seed]/[WIDTH]/[HEIGHT]`
- Choose seeds that describe the content (e.g., `tokyo-temple`, `beach-sunset`)
- Match dimensions to your layout needs
- Include descriptive alt text for accessibility

**❌ NEVER:**

- Use `source.unsplash.com` (deprecated, broken)
- Use `/api/placeholder/` URLs (they don't exist)
- Use broken or non-existent URLs
- Use spaces in seeds (use hyphens: `my-seed` not `my seed`)
