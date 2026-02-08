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
  resource_count?: number
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
  trigger_type: string // Accept any trigger type from backend
  flow_type: string // Accept any flow type from backend
  label?: string
  condition?: string
  color?: string
  [key: string]: unknown // Allow additional properties from backend
}

export interface FlowScreen {
  screen_id: string
  name: string
  description?: string // Optional - backend may not always provide this
  task_description: string
  platform: string // Accept any platform string from backend
  dimensions: { width: number; height: number }
  screen_type?: string // Accept any screen type from backend
  semantic_role?: string
  ui_code?: string | null // Can be null initially
  ui_loading?: boolean
  ui_error?: boolean
  // Allow additional properties from backend (user_provided, reference_mode, etc.)
  [key: string]: unknown
}

export interface FlowGraph {
  flow_id: string
  flow_name: string
  display_title?: string
  display_description?: string
  description?: string
  entry_screen_id: string
  screens: FlowScreen[]
  transitions: FlowTransition[]
  layout_positions?: Record<string, Position>
  layout_algorithm?: string // Accept any layout algorithm from backend
  [key: string]: unknown // Allow additional properties from backend
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
  rendering_mode?: 'react' | 'parametric'
  created_at?: string // Timestamp for sorting
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
