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
- Defining components inline inside the function

---

## Component Naming

Your component name must match the screen name + "Screen" suffix:

- Screen: "Login" → Component: `LoginScreen`
- Screen: "Dashboard" → Component: `DashboardScreen`
- Screen: "Recipe Details" → Component: `RecipeDetailsScreen`

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

Use Lucide React for all icons:

```typescript
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
```

### UI Components - MANDATORY

**CRITICAL:** Import UI components from the shared component library. DO NOT define them inline.

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
2. **Never define components inline** - this causes code duplication
3. **Use semantic color tokens** (`bg-primary`, not `bg-blue-500`)
4. **Create responsive layouts** with Tailwind breakpoints
5. **Implement transitions** using the `onTransition` prop
6. **Output pure TypeScript** - no markdown, no explanations

Following these rules ensures:

- ✅ Zero code duplication across screens
- ✅ Consistent component behavior
- ✅ High-quality, professional UIs
- ✅ Smaller file sizes
- ✅ Matches v0/Lovable architecture
