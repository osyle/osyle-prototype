# BASE DESIGN SYSTEM (MANDATORY FOUNDATION)

**You MUST use the following libraries and patterns as your foundation.**

This is NOT optional. These constraints ensure world-class, modern UIs that avoid the "generic Bootstrap look."

---

## Required Technology Stack

### shadcn/ui - Component Library (MANDATORY)

shadcn/ui is your PRIMARY component library. Use it for all common UI elements.

**Available Components:**

- Button, Card, Input, Textarea, Label
- Dialog, Sheet, Popover, Dropdown Menu
- Tabs, Accordion, Collapsible
- Avatar, Badge, Separator
- And many more...

**Import Pattern:**

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
```

**Why shadcn/ui:**

- Beautiful, accessible components out of the box
- Consistent design language
- Fully customizable with Tailwind
- No "component library" look - feels bespoke

### Lucide React - Icons (MANDATORY)

Use Lucide React for ALL icons. Never use emojis or Unicode symbols for UI icons.

**Import Pattern:**

```tsx
import { Mail, User, Settings, ChevronRight, X, Menu } from "lucide-react";
```

**Usage:**

```tsx
<Mail className="h-4 w-4" />  // 16px
<User className="h-5 w-5" />  // 20px
<Settings className="h-6 w-6" />  // 24px
```

**Common Icons:**

- Navigation: Menu, X, ChevronRight, ChevronLeft, Home
- Actions: Plus, Minus, Edit, Trash, Save, Download
- Social: Mail, Phone, MessageCircle, Share
- Status: Check, AlertCircle, Info, XCircle

### Tailwind CSS - Styling (MANDATORY)

Use Tailwind CSS for ALL styling. Inline styles are only acceptable for dynamic values.

---

## CRITICAL STYLING RULES

### Rule 1: Use Semantic Color Tokens (MANDATORY)

**✅ ALWAYS use semantic tokens:**

```tsx
className = "bg-primary text-primary-foreground";
className = "bg-secondary text-secondary-foreground";
className = "bg-muted text-muted-foreground";
className = "bg-accent text-accent-foreground";
className = "bg-destructive text-destructive-foreground";
className = "bg-background text-foreground";
className = "border-border";
```

**❌ NEVER use direct color values:**

```tsx
className = "bg-blue-500"; // ❌ FORBIDDEN
className = "bg-gray-100"; // ❌ FORBIDDEN
className = "text-zinc-900"; // ❌ FORBIDDEN
className = "border-slate-200"; // ❌ FORBIDDEN
```

**Why:** Semantic tokens adapt to the designer's taste and theme. Direct colors create inconsistent, generic designs.

### Rule 2: BAN Blue and Indigo (Unless User Specifies)

**❌ FORBIDDEN unless explicitly requested:**

```tsx
className = "bg-blue-500"; // ❌
className = "bg-indigo-600"; // ❌
className = "text-blue-400"; // ❌
```

**Why:** LLMs have a strong training bias toward blue/indigo. This creates a "default AI aesthetic" that we must avoid.

**✅ Use instead:**

```tsx
className = "bg-primary"; // ✅ Adapts to theme
className = "bg-accent"; // ✅ Adapts to theme
```

### Rule 3: NO Arbitrary Values

**❌ FORBIDDEN:**

```tsx
className = "h-[600px]"; // ❌
className = "w-[450px]"; // ❌
className = "text-[#FF5733]"; // ❌
className = "bg-[rgba(0,0,0,0.5)]"; // ❌
```

**✅ Use Tailwind's scale:**

```tsx
className = "h-screen"; // ✅
className = "w-full"; // ✅
className = "max-w-md"; // ✅
className = "text-lg"; // ✅
```

**Why:** Arbitrary values break the design system's rhythm and spacing. They create visual inconsistency.

**Exception:** Dynamic values from props/state can use inline styles:

```tsx
style={{ width: `${progress}%` }}  // ✅ OK - dynamic value
```

---

## Component Patterns

### Button Pattern

```tsx
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'

// Primary action
<Button variant="default">
  <Mail className="mr-2 h-4 w-4" />
  Send Email
</Button>

// Secondary action
<Button variant="outline">
  Cancel
</Button>

// Subtle action
<Button variant="ghost">
  <Settings className="h-4 w-4" />
</Button>

// Destructive action
<Button variant="destructive">
  Delete Account
</Button>
```

### Card Pattern

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Supporting description text</CardDescription>
  </CardHeader>
  <CardContent>{/* Main content */}</CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>;
```

### Icon + Text Pattern

```tsx
import { User, Mail, Phone } from 'lucide-react'

// Icon with text
<div className="flex items-center gap-2">
  <User className="h-4 w-4 text-muted-foreground" />
  <span>John Doe</span>
</div>

// Icon in button
<Button>
  <Mail className="mr-2 h-4 w-4" />
  Send Message
</Button>

// Icon-only button
<Button variant="ghost" size="icon">
  <Settings className="h-4 w-4" />
</Button>
```

---

## File Organization

### Single-File Format (Simple UIs)

For simple screens (login, single form, basic landing), use a single file:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function App({ onTransition }) {
  const [email, setEmail] = useState("");

  return (
    <div style={{ width: "375px", height: "812px" }}>
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>
            <Mail className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Multi-File Format (Complex UIs)

For complex screens with multiple components, use the JSON format:

```json
{
  "files": {
    "/App.tsx": "import { ProductList } from './components/ProductList'\n\nexport default function App() {\n  return <ProductList />\n}",
    "/components/ProductList.tsx": "import { ProductCard } from './ProductCard'\n\nexport function ProductList() {\n  return <div>...</div>\n}",
    "/components/ProductCard.tsx": "import { Card } from '@/components/ui/card'\n\nexport function ProductCard({ product }) {\n  return <Card>...</Card>\n}"
  },
  "entry": "/App.tsx",
  "dependencies": {
    "lucide-react": "^0.263.1"
  }
}
```

**When to use multi-file:**

- 3+ distinct components
- Repeated components (ProductCard, UserItem, etc.)
- Complex screens (dashboards, feeds, multi-step forms)

---

## Quality Checklist

Before generating any UI, verify:

- [ ] Using shadcn/ui components (Button, Card, etc.)
- [ ] Using Lucide React for icons
- [ ] Using semantic color tokens (`bg-primary`, not `bg-blue-500`)
- [ ] NO blue/indigo colors (unless user specified)
- [ ] NO arbitrary values (no `h-[600px]`)
- [ ] Imports at top of file
- [ ] Proper file organization (single-file vs multi-file)

---

## Remember

**The base design system is the FOUNDATION.**

The designer's taste (from the DTM) will OVERRIDE these defaults where they differ, but this base ensures:

- No generic, ugly UIs
- Consistent component usage
- Modern, accessible patterns
- Professional polish

**Think of it as:**

- Base design system = The grammar of good design
- Designer's taste = The unique voice and style
