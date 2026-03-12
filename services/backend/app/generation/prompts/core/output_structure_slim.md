# OUTPUT STRUCTURE

## Component Block Order

Every screen must follow this exact internal order:

```tsx
export default function LoginScreen({
  onTransition,
}: {
  onTransition: (id: string) => void;
}) {
  // BLOCK 1: HOOKS — all useState/useEffect/useRef at the very top
  const [email, setEmail] = useState("");

  // BLOCK 2: CONSTANTS — data arrays, config objects
  const items = [{ id: 1, label: "Home", icon: Home }];

  // BLOCK 3: HELPERS — inline sub-components defined inside the function
  const FeatureCard = ({
    title,
    icon: Icon,
  }: {
    title: string;
    icon: LucideIcon;
  }) => (
    <div className="p-4 rounded-lg border">
      <Icon className="h-5 w-5 mb-2" />
      <p className="font-medium">{title}</p>
    </div>
  );

  // BLOCK 4: RENDER
  return (
    <div className="w-full min-h-screen bg-background">
      {/* SECTION: Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        {/* ... */}
      </header>

      {/* SECTION: Main Content */}
      <main className="px-4 py-6 space-y-6">{/* ... */}</main>
    </div>
  );
}
```

**Rules:**

- Hooks first — always
- Helper components defined inline inside the function, never imported from relative paths
- Render tree in visual top→bottom order
- Mark every major section with a `{/* SECTION: Name */}` comment

---

## Checkpoint Markers

Insert `{/* CHECKPOINT */}` comments after every major visual section completes. These trigger progressive preview updates during streaming:

```tsx
return (
  <div className="w-full min-h-screen">
    <header>{/* ... */}</header>
    {/* CHECKPOINT */}

    <main>
      <HeroSection />
      {/* CHECKPOINT */}

      <FeatureGrid />
      {/* CHECKPOINT */}
    </main>

    <footer>{/* ... */}</footer>
    {/* CHECKPOINT */}
  </div>
);
```

Place checkpoints after: header, hero/lead section, each major content block, footer/nav.
Aim for 3–5 checkpoints per screen.

---

## Semantic IDs for Annotation

Add `id` attributes to major sections:

```tsx
<nav id="main-nav">
<main id="dashboard-content">
<section id="feature-cards">
<form id="login-form">
<div id="product-card-0">  // index for repeated items
```

Use kebab-case, be descriptive.

---

## Single-File Format Only

Output one `.tsx` file. Never return JSON with multiple files. Never import from relative paths.

- ✅ Single `export default function {Name}Screen`
- ✅ All helpers defined inline inside the function
- ❌ No `{ "files": { ... } }` JSON structure
- ❌ No `import { X } from "./components/X"`
