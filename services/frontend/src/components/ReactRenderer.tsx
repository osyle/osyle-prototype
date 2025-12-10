import React from 'react'

// Define types for the UI tree
export type UINodeType =
  | 'container'
  | 'text'
  | 'button'
  | 'image'
  | 'input'
  | 'stack' // for layout purposes
  | 'custom'

export interface UINode {
  id: string
  type: UINodeType
  props?: Record<string, string | number | boolean>
  style?: React.CSSProperties
  children?: UINode[]
  textContent?: string
}

// Props for the renderer
interface ReactRendererProps {
  uiTree: UINode
}

// Recursive function to render a node
const renderNode = (node: UINode): React.ReactNode => {
  const { type, props, style, children, textContent } = node

  // Remove key from props so React doesn't complain when spreading
  const restProps = { ...(props || {}) }
  delete (restProps as { key?: string }).key

  const commonProps = {
    style: style || {},
    ...restProps,
  }

  switch (type) {
    case 'container':
      return (
        <div key={node.id} {...commonProps}>
          {children?.map(renderNode)}
        </div>
      )

    case 'stack':
      return (
        <div
          key={node.id}
          {...commonProps}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            ...(style || {}),
          }}
        >
          {children?.map(renderNode)}
        </div>
      )

    case 'text':
      return (
        <span key={node.id} {...commonProps}>
          {textContent}
        </span>
      )

    case 'button':
      return (
        <button key={node.id} {...commonProps}>
          {textContent}
          {children?.map(renderNode)}
        </button>
      )

    case 'image':
      return (
        <img
          key={node.id}
          {...commonProps}
          src={props?.['src'] as string}
          alt={props?.['alt'] as string}
        />
      )

    case 'input':
      return (
        <input
          key={node.id}
          {...commonProps}
          placeholder={props?.['placeholder'] as string}
        />
      )

    case 'custom':
      // Render custom components if needed
      return (
        <div key={node.id} {...commonProps}>
          {children?.map(renderNode)}
        </div>
      )

    default:
      return (
        <div key={node.id} {...commonProps}>
          {children?.map(renderNode)}
        </div>
      )
  }
}

export default function ReactRenderer({ uiTree }: ReactRendererProps) {
  return <>{renderNode(uiTree)}</>
}
