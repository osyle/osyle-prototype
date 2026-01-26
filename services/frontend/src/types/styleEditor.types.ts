/**
 * Types for Style Editor System
 * Handles live style editing in Concept tab
 */

export interface StyleOverride {
  elementPath: string // DOM path to identify element
  elementIndex?: number // If multiple elements share same path
  styles: Record<string, string> // CSS property → value
  timestamp: number
}

export interface StyleOverrideState {
  [screenId: string]: StyleOverride[]
}

export interface EditableStyleCategory {
  name: string
  icon: string
  properties: EditableStyleProperty[]
}

export interface EditableStyleProperty {
  name: string
  cssProperty: string
  type: 'text' | 'number' | 'color' | 'select' | 'slider'
  unit?: string // 'px', '%', 'rem', etc.
  options?: string[] // For select type
  min?: number
  max?: number
  step?: number
}

export interface ExtractedStyles {
  layout: Record<string, string>
  typography: Record<string, string>
  background: Record<string, string>
  border: Record<string, string>
  effects: Record<string, string>
}

export interface DesignMutation {
  type: 'style_override' | 'reorder'
  screenId: string
  elementPath: string
  elementIndex?: number
  timestamp: number
  // For style_override
  styles?: Record<string, string>
  // For reorder
  oldIndex?: number
  newIndex?: number
}
