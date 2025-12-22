// ============================================================================
// HOME PAGE TYPES
// ============================================================================

export interface UserInfo {
  email: string
  name?: string
  picture?: string
  initials: string
}

export interface TasteDisplay {
  taste_id: string
  name: string
  resources: ResourceDisplay[]
}

export interface ResourceDisplay {
  resource_id: string
  name: string
  imageUrl: string | null
  has_image: boolean
  has_figma: boolean
}

// ============================================================================
// FLOW TYPES (NEW)
// ============================================================================

export interface Position {
  x: number
  y: number
}

export interface FlowTransition {
  transition_id: string
  from_screen_id: string
  to_screen_id: string
  trigger: string
  trigger_type: 'tap' | 'submit' | 'auto' | 'link'
  flow_type: 'forward' | 'back' | 'error' | 'branch' | 'success'
  label?: string
  condition?: string
  color?: string
}

export interface FlowScreen {
  screen_id: string
  name: string
  description: string
  task_description: string
  platform: 'web' | 'phone'
  dimensions: { width: number; height: number }
  screen_type?: 'entry' | 'intermediate' | 'success' | 'error' | 'exit'
  semantic_role?: string
  ui_code?: string
  ui_loading?: boolean
  ui_error?: boolean
}

export interface FlowGraph {
  flow_id: string
  flow_name: string
  description?: string
  entry_screen_id: string
  screens: FlowScreen[]
  transitions: FlowTransition[]
  layout_positions?: Record<string, Position>
  layout_algorithm?: 'hierarchical' | 'force-directed' | 'manual'
}

export interface ProjectDisplay {
  project_id: string
  name: string
  task_description: string
  flow_mode?: boolean // NEW: Indicates if this is a flow project
  flow_graph?: FlowGraph // NEW: Flow graph structure
  ui?: Record<string, unknown> | string // Legacy: single screen UI
  ui_loading?: boolean
  ui_error?: boolean
  rendering_mode?: 'design-ml' | 'react'
}

// ============================================================================
// API TYPES
// ============================================================================

export interface CreateProjectPayload {
  name: string
  task_description: string
  selected_taste_id: string
  selected_resource_ids: string[]
  inspiration_images?: File[]
  flow_mode?: boolean // NEW
  max_screens?: number // NEW
  metadata?: Record<string, unknown>
}

export interface ProjectDetails {
  project_id: string
  name: string
  task_description: string
  selected_taste_id: string
  selected_resource_ids: string[]
  inspiration_image_keys?: string[] // S3 keys
  inspiration_image_urls?: string[] // Presigned URLs (when requested)
  flow_mode?: boolean // NEW
  flow_graph?: FlowGraph // NEW
  metadata?: Record<string, unknown>
}
