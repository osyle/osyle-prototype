# BASE DESIGN SYSTEM

## Component Library: shadcn/ui + Lucide

Import only what you use. All components available at `@/components/ui/*`:

```tsx
// Common imports
import { Button } from "@/components/ui/button";
import {
  Input,
  Label,
  Textarea,
  Checkbox,
  Switch,
  Slider,
} from "@/components/ui/...";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Progress,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/...";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
// 50+ components total — use the right one for the job
```

```tsx
// Icons — always Lucide, never emoji for UI icons
import {
  Mail,
  User,
  Settings,
  ChevronRight,
  Plus,
  Trash,
  Check,
  Menu,
  X,
} from "lucide-react";
// Usage: <Mail className="h-5 w-5" />
```

## Semantic Color Tokens

Always use semantic tokens — they adapt to light/dark automatically:

| Purpose     | Token                                                              |
| ----------- | ------------------------------------------------------------------ |
| Background  | `bg-background`, `bg-card`, `bg-muted`                             |
| Text        | `text-foreground`, `text-muted-foreground`, `text-card-foreground` |
| Brand       | `bg-primary`, `text-primary-foreground`                            |
| Accent      | `bg-accent`, `text-accent-foreground`                              |
| Borders     | `border-border`, `border-input`                                    |
| Destructive | `bg-destructive`, `text-destructive`                               |

Use semantic tokens as your base. Apply designer taste (hex colors, fonts) on top when the aesthetic requires it.
