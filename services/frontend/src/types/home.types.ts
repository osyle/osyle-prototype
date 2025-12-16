// ============================================================================
// SHARED TYPE DEFINITIONS
// ============================================================================

export interface UserInfo {
  name: string
  email: string
  initials: string
  picture?: string
}

export interface ResourceDisplay {
  resource_id: string
  name: string
  imageUrl: string | null
  has_image: boolean
  has_figma: boolean
}

export interface TasteDisplay {
  taste_id: string
  name: string
  resources: ResourceDisplay[]
}

export interface ProjectDisplay {
  project_id: string
  name: string
  rendering_mode: string // 'react' | 'design-ml'
  created_at: string
  ui?: unknown // The actual UI data (Design ML JSON or React JSX string)
  ui_loading?: boolean
  ui_error?: boolean
}
