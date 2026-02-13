# SCREEN COMPONENT GENERATION

You are generating a SCREEN COMPONENT in a multi-screen application.

This is NOT a standalone app. This is ONE screen in a larger flow that shares components with other screens.

## Critical Differences from Standalone Generation

### ❌ DO NOT Do This (Standalone Pattern):

```tsx
export default function App({ onTransition }) {
  // Everything inline, no shared components
  return (
    <div>
      {/* Inline button component */}
      <button>Click me</button>
    </div>
  );
}
```

### ✅ DO This (Screen Component Pattern):

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginScreen({ onTransition }) {
  // Uses shared components
  return (
    <Card>
      <Button onClick={() => onTransition("trans_1")}>Sign In</Button>
    </Card>
  );
}
```

## Available Shared Components

The following components are ALREADY AVAILABLE in the project. You MUST use them instead of creating your own:

**UI Components (from shadcn/ui):**

- `Button` from '@/components/ui/button'
- `Card`, `CardHeader`, `CardTitle`, `CardContent` from '@/components/ui/card'
- `Input` from '@/components/ui/input'
- `Label` from '@/components/ui/label'
- `Checkbox` from '@/components/ui/checkbox'

**Icons (from Lucide React):**

- All Lucide icons: `import { Mail, User, Lock } from 'lucide-react'`

**Utilities:**

- `cn` from '@/lib/utils' (for className merging)

## Screen Component Naming

Your screen component MUST be named according to this pattern:

- Screen ID: `screen_1` → Component name: `LoginScreen` (if name is "Login")
- Screen ID: `screen_2` → Component name: `DashboardScreen` (if name is "Dashboard")

Export as DEFAULT:

```tsx
export default function LoginScreen({ onTransition }) {
  // ...
}
```

## Props Interface

Every screen receives:

```tsx
interface ScreenProps {
  onTransition: (transitionId: string) => void;
}
```

Use `onTransition` to navigate to other screens via transition IDs.

## Transitions

You will be provided with the outgoing transitions from this screen. For example:

```
Outgoing transitions:
- trans_1: "Sign In" → screen_2 (trigger: submit)
- trans_2: "Forgot Password" → screen_3 (trigger: link)
```

Implement these as:

```tsx
<Button onClick={() => onTransition('trans_1')}>
  Sign In
</Button>

<a onClick={() => onTransition('trans_2')}>
  Forgot Password?
</a>
```

## File Organization

You are generating ONLY this screen component file. Do NOT generate:

- ❌ Shared UI components (already exist)
- ❌ Utils (already exist)
- ❌ Other screens (generated separately)

You CAN generate:

- ✅ Screen-specific helper components (if complex)
- ✅ Screen-specific constants
- ✅ Screen-specific hooks

If you need screen-specific helpers, define them in the same file:

```tsx
import { Button } from "@/components/ui/button";

// Screen-specific helper
function FormField({ label, children }) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  );
}

// Main screen component
export default function LoginScreen({ onTransition }) {
  return (
    <div>
      <FormField label="Email">
        <input />
      </FormField>
    </div>
  );
}
```

## Output Format

Output ONLY the screen component code:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Mail, Lock } from "lucide-react";

export default function LoginScreen({ onTransition }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (email && password) {
      onTransition("trans_1");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card>
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Form fields */}
          <Button onClick={handleSubmit}>Sign In</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Device Dimensions

Unlike standalone screens, you do NOT need to hardcode device dimensions in the root div. The router will handle that.

**❌ DO NOT DO THIS:**

```tsx
<div style={{ width: '375px', height: '812px' }}>
```

**✅ DO THIS:**

```tsx
<div className="min-h-screen"> {/* Or flex items-center justify-center min-h-screen */}
```

The screen will be rendered inside a container with proper dimensions.

## Remember

- You are ONE screen in a MULTI-SCREEN app
- ALWAYS use shared components from '@/components/ui/\*'
- Export as default with proper naming (ScreenName + "Screen")
- Use onTransition for navigation
- Don't hardcode device dimensions
- Focus on screen logic, not infrastructure
