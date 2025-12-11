// DesignMLv2Renderer.tsx
import React from 'react'

// ============================================================================
// TYPES FOR ACTUAL GENERATED FORMAT
// ============================================================================

interface DesignMLv2Document {
  version: string
  meta?: {
    dtr_version?: string
    dtr_confidence?: number
    generated_from_dtr?: boolean
    generation_timestamp?: string
    design_philosophy?: string[]
    [key: string]: unknown
  }
  root: UINode
}

interface UINode {
  type: string
  name?: string
  semantic?: {
    role?: string
    platform?: string
    viewport?: { width: number; height: number }
    importance?: number
    content_type?: string
    hierarchy_level?: number
    layer?: string
    purpose?: string
    data_type?: string
    interaction?: string
    [key: string]: unknown
  }
  layout?: {
    mode?: string
    spacing_quantum?: number
    edge_padding?: number
    position?: {
      x?: number
      y?: number
      alignment?: string
      anchor_point?: string
    }
    z_index?: number
    direction?: string
    gap?: number
    padding?: Padding
  }
  style?: {
    size?: {
      width?: number
      height?: number
    }
    background?: {
      type?: string
      color?: string
      colors?: string[]
      direction?: string
    }
    border_radius?: {
      value?: number
    }
    border?: {
      width?: number
      color?: string
      opacity?: number
    }
    effects?: {
      blur?: number
      shadow?: string
      opacity?: number
    }
    typography?: {
      font_family?: string
      font_size?: number
      font_weight?: number
      line_height?: number
      letter_spacing?: number
      text_align?: string
      color?: string
      opacity?: number
    }
    touch_target?: {
      min_width?: number
      min_height?: number
      padding?: number
    }
    states?: {
      default?: { scale?: number; opacity?: number }
      hover?: { opacity_shift?: number; glow_intensity?: number }
      press?: { scale?: number; duration_ms?: number }
    }
    opacity?: number
  }
  children?: UINode[]
  content?: string | { type?: string; value?: string; alt?: string }
}

interface Padding {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

// Type guard to check if document has 'ui' property (API wrapper format)
function hasUIProperty(doc: unknown): doc is { ui: DesignMLv2Document } {
  return (
    typeof doc === 'object' &&
    doc !== null &&
    'ui' in doc &&
    typeof (doc as { ui: unknown }).ui === 'object'
  )
}

// Type guard to check if it's a valid DesignML document
function isDesignMLDocument(doc: unknown): doc is DesignMLv2Document {
  return (
    typeof doc === 'object' &&
    doc !== null &&
    'root' in doc &&
    typeof (doc as { root: unknown }).root === 'object'
  )
}

// ============================================================================
// MAIN RENDERER WITH API RESPONSE HANDLING
// ============================================================================

interface DesignMLv2RendererProps {
  document: unknown // Accept unknown to handle various input formats
}

export default function DesignMLv2Renderer({
  document,
}: DesignMLv2RendererProps) {
  // Handle API response wrapper format: { status, type, ui, version, dtr_applied }
  let actualDocument: DesignMLv2Document | null = null

  if (hasUIProperty(document)) {
    // If wrapped in API response, extract the ui field
    actualDocument = document.ui
  } else if (isDesignMLDocument(document)) {
    // Already a valid document
    actualDocument = document
  }

  // Validate document structure
  if (!actualDocument) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        Error: Invalid Design ML document (not an object)
        <pre style={{ fontSize: 10, marginTop: 10 }}>
          {typeof document === 'object' && document !== null
            ? JSON.stringify(Object.keys(document), null, 2)
            : `Type: ${typeof document}`}
        </pre>
      </div>
    )
  }

  if (!actualDocument.root) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        Error: Invalid Design ML document (missing root)
        <pre style={{ fontSize: 10, marginTop: 10 }}>
          {JSON.stringify(Object.keys(actualDocument), null, 2)}
        </pre>
      </div>
    )
  }

  const root = actualDocument.root

  // Extract canvas dimensions from root
  const canvasWidth =
    root.semantic?.viewport?.width || root.style?.size?.width || 1024
  const canvasHeight =
    root.semantic?.viewport?.height || root.style?.size?.height || 768

  return (
    <div
      style={{
        width: canvasWidth,
        height: canvasHeight,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <RenderNode node={root} />
    </div>
  )
}

// ============================================================================
// NODE RENDERER
// ============================================================================

interface RenderNodeProps {
  node: UINode
}

function RenderNode({ node }: RenderNodeProps): React.ReactElement | null {
  if (!node) return null

  const nodeType = node.type

  // Build style for this node
  const style = buildNodeStyle(node)

  // Render based on type
  switch (nodeType) {
    case 'SCREEN':
      return <RenderContainer node={node} style={style} />

    case 'CONTAINER':
    case 'HERO':
    case 'METRIC':
      return <RenderContainer node={node} style={style} />

    case 'TEXT_BLOCK':
    case 'LABEL':
      return <RenderText node={node} style={style} />

    case 'BUTTON':
      return <RenderButton node={node} style={style} />

    case 'ICON':
      return <RenderIcon node={node} style={style} />

    case 'IMAGE':
      return <RenderImage node={node} style={style} />

    case 'DECORATION':
      return <RenderDecoration node={node} style={style} />

    default:
      // Fallback: render as container
      return <RenderContainer node={node} style={style} />
  }
}

// ============================================================================
// SPECIFIC RENDERERS
// ============================================================================

function RenderContainer({
  node,
  style,
}: {
  node: UINode
  style: React.CSSProperties
}) {
  const children = node.children || []

  return (
    <div style={style} data-node-type={node.type} data-node-name={node.name}>
      {children.map((child, index) => (
        <RenderNode key={child.name || index} node={child} />
      ))}
    </div>
  )
}

function RenderText({
  node,
  style,
}: {
  node: UINode
  style: React.CSSProperties
}) {
  const content = typeof node.content === 'string' ? node.content : ''

  return (
    <div style={style} data-node-type={node.type} data-node-name={node.name}>
      {content}
    </div>
  )
}

function RenderButton({
  node,
  style,
}: {
  node: UINode
  style: React.CSSProperties
}) {
  const content = typeof node.content === 'string' ? node.content : ''

  return (
    <button
      style={{
        ...style,
        border: style.border || 'none',
        cursor: 'pointer',
        outline: 'none',
      }}
      data-node-type={node.type}
      data-node-name={node.name}
    >
      {content}
    </button>
  )
}

function RenderIcon({
  node,
  style,
}: {
  node: UINode
  style: React.CSSProperties
}) {
  const content = node.content
  const iconValue = typeof content === 'object' ? content.value : '●'

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: (node.style?.size?.width || 24) * 0.5,
      }}
      data-node-type={node.type}
      data-node-name={node.name}
    >
      {iconValue}
    </div>
  )
}

