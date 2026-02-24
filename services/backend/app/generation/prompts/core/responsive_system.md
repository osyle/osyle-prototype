# RESPONSIVE DESIGN SYSTEM

## Core Principle

Your design must look **SPECTACULAR at ANY viewport size** while maintaining the designer's aesthetic identity.

The user can resize the viewport freely. Your UI must adapt gracefully from mobile (320px) to ultra-wide desktop (2560px+).

## ⚠️ CRITICAL: Full-Width Usage & Layout Adaptation

**NEVER create fixed-width centered cards that waste space.** Responsive design means:

1. **USE FULL AVAILABLE SPACE** - Root container must be `w-full h-full`
2. **LAYOUT CHANGES** - Don't just scale, reorganize content at breakpoints
3. **ADAPTIVE DENSITY** - More space = more columns, visible sidebars, expanded features

### Examples of Proper Responsive Layouts

**❌ WRONG - Fixed Card (common mistake)**:

```jsx
// This is NOT responsive - it's just a centered card
<div className="flex items-center justify-center min-h-screen">
  <div className="max-w-md w-full bg-white rounded-lg p-6">
    {/* Card stays same size regardless of viewport */}
  </div>
</div>
```

**✅ CORRECT - Full Width with Adaptive Layout**:

```jsx
// Weather app example - adapts from mobile to desktop
<div className="w-full h-full min-h-screen bg-gradient-to-br from-blue-400 to-blue-600">
  <div className="p-4 md:p-8 lg:p-12">
    {/* Mobile: Single column */}
    {/* Tablet: 2 columns */}
    {/* Desktop: 3-4 columns + sidebar */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Content fills all available space */}
    </div>
  </div>
</div>
```

**✅ CORRECT - Dashboard with Sidebar**:

```jsx
<div className="flex w-full h-full">
  {/* Sidebar hidden on mobile, appears on desktop */}
  <aside className="hidden lg:block w-64 bg-gray-900 p-6">
    <nav>{/* Navigation */}</nav>
  </aside>

  {/* Main content uses all remaining space */}
  <main className="flex-1 overflow-y-auto">
    <div className="p-4 md:p-6 lg:p-8">
      {/* Content grid adapts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Cards */}
      </div>
    </div>
  </main>
</div>
```

**Key Rule**: If the task is to design a full app/screen (not just a component), **always use the full viewport**. Only use constrained widths for inner content containers when needed for readability (like article text).

---

## Sizing Philosophy

### Container Sizing - Use Semantic Units

**Root Container**: NEVER use fixed pixel dimensions

```jsx
// ❌ WRONG - Fixed dimensions
<div style={{ width: "1440px", height: "900px" }}>

// ✅ CORRECT - Fluid dimensions
<div className="w-full h-full min-h-screen">
```

**Major Sections**: Use flex, percentage, or viewport units

```jsx
// ✅ Flexible containers
<main className="flex-1 h-full">
<section className="w-full max-w-7xl mx-auto">
<div className="h-screen">
```

**Component Containers**: Adapt to parent

```jsx
// ✅ Responsive components
<div className="w-full md:w-1/2 lg:w-1/3">
```

### Spacing - Scale with Viewport

Apply the designer's spacing quantum RELATIVELY across breakpoints:

**Quantum Scaling Strategy**:

- Mobile (< 640px): quantum × 0.75
- Tablet (640px - 1024px): quantum × 1.0
- Desktop (> 1024px): quantum × 1.25

**Example**: If designer uses 8px quantum:

- Mobile: 6px base (multiples: 6, 12, 18, 24, 36, 48...)
- Tablet: 8px base (multiples: 8, 16, 24, 32, 48, 64...)
- Desktop: 10px base (multiples: 10, 20, 30, 40, 60, 80...)

**Implementation with Tailwind**:

