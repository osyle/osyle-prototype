/**
 * WebSocket Client for UI Iteration
 * Handles iterate-ui action with feedback loop
 */
import { fetchAuthSession } from 'aws-amplify/auth'

const WS_BASE_URL =
  import.meta.env['VITE_WS_URL'] ||
  (import.meta.env.DEV
    ? 'ws://localhost:8000'
    : 'wss://n6m806tmzk.execute-api.us-east-1.amazonaws.com/production')

const WS_PATH = WS_BASE_URL.includes('localhost') ? '/ws/llm' : ''

export interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

export interface IterationCallbacks {
  // Routing phase
  onRoutingStart?: () => void
  // eslint-disable-next-line no-unused-vars
  onRoutingComplete?: (data: {
    screens_to_edit: string[]
    reasoning: string
  }) => void

  // Screen iteration phase
  // eslint-disable-next-line no-unused-vars
  onScreenIterationStart?: (data: {
    screen_id: string
    screen_name: string
    current_index: number
    total_screens: number
  }) => void

  // eslint-disable-next-line no-unused-vars
  onScreenConversationChunk?: (data: {
    screen_id: string
    chunk: string
  }) => void

  // eslint-disable-next-line no-unused-vars
  onScreenGenerating?: (data: { screen_id: string; message: string }) => void

  // eslint-disable-next-line no-unused-vars
  onScreenUpdated?: (data: {
    screen_id: string
    ui_code: string
    conversation?: string
  }) => void

  // Completion phase
  // eslint-disable-next-line no-unused-vars
  onIterationComplete?: (data: {
    summary: string
    screens_updated: string[]
    new_version: number
  }) => void

  // Conversation only (no regeneration)
  // eslint-disable-next-line no-unused-vars
  onConversationResponse?: (data: { response: string }) => void

  // General
  // eslint-disable-next-line no-unused-vars
  onProgress?: (stage: string, message: string) => void
  // eslint-disable-next-line no-unused-vars
  onError?: (error: string) => void
  // eslint-disable-next-line no-unused-vars
  onComplete?: (result: Record<string, unknown>) => void
}

/**
 * Iterate on UI design with feedback
 */
export function iterateUIWebSocket(
  projectId: string,
  userFeedback: string,
  conversationHistory: Message[],
  callbacks: IterationCallbacks,
): Promise<Record<string, unknown>> {
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
          console.log('WebSocket connected for UI iteration')

          // Convert conversation history to simple format
          const history = conversationHistory.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
          }))

          ws.send(
            JSON.stringify({
              action: 'iterate-ui',
              data: {
                project_id: projectId,
                user_feedback: userFeedback,
                conversation_history: history,
                user_id: userId,
              },
            }),
          )
        }

        ws.onmessage = event => {
          try {
            const message = JSON.parse(event.data) as
              | { type: 'progress'; stage: string; message: string }
              | {
                  type: 'feedback_routing_complete'
                  data: { screens_to_edit: string[]; reasoning: string }
                }
              | {
                  type: 'screen_iteration_start'
                  data: {
                    screen_id: string
                    screen_name: string
                    current_index: number
                    total_screens: number
                  }
                }
              | {
                  type: 'screen_conversation_chunk'
                  data: { screen_id: string; chunk: string }
                }
              | {
                  type: 'screen_generating'
                  data: { screen_id: string; message: string }
                }
              | {
                  type: 'screen_updated'
                  data: {
                    screen_id: string
                    ui_code: string
                    conversation?: string
                  }
                }
              | {
                  type: 'iteration_complete'
                  data: {
                    summary: string
                    screens_updated: string[]
                    new_version: number
                  }
                }
              | {
                  type: 'conversation_response'
                  data: { response: string }
                }
              | { type: 'complete'; result: Record<string, unknown> }
              | { type: 'error'; error: string }

            console.log('[Iteration WS] Message type:', message.type)

            if (message.type === 'progress') {
              callbacks.onProgress?.(message.stage, message.message)

              // Routing started
              if (message.stage === 'routing') {
                callbacks.onRoutingStart?.()
              }
            } else if (message.type === 'feedback_routing_complete') {
              callbacks.onRoutingComplete?.(message.data)
            } else if (message.type === 'screen_iteration_start') {
              callbacks.onScreenIterationStart?.(message.data)
            } else if (message.type === 'screen_conversation_chunk') {
              callbacks.onScreenConversationChunk?.(message.data)
            } else if (message.type === 'screen_generating') {
              callbacks.onScreenGenerating?.(message.data)
            } else if (message.type === 'screen_updated') {
              callbacks.onScreenUpdated?.(message.data)
            } else if (message.type === 'iteration_complete') {
              callbacks.onIterationComplete?.(message.data)
            } else if (message.type === 'conversation_response') {
              callbacks.onConversationResponse?.(message.data)
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
