import { useEffect, useRef, useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

// Screens complete at ~1/s on average; baseline assumes 45s for a typical flow.
// The time-creep component provides forward movement before any screen is done.
const BASELINE_MS = 45_000

// The display progress hard-caps at this until generation is truly complete,
// so the bar can never "lie" by reaching 100% before the websocket closes.
const STALL_CAP = 0.94

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  totalScreens: number
  completedScreens: number
  isVisible: boolean
  isRightPanelCollapsed: boolean
}

// ─── Hook: smooth asymptotic progress ────────────────────────────────────────

function useSmoothedProgress(
  completedScreens: number,
  totalScreens: number,
  isVisible: boolean,
) {
  const startTimeRef = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  // Displayed progress (0–1) animated smoothly via RAF
  const [displayProgress, setDisplayProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const prevTargetRef = useRef(0)

  const allDone = totalScreens > 0 && completedScreens >= totalScreens

  // Start / reset timer when bar becomes visible
  useEffect(() => {
    if (isVisible) {
      startTimeRef.current = Date.now()
      setElapsed(0)
      setDisplayProgress(0)
      prevTargetRef.current = 0
    }
  }, [isVisible])

  // Elapsed ticker
  useEffect(() => {
    if (!isVisible) return
    const id = setInterval(
      () => setElapsed(Date.now() - (startTimeRef.current ?? Date.now())),
      250,
    )
    return () => clearInterval(id)
  }, [isVisible])

  // Compute target progress from real signals
  useEffect(() => {
    if (!isVisible) return

    const screenFraction =
      totalScreens > 0 ? completedScreens / totalScreens : 0

    // Asymptotic time creep: moves quickly to ~12% then decelerates sharply.
    // Formula: cap * (1 - e^(-k*t)) where k is tuned for the decay speed.
    const t = elapsed / BASELINE_MS
    const timeCreep = 0.12 * (1 - Math.exp(-4 * t))

    // Screen signal dominates once screens start completing.
    // Scaled to max 0.88 so time-creep fills in the first segment.
    const screenContrib = screenFraction * 0.88

    const raw = Math.max(timeCreep, screenContrib)
    const target = allDone ? 1 : Math.min(raw, STALL_CAP)

    // Smooth the display value toward target via RAF lerp
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const animate = () => {
      setDisplayProgress(prev => {
        const diff = target - prev
        // Fast approach when moving forward, instant snap to 100%
        if (allDone && target === 1) return 1
        if (Math.abs(diff) < 0.001) return target
        // Ease toward target: faster when further away, eases in near target
        const step = diff * 0.08
        return prev + step
      })
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [elapsed, completedScreens, totalScreens, allDone, isVisible])

  return { displayProgress, elapsed, allDone }
}

// ─── Time label ───────────────────────────────────────────────────────────────

function useTimeLabel(
  elapsed: number,
  completedScreens: number,
  totalScreens: number,
  displayProgress: number,
  allDone: boolean,
): string {
  if (allDone) return 'Done!'
  if (displayProgress >= STALL_CAP - 0.02) return 'Almost there…'

  // Estimate remaining based on observed completion rate, fall back to baseline
  const remaining = totalScreens - completedScreens
  let estimatedMs: number

  if (completedScreens > 0 && elapsed > 2000) {
    const msPerScreen = elapsed / completedScreens
    estimatedMs = remaining * msPerScreen
    // Clamp: don't show absurdly long estimates
    estimatedMs = Math.min(estimatedMs, 120_000)
  } else {
    // Pure time-based guess before any screen completes
    estimatedMs = Math.max(BASELINE_MS - elapsed, 5000)
  }

  const secs = Math.ceil(estimatedMs / 1000)
  if (secs >= 60) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `~${m}m ${s > 0 ? `${s}s` : ''} left`
  }
  return `~${secs}s left`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GenerationProgressBar({
  totalScreens,
  completedScreens,
  isVisible,
  isRightPanelCollapsed,
}: Props) {
  const { displayProgress, elapsed, allDone } = useSmoothedProgress(
    completedScreens,
    totalScreens,
    isVisible,
  )

  const timeLabel = useTimeLabel(
    elapsed,
    completedScreens,
    totalScreens,
    displayProgress,
    allDone,
  )

  // Fade out after completion
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    if (isVisible) {
      setIsMounted(true)
    } else {
      // Keep mounted briefly so the 100% animation plays before unmounting
      const t = setTimeout(() => setIsMounted(false), 800)
      return () => clearTimeout(t)
    }
  }, [isVisible])

  if (!isMounted) return null

  const barWidth = `${(displayProgress * 100).toFixed(2)}%`

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '100px',
          left: '80px',
          right: isRightPanelCollapsed ? '80px' : 'calc(28% + 40px)',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 45,
          pointerEvents: 'none',
          transition: 'right 0.3s ease',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            boxShadow:
              '0 2px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.06)',
            padding: '10px 16px 12px',
            minWidth: '320px',
            maxWidth: '460px',
            width: '100%',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(-6px)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}
        >
          {/* Top row: status text + counters */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            {/* Left: status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              {/* Pulse dot */}
              {!allDone && (
                <div style={{ position: 'relative', width: 8, height: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667EEA, #764BA2)',
                      position: 'absolute',
                    }}
                  />
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'rgba(102, 126, 234, 0.5)',
                      position: 'absolute',
                      animation: 'pgbar-ping 1.4s ease-out infinite',
                    }}
                  />
                </div>
              )}
              {allDone && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="7" fill="#10B981" />
                  <path
                    d="M4 7l2 2 4-4"
                    stroke="white"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: allDone ? '#10B981' : '#1F1F20',
                  fontFamily: 'system-ui, sans-serif',
                  letterSpacing: '-0.01em',
                }}
              >
                {allDone
                  ? 'Screens ready'
                  : completedScreens === 0
                    ? 'Generating screens…'
                    : `Generating screens…`}
              </span>
            </div>

            {/* Right: counter + time */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {totalScreens > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#929397',
                    fontFamily: 'system-ui, sans-serif',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {completedScreens}/{totalScreens}
                </span>
              )}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: allDone ? '#10B981' : '#667EEA',
                  fontFamily: 'system-ui, sans-serif',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '68px',
                  textAlign: 'right',
                  transition: 'color 0.3s ease',
                }}
              >
                {timeLabel}
              </span>
            </div>
          </div>

          {/* Progress track */}
          <div
            style={{
              height: '5px',
              borderRadius: '999px',
              backgroundColor: 'rgba(102, 126, 234, 0.10)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Fill */}
            <div
              style={{
                height: '100%',
                width: barWidth,
                borderRadius: '999px',
                background: allDone
                  ? 'linear-gradient(90deg, #10B981, #34D399)'
                  : 'linear-gradient(90deg, #667EEA, #9B59B6, #764BA2)',
                transition: allDone
                  ? 'width 0.4s cubic-bezier(0.4,0,0.2,1), background 0.4s ease'
                  : 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Shimmer sweep */}
              {!allDone && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'pgbar-shimmer 1.8s linear infinite',
                  }}
                />
              )}
            </div>

            {/* Stall pulse overlay when close to cap */}
            {!allDone && displayProgress >= STALL_CAP - 0.03 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '30%',
                  height: '100%',
                  background:
                    'linear-gradient(90deg, transparent, rgba(102,126,234,0.15))',
                  animation: 'pgbar-breathe 2s ease-in-out infinite',
                }}
              />
            )}
          </div>

          {/* Screen pills row */}
          {totalScreens > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '4px',
                marginTop: '8px',
                flexWrap: 'wrap',
              }}
            >
              {Array.from({ length: totalScreens }).map((_, i) => {
                const done = i < completedScreens
                return (
                  <div
                    key={i}
                    style={{
                      height: '3px',
                      flex: '1 1 0',
                      minWidth: '12px',
                      borderRadius: '999px',
                      backgroundColor: done ? undefined : 'rgba(0,0,0,0.07)',
                      background: done
                        ? 'linear-gradient(90deg, #667EEA, #764BA2)'
                        : undefined,
                      transition:
                        'background 0.4s ease, background-color 0.4s ease',
                      animation:
                        !done && i === completedScreens
                          ? 'pgbar-breathe 1.5s ease-in-out infinite'
                          : undefined,
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes pgbar-ping {
          0%   { transform: scale(1);   opacity: 0.8; }
          80%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes pgbar-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes pgbar-breathe {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1;   }
        }
      `}</style>
    </>
  )
}
