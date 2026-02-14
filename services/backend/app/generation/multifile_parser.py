"""
Multi-file Parser for LLM Output

Parses LLM responses that can be either:
1. Single-file format (legacy): Just the React code
2. Multi-file format (new): JSON with files dict

Also provides utilities for adding shadcn/ui components to projects.
"""

import json
import re
from typing import Dict, Any, List


def parse_llm_output(llm_response: str) -> Dict[str, Any]:
    """
    Parse LLM output that could be single-file or multi-file format
    
    Supports two formats:
    
    Format 1 (Legacy): Single JSX/TSX code
    ```
    export default function App() { ... }
    ```
    
    Format 2 (Multi-file): JSON structure
    ```
    {
      "files": {
        "/App.tsx": "...",
        "/components/ProductCard.tsx": "..."
      },
      "entry": "/App.tsx",
      "dependencies": {...}
    }
    ```
    
    Returns:
        {
            "files": {"/App.tsx": "code"},
            "entry": "/App.tsx",
            "dependencies": {},
            "format": "legacy" | "multifile"
        }
    """
    
    # Clean response
    cleaned = llm_response.strip()
    
    # CRITICAL: Check if LLM incorrectly wrapped code in JSON
    # Pattern: json\n{"files": {"/App.tsx": "actual code"}}
    # This is WRONG - we want just the code, not a JSON wrapper
    if cleaned.startswith('json\n{') or cleaned.startswith('```json\n{'):
        print("  ⚠️  LLM output JSON wrapper (extracting code)...")
        try:
            # Remove 'json\n' prefix or ```json\n prefix
            json_str = cleaned.replace('json\n', '', 1).replace('```json\n', '', 1)
            # Remove trailing ```
            json_str = json_str.rstrip('`').strip()
            
            data = json.loads(json_str)
            
            # If it has "files" with a single "/App.tsx" entry, extract that code
            if isinstance(data, dict) and "files" in data:
                files = data["files"]
                if isinstance(files, dict) and len(files) == 1:
                    # Get the single file's code
                    code = list(files.values())[0]
                    print(f"  ✓ Extracted code from JSON wrapper ({len(code)} chars)")
                    return {
                        "files": {"/App.tsx": code},
                        "entry": "/App.tsx",
                        "dependencies": data.get("dependencies", {}),
                        "format": "legacy"
                    }
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"  ✗ Failed to parse JSON wrapper: {e}")
            # Fall through to normal parsing
    
    # Try to detect and parse JSON format first
    json_result = _try_parse_json(cleaned)
    if json_result:
        return json_result
    
    # Fall back to single-file format
    print("  📄 Detected single-file format")
    
    # Clean code fences
    code = _clean_code_fences(cleaned)
    
    return {
        "files": {"/App.tsx": code},
        "entry": "/App.tsx",
        "dependencies": {},
        "format": "legacy"
    }


def _try_parse_json(response: str) -> Dict[str, Any] | None:
    """
    Try to parse response as JSON multi-file format
    
    Returns None if not valid JSON format
    """
    
    # Look for JSON pattern
    # It might be wrapped in code fences or not
    json_match = re.search(r'```json\s*\n(.*?)\n```', response, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        # Try parsing entire response as JSON
        json_str = response.strip()
    
    try:
        data = json.loads(json_str)
        
        # Validate structure
        if not isinstance(data, dict):
            return None
        
        if "files" not in data:
            return None
        
        if not isinstance(data["files"], dict):
            return None
        
        # Valid multi-file format!
        print("  📁 Detected multi-file format")
        
        return {
            "files": data["files"],
            "entry": data.get("entry", "/App.tsx"),
            "dependencies": data.get("dependencies", {}),
            "format": "multifile"
        }
        
    except json.JSONDecodeError:
        return None


def _clean_code_fences(code: str) -> str:
    """Remove markdown code fences from code"""
    
    # Remove opening fence (with optional language)
    code = re.sub(r'^```(?:typescript|tsx|jsx|javascript|js|react)?\s*\n', '', code, flags=re.MULTILINE)
    
    # Remove closing fence
    code = re.sub(r'\n```\s*$', '', code)
    
    return code.strip()


def ensure_default_dependencies(
    dependencies: Dict[str, str]
) -> Dict[str, str]:
    """
    Ensure default dependencies are included
    
    For Sandpack bundling, we need to specify npm package versions.
    
    Args:
        dependencies: Existing dependencies dict
    
    Returns:
        Updated dependencies dict with defaults
    """
    
    defaults = {
        'lucide-react': '^0.263.1',
        'clsx': '^2.0.0',
        'tailwind-merge': '^2.0.0',
        'class-variance-authority': '^0.7.0'
    }
    
    # Merge with existing, preferring existing versions
    result = {**defaults, **dependencies}
    
    return result


def add_shadcn_components_to_files(
    files: Dict[str, str],
    components: List[str] = None
) -> Dict[str, str]:
    """
    Add shadcn/ui component files to the files dict
    
    This ensures that when screens import from '@/components/ui/button',
    the actual component files are included in the output.
    
    Args:
        files: Existing files dict
        components: List of component names to add (default: ['button', 'card', 'input'])
    
    Returns:
        Updated files dict with component files added
    """
    
    if components is None:
        components = ['button', 'card', 'input', 'label']
    
    updated_files = files.copy()
    
    # Add lib/utils.ts (required by all shadcn/ui components)
    if '/lib/utils.ts' not in updated_files:
        updated_files['/lib/utils.ts'] = '''import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
'''
    
    # Add button component
    if 'button' in components and '/components/ui/button.tsx' not in updated_files:
        updated_files['/components/ui/button.tsx'] = '''import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
'''
    
    # Add card component
    if 'card' in components and '/components/ui/card.tsx' not in updated_files:
        updated_files['/components/ui/card.tsx'] = '''import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
'''
    
    # Add input component
    if 'input' in components and '/components/ui/input.tsx' not in updated_files:
        updated_files['/components/ui/input.tsx'] = '''import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
'''
    
    # Add label component
    if 'label' in components and '/components/ui/label.tsx' not in updated_files:
        updated_files['/components/ui/label.tsx'] = '''import * as React from "react"
import { cn } from "@/lib/utils"

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
)
Label.displayName = "Label"

export { Label }
'''
    
    # Add checkbox component
    if 'checkbox' in components and '/components/ui/checkbox.tsx' not in updated_files:
        updated_files['/components/ui/checkbox.tsx'] = '''import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 peer-checked:bg-primary peer-checked:text-primary-foreground",
            className
          )}
        >
          {props.checked && (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          )}
        </div>
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
'''
    
    # Add badge component
    if 'badge' in components and '/components/ui/badge.tsx' not in updated_files:
        updated_files['/components/ui/badge.tsx'] = '''import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
'''
    
    # Add separator component
    if 'separator' in components and '/components/ui/separator.tsx' not in updated_files:
        updated_files['/components/ui/separator.tsx'] = '''import * as React from "react"
import { cn } from "@/lib/utils"

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }
'''
    
    return updated_files


def normalize_file_paths(files: Dict[str, str]) -> Dict[str, str]:
    """
    Normalize file paths to ensure consistency
    
    - All paths start with /
    - Convert Windows backslashes to forward slashes
    - Remove duplicate slashes
    """
    
    normalized = {}
    
    for path, code in files.items():
        # Ensure leading slash
        if not path.startswith('/'):
            path = '/' + path
        
        # Convert backslashes
        path = path.replace('\\', '/')
        
        # Remove duplicate slashes
        path = re.sub(r'/+', '/', path)
        
        normalized[path] = code
    
    return normalized