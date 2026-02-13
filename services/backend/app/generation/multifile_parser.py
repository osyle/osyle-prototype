"""
Multi-File Output Parser

Handles conversion between LLM output formats:
1. Legacy: Single JSX string
2. New: Multi-file JSON structure

Ensures backward compatibility while enabling new capabilities.
"""
import json
import re
from typing import Dict, Any, Optional, Tuple


def parse_llm_output(llm_response: str) -> Dict[str, Any]:
    """
    Parse LLM output into multi-file structure
    
    Supports two formats:
    
    Format 1 (Legacy): Single JSX code
    ```
    export default function App() { ... }
    ```
    Returns: {
        "files": {"/App.tsx": "..."},
        "entry": "/App.tsx",
        "dependencies": {}
    }
    
    Format 2 (New): JSON with file structure
    ```
    {
      "files": {
        "/App.tsx": "...",
        "/components/Button.tsx": "..."
      },
      "entry": "/App.tsx",
      "dependencies": {"lucide-react": "^0.263.1"}
    }
    ```
    Returns: The parsed JSON structure
    
    Args:
        llm_response: Raw LLM output (may include markdown, JSON, or plain code)
    
    Returns:
        {
            "files": Dict[str, str],  # filepath -> code
            "entry": str,              # entry point filepath
            "dependencies": Dict[str, str],  # package -> version
            "format": str              # "legacy" or "multifile"
        }
    """
    
    # Clean response
    cleaned = llm_response.strip()
    
    # Try to detect and parse JSON format first
    json_result = _try_parse_json(cleaned)
    if json_result:
        return json_result
    
    # Fallback: treat as legacy single-file format
    code = _clean_code_fences(cleaned)
    
    return {
        "files": {"/App.tsx": code},
        "entry": "/App.tsx",
        "dependencies": {},
        "format": "legacy"
    }


def _try_parse_json(response: str) -> Optional[Dict[str, Any]]:
    """
    Try to parse response as JSON multi-file structure
    
    Looks for JSON objects that match the multi-file schema:
    {
      "files": {...},
      "entry": "...",
      "dependencies": {...}
    }
    """
    
    # Look for JSON code blocks first
    json_block_pattern = r'```json\s*\n(.*?)\n```'
    matches = re.findall(json_block_pattern, response, re.DOTALL)
    
    if matches:
        # Try to parse the first JSON block
        try:
            data = json.loads(matches[0])
            if _validate_multifile_structure(data):
                return {
                    **data,
                    "format": "multifile"
                }
        except json.JSONDecodeError:
            pass
    
    # Try to parse entire response as JSON
    try:
        data = json.loads(response)
        if _validate_multifile_structure(data):
            return {
                **data,
                "format": "multifile"
            }
    except json.JSONDecodeError:
        pass
    
    # Look for JSON-like structure without code blocks
    # Pattern: starts with { and ends with }
    if response.strip().startswith('{') and response.strip().endswith('}'):
        try:
            data = json.loads(response)
            if _validate_multifile_structure(data):
                return {
                    **data,
                    "format": "multifile"
                }
        except json.JSONDecodeError:
            pass
    
    return None


def _validate_multifile_structure(data: Any) -> bool:
    """
    Validate that data matches multi-file schema
    
    Required:
    - "files" key with dict value
    
    Optional:
    - "entry" key with string value
    - "dependencies" key with dict value
    """
    
    if not isinstance(data, dict):
        return False
    
    # Must have "files" key
    if "files" not in data:
        return False
    
    # "files" must be a dict
    if not isinstance(data["files"], dict):
        return False
    
    # "files" must not be empty
    if len(data["files"]) == 0:
        return False
    
    # If "entry" exists, must be string
    if "entry" in data and not isinstance(data["entry"], str):
        return False
    
    # If "dependencies" exists, must be dict
    if "dependencies" in data and not isinstance(data["dependencies"], dict):
        return False
    
    return True


def _clean_code_fences(code: str) -> str:
    """
    Remove markdown code fences from code
    
    Handles:
    - ```jsx ... ```
    - ```typescript ... ```
    - ```tsx ... ```
    - ``` ... ```
    """
    
    # Remove fences
    code = re.sub(r'```(?:typescript|tsx|jsx|javascript|js|react)?\n', '', code)
    code = re.sub(r'\n```\s*$', '', code)
    code = re.sub(r'^```\s*', '', code)
    
    # Remove standalone language identifiers
    code = re.sub(r'^(typescript|javascript|jsx|tsx|ts|js|react)\s*$', '', code, flags=re.MULTILINE)
    
    return code.strip()


def add_shadcn_components_to_files(
    files: Dict[str, str],
    components: list[str] = None
) -> Dict[str, str]:
    """
    Add shadcn/ui component files to the files dict
    
    This ensures that when LLM generates code using shadcn/ui components,
    the actual component files are included in the output.
    
    Args:
        files: Existing files dict
        components: List of component names to add (default: ['button', 'card'])
    
    Returns:
        Updated files dict with component files added
    """
    
    if components is None:
        components = ['button', 'card']
    
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
import { Slot } from "@radix-ui/react-slot"
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
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
    
    return updated_files


def ensure_default_dependencies(
    dependencies: Dict[str, str]
) -> Dict[str, str]:
    """
    Ensure default dependencies are included
    
    Default dependencies for all projects:
    - lucide-react: Icons
    - clsx: Utility for className merging
    - tailwind-merge: Tailwind class merging
    - @radix-ui/*: Required by shadcn/ui components
    """
    
    defaults = {
        "lucide-react": "^0.263.1",
        "clsx": "^2.1.1",
        "tailwind-merge": "^2.5.5",
        "@radix-ui/react-slot": "latest",
        "class-variance-authority": "latest",
    }
    
    # Merge with provided dependencies (provided take precedence)
    return {
        **defaults,
        **dependencies
    }


def normalize_file_paths(files: Dict[str, str]) -> Dict[str, str]:
    """
    Normalize file paths to ensure consistency
    
    - All paths start with /
    - No duplicate leading slashes
    - Consistent use of .tsx vs .ts
    """
    
    normalized = {}
    
    for filepath, code in files.items():
        # Ensure leading slash
        if not filepath.startswith('/'):
            filepath = '/' + filepath
        
        # Remove duplicate slashes
        filepath = re.sub(r'/+', '/', filepath)
        
        normalized[filepath] = code
    
    return normalized