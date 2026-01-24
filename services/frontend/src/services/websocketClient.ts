/**
 * WebSocket Client for Long-Running LLM Operations
 * Handles build-dtr and generate-ui with real-time progress updates
 */
import { fetchAuthSession } from 'aws-amplify/auth'

// WebSocket uses a separate API Gateway in production, local server in dev
const WS_BASE_URL =
  import.meta.env['VITE_WS_URL'] ||
  (import.meta.env.DEV
    ? 'ws://localhost:8000'
    : 'wss://n6m806tmzk.execute-api.us-east-1.amazonaws.com/production')

// Add /ws/llm for local FastAPI, nothing for API Gateway
const WS_PATH = WS_BASE_URL.includes('localhost') ? '/ws/llm' : ''

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
 * Flow generation result types
 */
export interface FlowArchitectureResult {
  flow_id: string
  flow_name: string
  description?: string
  entry_screen_id: string
  screens: Array<{
    screen_id: string
    name: string
    description?: string
    task_description: string
    platform: string
    dimensions: { width: number; height: number }
    screen_type?: string
    semantic_role?: string
    user_provided?: boolean
    user_screen_index?: number
    reference_mode?: string
    ui_code?: string
    ui_loading?: boolean
    ui_error?: boolean
    [key: string]: unknown
  }>
  transitions: Array<{
    transition_id: string
    from_screen_id: string
    to_screen_id: string
    trigger: string
    trigger_type: string
    flow_type: string
    label?: string
    condition?: string
    color?: string
  }>
  layout_positions?: Record<string, { x: number; y: number }>
  layout_algorithm?: string
}

