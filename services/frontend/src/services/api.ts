/**
 * API Client for Osyle Frontend
 * Automatically attaches Cognito JWT tokens to requests
 */
import { fetchAuthSession } from 'aws-amplify/auth'
import type { FlowGraph } from '../types/home.types'

import {
  buildDTRWebSocket,
  generateUIWebSocket,
  type WSCallbacks,
} from './websocketClient'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://bj7i7munz2.execute-api.us-east-1.amazonaws.com'

// ============================================================================
// TYPES
// ============================================================================

export interface Taste {
  taste_id: string
  owner_id: string
  name: string
  metadata: Record<string, unknown>
  created_at: string
  resource_count?: number
}

export interface Resource {
  resource_id: string
  taste_id: string
  owner_id: string
  name: string
  figma_key?: string
  image_key?: string
  has_figma: boolean
  has_image: boolean
  metadata: Record<string, unknown>
  created_at: string
  download_urls?: {
    figma_get_url?: string
    image_get_url?: string
  }
}

export interface ResourceWithUrls {
  resource: Resource
  upload_urls: {
    figma_put_url?: string
    image_put_url?: string
  }
}

export interface Project {
  project_id: string
  owner_id: string
  name: string
  task_description: string
  selected_taste_id?: string
  selected_resource_ids: string[]
  inspiration_image_keys?: string[] // S3 keys
  inspiration_image_urls?: string[] // Presigned URLs (when requested)
  device_info?: DeviceInfo // Device settings when project was created
  rendering_mode?: 'react' | 'parametric' // Rendering mode when project was created
  flow_mode?: boolean // Enable flow mode
  max_screens?: number // Max screens in flow
  flow_graph?: FlowGraph // Flow graph structure
  outputs: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DeviceInfo {
  platform: 'web' | 'phone'
  screen: {
    width: number
    height: number
  }
}

export interface GenerateUIResponse {
  status: string
  type: 'react' | 'parametric'
  ui: unknown
  version: number
  dtr_applied?: boolean
}

export interface DTRExistsResponse {
  resource_id: string
  dtr_exists: boolean
}

export interface BuildDTRResponse {
  status: 'success' | 'skipped'
  reason?: string
  dtr?: Record<string, unknown>
  version?: string
  confidence?: Record<string, unknown>
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get auth token from Amplify session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.idToken?.toString() || null
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return null
  }
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string
    body?: string
    headers?: Record<string, string>
  } = {},
): Promise<T> {
  const token = await getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    body: options.body,
    headers,
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      detail: 'Request failed',
    }))) as { detail: string }
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

/**
 * Upload file to S3 using presigned URL
 */
