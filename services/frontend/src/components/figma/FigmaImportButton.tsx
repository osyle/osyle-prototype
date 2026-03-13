/**
 * FigmaImportButton.tsx
 *
 * Placed in Stage 2 of Home. When clicked, arms the relay and polls
 * localhost:8765/figma-import-latest until the Figma plugin sends a frame.
 * On payload arrival it ACKs the relay and calls onImport with the frame data.
 *
 * States:
 *  idle     → "Import" button with Figma icon
 *  waiting  → spinner + "Waiting…"  (polling relay)
 *  done     → green check, auto-resets after 4s
 *  error    → red text, auto-resets after 6s
 *  relay_offline → relay not running
 */

import { useState, useEffect, useRef, useCallback } from 'react'

import { config } from '../../config/env'

const RELAY_BASE = config.relay.url
const POLL_MS = 800

type Stage = 'idle' | 'waiting' | 'done' | 'error' | 'relay_offline'

interface FigmaImportPayload {
  type: 'FIGMA_TO_OSYLE'
  token: string
  frameName: string
  figmaJson: Record<string, unknown>
  imagePng: string
}

interface FigmaImportButtonProps {
  onImport: (
    // eslint-disable-next-line no-unused-vars
    frameName: string,
    // eslint-disable-next-line no-unused-vars
    figmaJson: Record<string, unknown>,
    // eslint-disable-next-line no-unused-vars
    imagePng: string,
  ) => Promise<void>
  disabled?: boolean
}

function FigmaIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 57" fill="none">
      <path
        d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z"
        fill="#1ABCFE"
      />
      <path
        d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0Z"
        fill="#0ACF83"
      />
      <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19Z" fill="#FF7262" />
      <path
        d="M0 9.5a9.5 9.5 0 0 0 9.5 9.5H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z"
        fill="#F24E1E"
      />
      <path
        d="M0 28.5a9.5 9.5 0 0 0 9.5 9.5H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z"
        fill="#A259FF"
      />
    </svg>
  )
}

function Spinner({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 15"
      fill="none"
      style={{
        animation: 'figma-import-spin 0.75s linear infinite',
        flexShrink: 0,
      }}
    >
      <circle
        cx="7.5"
        cy="7.5"
        r="5.5"
        stroke="#6366F1"
        strokeWidth="2"
        strokeDasharray="20"
        strokeDashoffset="6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function FigmaImportButton({
  onImport,
  disabled = false,
}: FigmaImportButtonProps) {
  const [stage, setStage] = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef = useRef(false)

  // Auto-reset done/error
  useEffect(() => {
    if (stage === 'done') {
      const t = setTimeout(() => setStage('idle'), 4000)
      return () => clearTimeout(t)
    }
    if (stage === 'error' || stage === 'relay_offline') {
      const t = setTimeout(() => {
        setStage('idle')
        setErrorMsg('')
      }, 6000)
      return () => clearTimeout(t)
    }
  }, [stage])

  // Stop poller on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [])

  function stopPolling() {
    if (pollerRef.current) {
      clearInterval(pollerRef.current)
      pollerRef.current = null
    }
  }

  const poll = useCallback(async () => {
    if (cancelledRef.current) return
    try {
      const res = await fetch(`${RELAY_BASE}/figma-import-latest`, {
        signal: AbortSignal.timeout(2000),
      })
      if (cancelledRef.current) return

      if (res.status === 404) return // nothing yet, keep waiting

      if (!res.ok) return

      const payload: FigmaImportPayload = await res.json()
      if (payload?.type !== 'FIGMA_TO_OSYLE') return

      stopPolling()
      cancelledRef.current = true

      // ACK relay — remove from queue
      fetch(`${RELAY_BASE}/figma-import-ack/${payload.token}`, {
        method: 'POST',
      }).catch(() => {})

      setStage('done')

      // Hand off to parent — parent handles resource creation + DTR
      await onImport(payload.frameName, payload.figmaJson, payload.imagePng)
    } catch {
      // relay offline or timeout — stay in waiting, will retry
      if (cancelledRef.current) return
    }
  }, [onImport])

  const handleClick = useCallback(async () => {
    if (stage !== 'idle') {
      // Cancel waiting
      cancelledRef.current = true
      stopPolling()
      setStage('idle')
      return
    }

    // Check relay first
    try {
      const ping = await fetch(`${RELAY_BASE}/figma-ping`, {
        signal: AbortSignal.timeout(1500),
      })
      if (!ping.ok) throw new Error()
    } catch {
      setStage('relay_offline')
      setErrorMsg(
        config.isDevelopment
          ? 'Run: node figma-relay.mjs'
          : 'Connection failed — please refresh',
      )
      return
    }

    cancelledRef.current = false
    setStage('waiting')

    // Start polling
    poll()
    pollerRef.current = setInterval(poll, POLL_MS)
  }, [stage, poll])

  // ── Derived styles (matches FigmaExportButton aesthetic) ──────────────
  const btnBg =
    stage === 'done'
      ? '#EDFBF3'
      : stage === 'error' || stage === 'relay_offline'
        ? '#FFF2F0'
        : '#FFFFFF'

  const btnBorder =
    stage === 'done'
      ? '1px solid #0ACF83'
      : stage === 'error' || stage === 'relay_offline'
        ? '1px solid #FF4D4F'
        : stage === 'waiting'
          ? '1px solid #6366F1'
          : '1px solid rgba(0,0,0,0.06)'

  const labelColor =
    stage === 'done'
      ? '#0ACF83'
      : stage === 'error' || stage === 'relay_offline'
        ? '#FF4D4F'
        : stage === 'waiting'
          ? '#6366F1'
          : '#3B3B3B'

  const labelText =
    stage === 'waiting'
      ? 'Waiting…'
      : stage === 'done'
        ? 'Received!'
        : stage === 'error'
          ? 'Failed'
          : stage === 'relay_offline'
            ? 'Relay offline'
            : 'Import'

  const isClickable = !disabled

  return (
    <>
      <style>{`@keyframes figma-import-spin { to { transform: rotate(360deg) } }`}</style>
      <div
        role="button"
        tabIndex={isClickable ? 0 : -1}
        title={
          stage === 'waiting'
            ? 'Click to cancel — waiting for Figma plugin to send a frame'
            : stage === 'relay_offline'
              ? errorMsg
              : 'Import a frame from Figma into this taste'
        }
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={
          isClickable
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClick()
                }
              }
            : undefined
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          height: '30px',
          padding: '0 10px 0 8px',
          backgroundColor: btnBg,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          borderRadius: '8px',
          border: btnBorder,
          cursor: isClickable ? 'pointer' : 'not-allowed',
          opacity: !isClickable ? 0.45 : 1,
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
          fontSize: '13px',
          fontWeight: 500,
          color: labelColor,
          userSelect: 'none',
        }}
      >
        {/* Icon */}
        {stage === 'waiting' ? (
          <Spinner size={13} />
        ) : stage === 'done' ? (
          <svg
            width="13"
            height="13"
            viewBox="0 0 15 15"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M3 7.5L6.5 11L12 4"
              stroke="#0ACF83"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : stage === 'error' || stage === 'relay_offline' ? (
          <svg
            width="13"
            height="13"
            viewBox="0 0 15 15"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M7.5 2L13.5 13H1.5L7.5 2Z"
              stroke="#FF4D4F"
              strokeWidth="1.5"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M7.5 6v3.5M7.5 11v.5"
              stroke="#FF4D4F"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <FigmaIcon size={13} />
        )}

        <span style={{ letterSpacing: '-0.01em' }}>{labelText}</span>
      </div>
    </>
  )
}
