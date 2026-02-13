import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export default function BackEdge({
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
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#9CA3AF',
          strokeWidth: 3.5,
          strokeDasharray: '10 6',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />

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
                border: '2.5px solid #9CA3AF',
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
    </>
  )
}
