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
  // Define ALL helper components inside the main component function
  // These are inline components, NOT separate imports

  // Simple helper component
  const Card = ({ children }) => (
    <div style={{ borderRadius: 12, padding: 24 }}>{children}</div>
  );

  // Helper component with props
  const ProductCard = ({ product, onView }) => (
    <Card>
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      <button onClick={() => onView(product.id)}>View Details</button>
    </Card>
  );

  // Helper component with children
  const Section = ({ title, children }) => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </div>
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

**CRITICAL: You MUST use Single-File Format for ALL screens.**

### Single-File Format (MANDATORY)

Return **ONLY** the React component code with NO multi-file JSON structure:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Mail, Lock } from "lucide-react";

export default function LoginScreen({ onTransition }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ✅ Define helper components inline if needed
  const FormField = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <Button className="w-full" onClick={() => onTransition("login")}>
            <Mail className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Why Single-File Only:**

- ✅ No "component not found" errors
- ✅ Simpler file structure
- ✅ Faster rendering
- ✅ Easier debugging
- ✅ All code in one place

**DO NOT:**

- ❌ Return JSON with multiple files
- ❌ Use `{"files": {...}}` structure
- ❌ Create separate component files
- ❌ Import from relative paths

---

## Output Rules

**NO**:

- ❌ Markdown code fences (no `jsx or `json)
- ❌ Explanations before or after code
- ❌ Preamble or postamble
- ❌ Comments about what you're doing
- ❌ JSON structure with multiple files
- ❌ Separate component file imports

**YES**:

- ✅ Pure TypeScript code only
- ✅ Imports at the top
- ✅ Checkpoint markers for progressive rendering
- ✅ Component boundary comments
- ✅ Single default export with screen name
- ✅ Helper components defined inline (inside the main function)
