# SCREEN COMPONENT GENERATION

You are generating a **screen component** for a multi-screen application.

---

## OUTPUT FORMAT - CRITICAL

Output ONLY pure TypeScript code. Start immediately with imports. No markdown fences. No JSON wrapper. No explanatory text.

**CORRECT output starts like this:**

```
import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginScreenProps {
  onTransition: (transitionId: string) => void
}

export default function LoginScreen({ onTransition }: LoginScreenProps) {
  ...
}
```

**WRONG outputs (DO NOT do this):**

- `json\n{"files": {...}}`
- ` ```typescript\n...` ```
- ` ```tsx\n...` ```
- Text before/after code
- **Importing from relative paths like `./components/*` or `../utils/*`**
- **Importing custom components from ANY path other than `@/components/ui/*`**

**❌ WRONG:**

```typescript
import { SomeComponent } from "./components/SomeComponent";
import { Icon } from "https://esm.sh/lucide-react";
```

**✅ CORRECT:**

```typescript
import { ArrowLeft, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MyScreen({ onTransition }) {
  const products = [
    /* data */
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {products.map((product) => (
        <Card key={product.id}>
          <CardContent className="p-4">
            <h3>{product.name}</h3>
            <Badge>{product.category}</Badge>
            <Button onClick={() => onTransition("t1")}>View</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## Component Naming

Your component name must match the screen name + "Screen" suffix.

**CRITICAL NAMING RULES:**

1. **Remove ALL special characters** (hyphens, ampersands, numbers at start, etc.)
2. **Use PascalCase** (capitalize each word, no spaces)
3. **Valid characters only**: Letters (A-Z, a-z) and numbers (0-9, but NOT at the start)
4. **NO hyphens, underscores, or special symbols**

**Examples of CORRECT naming:**

- Screen: "Login" → Component: `LoginScreen`
- Screen: "Dashboard" → Component: `DashboardScreen`
- Screen: "Recipe Details" → Component: `RecipeDetailsScreen`
- Screen: "Product & Cart" → Component: `ProductCartScreen` (remove &)
- Screen: "Step-by-Step Guide" → Component: `StepByStepGuideScreen` (remove hyphens)
- Screen: "7-Day Weather" → Component: `SevenDayWeatherScreen` (spell out number, remove hyphen)
- Screen: "User's Profile" → Component: `UsersProfileScreen` (remove apostrophe)

**Examples of WRONG naming (DO NOT USE):**

- ❌ `Weather-Card` (has hyphen)
- ❌ `7DayCalendar` (starts with number)
- ❌ `Product&Info` (has ampersand)
- ❌ `User's-Profile` (has apostrophe and hyphen)
- ❌ `step_by_step` (has underscores)

**Processing algorithm:**

1. Remove ALL non-alphanumeric characters (keep only A-Z, a-z, 0-9)
2. If starts with number, spell it out (7 → Seven)
3. Convert to PascalCase
4. Add "Screen" suffix

```typescript
// Example:
interface LoginScreenProps {
  onTransition: (transitionId: string) => void;
}

export default function LoginScreen({ onTransition }: LoginScreenProps) {
  return <div>...</div>;
}
```

---

## Required Imports

### React Hooks

Import React hooks at the top:

```typescript
import { useState, useEffect, useCallback, useMemo } from "react";
```

### Lucide Icons

**CRITICAL:** Import from the npm package `lucide-react` - NEVER from URLs.

```typescript
// ✅ CORRECT
import {
  Mail,
  Lock,
  User,
  Settings,
  ArrowRight,
  ChevronDown,
  Check,
  X,
  Menu,
} from "lucide-react";

// ❌ WRONG - NEVER use URL imports
// import { Mail } from "https://esm.sh/lucide-react@0.263.1"
// import { Lock } from "http://cdn.example.com/lucide-react"
```

### UI Components - MANDATORY

**CRITICAL:** Import UI components from the shared component library. DO NOT define them inline.

