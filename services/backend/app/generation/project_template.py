"""
Project Template Generator

Provides initial Sandpack template with:
- Basic App.tsx router structure
- package.json with dependencies
- tsconfig.json for TypeScript
- Tailwind setup
- Utility functions
"""
from typing import Dict, Any


def get_initial_template(device_info: Dict[str, Any] = None) -> Dict[str, str]:
    """
    Get initial project template files
    
    Args:
        device_info: Optional device specifications
    
    Returns:
        Dict of filepath -> content
    """
    
    files = {
        "/App.tsx": _get_app_template(),
        "/package.json": _get_package_json(),
        "/tsconfig.json": _get_tsconfig(),
        "/lib/utils.ts": _get_utils(),
        "/index.css": _get_tailwind_css()
    }
    
    return files


def _get_app_template() -> str:
    """Initial App.tsx template"""
    return """import { useState } from 'react'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Building your app...
          </h1>
          <p className="text-muted-foreground">
            The AI is generating your screens
          </p>
        </div>
      </div>
    </div>
  )
}"""


def _get_package_json() -> str:
    """package.json with dependencies"""
    return """{
  "name": "osyle-generated-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0"
  }
}"""


def _get_tsconfig() -> str:
    """TypeScript configuration"""
    return """{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "references": [{ "path": "./tsconfig.node.json" }]
}"""


def _get_utils() -> str:
    """Utility functions (cn helper)"""
    return """import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}"""


def _get_tailwind_css() -> str:
    """Tailwind CSS configuration"""
    return """@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}"""