# SCREEN COMPONENT GENERATION

## Output Format — Critical

Output **pure TypeScript code only**. Start with imports. No markdown fences, no JSON wrapper, no preamble, no explanations after the code.

---

## Component Naming

Remove ALL non-alphanumeric characters → PascalCase → add "Screen" suffix.

- "Login" → `LoginScreen`
- "Product & Cart" → `ProductCartScreen`
- "Step-by-Step Guide" → `StepByStepGuideScreen`
- "7-Day Calendar" → `SevenDayCalendarScreen`

---

## Imports — Only These Three Sources

```typescript
import { useState, useEffect, useCallback } from "react";
import { Mail, Lock, ArrowRight /* etc */ } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// etc — full shadcn/ui library (50+ components) available at @/components/ui/*
```

**Never** import from relative paths (`./components/*`), URLs, or create separate files.
Define all helper components **inline** inside the screen function.

---

## Props Interface

Every screen receives exactly one prop:

```typescript
interface LoginScreenProps {
  onTransition: (transitionId: string) => void
}
export default function LoginScreen({ onTransition }: LoginScreenProps) { ... }
```

---

## Styling

Use semantic Tailwind tokens (`bg-primary`, `text-muted-foreground`, `border-border`).
Never use raw hex values or arbitrary classes like `h-[600px]`.
Use responsive breakpoints (`text-2xl md:text-4xl`, `p-4 md:p-6`).
Never use fixed pixel dimensions for layout containers.

---

## 8 Patterns You Must Follow

**1. Icons from object properties** — always assign to uppercase variable:

```typescript
const Icon = item.icon; // ← capital I
return <Icon className="h-5 w-5" />;
```

**2. Map rendering** — render item properties, never the loop index as content:

```typescript
// ❌ {items.map((item, i) => <span key={i}>{i}</span>)}
// ✅ {items.map((item) => <span key={item.id}>{item.name}</span>)}
```

**3. Mobile-first headlines**:

```typescript
<h1 className="text-2xl md:text-4xl font-bold leading-tight">Title</h1>
```

**4. Sticky headers** (not fixed):

```typescript
<header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
```

**5. Horizontal scroll lists** — explicit equal heights:

```typescript
<div className="flex gap-3 overflow-x-auto pb-2">
  <div className="flex-shrink-0 w-28 h-36"><Card className="h-full">...</Card></div>
```

**6. Metric cards** — consistent height, centered:

```typescript
<Card className="h-full">
  <CardContent className="h-full flex flex-col items-center justify-center gap-2 p-4">
```

**7. Image containers** — always a background fallback:

```typescript
<div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
  <img src={url} className="w-full h-full object-cover" />
</div>
```

**8. Scroll events** — attach to window, not a plain div:

```typescript
useEffect(() => {
  const handler = () => setScrollY(window.scrollY);
  window.addEventListener("scroll", handler, { passive: true });
  return () => window.removeEventListener("scroll", handler);
}, []);
```

---

## Transitions

```typescript
<Button onClick={() => onTransition('trans_1')}>Sign In</Button>
<a onClick={() => onTransition('trans_2')} className="cursor-pointer text-primary hover:underline">
  Forgot password?
</a>
```

---

## Final Checklist

Before submitting, verify:

- Single `.tsx` file, one `export default function {Name}Screen`
- All imports from `@/components/ui/*`, `lucide-react`, or `react`
- Icons from data objects use uppercase variable (`const Icon = item.icon`)
- Every `.map()` renders `item.property`, never the index as content
- Headlines mobile-first (`text-2xl md:text-4xl`)
- Sticky headers; fixed bottom bars have matching `pb-{n}` on scroll container
- Image containers have `bg-muted` fallback
- Semantic color tokens only — no raw hex, no `bg-blue-500`
