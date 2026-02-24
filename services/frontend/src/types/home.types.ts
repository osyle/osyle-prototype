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
  metadata?: Record<string, unknown>
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
  description?: string
  task_description?: string

  // Unified project fields
  component_path?: string // Path to screen component (e.g., '/screens/LoginScreen.tsx') - optional, can be generated

  // Device info (for canvas display)
  dimensions?: { width: number; height: number }

  // Additional metadata
  screen_type?: string
  semantic_role?: string

  // UI state
  ui_loading?: boolean
  ui_error?: boolean

  // Allow additional properties from backend
  [key: string]: unknown
}

export interface FlowGraph {
  flow_id: string
  flow_name: string
  display_title?: string
  display_description?: string
  description?: string
  entry_screen_id: string

  // Unified project (all screens share these files)
  project: {
    files: Record<string, string> // All project files
    entry: string // Entry point ('/App.tsx')
    dependencies: Record<string, string> // npm dependencies
  }

  screens: FlowScreen[]
  transitions: FlowTransition[]
  layout_positions?: Record<string, Position>
  layout_algorithm?: string
  [key: string]: unknown // Allow additional properties from backend
}

export interface Project {
  project_id: string
  name: string
  task_description: string
  selected_taste_id: string
  selected_resource_ids: string[]
  device_info?: { screen: { width: number; height: number } }
  rendering_mode?: 'react' | 'parametric'
  responsive_mode?: boolean
  flow_mode?: boolean
  max_screens?: number
  flow_graph?: FlowGraph
  metadata?: Record<string, unknown>
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
  device_info?: { screen: { width: number; height: number } }
  rendering_mode?: 'react' | 'parametric'
  responsive_mode?: boolean // NEW: Responsive design toggle
  flow_mode?: boolean // NEW
  max_screens?: number // NEW
  screen_definitions?: Array<{
    name: string
    description?: string
    mode?: string
    has_figma?: boolean
    has_images?: boolean
    image_count?: number
  }>
  screen_files?: Record<string, File>
  metadata?: Record<string, unknown>
}

export interface ProjectDetails {
  project_id: string
  name: string
  task_description: string
  selected_taste_id: string
  selected_resource_ids: string[]
  device_info?: { screen: { width: number; height: number } }
  rendering_mode?: 'react' | 'parametric'
  responsive_mode?: boolean
  inspiration_image_keys?: string[] // S3 keys
  inspiration_image_urls?: string[] // Presigned URLs (when requested)
  flow_mode?: boolean // NEW
  flow_graph?: FlowGraph // NEW
  metadata?: Record<string, unknown>
}
