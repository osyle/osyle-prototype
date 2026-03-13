/**
 * FigmaExportButton.tsx
 *
 * States:
 *  idle        → "Figma" button, opens scope menu (current / all screens)
 *  exporting   → spinner + progress label
 *  launching   → "Opening Figma…" with cancel-able wait
 *  not_installed → install prompt modal with deep link to Figma Community
 *  done        → green checkmark, auto-resets
 *  error       → red error, auto-resets
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  exportScreensToFigma,
  launchFigmaPlugin,
  FIGMA_COMMUNITY_URL,
} from '../../services/figmaExport'
import type { FlowGraph } from '../../types/home.types'

interface FigmaExportButtonProps {
  flowGraph: FlowGraph | null
  selectedScreenId?: string | null
  disabled?: boolean
}

type Stage =
  | 'idle'
  | 'exporting' // rendering iframes + extracting DOM
  | 'launching' // payload posted, waiting for plugin ACK
  | 'not_installed' // relay running, plugin not open
  | 'relay_offline' // relay server not running
  | 'done'
  | 'error'

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
      style={{ animation: 'osyle-spin 0.75s linear infinite', flexShrink: 0 }}
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

export default function FigmaExportButton({
  flowGraph,
  selectedScreenId,
  disabled = false,
}: FigmaExportButtonProps) {
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const cancelRef = useRef(false)

  // Auto-reset done/error states
  useEffect(() => {
    if (stage === 'done') {
      const t = setTimeout(() => setStage('idle'), 4000)
      return () => clearTimeout(t)
    }
    if (stage === 'error') {
      const t = setTimeout(() => {
        setStage('idle')
        setErrorMsg('')
      }, 6000)
      return () => clearTimeout(t)
    }
  }, [stage])

  const runExport = useCallback(
    async (exportAll: boolean) => {
      if (!flowGraph) return
      cancelRef.current = false
      setShowMenu(false)
      setStage('exporting')
      setErrorMsg('')
      setProgress('')

      try {
        const screenIds = exportAll
          ? flowGraph.screens.map(s => s.screen_id)
          : selectedScreenId
            ? [selectedScreenId]
            : flowGraph.screens.slice(0, 1).map(s => s.screen_id)

        if (screenIds.length === 0) {
          setErrorMsg('No screens to export')
          setStage('error')
          return
        }

        const payload = await exportScreensToFigma(flowGraph, screenIds, {
          onProgress: msg => setProgress(msg),
        })

        if (cancelRef.current) return

        // Phase 2: launch Figma
        setStage('launching')
        setProgress(
          `Opening Figma for ${payload.screens.length} screen${payload.screens.length !== 1 ? 's' : ''}…`,
        )

        const result = await launchFigmaPlugin(payload)

        if (cancelRef.current) return

        if (result === 'launched') {
          setStage('done')
          setProgress(
            `${payload.screens.length} screen${payload.screens.length !== 1 ? 's' : ''} sent to Figma!`,
          )
        } else if (result === 'relay_not_running') {
          setStage('relay_offline')
        } else {
          // Plugin not open in Figma
          setStage('not_installed')
        }
      } catch (e) {
        if (cancelRef.current) return
        setErrorMsg(e instanceof Error ? e.message : 'Export failed')
        setStage('error')
      }
    },
    [flowGraph, selectedScreenId],
  )

  const handleCancel = () => {
    cancelRef.current = true
    setStage('idle')
    setProgress('')
  }

  const screenCount = flowGraph?.screens?.filter(s => !s.ui_loading).length || 0
  const canExport = !disabled && stage === 'idle' && screenCount > 0

  // ── Derived display values ─────────────────────────────────────────────────
  const btnBg =
    stage === 'done' ? '#EDFBF3' : stage === 'error' ? '#FFF2F0' : '#FFFFFF'

  const btnBorder =
    stage === 'done'
      ? '1px solid #0ACF83'
      : stage === 'error'
        ? '1px solid #FF4D4F'
        : '1px solid rgba(0,0,0,0.06)'

  const labelColor =
    stage === 'done' ? '#0ACF83' : stage === 'error' ? '#FF4D4F' : '#3B3B3B'

  const labelText =
    stage === 'exporting'
      ? 'Exporting…'
      : stage === 'launching'
        ? 'Opening…'
        : stage === 'done'
          ? 'Sent!'
          : stage === 'error'
            ? 'Failed'
            : 'Figma'

  const showChevron = stage === 'idle' && screenCount > 1 && !!selectedScreenId

  return (
    <>
      <style>{`
        @keyframes osyle-spin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ position: 'relative' }}>
        {/* ── Main button ───────────────────────────────────────────────── */}
        <button
          disabled={!canExport && stage === 'idle'}
          onClick={() => {
            if (stage === 'exporting' || stage === 'launching') return
            if (stage === 'not_installed') {
              setStage('not_installed')
              return
            }
            if (screenCount <= 1 || !selectedScreenId) runExport(true)
            else setShowMenu(v => !v)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            height: '40px',
            padding: '0 14px 0 10px',
            backgroundColor: btnBg,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderRadius: '12px',
            border: btnBorder,
            cursor: canExport
              ? 'pointer'
              : stage === 'idle'
                ? 'not-allowed'
                : 'default',
            opacity: stage === 'idle' && !canExport ? 0.45 : 1,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
        >
          {/* Icon */}
          {stage === 'exporting' || stage === 'launching' ? (
            <Spinner />
          ) : stage === 'done' ? (
            <svg
              width="15"
              height="15"
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
          ) : stage === 'error' ? (
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <circle
                cx="7.5"
                cy="7.5"
                r="6"
                stroke="#FF4D4F"
                strokeWidth="1.5"
              />
              <path
                d="M7.5 4.5V8"
                stroke="#FF4D4F"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="7.5" cy="10.5" r="0.75" fill="#FF4D4F" />
            </svg>
          ) : (
            <div style={{ flexShrink: 0 }}>
              <FigmaIcon />
            </div>
          )}

          {/* Label */}
          <span
            style={{ fontSize: '13px', fontWeight: 500, color: labelColor }}
          >
            {labelText}
          </span>

          {/* Chevron */}
          {showChevron && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              style={{ flexShrink: 0, marginLeft: '-2px' }}
            >
              <path
                d="M2.5 4L5 6.5L7.5 4"
                stroke="#9CA3AF"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* ── Progress tooltip ─────────────────────────────────────────── */}
        {(stage === 'exporting' || stage === 'launching') && progress && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '8px',
              backgroundColor: '#1F1F20',
              color: '#F4F4F4',
              fontSize: '11px',
              padding: '6px 12px',
              borderRadius: '7px',
              whiteSpace: 'nowrap',
              zIndex: 100,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{progress}</span>
            <button
              onClick={handleCancel}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#F4F4F4',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                lineHeight: 1.4,
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Error tooltip ────────────────────────────────────────────── */}
        {stage === 'error' && errorMsg && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '8px',
              backgroundColor: '#FFF2F0',
              color: '#FF4D4F',
              fontSize: '11px',
              padding: '6px 12px',
              borderRadius: '7px',
              border: '1px solid #FFCCC7',
              zIndex: 100,
              pointerEvents: 'none',
              maxWidth: '240px',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* ── Scope menu (current / all screens) ──────────────────────── */}
        {showMenu && stage === 'idle' && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 98 }}
              onClick={() => setShowMenu(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '6px',
                backgroundColor: '#FFF',
                borderRadius: '14px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.06)',
                overflow: 'hidden',
                zIndex: 99,
                minWidth: '210px',
              }}
            >
              <div
                style={{
                  padding: '10px 14px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Export to Figma
              </div>

              {/* Current screen */}
              <MenuRow
                icon={
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect
                      x="1"
                      y="1"
                      width="12"
                      height="12"
                      rx="2"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                    />
                  </svg>
                }
                label="Current screen"
                sub="Export selected screen only"
                onClick={() => {
                  setShowMenu(false)
                  runExport(false)
                }}
              />

              <div
                style={{
                  height: '1px',
                  backgroundColor: '#F3F3F3',
                  margin: '0 10px',
                }}
              />

              {/* All screens */}
              <MenuRow
                icon={
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect
                      x="1"
                      y="1"
                      width="5.5"
                      height="5.5"
                      rx="1"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="7.5"
                      y="1"
                      width="5.5"
                      height="5.5"
                      rx="1"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="1"
                      y="7.5"
                      width="5.5"
                      height="5.5"
                      rx="1"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="7.5"
                      y="7.5"
                      width="5.5"
                      height="5.5"
                      rx="1"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                    />
                  </svg>
                }
                label={`All screens (${screenCount})`}
                sub="Export entire flow"
                onClick={() => {
                  setShowMenu(false)
                  runExport(true)
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Not-installed modal — portaled to body so position:fixed is unclipped ── */}
      {stage === 'not_installed' &&
        ReactDOM.createPortal(
          <NotInstalledModal
            onClose={() => setStage('idle')}
            onRetry={() => {
              setStage('idle')
              setTimeout(() => runExport(true), 100)
            }}
          />,
          document.body,
        )}

      {/* ── Relay offline modal ── */}
      {stage === 'relay_offline' &&
        ReactDOM.createPortal(
          <RelayOfflineModal
            onClose={() => setStage('idle')}
            onRetry={() => {
              setStage('idle')
              setTimeout(() => runExport(true), 100)
            }}
          />,
          document.body,
        )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MenuRow({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 14px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        color: '#3B3B3B',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: hover ? '#F9F9F9' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 500, lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>
          {sub}
        </div>
      </div>
    </button>
  )
}

function NotInstalledModal({
  onClose,
  onRetry,
}: {
  onClose: () => void
  onRetry: () => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 201,
          width: '360px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          padding: '28px 28px 24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            border: 'none',
            background: '#F3F4F6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="#6B7280"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Icon */}
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #F24E1E 0%, #A259FF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 38 57" fill="none">
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
        </div>

        {/* Copy */}
        <div
          style={{
            fontSize: '17px',
            fontWeight: 700,
            color: '#1F1F20',
            marginBottom: '8px',
          }}
        >
          Open the Osyle plugin in Figma
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#6B7280',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          The Osyle plugin needs to be open in Figma before you export. Keep it
          open and it will receive screens automatically.
        </div>

        {/* Steps */}
        <div
          style={{
            background: '#F9F9F9',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {[
            ['1', 'Open Figma and run the Osyle plugin'],
            ['2', 'Keep the plugin panel open — it listens for exports'],
            ['3', 'Come back here and click Retry'],
          ].map(([num, text]) => (
            <div
              key={num}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  backgroundColor: '#6366F1',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                {num}
              </div>
              <span
                style={{ fontSize: '13px', color: '#3B3B3B', lineHeight: 1.5 }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <a
            href={FIGMA_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '13px',
              borderRadius: '11px',
              background: '#1F1F20',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="16" height="16" viewBox="0 0 38 57" fill="none">
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
            Get the Osyle plugin (free)
          </a>

          <button
            onClick={onRetry}
            style={{
              padding: '12px',
              borderRadius: '11px',
              border: '1px solid #E5E7EB',
              background: 'white',
              fontSize: '14px',
              fontWeight: 500,
              color: '#3B3B3B',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F9F9F9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            Plugin is open — Retry
          </button>
        </div>
      </div>
    </>
  )
}

function RelayOfflineModal({
  onClose,
  onRetry,
}: {
  onClose: () => void
  onRetry: () => void
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 201,
          width: '360px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          padding: '28px 28px 24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            border: 'none',
            background: '#F3F4F6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="#6B7280"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366F1, #A259FF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
            fontSize: '26px',
          }}
        >
          🔌
        </div>

        <div
          style={{
            fontSize: '17px',
            fontWeight: 700,
            color: '#1F1F20',
            marginBottom: '8px',
          }}
        >
          Start the relay server
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#6B7280',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          Osyle uses a tiny local server to pass screens to Figma. Run this once
          in your terminal alongside Vite:
        </div>

        <div
          style={{
            background: '#1F1F20',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#A5F3A5',
            letterSpacing: '0.02em',
          }}
        >
          node figma-relay.mjs
        </div>

        <div
          style={{
            fontSize: '12px',
            color: '#9CA3AF',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}
        >
          The file is in your project root. It runs on port 8765 and requires no
          dependencies — just Node.js.
        </div>

        <button
          onClick={onRetry}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '11px',
            background: '#1F1F20',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Relay is running — Retry
        </button>
      </div>
    </>
  )
}