```jsx
// Instead of fixed: padding: "24px"
// Use responsive classes maintaining quantum multiples:
className = "p-4 md:p-6 lg:p-8"; // 16px → 24px → 32px (2x, 3x, 4x quantum)

// Vertical spacing
className = "space-y-3 md:space-y-4 lg:space-y-6"; // 12px → 16px → 24px

// Margins
className = "mb-6 md:mb-8 lg:mb-12"; // 24px → 32px → 48px
```

**Critical Rule**: At each breakpoint, ALL spacing values must be multiples of the scaled quantum.

### Typography - Fluid Scaling

Preserve hierarchy ratios while adapting absolute sizes:

**Hierarchy Preservation**:
If desktop has H1:H2:Body ratio of 3:2:1, maintain this ratio on mobile.

**Example Scale**:

```
Desktop (base):
- H1: 48px
- H2: 32px
- H3: 24px
- Body: 16px
- Small: 14px

Mobile (0.75x):
- H1: 36px
- H2: 24px
- H3: 18px
- Body: 14px
- Small: 12px
```

**Implementation**:

```jsx
// Headings - scale proportionally
<h1 className="text-3xl md:text-4xl lg:text-5xl">  // 30px → 36px → 48px

// Body text - subtle scaling
<p className="text-sm md:text-base lg:text-lg">  // 14px → 16px → 18px

// Maintain line-height ratios
className="leading-tight md:leading-snug lg:leading-normal"
```

**Font Families & Weights**: NEVER change

- Same families at all viewport sizes
- Same weights for same semantic purposes
- Only sizes scale

---

## Layout Responsiveness

### Breakpoint Strategy

Use Tailwind's responsive prefixes systematically:

**Available Breakpoints**:

- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up
- `2xl:` - 1536px and up

**Layout Patterns**:

```jsx
// Grid systems - responsive columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">

// Flex direction changes
<div className="flex flex-col md:flex-row">

// Hide/show elements
<div className="hidden lg:block">  // Desktop only
<div className="block md:hidden">  // Mobile only

// Responsive sizing
<div className="w-full md:w-2/3 lg:w-1/2">
```

### Component Adaptation Rules

Components should intelligently adapt:

**Cards**:

```jsx
// Mobile: Full width, vertical
// Tablet: 2-column grid
// Desktop: 3+ column grid
<div className="w-full md:w-1/2 lg:w-1/3 p-4 md:p-6">
```

**Navigation**:

```jsx
// Mobile: Bottom bar or hamburger
<nav className="fixed bottom-0 md:hidden">

// Desktop: Full horizontal or sidebar
<nav className="hidden md:flex md:items-center">
```

**Forms**:

```jsx
// Mobile: Single column, full-width
<form className="space-y-4">
  <input className="w-full" />

// Desktop: Multi-column, optimized width
<form className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl">
  <input className="w-full" />
```

**Images**:

```jsx
// Responsive images
<img className="w-full h-auto object-cover" />

// Different aspect ratios per breakpoint
<div className="aspect-square md:aspect-video">
```

---

## Maintaining Taste Across Viewports

### Layer 1 Constraints - Responsive Adaptation

#### Colors: ABSOLUTELY UNCHANGED

- ✅ Same exact hex values at ALL viewport sizes
- ✅ Same color roles and relationships
- ❌ NEVER change colors based on viewport

```jsx
// Same colors everywhere
className = "bg-[#6C63FF]"; // Desktop
className = "bg-[#6C63FF]"; // Mobile - SAME
```

#### Fonts: Families & Weights UNCHANGED

- ✅ Same font families at all sizes
- ✅ Same weights for same purposes
- ✅ Only font SIZES scale proportionally
- ❌ NEVER switch font families based on viewport

```jsx
// Font family stays constant
className = "font-[Inter]"; // All viewports

// Only size changes
className = "text-2xl md:text-3xl lg:text-4xl"; // Size scales
className = "font-semibold"; // Weight constant
```

