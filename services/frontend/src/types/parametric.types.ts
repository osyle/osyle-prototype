/**
 * Type definitions for Parametric Design System - Version 2.0
 * Supports design abstraction patterns and philosophical thinking
 */

export interface PropertyMapping {
  property: string // "gridColumns", "padding", "fontSize", etc.
  values: {
    [key: number]: unknown // {0: '16px', 50: '24px', 100: '32px'}
  }
}

export interface PhilosophicalExtreme {
  name: string // "Quick Reference", "Rich Experience"
  intent: string // "Fast lookup for experienced users"
  characteristics: string[] // ["Assumes expertise", "Prioritizes speed", ...]
}

export interface VariationDimension {
  id: string // "presentation_strategy"
  label: string // "Presentation Strategy"
  description: string // "How this UI positions itself to the user"
  min_label: string // "Quick Reference"
  max_label: string // "Rich Experience"
  default_value: number // 50 (0-100 scale)

  // Enhanced fields for design abstraction
  pattern?: string // "layout_mode_switching", "global_scale_multiplier", etc.
  type?: 'categorical' | 'continuous' | 'hybrid' // Type of variation

  affects: string[] // ["layoutStructure", "contentVisibility", "imageProminence", ...]
  property_mappings?: PropertyMapping[] // Optional detailed mappings

  // Philosophical understanding
  philosophical_extremes?: {
    0?: PhilosophicalExtreme
    100?: PhilosophicalExtreme
  }

  sample_values: {
    0: Record<string, unknown> // Minimum state
    50: Record<string, unknown> // Balanced state
    100: Record<string, unknown> // Maximum state
  }
}

export interface VariationSpace {
  dimensions: VariationDimension[]
  metadata: {
    ui_type: string // "dashboard", "form", "profile", etc.
    generated_at: string // ISO timestamp
    task_context: string // Original task description
  }
}

export interface ParameterValues {
  [dimensionId: string]: number // dimension_id -> value (0-100)
}
