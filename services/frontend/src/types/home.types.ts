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

export interface ProjectDisplay {
  project_id: string
  name: string
  task_description: string
  ui?: Record<string, unknown> | string // Optional: Design ML document or JSX string
  ui_loading?: boolean
  ui_error?: boolean // Loading error flag
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
  metadata?: Record<string, unknown>
}
