# RESPONSIVE DESIGN SYSTEM

## Core: Use Full Viewport, Adapt Layout

**Root container always**: `className="w-full h-full min-h-screen"`
**Never**: `style={{ width: "1440px" }}` or `className="w-[1440px]"`

---

## 5 Layout Transformations (Not Just Scaling)

```jsx
// Grid: 1 col → 2 → 3
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">

// Flex direction
<div className="flex flex-col lg:flex-row">

// Sidebar: hidden mobile, visible desktop
<aside className="hidden lg:block w-64 border-r">
<main className="flex-1 overflow-y-auto">

// Mobile bottom nav — scroll container MUST have pb matching bar height
<main className="pb-20 overflow-y-auto">
<nav className="fixed bottom-0 w-full flex md:hidden h-20 bg-background border-t">

// Desktop top nav
<nav className="hidden md:flex items-center justify-between px-8 py-4">
```

---

## Spacing Scale (Responsive)

Use responsive classes. All spacing values stay multiples of the designer's quantum:

```jsx
className = "p-4 md:p-6 lg:p-8"; // padding
className = "gap-3 md:gap-4 lg:gap-6"; // grid/flex gaps
className = "space-y-4 md:space-y-6"; // vertical stacks
className = "mb-6 md:mb-8 lg:mb-12"; // margins
```

---

## Typography (Fluid, Same Hierarchy Ratio)

```jsx
<h1 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight">
<h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">
<p className="text-sm md:text-base lg:text-lg leading-relaxed">
```

Font families and weights: **never change across viewports**. Only sizes scale.

---

## Touch Targets

All interactive elements: `min-h-[44px] min-w-[44px]`
