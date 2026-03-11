import { EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlowType = 'forward' | 'back' | 'branch' | 'success' | 'error'

const EDGE_COLORS: Record<FlowType, string> = {
  forward: '#60A5FA',
  back: '#9CA3AF',
  branch: '#A78BFA',
  success: '#34D399',
  error: '#F87171',
}

export interface ScreenEdgeData extends Record<string, unknown> {
  flowType: FlowType
  highwayY: number
}

// ─── Path builder ─────────────────────────────────────────────────────────────
//
// All screens sit on a single horizontal row. Edges travel:
//   source top-center → up to highwayY → across → down to target top-center
//
// This keeps every edge in empty canvas space above the nodes — no overlap,
// no z-index tricks needed.

const CORNER_RADIUS = 20

function buildHighwayPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  highwayY: number,
): string {
  const dx = targetX - sourceX

  // Self-loop or identical X: small arc above the node
  if (Math.abs(dx) < 4) {
    const offset = 40
    return [
      `M ${sourceX} ${sourceY}`,
      `C ${sourceX - offset} ${highwayY} ${targetX + offset} ${highwayY} ${targetX} ${targetY}`,
    ].join(' ')
  }

  const goRight = dx > 0
  const hDir = goRight ? 1 : -1

  // Clamp corner radius so it never overshoots on very close screens
  const r = Math.min(CORNER_RADIUS, Math.abs(dx) / 2)

  return [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceX} ${highwayY + r}`,
    `Q ${sourceX} ${highwayY} ${sourceX + hDir * r} ${highwayY}`,
    `L ${targetX - hDir * r} ${highwayY}`,
    `Q ${targetX} ${highwayY} ${targetX} ${highwayY + r}`,
    `L ${targetX} ${targetY}`,
  ].join(' ')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScreenEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  data,
}: EdgeProps) {
  const edgeData = (data ?? {}) as ScreenEdgeData
  const flowType: FlowType = edgeData.flowType ?? 'forward'
  const highwayY: number = edgeData.highwayY ?? sourceY - 80

  const color = EDGE_COLORS[flowType]
  const isDashed = flowType === 'back'
  const isAnimated = flowType === 'forward'

  const path = buildHighwayPath(sourceX, sourceY, targetX, targetY, highwayY)

  // Unique marker id per edge so colors don't bleed between edges
  const markerId = `arrow-${id}`

  // Label centered in the vertical descent between highway and target node top.
  // Midpoint of highwayY → targetY keeps it equidistant from the turn and the screen.
  const labelX = targetX
  const labelY = (highwayY + targetY) / 2

  return (
    <>
      {/* Arrow marker definition, colored to match this edge */}
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={color} />
        </marker>
      </defs>

      {/* Main path */}
      <path
        id={id}
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isDashed ? '10 6' : undefined}
        markerEnd={`url(#${markerId})`}
      />

      {/* Animated flow shimmer for forward transitions */}
      {isAnimated && (
        <path
          d={path}
          fill="none"
          stroke="white"
          strokeWidth={2}
          opacity={0.35}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="20 20"
          style={{ animation: 'screenEdgeDash 1.5s linear infinite' }}
          pointerEvents="none"
        />
      )}

      {/* Label pinned above the horizontal highway segment */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(10, 10, 10, 0.97)',
                border: `2px solid ${color}`,
                borderRadius: '8px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'white',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '0.3px',
                boxShadow: `0 4px 14px rgba(0, 0, 0, 0.4), 0 0 0 1px ${color}22`,
                whiteSpace: 'nowrap',
              }}
            >
              {String(label)}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      <style>{`
        @keyframes screenEdgeDash {
          to { stroke-dashoffset: -40; }
        }
      `}</style>
    </>
  )
}
