/**
 * Copy Generation WebSocket Client
 *
 * Handles real-time conversational copy development with the backend.
 */

import { fetchAuthSession } from 'aws-amplify/auth'

const WS_BASE_URL =
  import.meta.env['VITE_WS_URL'] ||
  'wss://bj7i7munz2.execute-api.us-east-1.amazonaws.com'

export interface CopyMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface CopyWSCallbacks {
  // eslint-disable-next-line no-unused-vars
  onChunk?: (chunk: string) => void
  // eslint-disable-next-line no-unused-vars
  onMessage?: (message: string) => void
  // eslint-disable-next-line no-unused-vars
  onProgress?: (stage: string, message: string) => void
  // eslint-disable-next-line no-unused-vars
  onError?: (error: string) => void
  // eslint-disable-next-line no-unused-vars
  onComplete?: (finalCopy: string) => void
}

/**
 * Send a message in the copy conversation
 */
export async function sendCopyMessage(
  projectId: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  callbacks: CopyWSCallbacks,
): Promise<void> {
  const session = await fetchAuthSession()
  const token = session.tokens?.idToken?.toString()

  if (!token) {
    throw new Error('No authentication token')
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/llm?token=${token}`)
    let resolved = false

    ws.onopen = () => {
      console.log('🔗 Copy WebSocket connected')

      // Send copy message action
      ws.send(
        JSON.stringify({
          action: 'copy-message',
          data: {
            project_id: projectId,
            message: userMessage,
            conversation_history: conversationHistory,
          },
        }),
      )
    }

    ws.onmessage = event => {
      try {
        const response = JSON.parse(event.data)
        console.log('📨 Copy WS message:', response.type)

        if (response.type === 'progress') {
          callbacks.onProgress?.(response.stage, response.message)
        } else if (response.type === 'copy_chunk') {
          // NEW: Handle streaming chunks
          callbacks.onChunk?.(response.chunk)
        } else if (response.type === 'copy_response') {
          callbacks.onMessage?.(response.message)

          if (!resolved) {
            resolved = true
            ws.close()
            resolve()
          }
        } else if (response.type === 'error') {
          callbacks.onError?.(response.error)

          if (!resolved) {
            resolved = true
            ws.close()
            reject(new Error(response.error))
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }

    ws.onerror = error => {
      console.error('❌ Copy WebSocket error:', error)
      callbacks.onError?.('Connection error')

      if (!resolved) {
        resolved = true
        reject(new Error('WebSocket connection failed'))
      }
    }

    ws.onclose = () => {
      console.log('🔌 Copy WebSocket closed')

      if (!resolved) {
        resolved = true
        resolve()
      }
    }

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!resolved) {
        console.warn('⏱️ Copy WebSocket timeout')
        resolved = true
        ws.close()
        reject(new Error('Request timeout'))
      }
    }, 60000)
  })
}

/**
 * Finalize the copy from the conversation
 */
export async function finalizeCopy(
  projectId: string,
  conversationHistory: Array<{ role: string; content: string }>,
  callbacks: CopyWSCallbacks,
): Promise<string> {
  const session = await fetchAuthSession()
  const token = session.tokens?.idToken?.toString()

  if (!token) {
    throw new Error('No authentication token')
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/llm?token=${token}`)
    let resolved = false

    ws.onopen = () => {
      console.log('🔗 Finalize Copy WebSocket connected')

      // Send finalize action
      ws.send(
        JSON.stringify({
          action: 'finalize-copy',
          data: {
            project_id: projectId,
            conversation_history: conversationHistory,
          },
        }),
      )
    }

    ws.onmessage = event => {
      try {
        const response = JSON.parse(event.data)
        console.log('📨 Finalize WS message:', response.type)

        if (response.type === 'progress') {
          callbacks.onProgress?.(response.stage, response.message)
        } else if (response.type === 'copy_finalized') {
          callbacks.onComplete?.(response.final_copy)

          if (!resolved) {
            resolved = true
            ws.close()
            resolve(response.final_copy)
          }
        } else if (response.type === 'error') {
          callbacks.onError?.(response.error)

          if (!resolved) {
            resolved = true
            ws.close()
            reject(new Error(response.error))
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }

    ws.onerror = error => {
      console.error('❌ Finalize WebSocket error:', error)
      callbacks.onError?.('Connection error')

      if (!resolved) {
        resolved = true
        reject(new Error('WebSocket connection failed'))
      }
    }

    ws.onclose = () => {
      console.log('🔌 Finalize WebSocket closed')

      if (!resolved) {
        resolved = true
        resolve('')
      }
    }

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!resolved) {
        console.warn('⏱️ Finalize WebSocket timeout')
        resolved = true
        ws.close()
        reject(new Error('Request timeout'))
      }
    }, 60000)
  })
}
