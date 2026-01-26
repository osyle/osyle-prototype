// =============================================================================
// Annotation Types
// =============================================================================

// Visual annotation (DOM-based) - UNCHANGED from original
export interface Annotation {
  id: string
  screenId: string
  screenName: string
  x: number // % of container width
  y: number // px from top of container
  comment: string
  element: string
  elementPath: string
  timestamp: number // Keep as number for backward compatibility
  selectedText?: string
  boundingBox?: { x: number; y: number; width: number; height: number }
  nearbyText?: string
  cssClasses?: string
  isMultiSelect?: boolean
  isFixed?: boolean
  elementIndex?: number
  textContent?: string
  tagName?: string
}

// Code annotation (line-based) - SEPARATE type
export interface CodeAnnotation {
  id: string
  type: 'code' // Always 'code'
  screenName: string
  startLine: number
  endLine: number
  selectedCode: string
  comment: string
  timestamp: Date
  boundingBox?: { x: number; y: number; width: number; height: number }
  filePath?: string
  component?: string
}

export interface PendingAnnotation extends Annotation {
  clientY: number
  computedStylesObj?: Record<string, string>
}

export interface HoverInfo {
  element: string
  elementPath: string
  rect: DOMRect | null
}

export type OutputDetailLevel = 'compact' | 'standard' | 'detailed' | 'forensic'

export interface AnnotationSettings {
  outputDetail: OutputDetailLevel
  annotationColor: string
  autoClearAfterCopy: boolean
}

// =============================================================================
// Inspect Mode Types
// =============================================================================

export interface InspectedElement {
  element: string
  elementPath: string
  cssClasses?: string
  boundingBox?: { x: number; y: number; width: number; height: number }
  nearbyText?: string
  tagName?: string
  attributes?: Record<string, string>
  computedStyles?: Record<string, string>
  timestamp: number
  textContent?: string // Full text content for better LLM targeting
  elementIndex?: number // Index if multiple elements share same path
}

export type AgentatorMode = 'annotate' | 'inspect'