async function uploadToS3(
  presignedUrl: string,
  file: File | Blob,
  contentType: string,
): Promise<void> {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': contentType,
    },
  })

  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status}`)
  }
}

// ============================================================================
// TASTE API
// ============================================================================

export const tastesAPI = {
  /**
   * Create a new taste
   */
  create: async (
    name: string,
    metadata?: Record<string, unknown>,
  ): Promise<Taste> => {
    return apiRequest<Taste>('/api/tastes/', {
      method: 'POST',
      body: JSON.stringify({ name, metadata: metadata || {} }),
    })
  },

  /**
   * List all tastes for current user
   */
  list: async (): Promise<Taste[]> => {
    return apiRequest<Taste[]>('/api/tastes/')
  },

  /**
   * Get a specific taste
   */
  get: async (tasteId: string): Promise<Taste> => {
    return apiRequest<Taste>(`/api/tastes/${tasteId}`)
  },

  /**
   * Update a taste
   */
  update: async (
    tasteId: string,
    updates: { name?: string; metadata?: Record<string, unknown> },
  ): Promise<Taste> => {
    return apiRequest<Taste>(`/api/tastes/${tasteId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  /**
   * Delete a taste
   */
  delete: async (tasteId: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/api/tastes/${tasteId}`, {
      method: 'DELETE',
    })
  },
}

// ============================================================================
// RESOURCE API
// ============================================================================

export const resourcesAPI = {
  /**
   * Create a new resource and get upload URLs
   */
  create: async (
    tasteId: string,
    name: string,
    metadata?: Record<string, unknown>,
  ): Promise<ResourceWithUrls> => {
    return apiRequest<ResourceWithUrls>(`/api/tastes/${tasteId}/resources`, {
      method: 'POST',
      body: JSON.stringify({ name, metadata: metadata || {} }),
    })
  },

  /**
   * Upload figma.json and image.png for a resource
   */
  uploadFiles: async (
    uploadUrls: ResourceWithUrls['upload_urls'],
    figmaJson?: Record<string, unknown>,
    imageFile?: File,
  ): Promise<void> => {
    const uploads: Promise<void>[] = []

    if (figmaJson && uploadUrls.figma_put_url) {
      const figmaBlob = new Blob([JSON.stringify(figmaJson)], {
        type: 'application/json',
      })
      uploads.push(
        uploadToS3(uploadUrls.figma_put_url, figmaBlob, 'application/json'),
      )
    }

    if (imageFile && uploadUrls.image_put_url) {
      uploads.push(uploadToS3(uploadUrls.image_put_url, imageFile, 'image/png'))
    }

    await Promise.all(uploads)
  },

  /**
   * Mark files as uploaded (update has_figma, has_image flags)
   */
  markUploaded: async (
    tasteId: string,
    resourceId: string,
    hasFigma: boolean,
    hasImage: boolean,
  ): Promise<Resource> => {
    return apiRequest<Resource>(
      `/api/tastes/${tasteId}/resources/${resourceId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ has_figma: hasFigma, has_image: hasImage }),
      },
    )
  },

  /**
   * List all resources in a taste
   */
  list: async (tasteId: string): Promise<Resource[]> => {
    return apiRequest<Resource[]>(`/api/tastes/${tasteId}/resources`)
  },

  /**
   * Get a specific resource
   */
  get: async (
    tasteId: string,
    resourceId: string,
    includeDownloadUrls = false,
  ): Promise<Resource> => {
    const query = includeDownloadUrls ? '?include_download_urls=true' : ''
    return apiRequest<Resource>(
      `/api/tastes/${tasteId}/resources/${resourceId}${query}`,
    )
  },

  /**
   * Update a resource
   */
  update: async (
    tasteId: string,
    resourceId: string,
    updates: { name?: string; metadata?: Record<string, unknown> },
  ): Promise<Resource> => {
    return apiRequest<Resource>(
      `/api/tastes/${tasteId}/resources/${resourceId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
    )
  },

  /**
   * Delete a resource
   */
  delete: async (
    tasteId: string,
    resourceId: string,
  ): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(
      `/api/tastes/${tasteId}/resources/${resourceId}`,
      {
        method: 'DELETE',
      },
    )
  },
}

// ============================================================================
// PROJECT API
// ============================================================================

export const projectsAPI = {
  /**
   * Create a new project
   */
  create: async (data: {
    name: string
    task_description?: string
    selected_taste_id?: string
    selected_resource_ids?: string[]
    inspiration_images?: File[]
    screen_definitions?: Array<{
      name?: string
      description?: string
      mode: 'exact' | 'redesign' | 'inspiration' | 'rethink'
      has_figma: boolean
      has_images: boolean
      image_count: number
    }>
    screen_files?: Record<string, File> // e.g., { 'screen_0_figma': file, 'screen_0_image_0': file }
    device_info?: DeviceInfo
    rendering_mode?: 'react' | 'parametric'
    flow_mode?: boolean
    max_screens?: number
    metadata?: Record<string, unknown>
  }): Promise<Project> => {
    const token = await getAuthToken()

    // Always use FormData (backend expects FormData)
    const formData = new FormData()
    formData.append('name', data.name)

    if (data.task_description) {
      formData.append('task_description', data.task_description)
    }
    if (data.selected_taste_id) {
      formData.append('selected_taste_id', data.selected_taste_id)
    }
    if (data.selected_resource_ids) {
      data.selected_resource_ids.forEach(id => {
        formData.append('selected_resource_ids', id)
      })
    }
    if (data.device_info) {
      formData.append('device_info', JSON.stringify(data.device_info))
    }
    if (data.rendering_mode) {
      formData.append('rendering_mode', data.rendering_mode)
    }
    if (data.flow_mode !== undefined) {
      formData.append('flow_mode', data.flow_mode.toString())
    }
    if (data.max_screens !== undefined) {
      formData.append('max_screens', data.max_screens.toString())
    }
    if (data.screen_definitions) {
      formData.append(
        'screen_definitions',
        JSON.stringify(data.screen_definitions),
      )
    }
    if (data.metadata) {
      formData.append('metadata', JSON.stringify(data.metadata))
    }

    // Append inspiration images if provided
    if (data.inspiration_images && data.inspiration_images.length > 0) {
      data.inspiration_images.forEach(file => {
        formData.append('inspiration_images', file, file.name)
      })
    }

    // Append screen files if provided
    if (data.screen_files) {
      Object.entries(data.screen_files).forEach(([key, file]) => {
        formData.append(key, file, file.name)
      })
    }

    const response = await fetch(`${API_BASE_URL}/api/projects/`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: formData,
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        detail: 'Request failed',
      }))) as { detail: string }
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json() as Promise<Project>
  },

  /**
   * List all projects for current user
   */
  list: async (): Promise<Project[]> => {
    return apiRequest<Project[]>('/api/projects/')
  },

  /**
   * Get a specific project
   */
  get: async (projectId: string): Promise<Project> => {
    return apiRequest<Project>(`/api/projects/${projectId}`)
  },

  /**
   * Update a project
   */
  update: async (
    projectId: string,
    updates: {
      name?: string
      task_description?: string
      selected_taste_id?: string
      selected_resource_ids?: string[] // ✅ CHANGED: Now an array
      metadata?: Record<string, unknown>
    },
  ): Promise<Project> => {
    return apiRequest<Project>(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  /**
   * Delete a project
   */
  delete: async (projectId: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    })
  },

  /**
   * Update project's flow graph (including display_title and display_description)
   */
  updateFlowGraph: async (
    projectId: string,
    flowGraph: FlowGraph,
  ): Promise<{ status: string; message: string; flow_graph: FlowGraph }> => {
    return apiRequest<{
      status: string
      message: string
      flow_graph: FlowGraph
    }>(`/api/projects/${projectId}/flow-graph`, {
      method: 'PATCH',
      body: JSON.stringify(flowGraph),
    })
  },

  /**
   * Get upload URL for project output
   */
  getOutputUploadUrl: async (
    projectId: string,
    filename: string,
  ): Promise<{ output_key: string; upload_url: string; filename: string }> => {
    return apiRequest<{
      output_key: string
      upload_url: string
      filename: string
    }>(`/api/projects/${projectId}/outputs?filename=${filename}`, {
      method: 'POST',
    })
  },

  /**
   * Upload project output file
   */
  uploadOutput: async (
    projectId: string,
    filename: string,
    file: File,
  ): Promise<void> => {
    // Get upload URL
    const { upload_url } = await projectsAPI.getOutputUploadUrl(
      projectId,
      filename,
    )

    // Upload file
    await uploadToS3(upload_url, file, file.type)

    // Confirm upload
    await apiRequest(`/api/projects/${projectId}/outputs/${filename}/confirm`, {
      method: 'POST',
    })
  },

  /**
   * Get download URL for project output
   */
  getOutputDownloadUrl: async (
    projectId: string,
    filename: string,
  ): Promise<{ download_url: string; filename: string }> => {
    return apiRequest<{ download_url: string; filename: string }>(
      `/api/projects/${projectId}/outputs/${filename}/download`,
    )
  },

  /**
   * Get inspiration images for a project with presigned URLs
   */
  getInspirationImages: async (
    projectId: string,
  ): Promise<Array<{ key: string; url: string; filename: string }>> => {
    return apiRequest<Array<{ key: string; url: string; filename: string }>>(
      `/api/projects/${projectId}/inspiration-images`,
    )
  },

  /**
   * Add inspiration images to a project
   */
  addInspirationImages: async (
    projectId: string,
    images: File[],
  ): Promise<Project> => {
    const token = await getAuthToken()
    const formData = new FormData()

    images.forEach(file => {
      formData.append('inspiration_images', file, file.name)
    })

    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/inspiration-images`,
      {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      },
    )

    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        detail: 'Request failed',
      }))) as { detail: string }
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json() as Promise<Project>
  },

  /**
   * Get conversation history for a project version
   */
  getConversation: async (
    projectId: string,
    version?: number,
  ): Promise<{
    conversation: Array<{
      id: string
      type: 'user' | 'ai'
      content: string
      timestamp: string
      screen: string | null
    }>
    version: number
  }> => {
    const params = version !== undefined ? `?version=${version}` : ''
    return apiRequest<{
      conversation: Array<{
        id: string
        type: 'user' | 'ai'
        content: string
        timestamp: string
        screen: string | null
      }>
      version: number
    }>(`/api/projects/${projectId}/conversation${params}`)
  },

  /**
   * Save conversation history for a project version
   */
  saveConversation: async (
    projectId: string,
    conversation: Array<{
      id: string
      type: 'user' | 'ai'
      content: string
      timestamp: string
      screen: string | null
    }>,
    version: number,
  ): Promise<{
    status: string
    message: string
    message_count: number
  }> => {
    return apiRequest<{
      status: string
      message: string
      message_count: number
    }>(`/api/projects/${projectId}/conversation`, {
      method: 'POST',
      body: JSON.stringify({ conversation, version }),
    })
  },

  /**
   * Delete a specific project version
   */
  deleteVersion: async (
    projectId: string,
    version: number,
  ): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(
      `/api/projects/${projectId}/versions/${version}`,
      {
        method: 'DELETE',
      },
    )
  },

  /**
   * List all available versions for a project
   */
  listVersions: async (projectId: string): Promise<{ versions: number[] }> => {
    return apiRequest<{ versions: number[] }>(
      `/api/projects/${projectId}/versions`,
    )
  },

  /**
   * Save design mutations for a screen
   */
  saveMutations: async (
    projectId: string,
    screenId: string,
    mutations: Array<{
      elementPath: string
      elementIndex: number
      styles: Record<string, string>
    }>,
  ): Promise<{ success: boolean; savedCount: number }> => {
    return apiRequest<{ success: boolean; savedCount: number }>(
      `/api/projects/${projectId}/screens/${screenId}/mutations`,
      {
        method: 'POST',
        body: JSON.stringify({ mutations }),
      },
    )
  },

  /**
   * Get design mutations for a screen
   */
  getMutations: async (
    projectId: string,
    screenId: string,
  ): Promise<{
    mutations: Array<{
      id: string
      mutationType: string
      elementPath: string
      elementIndex: number
      data: Record<string, string>
      createdAt: string
      updatedAt: string
    }>
  }> => {
    return apiRequest<{
      mutations: Array<{
        id: string
        mutationType: string
        elementPath: string
        elementIndex: number
        data: Record<string, string>
        createdAt: string
        updatedAt: string
      }>
    }>(`/api/projects/${projectId}/screens/${screenId}/mutations`)
  },

  /**
   * Clear all design mutations for a screen
   */
  clearMutations: async (
    projectId: string,
    screenId: string,
  ): Promise<{ success: boolean; deletedCount: number }> => {
    return apiRequest<{ success: boolean; deletedCount: number }>(
      `/api/projects/${projectId}/screens/${screenId}/mutations`,
      {
        method: 'DELETE',
      },
    )
  },
}

