# OUTPUT STRUCTURE

## Progressive UI Rendering Structure

To enable smooth progressive rendering as the UI streams in, follow these structural rules:

### Rule 1: Fixed Block Structure

Every component MUST follow this exact order:

```jsx
export default function App({ onTransition }) {
  // ===== BLOCK 1: STATE =====
  // All React hooks at the very top
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ===== BLOCK 2: CONSTANTS =====
  // Reusable constants
  const colors = ["#1A1A2E", "#6C63FF", "#FFFFFF", "#888888"];

  // ===== BLOCK 3: STYLES (OPTIONAL) =====
  // Complex reusable style objects (if needed)
  const cardStyle = {
    padding: "24px",
    borderRadius: "16px",
  };

  // ===== BLOCK 4: HELPER COMPONENTS =====
  // Define ALL helper components inside App function
  const Card = ({ children }) => (
    <div style={{ borderRadius: 12, padding: 24 }}>{children}</div>
  );

  // ===== BLOCK 5: RENDER TREE =====
  return (
    // JSX hierarchy here
  );
}
```

### Rule 2: Visual Top-to-Bottom Rendering Order

Components must render in visual order: **top→bottom, left→right**.

Example:
```jsx
return (
  <div style={rootStyle}>
    {/* Top: Header */}
    <header>{/* ... */}</header>
    
    {/* Middle: Main Content */}
    <main>{/* ... */}</main>
    
    {/* Bottom: Footer/Navigation */}
    <nav>{/* ... */}</nav>
  </div>
);
```

### Rule 3: Component Boundary Comments

Mark every major semantic section with a comment:

```jsx
return (
  <div style={rootStyle}>
    {/* COMPONENT: Navigation Bar */}
    <nav style={navStyle}>{/* ... */}</nav>

    {/* COMPONENT: Hero Section */}
    <header style={heroStyle}>{/* ... */}</header>

    {/* COMPONENT: Feature Cards */}
    <section style={cardsStyle}>{/* ... */}</section>
  </div>
);
```

### Rule 4: Progressive Checkpoints

After EVERY visual component or small group of related elements, insert a checkpoint marker.

**CRITICAL CHECKPOINT FORMAT - FOLLOW EXACTLY:**

Every checkpoint MUST have BOTH parts:
1. The comment block: `/*CHECKPOINT...*/`
2. The delimiter: `//$CHECKPOINT`

```jsx
export default function App({ onTransition }) {
  const [email, setEmail] = useState("");

  return (
    <div style={{ width: "375px", height: "812px" }}>

      {/* COMPONENT: Header */}
      <header style={{ padding: "24px" }}>
        <h1>Welcome</h1>
        <p>Get started below</p>
      </header>
/*CHECKPOINT
    </div>
  );
}*/
//$CHECKPOINT

      {/* COMPONENT: Email Input */}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "16px" }}
      />
/*CHECKPOINT
    </div>
  );
}*/
//$CHECKPOINT

    </div>
  );
}
```

**Checkpoint Rules**:
1. ALWAYS include BOTH parts: `/*CHECKPOINT...*/` AND `//$CHECKPOINT`
2. Completion code MUST exactly close all open tags and braces
3. Close ALL intermediate containers, not just root
4. Place 10-25 checkpoints per screen for smooth rendering

**What counts as a checkpoint-worthy element:**
- Headers, subheaders
- Paragraphs, text blocks
- Input fields, textareas
- Buttons, CTAs
- Cards, containers
- List items
- Images
- Form sections
- Navigation items

**Frequency Guidelines:**
- Simple screen (login, single form): 10-15 checkpoints
- Standard screen (dashboard, content page): 15-20 checkpoints
- Complex screen (multi-section, rich content): 20-25+ checkpoints

### Rule 5: Avoid Complex Iterations

For progressive rendering, avoid `.map()`, `.filter()` - use explicit structure when possible.

```jsx
// ❌ Less optimal for progressive rendering
{items.map(item => <Card key={item.id}>{item.title}</Card>)}

// ✅ Better for progressive rendering
<Card>{items[0]?.title}</Card>
/*CHECKPOINT*/
//$CHECKPOINT

<Card>{items[1]?.title}</Card>
/*CHECKPOINT*/
//$CHECKPOINT

<Card>{items[2]?.title}</Card>
/*CHECKPOINT*/
//$CHECKPOINT
```

---

## Annotation-Friendly Markup

Add strategic `id` attributes to key components to enable user annotations:

- Major sections: `<nav id="main-nav">`
- Repeated components: `<div id="product-card-0">`
- Interactive containers: `<form id="login-form">`
- Content sections: `<main id="dashboard">`

Use kebab-case, be descriptive, add index for repetition.

---

## Flow Integration

If `flow_context` includes `outgoing_transitions`, implement navigation:

```jsx
export default function App({ onTransition }) {
  // For each transition, create UI element
  const handleNext = () => {
    onTransition('transition_id_here');
  };

  return (
    <div>
      {/* Content */}
      <button onClick={handleNext}>
        Continue →
      </button>
    </div>
  );
}
```

**Transition Styling by Type:**
- `forward`: Primary action (prominent CTA button)
- `back`: Secondary action (subtle text link)
- `error`: Warning state (red/alert styling)
- `success`: Success state (green/confirmation styling)
- `branch`: Alternative path (secondary CTA)

---

## Final Output Format

Return **ONLY** the React component code:

```jsx
export default function App({ onTransition }) {
  // Component implementation
}
```

**NO**:
- ❌ Markdown code fences
- ❌ Explanations
- ❌ Preamble
- ❌ Comments about what you're doing
- ❌ Multiple component exports

**YES**:
- ✅ Pure React code
- ✅ Inline comments for component boundaries
- ✅ Checkpoint markers
- ✅ Single default export named "App"