#### Spacing Quantum: MAINTAINED AS MULTIPLES

- ✅ All spacing values remain multiples of quantum at each breakpoint
- ✅ Quantum scales: 0.75x (mobile), 1x (tablet), 1.25x (desktop)
- ❌ NEVER use arbitrary spacing values

**Quantum Translation Table** (for 8px base quantum):

| Element | Mobile (6px) | Tablet (8px) | Desktop (10px) |
| ------- | ------------ | ------------ | -------------- |
| Tiny    | 6px (1×)     | 8px (1×)     | 10px (1×)      |
| Small   | 12px (2×)    | 16px (2×)    | 20px (2×)      |
| Medium  | 18px (3×)    | 24px (3×)    | 30px (3×)      |
| Large   | 24px (4×)    | 32px (4×)    | 40px (4×)      |
| XL      | 36px (6×)    | 48px (6×)    | 60px (6×)      |
| 2XL     | 48px (8×)    | 64px (8×)    | 80px (8×)      |

```jsx
// Spacing that maintains quantum at each breakpoint
className = "p-4 md:p-6 lg:p-8"; // 16→24→32px (all quantum multiples)
className = "gap-3 md:gap-4 lg:gap-5"; // 12→16→20px (all quantum multiples)
```

#### Materials & Effects: MAINTAINED

- ✅ Same border radii (may scale slightly for very small screens if needed)
- ✅ Same shadows, blurs, gradients
- ✅ Same depth planes and layering
- ❌ Don't remove effects on mobile to "simplify"

```jsx
// Effects stay consistent
className = "shadow-lg rounded-xl backdrop-blur-sm"; // All viewports
```

### Layer 2 & 3 Constraints - Adaptive Application

#### Patterns: Adapt but Preserve Intent

**Spatial Philosophy**: Maintain relative density

- If designer prefers "spacious": Keep high spacing-to-content ratio on mobile
- If designer prefers "dense": Maintain tighter spacing even on mobile

**Color Relationships**: Same at all sizes

- Primary/secondary/accent usage stays consistent
- Background/foreground relationships preserved

**Typography Hierarchy**: Same RATIOS, different absolute sizes

- If H1 is 3× body text on desktop, keep 3× on mobile
- Maintain weight hierarchy (bold headers, normal body)

#### Personality: Context-Aware Decisions

When making responsive decisions, apply designer's heuristics:

**Complexity Approach**:

- Designer prefers simplification → Progressively disclose features on mobile
- Designer embraces complexity → Maintain full feature set, optimize layout

**Drama vs Usability**:

- Designer leans dramatic → Keep bold elements, adjust sizing
- Designer leans usable → Optimize for ergonomics first

**Density Preference**:

- Designer prefers sparse → Maintain breathing room on mobile
- Designer prefers dense → Pack efficiently but maintain quantum

---

## Technical Implementation

### Root Container Pattern

```jsx
export default function App({ onTransition }) {
  return (
    <div className="w-full h-full min-h-screen">
      {/* All content flows naturally */}
    </div>
  );
}
```

**Never use**:

```jsx
❌ <div style={{ width: "1440px", height: "900px" }}>
❌ <div className="w-[1440px] h-[900px]">
```

### Responsive Utility Patterns

**Container Max-Widths**:

```jsx
// Content container with max-width
<div className="w-full max-w-7xl mx-auto px-4 md:px-8">
```

**Responsive Padding**:

```jsx
// Consistent edge spacing
className = "px-4 md:px-8 lg:px-12"; // Horizontal
className = "py-6 md:py-8 lg:py-12"; // Vertical
```

**Responsive Gaps**:

```jsx
// Grid/flex gaps
className = "gap-4 md:gap-6 lg:gap-8";
className = "space-y-4 md:space-y-6 lg:space-y-8";
```

**Responsive Typography**:

