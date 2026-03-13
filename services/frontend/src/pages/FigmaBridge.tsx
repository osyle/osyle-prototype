/**
 * FigmaBridge.tsx
 *
 * Runs inside the Figma plugin panel as an iframe (loaded by code.js).
 *
 * TRANSPORT CHANGE: Polls http://localhost:8765/figma-payload-latest instead
 * of localStorage. This fixes the core bug: Figma Desktop's Electron webview
 * uses a separate storage partition from Chrome, so localStorage written by
 * the Osyle browser tab is never visible here.
 *
 * HTTP fetch works because:
 *  - The relay server runs on localhost:8765 (same machine)
 *  - Figma's manifest.json allows localhost in devAllowedDomains
 *  - HTTP is not subject to storage partitioning
 *
 * Flow:
 *  1. figma-relay.mjs runs on port 8765
 *  2. Osyle POSTs payload to relay
 *  3. This page polls GET /figma-payload-latest every 800ms
 *  4. Finds payload → sends to code.js via parent.postMessage
 *  5. POSTs ACK to relay → Osyle's poller resolves 'launched'
 */

import { useEffect, useState, useRef } from 'react'
import type { FigmaExportPayload } from '../services/figmaExport'

// Keep this export so existing imports in figmaExport.ts stay compatible
export const PAYLOAD_STORAGE_KEY_PREFIX = 'osyle_figma_payload_'

type BridgeState = 'waiting' | 'sending' | 'done' | 'error'

const RELAY_BASE = 'http://localhost:8765'
const POLL_INTERVAL_MS = 800

export default function FigmaBridge() {
  const [state, setState] = useState<BridgeState>('waiting')
  const [screenCount, setScreenCount] = useState(0)
  const [lastExport, setLastExport] = useState<string | null>(null)
  const [relayStatus, setRelayStatus] = useState<'unknown' | 'up' | 'down'>(
    'unknown',
  )
  const processedTokens = useRef(new Set<string>())

  function sendToCodeJs(payload: FigmaExportPayload) {
    try {
      parent.postMessage({ pluginMessage: payload }, '*')
      console.log(
        '[FigmaBridge] Sent payload to code.js, token:',
        payload.token,
      )
    } catch (e) {
      console.error('[FigmaBridge] parent.postMessage failed:', e)
    }
  }

  async function processPayload(payload: FigmaExportPayload) {
    if (processedTokens.current.has(payload.token)) return
    processedTokens.current.add(payload.token)

    setState('sending')
    setScreenCount(payload.screens.length)

    sendToCodeJs(payload)

    // ACK the relay so Osyle's launchFigmaPlugin resolves
    try {
      await fetch(`${RELAY_BASE}/figma-ack/${payload.token}`, {
        method: 'POST',
      })
      console.log('[FigmaBridge] ACK posted to relay')
    } catch (e) {
      console.warn('[FigmaBridge] Failed to ACK relay:', e)
    }

    setState('done')
    setLastExport(new Date().toLocaleTimeString())
    setTimeout(() => setState('waiting'), 4000)
  }

  useEffect(() => {
    let isMounted = true

    async function pollRelay() {
      try {
        const res = await fetch(`${RELAY_BASE}/figma-payload-latest`, {
          signal: AbortSignal.timeout(2000),
        })

        if (!isMounted) return

        if (res.status === 404) {
          if (relayStatus !== 'up') setRelayStatus('up')
          return
        }

        if (!res.ok) return

        setRelayStatus('up')
        const payload: FigmaExportPayload = await res.json()
        if (payload?.type === 'OSYLE_FIGMA_EXPORT') {
          await processPayload(payload)
        }
      } catch {
        if (!isMounted) return
        setRelayStatus('down')
      }
    }

    pollRelay()
    const poller = setInterval(pollRelay, POLL_INTERVAL_MS)

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'OSYLE_PING') pollRelay()
    }
    window.addEventListener('message', onMessage)

    return () => {
      isMounted = false
      clearInterval(poller)
      window.removeEventListener('message', onMessage)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
        backgroundColor: '#FAFAFA',
        gap: '16px',
        boxSizing: 'border-box',
      }}
    >
      {state === 'waiting' && (
        <>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366F1, #A259FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            <OsyleLogo />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#1F1F20',
                marginBottom: '6px',
              }}
            >
              Waiting for export…
            </div>
            <div
              style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}
            >
              Click the <strong>Figma</strong> button in Osyle
              <br />
              to send screens here.
            </div>
          </div>

          {lastExport && (
            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
              Last export: {lastExport}
            </div>
          )}

          {/* Relay status dot */}
          <div
            style={{
              fontSize: '11px',
              color: relayStatus === 'down' ? '#EF4444' : '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                display: 'inline-block',
                background:
                  relayStatus === 'up'
                    ? '#10B981'
                    : relayStatus === 'down'
                      ? '#EF4444'
                      : '#D1D5DB',
              }}
            />
            {relayStatus === 'up' && 'Relay connected · ready'}
            {relayStatus === 'down' && 'Run: node figma-relay.mjs'}
            {relayStatus === 'unknown' && 'Connecting to relay…'}
          </div>
        </>
      )}

      {state === 'sending' && (
        <>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366F1, #A259FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'spin 1s linear infinite',
            }}
          >
            <OsyleLogo />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#1F1F20',
                marginBottom: '6px',
              }}
            >
              Sending to Figma…
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              {screenCount} screen{screenCount !== 1 ? 's' : ''}
            </div>
          </div>
        </>
      )}

      {state === 'done' && (
        <>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0ACF83, #00A86B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#1F1F20',
                marginBottom: '6px',
              }}
            >
              Building in Figma!
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              {screenCount} screen{screenCount !== 1 ? 's' : ''} sent
              successfully
            </div>
          </div>
        </>
      )}

      {state === 'error' && (
        <>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #FF4D4F, #D9363E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            ⚠
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#1F1F20',
                marginBottom: '6px',
              }}
            >
              Something went wrong
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              Could not send to Figma.
            </div>
          </div>
          <button
            onClick={() => setState('waiting')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: '#1F1F20',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity:1; transform:scale(1); } 50% { opacity:0.75; transform:scale(0.93); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
    </div>
  )
}

function OsyleLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 38 57" fill="none">
      <path
        d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0Z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19Z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M0 9.5a9.5 9.5 0 0 0 9.5 9.5H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M0 28.5a9.5 9.5 0 0 0 9.5 9.5H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z"
        fill="white"
        fillOpacity="0.9"
      />
    </svg>
  )
}
