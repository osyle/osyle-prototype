import type { FlowTransition, Position } from '../types/home.types'

interface FlowConnectionsProps {
  transitions: FlowTransition[]
  screenPositions: Record<string, Position>
  screenDimensions: { width: number; height: number }
}

export default function FlowConnections({
  transitions,
  screenPositions,
  screenDimensions,
}: FlowConnectionsProps) {
  const getConnectionPath = (from: Position, to: Position) => {
    // Calculate connection points (center-right to center-left)
    const fromX = from.x + screenDimensions.width
    const fromY = from.y + screenDimensions.height / 2
    const toX = to.x
    const toY = to.y + screenDimensions.height / 2

    // Bezier curve control points
    const controlOffset = Math.abs(toX - fromX) * 0.5

    return `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`
  }

  const getColor = (flowType: string) => {
    switch (flowType) {
      case 'forward':
        return '#3B82F6' // Blue
      case 'back':
        return '#9CA3AF' // Gray
      case 'error':
        return '#EF4444' // Red
      case 'branch':
        return '#8B5CF6' // Purple
      case 'success':
        return '#10B981' // Green
      default:
        return '#6B7280'
    }
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <defs>
        {/* Arrow markers for each color */}
        {['forward', 'back', 'error', 'branch', 'success'].map(type => (
          <marker
            key={type}
            id={`arrowhead-${type}`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={getColor(type)} />
          </marker>
        ))}
      </defs>

      {transitions.map(transition => {
        const from = screenPositions[transition.from_screen_id]
        const to = screenPositions[transition.to_screen_id]

        if (!from || !to) return null

        const path = getConnectionPath(from, to)
        const color = getColor(transition.flow_type)
        const midX = (from.x + screenDimensions.width + to.x) / 2
        const midY = (from.y + to.y + screenDimensions.height) / 2

        return (
          <g key={transition.transition_id}>
            {/* Connection path */}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeDasharray={transition.flow_type === 'back' ? '5,5' : 'none'}
              markerEnd={`url(#arrowhead-${transition.flow_type})`}
            />

            {/* Label */}
            {transition.label && (
              <g>
                {/* Label background */}
                <rect
                  x={midX - 40}
                  y={midY - 12}
                  width="80"
                  height="24"
                  rx="4"
                  fill="white"
                  stroke={color}
                  strokeWidth="1.5"
                />

                {/* Label text */}
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="500"
                  fill={color}
                >
                  {transition.label}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