// ============================================================================
// LLM API
// ============================================================================

export const llmAPI = {
  /**
   * Build DTR from resource files (WebSocket for long-running operation)
   */
  buildDtr: async (
    resourceId: string,
    tasteId: string,
    callbacks?: WSCallbacks,
  ): Promise<BuildDTRResponse> => {
    const result = await buildDTRWebSocket(resourceId, tasteId, callbacks || {})
    // Type guard to ensure result matches BuildDTRResponse
    if (
      typeof result === 'object' &&
      result !== null &&
      'status' in result &&
      (result['status'] === 'success' || result['status'] === 'skipped')
    ) {
      return result as unknown as BuildDTRResponse
    }
    throw new Error('Invalid response format from buildDTR')
  },

  /**
   * Generate UI from project (WebSocket for long-running operation)
   */
  generateUI: async (
    projectId: string,
    taskDescription: string,
    deviceInfo: DeviceInfo,
    renderingMode: 'react' | 'parametric',
    callbacks?: WSCallbacks,
  ): Promise<GenerateUIResponse> => {
    const result = await generateUIWebSocket(
      projectId,
      taskDescription,
      deviceInfo,
      renderingMode,
      callbacks || {},
    )
    // Type guard to ensure result matches GenerateUIResponse
    if (
      typeof result === 'object' &&
      result !== null &&
      'status' in result &&
      'type' in result &&
      'ui' in result &&
      'version' in result
    ) {
      return result as unknown as GenerateUIResponse
    }
    throw new Error('Invalid response format from generateUI')
  },

  /**
   * Get existing UI for a project
   */
  getUI: async (
    projectId: string,
    version?: number,
  ): Promise<GenerateUIResponse> => {
    const query = version
      ? `?project_id=${projectId}&version=${version}`
      : `?project_id=${projectId}`
    return apiRequest<GenerateUIResponse>(`/api/llm/ui/get${query}`)
  },

  /**
   * Get all UI versions for a project
   */
  getUIVersions: async (
    projectId: string,
  ): Promise<{
    status: string
    current_version: number
    versions: number[]
  }> => {
    return apiRequest<{
      status: string
      current_version: number
      versions: number[]
    }>(`/api/llm/ui/versions?project_id=${projectId}`)
  },

  /**
   * Revert to a previous UI version
   */
  revertToVersion: async (
    projectId: string,
    version: number,
  ): Promise<{
    status: string
    message: string
    old_version: number
    new_version: number
    ui: unknown
  }> => {
    return apiRequest<{
      status: string
      message: string
      old_version: number
      new_version: number
      ui: unknown
    }>(`/api/llm/ui/revert?project_id=${projectId}&version=${version}`, {
      method: 'POST',
    })
  },

  /**
   * Generate flow for a project (multi-screen UI flow) via WebSocket for progressive updates
   */
  generateFlowProgressive: async (
    projectId: string,
    callbacks: import('./websocketClient').FlowGenerationCallbacks,
  ): Promise<import('./websocketClient').FlowCompleteResult> => {
    const { generateFlowWebSocket } = await import('./websocketClient')
    return await generateFlowWebSocket(projectId, callbacks)
  },

  /**
   * Generate flow for a project (multi-screen UI flow)
   */
  generateFlow: async (
    projectId: string,
  ): Promise<{
    status: string
    flow_graph: FlowGraph
    version: number
  }> => {
    return apiRequest<{
      status: string
      flow_graph: FlowGraph
      version: number
    }>(`/api/llm/generate-flow?project_id=${projectId}`, {
      method: 'POST',
    })
  },

  /**
   * Get existing flow for a project
   */
  getFlow: async (
    projectId: string,
    version?: number,
  ): Promise<{
    status: string
    flow_graph: FlowGraph
    version: number
  }> => {
    const query = version ? `?version=${version}` : ''
    return apiRequest<{
      status: string
      flow_graph: FlowGraph
      version: number
    }>(`/api/projects/${projectId}/flow${query}`)
  },

  /**
   * Get all flow versions for a project
   */
  getFlowVersions: async (
    projectId: string,
  ): Promise<{
    status: string
    current_version: number
    versions: number[]
  }> => {
    return apiRequest<{
      status: string
      current_version: number
      versions: number[]
    }>(`/api/projects/${projectId}/flow/versions`)
  },

  /**
   * Revert to a previous flow version
   */
  revertFlowVersion: async (
    projectId: string,
    version: number,
  ): Promise<{
    status: string
    message: string
    old_version: number
    new_version: number
    flow_graph: FlowGraph
  }> => {
    return apiRequest<{
      status: string
      message: string
      old_version: number
      new_version: number
      flow_graph: FlowGraph
    }>(`/api/projects/${projectId}/flow/revert?version=${version}`, {
      method: 'POST',
    })
  },

  /**
   * Get a random UI by rendering mode
   */
  getRandomUIByMode: async (
    renderingMode: 'parametric' | 'react',
  ): Promise<
    GenerateUIResponse & { project_id: string; project_name: string }
  > => {
    return apiRequest<
      GenerateUIResponse & { project_id: string; project_name: string }
    >(`/api/llm/ui/random?rendering_mode=${renderingMode}`)
  },

  /**
   * Check if user has any UIs of a specific rendering mode
   */
  hasUIsByMode: async (
    renderingMode: 'parametric' | 'react',
  ): Promise<boolean> => {
    try {
      await apiRequest(`/api/llm/ui/random?rendering_mode=${renderingMode}`)
      return true
    } catch {
      return false
    }
  },
}

