/**
 * WebSocket Client for Long-Running LLM Operations
 * Handles build-dtr and generate-ui with real-time progress updates
 */
import { fetchAuthSession } from 'aws-amplify/auth'

// WebSocket uses a separate API Gateway
const WS_BASE_URL =
  import.meta.env['VITE_WS_URL'] ||
  'wss://n6m806tmzk.execute-api.us-east-1.amazonaws.com/production'

export interface ProgressUpdate {
  type: 'progress'
  stage: string
  message: string
  data?: Record<string, unknown>
}

export interface CompleteUpdate {
  type: 'complete'
  result: Record<string, unknown>
}

export interface ErrorUpdate {
  type: 'error'
  error: string
}

type WSMessage = ProgressUpdate | CompleteUpdate | ErrorUpdate

export interface WSCallbacks {
  onProgress?: (
    // eslint-disable-next-line no-unused-vars
    stage: string,
    // eslint-disable-next-line no-unused-vars
    message: string,
    // eslint-disable-next-line no-unused-vars
    data?: Record<string, unknown>,
  ) => void
  // eslint-disable-next-line no-unused-vars
  onComplete?: (result: Record<string, unknown>) => void
  // eslint-disable-next-line no-unused-vars
  onError?: (error: string) => void
}

/**
 * Connect to WebSocket and handle LLM operation
 */
function connectWebSocket(
  action: string,
  data: Record<string, unknown>,
  callbacks: WSCallbacks,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    // Get auth token and connect
    fetchAuthSession()
      .then(session => {
        const token = session.tokens?.idToken?.toString()

        if (!token) {
          reject(new Error('No authentication token'))
          return
        }

        // Connect to WebSocket
        const ws = new WebSocket(
          `${WS_BASE_URL}/ws/llm?token=${encodeURIComponent(token)}`,
        )

        ws.onopen = () => {
          console.log('WebSocket connected')
          // Send action
          ws.send(JSON.stringify({ action, data }))
        }

        ws.onmessage = event => {
          try {
            const message: WSMessage = JSON.parse(event.data)

            if (message.type === 'progress' && callbacks.onProgress) {
              callbacks.onProgress(message.stage, message.message, message.data)
            } else if (message.type === 'complete') {
              callbacks.onComplete?.(message.result)
              ws.close()
              resolve(message.result)
            } else if (message.type === 'error') {
              callbacks.onError?.(message.error)
              ws.close()
              reject(new Error(message.error))
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err)
          }
        }

        ws.onerror = error => {
          console.error('WebSocket error:', error)
          callbacks.onError?.('WebSocket connection error')
          reject(new Error('WebSocket connection error'))
        }

        ws.onclose = () => {
          console.log('WebSocket closed')
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}

/**
 * Build DTR via WebSocket
 */
export async function buildDTRWebSocket(
  resourceId: string,
  tasteId: string,
  callbacks: WSCallbacks,
): Promise<Record<string, unknown>> {
  return connectWebSocket(
    'build-dtr',
    {
      resource_id: resourceId,
      taste_id: tasteId,
    },
    callbacks,
  )
}

/**
 * Generate UI via WebSocket
 */
export async function generateUIWebSocket(
  projectId: string,
  taskDescription: string,
  deviceInfo: { platform: string; screen: { width: number; height: number } },
  renderingMode: 'design-ml' | 'react',
  callbacks: WSCallbacks,
): Promise<Record<string, unknown>> {
  return connectWebSocket(
    'generate-ui',
    {
      project_id: projectId,
      task_description: taskDescription,
      device_info: deviceInfo,
      rendering_mode: renderingMode,
    },
    callbacks,
  )
}
