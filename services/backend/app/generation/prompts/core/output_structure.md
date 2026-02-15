# OUTPUT STRUCTURE

## Progressive UI Rendering Structure

To enable smooth progressive rendering as the UI streams in, follow these structural rules:

### Rule 1: Fixed Block Structure

Every component MUST follow this exact order:

```jsx
export default function App({ onTransition }) {
  // ===== BLOCK 1: STATE =====
  // All React hooks at the very top
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ===== BLOCK 2: CONSTANTS =====
  // Reusable constants
  const colors = ["#1A1A2E", "#6C63FF", "#FFFFFF", "#888888"];

  // ===== BLOCK 3: STYLES (OPTIONAL) =====
  // Complex reusable style objects (if needed)
  const cardStyle = {
    padding: "24px",
    borderRadius: "16px",
  };

  // ===== BLOCK 4: HELPER COMPONENTS =====
  // Define ALL helper components inside App function
  const Card = ({ children }) => (
    <div style={{ borderRadius: 12, padding: 24 }}>{children}</div>
  );

  // ===== BLOCK 5: RENDER TREE =====
  return (
    // JSX hierarchy here
  );
}
```

### Rule 2: Visual Top-to-Bottom Rendering Order

Components must render in visual order: **top→bottom, left→right**.

Example:

```jsx
return (
  <div style={rootStyle}>
    {/* Top: Header */}
    <header>{/* ... */}</header>

    {/* Middle: Main Content */}
    <main>{/* ... */}</main>

    {/* Bottom: Footer/Navigation */}
    <nav>{/* ... */}</nav>
  </div>
);
```

### Rule 3: Component Boundary Comments

Mark every major semantic section with a comment:

```jsx
return (
  <div style={rootStyle}>
    {/* COMPONENT: Navigation Bar */}
    <nav style={navStyle}>{/* ... */}</nav>

    {/* COMPONENT: Hero Section */}
    <header style={heroStyle}>{/* ... */}</header>

    {/* COMPONENT: Feature Cards */}
    <section style={cardsStyle}>{/* ... */}</section>
  </div>
);
```

---

## Annotation-Friendly Markup

Add strategic `id` attributes to key components to enable user annotations:

- Major sections: `<nav id="main-nav">`
- Repeated components: `<div id="product-card-0">`
- Interactive containers: `<form id="login-form">`
- Content sections: `<main id="dashboard">`

Use kebab-case, be descriptive, add index for repetition.

---

## Flow Integration

If `flow_context` includes `outgoing_transitions`, implement navigation:

```jsx
export default function App({ onTransition }) {
  // For each transition, create UI element
  const handleNext = () => {
    onTransition("transition_id_here");
  };

  return (
    <div>
      {/* Content */}
      <button onClick={handleNext}>Continue →</button>
    </div>
  );
}
```

**Transition Styling by Type:**

- `forward`: Primary action (prominent CTA button)
- `back`: Secondary action (subtle text link)
- `error`: Warning state (red/alert styling)
- `success`: Success state (green/confirmation styling)
- `branch`: Alternative path (secondary CTA)

---

## Final Output Format

You have TWO output format options:

### Option 1: Single-File Format (Simple UIs)

**Use for:** Simple screens (login, single form, basic pages)

Return **ONLY** the React component code:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function App({ onTransition }) {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Component implementation */}
    </div>
  );
}
```

### Option 2: Multi-File Format (Complex UIs)

**Use for:**

- Screens with 3+ distinct components
- Repeated components (ProductCard, UserItem, etc.)
- Complex UIs (dashboards, feeds, multi-step forms)

Return a JSON structure:

```json
{
  "files": {
    "/App.tsx": "import { ProductList } from './components/ProductList'\n\nexport default function App({ onTransition }) {\n  return (\n    <div className=\"min-h-screen bg-background\">\n      <ProductList />\n    </div>\n  )\n}",
    "/components/ProductList.tsx": "import { ProductCard } from './ProductCard'\nimport { useState } from 'react'\n\nexport function ProductList() {\n  const [products] = useState([...])\n  return <div>{products.map(p => <ProductCard key={p.id} product={p} />)}</div>\n}",
    "/components/ProductCard.tsx": "import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'\nimport { Button } from '@/components/ui/button'\n\nexport function ProductCard({ product }) {\n  return <Card><CardHeader><CardTitle>{product.name}</CardTitle></CardHeader><CardContent>...</CardContent></Card>\n}"
  },
  "entry": "/App.tsx",
  "dependencies": {
    "lucide-react": "^0.263.1"
  }
}
```

**Multi-File Rules:**

- Always include `/App.tsx` as the entry point
- Use relative imports: `import { X } from './components/X'`
- Use alias imports for ui: `import { Button } from '@/components/ui/button'`
- Put components in `/components/` directory
- Each component should be in its own file
- Escape newlines in JSON strings: `\n`
- Include `lucide-react` in dependencies if using icons

---

## Output Rules (Both Formats)

**NO**:

- ❌ Markdown code fences (no `jsx or `json)
- ❌ Explanations before or after code
- ❌ Preamble or postamble
- ❌ Comments about what you're doing
- ❌ Multiple component exports from App.tsx

**YES**:

- ✅ Pure code (single-file) OR pure JSON (multi-file)
- ✅ Imports at the top of each file
- ✅ Checkpoint markers (single-file only)
- ✅ Component boundary comments
- ✅ Single default export named "App" in entry file