// ============================================================================
// DTM API (Pass 7)
// ============================================================================

export interface DTMBuildRequest {
  taste_id: string
  resource_ids?: string[] // If not provided, uses all resources
  priority_mode?: boolean
}

export interface DTMBuildResponse {
  status: string
  dtm_id: string
  resource_count: number
  confidence: number
  duration_seconds: number
}

export interface DTMStatusResponse {
  exists: boolean
  resource_count: number
  created_at?: string
  confidence?: number
  needs_rebuild?: boolean // True if resources were deleted since last build
}

export const dtmAPI = {
  /**
   * Build DTM for a taste (entire taste or subset of resources)
   */
  build: async (payload: DTMBuildRequest): Promise<DTMBuildResponse> => {
    return apiRequest<DTMBuildResponse>('/api/dtm/build', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get DTM status for a taste
   */
  getStatus: async (tasteId: string): Promise<DTMStatusResponse> => {
    return apiRequest<DTMStatusResponse>(`/api/dtm/${tasteId}/status`)
  },

  /**
   * Rebuild DTM for entire taste (after resource deletions)
   */
  rebuild: async (tasteId: string): Promise<DTMBuildResponse> => {
    return apiRequest<DTMBuildResponse>(`/api/dtm/${tasteId}/rebuild`, {
      method: 'POST',
    })
  },

  /**
   * Delete DTM for a taste
   */
  delete: async (tasteId: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/api/dtm/${tasteId}`, {
      method: 'DELETE',
    })
  },
}

/**
 * Mobbin API Client Module
 */

// ============================================================================
// MOBBIN TYPES
// ============================================================================

export interface MobbinSearchRequest {
  query: string
  platform: 'ios' | 'android'
  content_type?: 'apps' | 'screens' | 'ui-elements' | 'flows'
}

export interface MobbinAppSearchResult {
  id: string
  name: string
  logo_url: string | null
  platform: string
  version_id: string | null
  url: string
  base_url: string
}

export interface MobbinSearchResponse {
  query: string
  platform: string
  content_type: string
  apps: MobbinAppSearchResult[]
  total: number
}

export interface MobbinScreen {
  id: string
  screen_number: number
  image_url: string
  thumbnail_url: string
  title: string | null
  tags: string[] | null
}

export interface MobbinUIElement {
  id: string
  element_number: number
  image_url: string
  thumbnail_url: string
  title: string | null
  category: string | null
  tags: string[] | null
}

export interface MobbinFlow {
  id: string
  flow_number: number | null
  title: string
  thumbnail_url: string | null
  url: string | null
  metadata: string | null
  tags: string[] | null
}

export interface MobbinFlowTreeNode {
  id: string
  type?: string
  position?: { x: number; y: number }
  data?: Record<string, unknown>
}

export interface MobbinFlowTreeEdge {
  id: string
  source: string
  target: string
  type?: string
}

export interface MobbinFlowTree {
  nodes?: MobbinFlowTreeNode[]
  edges?: MobbinFlowTreeEdge[]
  [key: string]: unknown
}

export interface MobbinFlowDetails {
  title: string | null
  description: string | null
  screens: Array<{
    screen_number: number
    image_url: string
    label: string | null
  }>
  flow_tree: MobbinFlowTree | null
  metadata: Record<string, unknown>
}

export interface MobbinFlowTreeHierarchyNode {
  id: string
  title: string
  screen_count: number
  depth: number
  has_children: boolean
  is_selected: boolean
  order: number
}

export interface MobbinFlowTreeHierarchy {
  app_id: string
  version_id: string
  nodes: MobbinFlowTreeHierarchyNode[]
  total: number
}

export interface MobbinNodeScreen {
  id: string
  screen_number: number
  image_url: string
  thumbnail_url: string
  label: string | null
  dimensions?: { width: number; height: number }
}

// ============================================================================
// MOBBIN API
// ============================================================================

export const mobbinAPI = {
  /**
   * Search for apps on Mobbin
   */
  search: async (
    params: MobbinSearchRequest,
  ): Promise<MobbinSearchResponse> => {
    return apiRequest<MobbinSearchResponse>('/api/mobbin/search', {
      method: 'POST',
      body: JSON.stringify({
        query: params.query,
        platform: params.platform,
        content_type: params.content_type || 'apps',
      }),
    })
  },

  /**
   * Get screens for a specific app
   */
  getScreens: async (
    appId: string,
    versionId?: string,
    limit?: number,
  ): Promise<{
    app_id: string
    version_id: string | null
    screens: MobbinScreen[]
    total: number
  }> => {
    const params = new URLSearchParams()
    if (versionId) params.append('version_id', versionId)
    if (limit) params.append('limit', limit.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<{
      app_id: string
      version_id: string | null
      screens: MobbinScreen[]
      total: number
    }>(`/api/mobbin/apps/${appId}/screens${query}`)
  },

  /**
   * Get UI elements for a specific app
   */
  getUIElements: async (
    appId: string,
    versionId?: string,
    limit?: number,
  ): Promise<{
    app_id: string
    version_id: string | null
    ui_elements: MobbinUIElement[]
    total: number
  }> => {
    const params = new URLSearchParams()
    if (versionId) params.append('version_id', versionId)
    if (limit) params.append('limit', limit.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<{
      app_id: string
      version_id: string | null
      ui_elements: MobbinUIElement[]
      total: number
    }>(`/api/mobbin/apps/${appId}/ui-elements${query}`)
  },

  /**
   * Get flows for a specific app
   */
  getFlows: async (
    appId: string,
    versionId?: string,
    limit?: number,
  ): Promise<{
    app_id: string
    version_id: string | null
    flows: MobbinFlow[]
    total: number
  }> => {
    const params = new URLSearchParams()
    if (versionId) params.append('version_id', versionId)
    if (limit) params.append('limit', limit.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<{
      app_id: string
      version_id: string | null
      flows: MobbinFlow[]
      total: number
    }>(`/api/mobbin/apps/${appId}/flows${query}`)
  },

  /**
   * Get detailed information about a specific flow
   */
  getFlowDetails: async (
    appId: string,
    versionId: string,
    flowId: string,
  ): Promise<MobbinFlowDetails> => {
    const params = new URLSearchParams()
    params.append('version_id', versionId)
    params.append('flow_id', flowId)

    return apiRequest<MobbinFlowDetails>(
      `/api/mobbin/apps/${appId}/flows/${flowId}?${params.toString()}`,
    )
  },

  /**
   * Get flow tree hierarchy for an app
   */
  getFlowTree: async (
    appId: string,
    versionId?: string,
  ): Promise<MobbinFlowTreeHierarchy> => {
    const params = new URLSearchParams()
    if (versionId) params.append('version_id', versionId)

    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<MobbinFlowTreeHierarchy>(
      `/api/mobbin/apps/${appId}/flows/tree${query}`,
    )
  },

  /**
   * Get screens for a specific flow tree node
   */
  getFlowNodeScreens: async (
    appId: string,
    nodeId: string,
    versionId: string,
  ): Promise<{
    app_id: string
    version_id: string
    node_id: string
    screens: MobbinNodeScreen[]
    total: number
  }> => {
    const params = new URLSearchParams()
    params.append('version_id', versionId)

    return apiRequest<{
      app_id: string
      version_id: string
      node_id: string
      screens: MobbinNodeScreen[]
      total: number
    }>(
      `/api/mobbin/apps/${appId}/flows/tree/${nodeId}/screens?${params.toString()}`,
    )
  },

  /**
   * Get Mobbin service status
   */
  getStatus: async (): Promise<{
    configured: boolean
    method: string
    browser: string
    note: string
  }> => {
    return apiRequest<{
      configured: boolean
      method: string
      browser: string
      note: string
    }>('/api/mobbin/status')
  },
}

// ============================================================================
// EXPORT DEFAULT API OBJECT
// ============================================================================

const api = {
  tastes: tastesAPI,
  resources: resourcesAPI,
  projects: projectsAPI,
  llm: llmAPI,
  dtm: dtmAPI,
  mobbin: mobbinAPI,
}

export default api
