// src/components/DesignMLRenderer.tsx
import React from 'react'

// ---------------------- Types ----------------------

export type LayoutMode = 'absolute' | 'flex'
export type NodeType =
  | 'FRAME'
  | 'TEXT'
  | 'IMAGE'
  | 'ELLIPSE'
  | 'RECTANGLE'
  | 'ICON'

export interface Size {
  width?: number | string
  height?: number | string
}
export interface Color {
  fill?: string
  text?: string
}
export interface Typography {
  fontFamily?: string
  fontWeight?: string | number
  fontSize?: number
  lineHeight?: number
  letterSpacing?: number
}
export interface Spacing {
  padding?: number | string
  margin?: number | string
}
export interface Border {
  radius?: number
  width?: number
  color?: string
}
export interface Effects {
  blur?: number
  opacity?: number
  shadow?: string
}

export interface Style {
  size?: Size
  color?: Color
  typography?: Typography
  spacing?: Spacing
  border?: Border
  effects?: Effects
  layer_order?: number
  alignment?: { direction?: 'row' | 'column'; justify?: string; align?: string }
  icon_name?: string
  source?: {
    type: 'base64' | 'url'
    media_type?: string
    data?: string
    url?: string
  }
  alt?: string
}

export interface Position {
  x?: number | string
  y?: number | string
}

export interface UINode {
  type: NodeType
  name: string
  layout?: LayoutMode
  style?: Style
  position?: Position
  children?: UINode[]
  content?: string
  metadata?: Record<string, unknown>
}

export interface DeviceInfo {
  platform: 'web' | 'phone'
  screen: { width: number; height: number }
}

interface DesignMLRendererProps {
  uiTree: UINode
  deviceInfo: DeviceInfo
}

// ---------------------- Utility Functions ----------------------

const parseGradient = (gradient: string) => gradient // Placeholder

const buildStyle = (node: UINode): React.CSSProperties => {
  const style: React.CSSProperties = {}
  const s = node.style
  const t = s?.typography
  const align = s?.alignment

  // Size
  if (s?.size) {
    if (s.size.width !== undefined) style.width = s.size.width
    if (s.size.height !== undefined) style.height = s.size.height
  }

  // Position
  if (node.layout === 'absolute' && node.position) {
    style.position = 'absolute'
    if (node.position.x !== undefined) style.left = node.position.x
    if (node.position.y !== undefined) style.top = node.position.y
  }

  // Background / Fill
  if (s?.color?.fill) {
    style.backgroundColor = s.color.fill.includes('gradient')
      ? parseGradient(s.color.fill)
      : s.color.fill
  }

  // Text color
  if (s?.color?.text) {
    style.color = s.color.text.includes('gradient')
      ? 'transparent'
      : s.color.text
    if (s.color.text.includes('gradient')) {
      style.background = parseGradient(s.color.text)
      style.WebkitBackgroundClip = 'text'
      style.backgroundClip = 'text'
      style.WebkitTextFillColor = 'transparent'
    }
  }

  // Typography
  if (t) {
    if (t.fontFamily) style.fontFamily = t.fontFamily
    if (t.fontWeight) style.fontWeight = t.fontWeight
    if (t.fontSize) style.fontSize = t.fontSize
    if (t.lineHeight) style.lineHeight = `${t.lineHeight}px`
    if (t.letterSpacing) style.letterSpacing = `${t.letterSpacing}px`
  }

  // Spacing
  if (s?.spacing) {
    if (s.spacing.padding !== undefined)
      style.padding =
        typeof s.spacing.padding === 'number'
          ? `${s.spacing.padding}px`
          : s.spacing.padding
    if (s.spacing.margin !== undefined)
      style.margin =
        typeof s.spacing.margin === 'number'
          ? `${s.spacing.margin}px`
          : s.spacing.margin
  }

  // Border
  if (s?.border) {
    if (s.border.radius) style.borderRadius = s.border.radius
    if (s.border.width && s.border.color)
      style.border = `${s.border.width}px solid ${s.border.color}`
  }

  // Effects
  if (s?.effects) {
    if (s.effects.opacity !== undefined) style.opacity = s.effects.opacity
    if (s.effects.blur) style.filter = `blur(${s.effects.blur}px)`
    if (s.effects.shadow) style.boxShadow = s.effects.shadow
  }

  // Layer order / zIndex
  if (s?.layer_order !== undefined) style.zIndex = s.layer_order

  // Flex alignment
  if (align) {
    style.display = 'flex'
    style.flexDirection = align.direction || 'column'
    if (align.justify) style.justifyContent = align.justify
    if (align.align) style.alignItems = align.align
  }

  // Overflow for frames
  if (node.type === 'FRAME') style.overflow = 'visible'

  return style
}

// ---------------------- Node Renderers ----------------------

const RenderNode: React.FC<{ node: UINode }> = ({ node }) => {
  const style = buildStyle(node)

  switch (node.type) {
    case 'FRAME':
      return (
        <div style={style} data-name={node.name}>
          {node.children?.map(child => (
            <RenderNode key={child.name} node={child} />
          ))}
        </div>
      )
    case 'TEXT':
      return (
        <div style={style} data-name={node.name}>
          {node.content || ''}
        </div>
      )
    case 'IMAGE':
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-name={node.name}
        >
          <span style={{ opacity: 0.3, fontSize: 12 }}>IMG</span>
        </div>
      )
    case 'ELLIPSE':
      return (
        <div style={{ ...style, borderRadius: '50%' }} data-name={node.name}>
          {node.children?.map(child => (
            <RenderNode key={child.name} node={child} />
          ))}
        </div>
      )
    case 'RECTANGLE':
      return (
        <div style={style} data-name={node.name}>
          {node.children?.map(child => (
            <RenderNode key={child.name} node={child} />
          ))}
        </div>
      )
    case 'ICON':
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-name={node.name}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="12" cy="12" r="10" opacity={0.3} />
          </svg>
        </div>
      )
    default:
      return null
  }
}

// ---------------------- Main Renderer ----------------------

const DesignMLRenderer: React.FC<DesignMLRendererProps> = ({
  uiTree,
  deviceInfo,
}) => {
  const width = uiTree.style?.size?.width || deviceInfo.screen.width
  const height = uiTree.style?.size?.height || deviceInfo.screen.height

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}
    >
      <RenderNode node={uiTree} />
    </div>
  )
}

export default DesignMLRenderer
