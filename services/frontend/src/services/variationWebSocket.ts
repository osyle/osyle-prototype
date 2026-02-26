/**
 * WebSocket Client for Variation Generation
 * Handles generate-variation action — regenerates a specific element area with a fresh design.
 */
import { fetchAuthSession } from 'aws-amplify/auth'

const WS_BASE_URL =
  import.meta.env['VITE_WS_URL'] ||
  (import.meta.env.DEV
    ? 'ws://localhost:8000'
    : 'wss://n6m806tmzk.execute-api.us-east-1.amazonaws.com/production')

const WS_PATH = WS_BASE_URL.includes('localhost') ? '/ws/llm' : ''

export interface VariationCallbacks {
  // eslint-disable-next-line no-unused-vars
  onVariationStart?: (data: {
    screen_id: string
    screen_name: string
    element_path: string
    element_name: string
  }) => void

  // eslint-disable-next-line no-unused-vars
  onConversationChunk?: (data: { screen_id: string; chunk: string }) => void

  // eslint-disable-next-line no-unused-vars
  onGenerating?: (data: {
    screen_id: string
    screen_name: string
    message: string
  }) => void

  // eslint-disable-next-line no-unused-vars
  onScreenUpdated?: (data: {
    screen_id: string
    ui_code: string
    component_path?: string
    conversation?: string
  }) => void

  // eslint-disable-next-line no-unused-vars
  onProgress?: (stage: string, message: string) => void

  // eslint-disable-next-line no-unused-vars
  onError?: (error: string) => void

  // eslint-disable-next-line no-unused-vars
  onComplete?: (data: {
    status: string
    screen_id: string
    new_version: number
  }) => void
}

export function generateVariationWebSocket(
  projectId: string,
  screenId: string,
  elementPath: string,
  elementName: string,
  elementText: string,
  elementType: 'leaf' | 'container',
  callbacks: VariationCallbacks,
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
          ws.send(
            JSON.stringify({
              action: 'generate-variation',
              data: {
                project_id: projectId,
                screen_id: screenId,
                element_path: elementPath,
                element_name: elementName,
                element_text: elementText,
                element_type: elementType,
                user_id: userId,
              },
            }),
          )
        }

        ws.onmessage = event => {
          try {
            const message = JSON.parse(event.data) as Record<string, unknown>
            const type = message.type as string

            if (type === 'progress') {
              callbacks.onProgress?.(
                message.stage as string,
                message.message as string,
              )
            } else if (type === 'screen_variation_start') {
              callbacks.onVariationStart?.(
                message.data as {
                  screen_id: string
                  screen_name: string
                  element_path: string
                  element_name: string
                },
              )
            } else if (type === 'screen_conversation_chunk') {
              callbacks.onConversationChunk?.(
                message.data as { screen_id: string; chunk: string },
              )
            } else if (type === 'screen_generating') {
              callbacks.onGenerating?.(
                message.data as {
                  screen_id: string
                  screen_name: string
                  message: string
                },
              )
            } else if (type === 'screen_updated') {
              callbacks.onScreenUpdated?.(
                message.data as {
                  screen_id: string
                  ui_code: string
                  component_path?: string
                  conversation?: string
                },
              )
            } else if (type === 'complete') {
              const result = message.result as Record<string, unknown>
              callbacks.onComplete?.(
                result as {
                  status: string
                  screen_id: string
                  new_version: number
                },
              )
              ws.close()
              resolve(result)
            } else if (type === 'error') {
              const errorMsg = message.error as string
              callbacks.onError?.(errorMsg)
              ws.close()
              reject(new Error(errorMsg))
            }
          } catch (e) {
            console.error('Failed to parse variation websocket message', e)
          }
        }

        ws.onerror = err => {
          console.error('Variation WebSocket error', err)
          callbacks.onError?.('WebSocket connection error')
          reject(new Error('WebSocket connection error'))
        }

        ws.onclose = () => {
          console.log('Variation WebSocket closed')
        }
      })
      .catch(reject)
  })
}