export interface FlowCompleteResult {
  status: string
  version: number
  flow_graph: FlowArchitectureResult
  [key: string]: unknown
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
    void fetchAuthSession()
      .then(session => {
        const token = session.tokens?.idToken?.toString()
        const userId = session.tokens?.idToken?.payload?.sub as string

        if (!token) {
          reject(new Error('No authentication token'))
          return
        }

        if (!userId) {
          reject(new Error('No user ID in token'))
          return
        }

        // Connect to WebSocket
        const ws = new WebSocket(
          `${WS_BASE_URL}${WS_PATH}?token=${encodeURIComponent(token)}`,
        )

        ws.onopen = () => {
          console.log('WebSocket connected')
          // Send action with user_id included for production Lambda
          ws.send(
            JSON.stringify({
              action,
              data: {
                ...data,
                user_id: userId,
              },
            }),
          )
        }

        ws.onmessage = event => {
          try {
            const message = JSON.parse(event.data) as WSMessage

            if (message.type === 'progress') {
              callbacks.onProgress?.(
                message.stage,
                message.message,
                message.data,
              )
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
      .catch((error: Error) => {
        reject(error)
      })
  })
}

/**
 * Build DTR via WebSocket
 */
export function buildDTRWebSocket(
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
export function generateUIWebSocket(
  projectId: string,
  taskDescription: string,
  deviceInfo: { platform: string; screen: { width: number; height: number } },
  renderingMode: 'react' | 'parametric',
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

/**
 * Generate Flow via WebSocket with progressive updates
 */
export interface FlowGenerationCallbacks {
  onProgress?: (
    // eslint-disable-next-line no-unused-vars
    stage: string,
    // eslint-disable-next-line no-unused-vars
    message: string,
    // eslint-disable-next-line no-unused-vars
    data?: Record<string, unknown>,
  ) => void
  // eslint-disable-next-line no-unused-vars
  onRethinkComplete?: (rethinkData: Record<string, unknown>) => void
  // eslint-disable-next-line no-unused-vars
  onFlowArchitecture?: (flowArchitecture: FlowArchitectureResult) => void
  onUICheckpoint?: (
    // eslint-disable-next-line no-unused-vars
    screenId: string,
    // eslint-disable-next-line no-unused-vars
    uiCode: string,
    // eslint-disable-next-line no-unused-vars
    checkpointNumber: number,
  ) => void
  onScreenReady?: (
    // eslint-disable-next-line no-unused-vars
    screenId: string,
    // eslint-disable-next-line no-unused-vars
    uiCode: string,
    // eslint-disable-next-line no-unused-vars
    variationSpace?: Record<string, unknown>,
  ) => void
  onScreenError?: (
    // eslint-disable-next-line no-unused-vars
    screenId: string,
    // eslint-disable-next-line no-unused-vars
    error: string,
  ) => void
  // eslint-disable-next-line no-unused-vars
  onComplete?: (result: FlowCompleteResult) => void
  // eslint-disable-next-line no-unused-vars
  onError?: (error: string) => void
}

export function generateFlowWebSocket(
  projectId: string,
  callbacks: FlowGenerationCallbacks,
): Promise<FlowCompleteResult> {
  return new Promise((resolve, reject) => {
    void fetchAuthSession()
      .then(session => {
        const token = session.tokens?.idToken?.toString()
        const userId = session.tokens?.idToken?.payload?.sub as string

        if (!token) {
          reject(new Error('No authentication token'))
          return
        }

        if (!userId) {
          reject(new Error('No user ID in token'))
          return
        }

        const ws = new WebSocket(
          `${WS_BASE_URL}${WS_PATH}?token=${encodeURIComponent(token)}`,
        )

        ws.onopen = () => {
          console.log('WebSocket connected for flow generation')
          ws.send(
            JSON.stringify({
              action: 'generate-flow',
              data: {
                project_id: projectId,
                user_id: userId,
              },
            }),
          )
        }

        ws.onmessage = event => {
          // ========== ENHANCED LOGGING FOR DEBUGGING ==========
          console.log(
            '[WebSocket] Raw message received (first 300 chars):',
            event.data.substring(0, 300),
          )

          try {
            const message = JSON.parse(event.data) as
              | ProgressUpdate
              | CompleteUpdate
              | ErrorUpdate
              | {
                  type: 'rethink_complete'
                  data: Record<string, unknown>
                }
              | {
                  type: 'flow_architecture'
                  data: FlowArchitectureResult
                }
              | {
                  type: 'ui_checkpoint'
                  data: {
                    screen_id: string
                    ui_code: string
                    checkpoint_number: number
                  }
                }
              | {
                  type: 'screen_ready'
                  data: {
                    screen_id: string
                    ui_code: string
                    variation_space?: Record<string, unknown>
                  }
                }
              | {
                  type: 'screen_error'
                  data: { screen_id: string; error: string }
                }

            console.log('[WebSocket] Parsed message type:', message.type)
            // ========== END ENHANCED LOGGING ==========

            if (message.type === 'progress') {
              callbacks.onProgress?.(
                message.stage,
                message.message,
                message.data,
              )
            } else if (message.type === 'rethink_complete') {
              callbacks.onRethinkComplete?.(message.data)
            } else if (message.type === 'flow_architecture') {
              callbacks.onFlowArchitecture?.(message.data)
            } else if (message.type === 'ui_checkpoint') {
              console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                     📍 UI CHECKPOINT RECEIVED                              ║
╚════════════════════════════════════════════════════════════════════════════╝
              `)
              console.log('Checkpoint Details:', {
                screenId: message.data.screen_id,
                checkpointNumber: message.data.checkpoint_number,
                codeLength: message.data.ui_code?.length || 0,
                timestamp: new Date().toISOString(),
              })
              console.log('\nFirst 500 chars of checkpoint code:')
              console.log(message.data.ui_code?.substring(0, 500))
              console.log('\nLast 500 chars of checkpoint code:')
              console.log(
                message.data.ui_code?.substring(
                  message.data.ui_code.length - 500,
                ),
              )
              console.log('\n🔧 Calling callbacks.onUICheckpoint...')

              callbacks.onUICheckpoint?.(
                message.data.screen_id,
                message.data.ui_code,
                message.data.checkpoint_number,
              )

              console.log('✅ callbacks.onUICheckpoint completed')
              console.log(
                '╚════════════════════════════════════════════════════════════════════════════╝\n',
              )
            } else if (message.type === 'screen_ready') {
              console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                     ✅ SCREEN READY (FINAL)                                ║
╚════════════════════════════════════════════════════════════════════════════╝
              `)
              console.log('Screen Ready Details:', {
                screenId: message.data.screen_id,
                codeLength: message.data.ui_code?.length || 0,
                hasVariationSpace: !!message.data.variation_space,
                timestamp: new Date().toISOString(),
              })
              console.log('\nFirst 500 chars of final code:')
              console.log(message.data.ui_code?.substring(0, 500))
              console.log('\nLast 500 chars of final code:')
              console.log(
                message.data.ui_code?.substring(
                  message.data.ui_code.length - 500,
                ),
              )
              console.log('\n🔧 Calling callbacks.onScreenReady...')

              callbacks.onScreenReady?.(
                message.data.screen_id,
                message.data.ui_code,
                message.data.variation_space,
              )

              console.log('✅ callbacks.onScreenReady completed')
              console.log(
                '╚════════════════════════════════════════════════════════════════════════════╝\n',
              )
            } else if (message.type === 'screen_error') {
              callbacks.onScreenError?.(
                message.data.screen_id,
                message.data.error,
              )
            } else if (message.type === 'complete') {
              const result = message.result as FlowCompleteResult
              callbacks.onComplete?.(result)
              ws.close()
              resolve(result)
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
      .catch((error: Error) => {
        reject(error)
      })
  })
}
