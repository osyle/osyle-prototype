/**
 * Auto-layout utility for flow graphs
 *
 * Figma-style: screens are placed left-to-right in flow order,
 * so they never overlap regardless of height. Each screen renders
 * at its configured width and at whatever height its content needs.
 */

import type { FlowGraph } from '../types/home.types'

const HORIZONTAL_GAP = 120 // px gap between screens
const START_X = 100
const START_Y = 100

/**
 * Calculate positions: sort screens in BFS order from entry,
 * then place them left to right with a fixed gap.
 */
export function calculateFlowLayout(
  flowGraph: FlowGraph,
  deviceInfo: {
    screen: { width: number; height: number }
  },
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()

  if (!flowGraph.screens.length) return positions

  // Build BFS order starting from entry screen
  const adjacency = new Map<string, string[]>()
  flowGraph.screens.forEach(s => adjacency.set(s.screen_id, []))
  flowGraph.transitions.forEach(t => {
    const children = adjacency.get(t.from_screen_id) || []
    if (!children.includes(t.to_screen_id)) children.push(t.to_screen_id)
    adjacency.set(t.from_screen_id, children)
  })

  const hasIncoming = new Set<string>()
  flowGraph.transitions.forEach(t => hasIncoming.add(t.to_screen_id))

  // Find entry points
  const entryIds = flowGraph.screens
    .filter(s => s.screen_type === 'entry' || !hasIncoming.has(s.screen_id))
    .map(s => s.screen_id)

  if (entryIds.length === 0) entryIds.push(flowGraph.screens[0].screen_id)

  // BFS to get ordered list
  const visited = new Set<string>()
  const ordered: string[] = []
  const queue = [...entryIds]
  entryIds.forEach(id => visited.add(id))

  while (queue.length > 0) {
    const id = queue.shift()!
    ordered.push(id)
    const children = adjacency.get(id) || []
    for (const child of children) {
      if (!visited.has(child)) {
        visited.add(child)
        queue.push(child)
      }
    }
  }

  // Add any disconnected screens at the end
  flowGraph.screens.forEach(s => {
    if (!visited.has(s.screen_id)) ordered.push(s.screen_id)
  })

  // Place screens left to right
  let currentX = START_X
  for (const screenId of ordered) {
    const screen = flowGraph.screens.find(s => s.screen_id === screenId)
    const width = screen?.dimensions?.width ?? deviceInfo.screen.width
    positions.set(screenId, { x: currentX, y: START_Y })
    currentX += width + HORIZONTAL_GAP
  }

  return positions
}

/**
 * Update positions map with new values
 */
export function updatePosition(
  positions: Map<string, { x: number; y: number }>,
  screenId: string,
  x: number,
  y: number,
): Map<string, { x: number; y: number }> {
  const newPositions = new Map(positions)
  newPositions.set(screenId, { x, y })
  return newPositions
}