```jsx
// Text sizing
className = "text-sm md:text-base lg:text-lg";
className = "text-2xl md:text-3xl lg:text-4xl";

// Line height
className = "leading-tight md:leading-snug lg:leading-normal";

// Letter spacing
className = "tracking-tight md:tracking-normal";
```

### Container Query Pattern (Advanced)

For component-level responsiveness independent of viewport:

```jsx
<div className="@container">
  {/* Component adapts to container width, not viewport */}
  <div className="@sm:flex @lg:grid @lg:grid-cols-2">{/* Content */}</div>
</div>
```

Use container queries when:

- Component is reused in different contexts
- Sidebar layouts where component width varies
- Card grids with varying item widths

---

## Quality Checklist

Before generating code, verify:

### ✅ Responsive Structure

- [ ] Root container uses `w-full h-full` (not fixed pixels)
- [ ] All major sections use flex/grid/percentage sizing
- [ ] Content reflows from mobile → tablet → desktop

### ✅ Spacing Fidelity

- [ ] All spacing values are quantum multiples at each breakpoint
- [ ] Mobile uses ~0.75x quantum
- [ ] Tablet uses 1x quantum
- [ ] Desktop uses ~1.25x quantum

### ✅ Typography Scaling

- [ ] Font families/weights unchanged across viewports
- [ ] Font sizes scale proportionally
- [ ] Hierarchy ratios maintained (H1:H2:Body same at all sizes)
- [ ] Responsive classes used: `text-2xl md:text-3xl lg:text-4xl`

### ✅ Color Consistency

- [ ] Exact same hex values at all viewport sizes
- [ ] No color changes based on breakpoint
- [ ] Same color roles across viewports

### ✅ Layout Adaptation

- [ ] Single column on mobile
- [ ] Multi-column on desktop (when appropriate)
- [ ] Navigation adapted per screen dimensions
- [ ] Components reflow gracefully

---

## Common Responsive Patterns

These patterns show HOW LAYOUTS CHANGE, not just scale:

### Product Grid - Columns Adapt

```jsx
// ✅ CORRECT - 1 column mobile → 3 columns desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8 p-4 md:p-6 lg:p-8">
  {products.map((product, i) => (
    <div
      key={i}
      className="bg-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow"
    >
      <img
        src={product.image}
        className="w-full h-48 object-cover rounded-md mb-4"
      />
      <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
      <p className="text-gray-600 text-sm mb-4">{product.description}</p>
      <div className="flex justify-between items-center">
        <span className="text-xl font-bold">${product.price}</span>
        <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
          Add to Cart
        </button>
      </div>
    </div>
  ))}
</div>
```

### Dashboard - Sidebar Appears

```jsx
// ✅ CORRECT - Mobile: stacked, Desktop: sidebar + content
<div className="flex flex-col lg:flex-row w-full h-full min-h-screen">
  {/* Sidebar - hidden on mobile, fixed on desktop */}
  <aside className="hidden lg:block w-64 bg-gray-900 text-white">
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <nav className="space-y-2">
        <a href="#" className="block px-4 py-2 rounded-md hover:bg-gray-800">
          Overview
        </a>
        <a href="#" className="block px-4 py-2 rounded-md hover:bg-gray-800">
          Analytics
        </a>
        <a href="#" className="block px-4 py-2 rounded-md hover:bg-gray-800">
          Reports
        </a>
      </nav>
    </div>
  </aside>

  {/* Main content - full width mobile, beside sidebar desktop */}
  <main className="flex-1 bg-gray-50 overflow-y-auto">
    <div className="p-4 md:p-6 lg:p-8">
      {/* Metrics grid adapts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-gray-600 text-sm font-medium mb-2">
            Total Revenue
          </h3>
          <p className="text-3xl font-bold">$54,239</p>
        </div>
        {/* More metrics... */}
      </div>
    </div>
  </main>
</div>
```

### Form - Layout Changes