**ONLY ALLOWED IMPORTS:**

1. `@/components/ui/*` (shadcn/ui components - see list below)
2. `lucide-react` (icons)
3. `react` (hooks)

**NEVER:**

- ❌ Import from relative paths: `./components/*`, `../components/*`
- ❌ Create separate helper component files
- ❌ Import custom components from anywhere except `@/components/ui/*`
- ❌ Import from URLs: `https://...`, `http://...`, `esm.sh`, CDN links

**If you need custom logic:**

- ✅ Define helper functions inside the screen component
- ✅ Define helper components inside the screen function (NOT as separate imports)
- ✅ Keep everything in ONE single file
- ❌ NEVER create separate component files to import
- ❌ NEVER import custom components from ./components/ or any relative path

**Example of CORRECT inline component:**

```typescript
export default function ProductListScreen({ onTransition }: Props) {
  const [products, setProducts] = useState([...])

  // ✅ CORRECT: Define helper component inline
  const ProductCard = ({ product }: { product: Product }) => (
    <Card>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{product.description}</p>
        <Button onClick={() => onTransition('view-product')}>View</Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

**Example of WRONG separate component file:**

```typescript
// ❌ WRONG: Do NOT create separate component files
import { ProductCard } from "./components/ProductCard"; // NEVER DO THIS
import { ProductCard } from "../ProductCard"; // NEVER DO THIS

export default function ProductListScreen({ onTransition }: Props) {
  // ...
}
```

**Import UI components from the shared component library:**

CRITICAL: The full shadcn/ui library (50+ components) is available. Import what you need.

```typescript
// Core Input
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

// Data Display
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Feedback
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";

// Layout
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";

// Navigation
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Pagination } from "@/components/ui/pagination";

// Overlays
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";

// Interactive
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Command } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
```

**Available: 50+ components across all categories.**

See documentation for complete list. Use any component that fits your design needs.

**NEVER define these components inline.** Always import from `@/components/ui/*`.

---

## Component Usage Examples

### Button

```typescript
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'

// Primary action
<Button onClick={() => onTransition('trans_1')}>
  <Mail className="mr-2 h-4 w-4" />
  Continue
</Button>

// Secondary action
<Button variant="outline" onClick={handleBack}>
  Back
</Button>

// Destructive action
<Button variant="destructive" onClick={handleDelete}>
  Delete
</Button>

// Ghost variant
<Button variant="ghost">
  <Settings className="h-4 w-4" />
</Button>
```

### Card

```typescript
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card className="w-full max-w-md">
  <CardHeader>
    <CardTitle>Welcome Back</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">{/* Form fields */}</CardContent>
</Card>;
```

### Form Inputs

```typescript
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="you@example.com"
  />
</div>;
```

---

## Screen Structure

Every screen should follow this structure:

```typescript
import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginScreenProps {
  onTransition: (transitionId: string) => void;
}

export default function LoginScreen({ onTransition }: LoginScreenProps) {
  // 1. State hooks
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 2. Event handlers
  const handleSubmit = () => {
    // Validation
    if (email && password) {
      onTransition("trans_1");
    }
  };

  // 3. Render
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleSubmit}>
            <Mail className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Responsive Design

Use Tailwind breakpoints to create layouts that adapt:

```typescript
// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">Left</div>
  <div className="w-full md:w-1/2">Right</div>
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* items */}
</div>

// Responsive text sizes
<h1 className="text-2xl md:text-4xl lg:text-6xl">Title</h1>

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">
```

Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)

---

## Transitions

You'll receive transition info in the task description:

```
Outgoing transitions:
- trans_1: "Sign In" → screen_2
- trans_2: "Forgot Password" → screen_3
```

Implement them using the `onTransition` prop:

```typescript
// Primary transition (button)
<Button onClick={() => onTransition('trans_1')}>
  Sign In
</Button>

// Secondary transition (link)
<a
  className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
  onClick={() => onTransition('trans_2')}
>
  Forgot Password?
</a>
```

