import { fetchAuthSession } from 'aws-amplify/auth'
import { config } from '../config/env'

class ApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = config.api.url
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    try {
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()

      if (!token) {
        throw new Error('No ID token available')
      }

      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    } catch (error) {
      console.error('Error getting auth token:', error)
      throw error
    }
  }

  async get<T>(endpoint: string, requiresAuth = false): Promise<T> {
    const headers: Record<string, string> = requiresAuth
      ? await this.getAuthHeader()
      : { 'Content-Type': 'application/json' }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'API request failed')
    }

    return response.json()
  }

  async post<T>(
    endpoint: string,
    data: unknown,
    requiresAuth = true,
  ): Promise<T> {
    const headers: Record<string, string> = requiresAuth
      ? await this.getAuthHeader()
      : { 'Content-Type': 'application/json' }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'API request failed')
    }

    return response.json()
  }

  // Specific API methods
  async healthCheck() {
    return this.get('/api/health')
  }

  async getProtectedData() {
    return this.get('/api/protected', true)
  }

  async getUserProfile() {
    return this.get('/api/user/profile', true)
  }
}

export const api = new ApiService()
