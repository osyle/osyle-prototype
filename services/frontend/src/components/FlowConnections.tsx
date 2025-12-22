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
  // Group transitions by from-to pair to detect multiple connections
  const connectionGroups: Record<string, FlowTransition[]> = {}
  transitions.forEach(t => {
    const key = `${t.from_screen_id}->${t.to_screen_id}`
    if (!connectionGroups[key]) connectionGroups[key] = []
    connectionGroups[key].push(t)
  })

  const getConnectionPoints = (
    from: Position,
    to: Position,
    transitionIndex: number,
    totalInGroup: number,
  ) => {
    // Calculate screen centers
    const fromCenterX = from.x + screenDimensions.width / 2
    const fromCenterY = from.y + screenDimensions.height / 2
    const toCenterX = to.x + screenDimensions.width / 2
    const toCenterY = to.y + screenDimensions.height / 2

    // Offset for multiple connections (stagger vertically or horizontally)
    const offsetStep = 40
    const totalOffset = (totalInGroup - 1) * offsetStep
    const currentOffset = transitionIndex * offsetStep - totalOffset / 2

    let fromX: number, fromY: number, toX: number, toY: number

    // Determine primary direction based on relative positions
    const deltaX = toCenterX - fromCenterX
    const deltaY = toCenterY - fromCenterY
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY)

    if (isHorizontal) {
      // Horizontal flow
      if (deltaX > 0) {
        // Left to right: from right edge to left edge
        fromX = from.x + screenDimensions.width + 10 // Add small gap
        toX = to.x - 10
        fromY = fromCenterY + currentOffset
        toY = toCenterY + currentOffset
      } else {
        // Right to left: from left edge to right edge
        fromX = from.x - 10
        toX = to.x + screenDimensions.width + 10
        fromY = fromCenterY + currentOffset
        toY = toCenterY + currentOffset
      }
    } else {
      // Vertical flow
      if (deltaY > 0) {
        // Top to bottom: from bottom edge to top edge
        fromY = from.y + screenDimensions.height + 10
        toY = to.y - 10
        fromX = fromCenterX + currentOffset
        toX = toCenterX + currentOffset
      } else {
        // Bottom to top: from top edge to bottom edge
        fromY = from.y - 10
        toY = to.y + screenDimensions.height + 10
        fromX = fromCenterX + currentOffset
        toX = toCenterX + currentOffset
      }
    }

    return { fromX, fromY, toX, toY }
  }

  const getConnectionPath = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) => {
    const dx = toX - fromX
    const dy = toY - fromY

    // Calculate control points that curve around screens
    const isHorizontal = Math.abs(dx) > Math.abs(dy)

    if (isHorizontal) {
      // Horizontal curve - control points extend horizontally
      const controlDist = Math.abs(dx) * 0.5
      const cp1x = fromX + (dx > 0 ? controlDist : -controlDist)
      const cp1y = fromY
      const cp2x = toX - (dx > 0 ? controlDist : -controlDist)
      const cp2y = toY

      return `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`
    } else {
      // Vertical curve - control points extend vertically
      const controlDist = Math.abs(dy) * 0.5
      const cp1x = fromX
      const cp1y = fromY + (dy > 0 ? controlDist : -controlDist)
      const cp2x = toX
      const cp2y = toY - (dy > 0 ? controlDist : -controlDist)

      return `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`
    }
  }

  const getColor = (flowType: string) => {
    switch (flowType) {
      case 'forward':
        return '#60A5FA' // Brighter Blue
      case 'back':
        return '#9CA3AF' // Gray
      case 'error':
        return '#F87171' // Brighter Red
      case 'branch':
        return '#A78BFA' // Brighter Purple
      case 'success':
        return '#34D399' // Brighter Green
      default:
        return '#9CA3AF'
    }
  }

  const getLabelPosition = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) => {
    // Calculate position at 50% along the bezier curve
    const dx = toX - fromX
    const dy = toY - fromY
    const isHorizontal = Math.abs(dx) > Math.abs(dy)

    if (isHorizontal) {
      const controlDist = Math.abs(dx) * 0.5
      const cp1x = fromX + (dx > 0 ? controlDist : -controlDist)
      const cp2x = toX - (dx > 0 ? controlDist : -controlDist)

      // Approximate midpoint on bezier curve
      const t = 0.5
      const x =
        Math.pow(1 - t, 3) * fromX +
        3 * Math.pow(1 - t, 2) * t * cp1x +
        3 * (1 - t) * Math.pow(t, 2) * cp2x +
        Math.pow(t, 3) * toX
      const y =
        Math.pow(1 - t, 3) * fromY +
        3 * Math.pow(1 - t, 2) * t * fromY +
        3 * (1 - t) * Math.pow(t, 2) * toY +
        Math.pow(t, 3) * toY

      return { x, y }
    } else {
      const controlDist = Math.abs(dy) * 0.5
      const cp1y = fromY + (dy > 0 ? controlDist : -controlDist)
      const cp2y = toY - (dy > 0 ? controlDist : -controlDist)

      // Approximate midpoint on bezier curve
      const t = 0.5
      const x =
        Math.pow(1 - t, 3) * fromX +
        3 * Math.pow(1 - t, 2) * t * fromX +
        3 * (1 - t) * Math.pow(t, 2) * toX +
        Math.pow(t, 3) * toX
      const y =
        Math.pow(1 - t, 3) * fromY +
        3 * Math.pow(1 - t, 2) * t * cp1y +
        3 * (1 - t) * Math.pow(t, 2) * cp2y +
        Math.pow(t, 3) * toY

      return { x, y }
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
            markerWidth="14"
            markerHeight="14"
            refX="13"
            refY="7"
            orient="auto"
          >
            <polygon points="0 0, 14 7, 0 14" fill={getColor(type)} />
          </marker>
        ))}
      </defs>

      {Object.entries(connectionGroups).map(([, groupTransitions]) => {
        return groupTransitions.map((transition, index) => {
          const from = screenPositions[transition.from_screen_id]
          const to = screenPositions[transition.to_screen_id]

          if (!from || !to) return null

          const { fromX, fromY, toX, toY } = getConnectionPoints(
            from,
            to,
            index,
            groupTransitions.length,
          )
          const path = getConnectionPath(fromX, fromY, toX, toY)
          const color = getColor(transition.flow_type)
          const labelPos = getLabelPosition(fromX, fromY, toX, toY)

          return (
            <g key={`${transition.transition_id}-${index}`}>
              {/* Base connection path */}
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="3.5"
                strokeDasharray={
                  transition.flow_type === 'back' ? '10,6' : 'none'
                }
                markerEnd={`url(#arrowhead-${transition.flow_type})`}
                opacity="0.9"
                strokeLinecap="round"
              />

              {/* Animated flow indicator */}
              {transition.flow_type === 'forward' && (
                <path
                  d={path}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.5"
                  strokeLinecap="round"
                  strokeDasharray="20 20"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="40"
                    to="0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </path>
              )}

              {/* Label with improved positioning and styling */}
              {transition.label && (
                <g>
                  {/* Shadow for depth */}
                  <rect
                    x={labelPos.x - 50}
                    y={labelPos.y - 16}
                    width="100"
                    height="32"
                    rx="8"
                    fill="rgba(0, 0, 0, 0.2)"
                    filter="blur(3px)"
                  />

                  {/* Label background */}
                  <rect
                    x={labelPos.x - 50}
                    y={labelPos.y - 16}
                    width="100"
                    height="32"
                    rx="8"
                    fill="rgba(0, 0, 0, 0.95)"
                    stroke={color}
                    strokeWidth="2.5"
                  />

                  {/* Label text */}
                  <text
                    x={labelPos.x}
                    y={labelPos.y + 6}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill="white"
                    style={{
                      fontFamily: 'system-ui, sans-serif',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {transition.label}
                  </text>
                </g>
              )}
            </g>
          )
        })
      })}
    </svg>
  )
}
