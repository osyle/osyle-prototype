// =============================================================================
// Annotation Types
// =============================================================================

export interface Annotation {
  id: string
  screenId: string
  screenName: string
  x: number // % of container width
  y: number // px from top of container
  comment: string
  element: string
  elementPath: string
  timestamp: number
  selectedText?: string
  boundingBox?: { x: number; y: number; width: number; height: number }
  nearbyText?: string
  cssClasses?: string
  isMultiSelect?: boolean
  isFixed?: boolean
  elementIndex?: number // Index if multiple elements share same path (e.g., 3rd button)
  textContent?: string // Full text content of element (for LLM context)
}

export interface PendingAnnotation extends Annotation {
  clientY: number // For popup positioning
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
