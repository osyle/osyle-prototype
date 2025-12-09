/**
 * API Client for Osyle Frontend
 * Automatically attaches Cognito JWT tokens to requests
 */
import { fetchAuthSession } from 'aws-amplify/auth'

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
  selected_resource_id?: string
  outputs: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
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
    const error = await response.json().catch(() => ({
      detail: 'Request failed',
    }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
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
    return apiRequest(`/api/tastes/${tasteId}`, {
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
    return apiRequest(`/api/tastes/${tasteId}/resources/${resourceId}`, {
      method: 'DELETE',
    })
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
    selected_resource_id?: string
    metadata?: Record<string, unknown>
  }): Promise<Project> => {
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
      selected_resource_id?: string
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
    return apiRequest(`/api/projects/${projectId}`, {
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
    return apiRequest(
      `/api/projects/${projectId}/outputs?filename=${filename}`,
      {
        method: 'POST',
      },
    )
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
    return apiRequest(`/api/projects/${projectId}/outputs/${filename}/download`)
  },
}

// ============================================================================
// EXPORT DEFAULT API OBJECT
// ============================================================================

const api = {
  tastes: tastesAPI,
  resources: resourcesAPI,
  projects: projectsAPI,
}

export default api