---

## Layout Guidelines

### ✅ DO: Flexible, Responsive Layouts

```typescript
<div className="min-h-screen bg-background">
  <div className="max-w-4xl mx-auto p-4">
    {/* content adapts to screen size */}
  </div>
</div>
```

### ❌ DON'T: Fixed Pixel Dimensions

```typescript
// ❌ WRONG
<div style={{ width: '375px', height: '812px' }}>

// ✅ CORRECT
<div className="min-h-screen">
```

---

## Styling Rules

### Use Semantic Color Tokens

```typescript
// ✅ CORRECT - semantic tokens
className = "bg-primary text-primary-foreground";
className = "bg-secondary text-secondary-foreground";
className = "bg-muted text-muted-foreground";
className = "bg-accent text-accent-foreground";
className = "bg-background text-foreground";
className = "border-border";

// ❌ WRONG - direct colors
className = "bg-blue-500";
className = "bg-gray-100";
className = "text-zinc-900";
```

### NO Arbitrary Values

```typescript
// ❌ WRONG
className = "h-[600px] w-[450px]";

// ✅ CORRECT
className = "h-screen w-full max-w-md";
```

---

## Complete Working Example

```typescript
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface LoginScreenProps {
  onTransition: (transitionId: string) => void;
}

export default function LoginScreen({ onTransition }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    if (email && password) {
      onTransition("trans_1");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm cursor-pointer">
                Remember me
              </Label>
            </div>
            <a
              onClick={() => onTransition("trans_2")}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              Forgot password?
            </a>
          </div>

          <Button className="w-full" onClick={handleLogin}>
            Sign In
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              OR
            </span>
          </div>

          <Button variant="outline" className="w-full">
            Sign in with Google
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-muted-foreground text-center">
            Don't have an account?{" "}
            <a
              onClick={() => onTransition("trans_3")}
              className="text-primary hover:underline cursor-pointer font-medium"
            >
              Sign up
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
```

---

## Key Takeaways

1. **Always import UI components** from `@/components/ui/*`
2. **ALWAYS define helper components inline** - inside the screen function, NOT as separate imports
3. **NEVER import from relative paths** - no `./components/*` or `../components/*` imports
4. **Keep everything in ONE single file** - all helper components must be defined inline
5. **Use semantic color tokens** (`bg-primary`, not `bg-blue-500`)
6. **Create responsive layouts** with Tailwind breakpoints
7. **Implement transitions** using the `onTransition` prop
8. **Output pure TypeScript** - no markdown, no explanations

Following these rules ensures:

- ✅ Zero "component not found" errors
- ✅ Single file per screen (no scattered component files)
- ✅ Consistent component behavior
- ✅ High-quality, professional UIs
- ✅ Smaller file sizes
- ✅ Matches v0/Lovable architecture

---

## CRITICAL FINAL REMINDERS

🚨 **SINGLE FILE ONLY** 🚨

- Your output is ONLY the TypeScript code for ONE file
- Do NOT create a JSON structure with multiple files
- Do NOT import custom components from relative paths
- Define ALL helper components inside the main screen function

🚨 **VALID COMPONENT NAMES ONLY** 🚨

- Component name: `LoginScreen`, `DashboardScreen`, `RecipeDetailsScreen`
- NO hyphens: ❌ `Weather-Card` → ✅ `WeatherCard`
- NO starting with numbers: ❌ `7DayCalendar` → ✅ `SevenDayCalendar`
- NO special characters: ❌ `Product&Info` → ✅ `ProductInfo`
- Remove ALL non-alphanumeric characters, use PascalCase, add "Screen" suffix

🚨 **ALLOWED IMPORTS ONLY** 🚨

- ✅ `@/components/ui/*` (shadcn components)
- ✅ `lucide-react` (icons)
- ✅ `react` (hooks)
- ❌ `./components/*` NEVER
- ❌ `../components/*` NEVER
- ❌ Any relative path imports NEVER