```jsx
// ✅ CORRECT - Mobile: single column, Desktop: two column
<form className="w-full max-w-4xl mx-auto p-4 md:p-8">
  <h2 className="text-2xl md:text-3xl font-bold mb-6">Checkout</h2>

  {/* Fields go from stacked to side-by-side */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
    <div>
      <label className="block text-sm font-medium mb-2">First Name</label>
      <input className="w-full px-4 py-3 border rounded-lg focus:ring-2" />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Last Name</label>
      <input className="w-full px-4 py-3 border rounded-lg focus:ring-2" />
    </div>
  </div>

  {/* Full width field */}
  <div className="mb-6">
    <label className="block text-sm font-medium mb-2">Email</label>
    <input className="w-full px-4 py-3 border rounded-lg focus:ring-2" />
  </div>

  {/* Button changes size */}
  <button className="w-full md:w-auto md:px-12 py-3 bg-blue-500 text-white rounded-lg font-semibold">
    Complete Purchase
  </button>
</form>
```

### Hero Section - Content Reflows

```jsx
// ✅ CORRECT - Mobile: stacked, Desktop: side-by-side
<section className="w-full min-h-screen flex items-center bg-gradient-to-br from-purple-600 to-blue-600">
  <div className="container mx-auto px-4 md:px-8 lg:px-12">
    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
      {/* Text content */}
      <div className="flex-1 text-white text-center lg:text-left">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
          Welcome to the Future
        </h1>
        <p className="text-lg md:text-xl mb-6 md:mb-8 opacity-90">
          Build amazing products with our platform
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          <button className="px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold">
            Get Started
          </button>
          <button className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold">
            Learn More
          </button>
        </div>
      </div>

      {/* Image/illustration */}
      <div className="flex-1 w-full max-w-md lg:max-w-none">
        <img src="[IMAGE_URL]" className="w-full" alt="Product" />
      </div>
    </div>
  </div>
</section>
```

**Key Takeaway**: Responsive design = **LAYOUT TRANSFORMATION**, not just stretching. Content reorganizes, sidebars appear/hide, columns change, spacing adapts.

### Hero Section

```jsx
<section className="w-full min-h-screen flex items-center justify-center px-4 md:px-8 lg:px-12">
  <div className="max-w-4xl text-center">
    <h1 className="text-4xl md:text-5xl lg:text-6xl mb-4 md:mb-6 lg:mb-8">
      Hero Title
    </h1>
    <p className="text-lg md:text-xl lg:text-2xl">Subtitle</p>
  </div>
</section>
```

### Card Grid

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 p-4 md:p-8 lg:p-12">
  {items.map((item) => (
    <div key={item.id} className="p-4 md:p-6">
      {/* Card content */}
    </div>
  ))}
</div>
```

### Navigation

```jsx
{
  /* Mobile: Bottom bar */
}
<nav className="fixed bottom-0 w-full flex md:hidden justify-around p-4">
  <button className="min-h-[44px] min-w-[44px]">Nav</button>
</nav>;

{
  /* Desktop: Top bar */
}
<nav className="hidden md:flex items-center justify-between px-8 py-4">
  <button className="px-4 py-2 hover:opacity-80">Nav</button>
</nav>;
```

### Form Layout

```jsx
<form className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6 p-4 md:p-8">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
    <input className="w-full p-3 md:p-4" />
    <input className="w-full p-3 md:p-4" />
  </div>
</form>
```

---

## Remember

**The goal**: A user should be able to resize their browser from 320px to 2560px and at EVERY size:

1. The design looks intentional and polished
2. The designer's aesthetic identity is preserved
3. All content is accessible and readable
4. The layout makes intelligent use of space

**This is not**:

- ❌ Desktop design that "squishes" on mobile
- ❌ Mobile design that "stretches" on desktop
- ❌ Arbitrary breakpoint behavior

**This is**:

- ✅ Fluid, intentional design at every width
- ✅ Designer's taste maintained across all viewports
