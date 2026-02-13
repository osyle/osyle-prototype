import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export default function ForwardEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      {/* Base path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#60A5FA',
          strokeWidth: 3.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />

      {/* Animated flow indicator */}
      <path
        d={edgePath}
        fill="none"
        stroke="white"
        strokeWidth="2"
        opacity="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="20 20"
        style={{
          animation: 'dash 1.5s linear infinite',
        }}
      />

      {/* Label */}
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
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                border: '2.5px solid #60A5FA',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'white',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '0.3px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -40;
          }
        }
      `}</style>
    </>
  )
}