function RenderImage({
  node,
  style,
}: {
  node: UINode
  style: React.CSSProperties
}) {
  const content = node.content
  const imageUrl = typeof content === 'object' ? content.value : undefined

  if (!imageUrl) {
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: style.background || '#f0f0f0',
        }}
        data-node-type={node.type}
        data-node-name={node.name}
      >
        <span style={{ opacity: 0.3, fontSize: 12 }}>IMG</span>
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={node.name || 'Image'}
      style={style}
      data-node-type={node.type}
      data-node-name={node.name}
    />
  )
}

function RenderDecoration({
  node,
  style,
}: {
  node: UINode
  style: React.CSSProperties
}) {
  return (
    <div
      style={{
        ...style,
        pointerEvents: 'none', // Decorations shouldn't intercept clicks
      }}
      data-node-type={node.type}
      data-node-name={node.name}
    />
  )
}

// ============================================================================
// STYLE BUILDER
// ============================================================================

function buildNodeStyle(node: UINode): React.CSSProperties {
  const style: React.CSSProperties = {}

  // === POSITIONING ===
  if (node.layout?.mode === 'absolute' && node.layout?.position) {
    style.position = 'absolute'

    const pos = node.layout.position
    if (pos.x !== undefined) style.left = pos.x
    if (pos.y !== undefined) style.top = pos.y

    if (node.layout.z_index !== undefined) {
      style.zIndex = node.layout.z_index
    }
  }

  // === SIZE ===
  if (node.style?.size) {
    if (node.style.size.width !== undefined) {
      style.width = node.style.size.width
    }
    if (node.style.size.height !== undefined) {
      style.height = node.style.size.height
    }
  }

  // === BACKGROUND ===
  if (node.style?.background) {
    const bg = node.style.background

    if (bg.type === 'solid' && bg.color) {
      style.background = bg.color
    } else if (bg.type === 'gradient' && bg.colors) {
      const colors = bg.colors
      const direction = bg.direction || 'vertical'

      if (direction === 'radial') {
        style.background = `radial-gradient(circle, ${colors.join(', ')})`
      } else if (direction === 'horizontal') {
        style.background = `linear-gradient(to right, ${colors.join(', ')})`
      } else {
        // vertical or default
        style.background = `linear-gradient(to bottom, ${colors.join(', ')})`
      }
    }
  }

  // === BORDER RADIUS ===
  if (node.style?.border_radius?.value !== undefined) {
    style.borderRadius = node.style.border_radius.value
  }

  // === BORDER ===
  if (node.style?.border) {
    const border = node.style.border
    if (border.width && border.color) {
      style.border = `${border.width}px solid ${border.color}`
    }
  }

  // === EFFECTS ===
  if (node.style?.effects) {
    const effects = node.style.effects

    if (effects.blur !== undefined) {
      style.backdropFilter = `blur(${effects.blur}px)`
      // Safari support with proper typing
      const webkitStyle = style as React.CSSProperties & {
        WebkitBackdropFilter?: string
      }
      webkitStyle.WebkitBackdropFilter = `blur(${effects.blur}px)`
    }

    if (effects.shadow) {
      style.boxShadow = effects.shadow
    }

    if (effects.opacity !== undefined) {
      style.opacity = effects.opacity
    }
  }

  // === TYPOGRAPHY ===
  if (node.style?.typography) {
    const typo = node.style.typography

    if (typo.font_family) style.fontFamily = typo.font_family
    if (typo.font_size !== undefined) style.fontSize = typo.font_size
    if (typo.font_weight !== undefined) style.fontWeight = typo.font_weight
    if (typo.line_height !== undefined)
      style.lineHeight = `${typo.line_height}px`
    if (typo.letter_spacing !== undefined)
      style.letterSpacing = typo.letter_spacing
    if (typo.text_align)
      style.textAlign = typo.text_align as
        | 'left'
        | 'right'
        | 'center'
        | 'justify'
    if (typo.color) style.color = typo.color

    // Apply typography opacity (in addition to general opacity)
    if (
      typo.opacity !== undefined &&
      node.style?.effects?.opacity === undefined
    ) {
      style.opacity = typo.opacity
    }
  }

  // === GENERAL OPACITY ===
  if (node.style?.opacity !== undefined && !node.style?.effects?.opacity) {
    style.opacity = node.style.opacity
  }

  // === PADDING (from layout) ===
  if (node.layout?.padding) {
    const p = node.layout.padding
    style.padding = `${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${p.left || 0}px`
  }

  return style
}

// ============================================================================
// EXPORT
// ============================================================================

export { DesignMLv2Renderer }
