# SCREEN COMPONENT GENERATION

You are generating a **screen component** for a multi-screen application.

---

## OUTPUT FORMAT - CRITICAL

Output ONLY pure TypeScript code. Start immediately with imports. No markdown fences. No JSON wrapper. No explanatory text.

**CORRECT output starts like this:**

```
import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'

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

## Component Imports

Import React hooks and Lucide icons using standard npm imports:

```typescript
// React hooks
import { useState, useEffect } from "react";

// Lucide icons
import { Mail, Lock, ArrowRight, User } from "lucide-react";
```

**Define UI Components Inline:**

Since each screen is a single file, define reusable UI components INSIDE your main function:

```typescript
export default function LoginScreen({ onTransition }: LoginScreenProps) {
  // Define Button component
  const Button = ({
    children,
    onClick,
    variant = "default",
    className = "",
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "default" | "destructive" | "outline" | "ghost";
    className?: string;
  }) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 h-9 px-4 py-2";
    const variants = {
      default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
      destructive:
        "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      outline:
        "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
    };
    return (
      <button
        className={`${baseStyles} ${variants[variant]} ${className}`}
        onClick={onClick}
      >
        {children}
      </button>
    );
  };

  // Define Card components
  const Card = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={`rounded-xl border bg-card text-card-foreground shadow ${className}`}
    >
      {children}
    </div>
  );

  const CardHeader = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
      {children}
    </div>
  );

  const CardTitle = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <h3 className={`font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );

  const CardContent = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;

  // Define Input component
  const Input = ({
    type = "text",
    placeholder = "",
    value = "",
    onChange,
    className = "",
  }: {
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
  }) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
    />
  );

  // Use in your screen...
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="email" placeholder="you@example.com" />
          <Button onClick={() => onTransition("trans_1")}>Sign In</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Common Components to Define:**

- Button (default, destructive, outline, ghost variants)
- Card, CardHeader, CardTitle, CardContent, CardFooter
- Input
- Label
- Checkbox
- Select
- Textarea
- Badge
- Separator
- Skeleton (for loading states)

Define only the components you need for your screen. Follow shadcn/ui design aesthetic.

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

Implement them:

```typescript
<Button onClick={() => onTransition('trans_1')}>Sign In</Button>
<a onClick={() => onTransition('trans_2')}>Forgot Password?</a>
```

---

## Layout Guidelines

✅ **DO:** Use flexible responsive layouts

```typescript
<div className="min-h-screen">
  <div className="max-w-4xl mx-auto p-4">
    {/* content adapts to screen size */}
  </div>
</div>
```

❌ **DON'T:** Hardcode fixed dimensions

```typescript
<div style={{ width: '375px', height: '812px' }}>
```

---

## Complete Example

```typescript
import { useState } from "react";
import { Mail, Lock } from "lucide-react";

interface LoginScreenProps {
  onTransition: (transitionId: string) => void;
}

export default function LoginScreen({ onTransition }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Define UI components inline
  const Button = ({
    children,
    onClick,
    className = "",
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );

  const Card = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={`rounded-xl border bg-card text-card-foreground shadow ${className}`}
    >
      {children}
    </div>
  );

  const CardHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col space-y-1.5 p-6">{children}</div>
  );

  const CardTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="font-semibold leading-none tracking-tight text-2xl">
      {children}
    </h3>
  );

  const CardContent = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;

  const Input = ({
    type = "text",
    placeholder = "",
    value,
    onChange,
  }: {
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={() => onTransition("trans_1")}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```
