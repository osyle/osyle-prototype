/**
 * API Client for Osyle Frontend
 * Automatically attaches Cognito JWT tokens to requests
 */
import { fetchAuthSession } from 'aws-amplify/auth'
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
  type: 'design-ml' | 'react'
  ui: unknown // JSON object for design-ml, string for react
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

export interface UpdateDTMResponse {
  status: 'skipped' | 'built' | 'updated'
  message?: string
  taste_id?: string
  total_resources?: number
  confidence?: number
  incremental?: boolean
  reason?: string
  total_dtrs?: number
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
    metadata?: Record<string, unknown>
  }): Promise<Project> => {
    const token = await getAuthToken()

    // If inspiration images exist, use FormData
    if (data.inspiration_images && data.inspiration_images.length > 0) {
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
      if (data.metadata) {
        formData.append('metadata', JSON.stringify(data.metadata))
      }

      // Append inspiration images
      data.inspiration_images.forEach(file => {
        formData.append('inspiration_images', file, file.name)
      })

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
    }

    // No inspiration images - use JSON
    return apiRequest<Project>('/api/projects/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
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
}

// ============================================================================
// LLM API
// ============================================================================

export const llmAPI = {
  /**
   * Check if DTR exists for a resource
   */
  checkDtrExists: async (
    resourceId: string,
    tasteId: string,
  ): Promise<DTRExistsResponse> => {
    return apiRequest<DTRExistsResponse>(
      `/api/llm/resource/${resourceId}/dtr-exists?taste_id=${tasteId}`,
    )
  },

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
    renderingMode: 'design-ml' | 'react',
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
   * Get a random test UI (for testing)
   */
  getTestUI: async (): Promise<
    GenerateUIResponse & { project_id: string; project_name: string }
  > => {
    return apiRequest<
      GenerateUIResponse & { project_id: string; project_name: string }
    >('/api/llm/ui/get/test')
  },

  /**
   * Get a random UI by rendering mode
   */
  getRandomUIByMode: async (
    renderingMode: 'design-ml' | 'react',
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
    renderingMode: 'design-ml' | 'react',
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
// DTM API
// ============================================================================

export const dtmAPI = {
  /**
   * Auto-update DTM after DTR is created
   * Decides whether to build new DTM or update existing one
   */
  updateDtm: async (
    tasteId: string,
    resourceId: string,
  ): Promise<UpdateDTMResponse> => {
    return apiRequest<UpdateDTMResponse>('/api/dtm/update', {
      method: 'POST',
      body: JSON.stringify({
        taste_id: tasteId,
        resource_id: resourceId,
        resynthesize: false, // Fast incremental update
      }),
    })
  },

  /**
   * Get DTM for a taste
   */
  get: async (tasteId: string): Promise<Record<string, unknown>> => {
    return apiRequest<Record<string, unknown>>(`/api/dtm/${tasteId}`)
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

// ============================================================================
// EXPORT DEFAULT API OBJECT
// ============================================================================

const api = {
  tastes: tastesAPI,
  resources: resourcesAPI,
  projects: projectsAPI,
  llm: llmAPI,
  dtm: dtmAPI,
}

export default api
