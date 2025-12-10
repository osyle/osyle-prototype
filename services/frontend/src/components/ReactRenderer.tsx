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

  const commonProps = {
    key: node.id,
    style: style || {},
    ...props,
  }

  switch (type) {
    case 'container':
      return <div {...commonProps}>{children?.map(renderNode)}</div>

    case 'stack':
      return (
        <div
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
      return <span {...commonProps}>{textContent}</span>

    case 'button':
      return (
        <button {...commonProps}>
          {textContent}
          {children?.map(renderNode)}
        </button>
      )

    case 'image':
      return (
        <img
          {...commonProps}
          src={props?.['src'] as string}
          alt={props?.['alt'] as string}
        />
      )

    case 'input':
      return (
        <input
          {...commonProps}
          placeholder={props?.['placeholder'] as string}
        />
      )

    case 'custom':
      // Render custom components if needed
      return <div {...commonProps}>{children?.map(renderNode)}</div>

    default:
      return <div {...commonProps}>{children?.map(renderNode)}</div>
  }
}

export default function ReactRenderer({ uiTree }: ReactRendererProps) {
  return <>{renderNode(uiTree)}</>
}
