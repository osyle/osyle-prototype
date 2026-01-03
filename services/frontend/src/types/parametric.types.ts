/**
 * Type definitions for Parametric Design System
 */

export interface PropertyMapping {
  property: string // "gridColumns", "padding", "fontSize", etc.
  values: {
    [key: number]: unknown // {0: '16px', 50: '24px', 100: '32px'}
  }
}

export interface VariationDimension {
  id: string // "information_density"
  label: string // "Information Density"
  description: string // "How much data is shown at once"
  min_label: string // "Focused"
  max_label: string // "Comprehensive"
  default_value: number // 50 (0-100 scale)
  affects: string[] // ["gridColumns", "cardPadding", "fontSize"]
  property_mappings?: PropertyMapping[] // Optional detailed mappings
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
