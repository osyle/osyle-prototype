/**
 * Auto-layout utility for flow graphs
 * Creates hierarchical layouts based on transitions/connections
 */

import type { FlowGraph, FlowScreen } from '../types/home.types'

/**
 * Calculate auto-layout positions for screens based on flow structure
 */
export function calculateFlowLayout(
  flowGraph: FlowGraph,
  deviceInfo: {
    platform: 'phone' | 'web'
    screen: { width: number; height: number }
  },
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()

  if (!flowGraph.screens.length) {
    return positions
  }

  // Build adjacency map (screen -> children)
  const adjacency = new Map<string, string[]>()
  flowGraph.screens.forEach(screen => {
    adjacency.set(screen.screen_id, [])
  })

  flowGraph.transitions.forEach(transition => {
    const children = adjacency.get(transition.from_screen_id) || []
    if (!children.includes(transition.to_screen_id)) {
      children.push(transition.to_screen_id)
    }
    adjacency.set(transition.from_screen_id, children)
  })

  // Find root nodes (entry screens or nodes with no incoming edges)
  const hasIncoming = new Set<string>()
  flowGraph.transitions.forEach(t => hasIncoming.add(t.to_screen_id))

  const roots: string[] = []
  flowGraph.screens.forEach(screen => {
    if (screen.screen_type === 'entry' || !hasIncoming.has(screen.screen_id)) {
      roots.push(screen.screen_id)
    }
  })

  if (roots.length === 0 && flowGraph.screens.length > 0) {
    // Fallback: use first screen as root
    roots.push(flowGraph.screens[0].screen_id)
  }

  // Calculate screen dimensions (including bezel/chrome)
  const getScreenDimensions = (screen: FlowScreen) => {
    const baseWidth = screen.dimensions?.width || deviceInfo.screen.width
    const baseHeight = screen.dimensions?.height || deviceInfo.screen.height

    return {
      width: deviceInfo.platform === 'phone' ? baseWidth + 24 : baseWidth,
      height:
        deviceInfo.platform === 'phone' ? baseHeight + 48 : baseHeight + 40,
    }
  }

  // Layout parameters
  const HORIZONTAL_SPACING = 200 // Space between columns
  const VERTICAL_SPACING = 100 // Space between rows
  const START_X = 100
  const START_Y = 100

  // Assign levels using BFS
  const levels = new Map<string, number>()
  const queue: Array<{ id: string; level: number }> = []
  const visited = new Set<string>()

  roots.forEach(rootId => {
    queue.push({ id: rootId, level: 0 })
    visited.add(rootId)
  })

  while (queue.length > 0) {
    const { id, level } = queue.shift()!
    levels.set(id, level)

    const children = adjacency.get(id) || []
    children.forEach(childId => {
      if (!visited.has(childId)) {
        visited.add(childId)
        queue.push({ id: childId, level: level + 1 })
      }
    })
  }

  // Handle any unvisited nodes (disconnected components)
  flowGraph.screens.forEach(screen => {
    if (!levels.has(screen.screen_id)) {
      levels.set(screen.screen_id, 0)
    }
  })

  // Group screens by level
  const screensByLevel = new Map<number, FlowScreen[]>()
  flowGraph.screens.forEach(screen => {
    const level = levels.get(screen.screen_id) || 0
    if (!screensByLevel.has(level)) {
      screensByLevel.set(level, [])
    }
    screensByLevel.get(level)!.push(screen)
  })

  // Calculate maximum screen height per level
  const maxHeightPerLevel = new Map<number, number>()
  screensByLevel.forEach((screens, level) => {
    const maxHeight = Math.max(
      ...screens.map(s => getScreenDimensions(s).height),
    )
    maxHeightPerLevel.set(level, maxHeight)
  })

  // Position screens level by level
  let currentX = START_X
  const sortedLevels = Array.from(screensByLevel.keys()).sort((a, b) => a - b)

  sortedLevels.forEach(level => {
    const screensInLevel = screensByLevel.get(level)!
    const maxWidth = Math.max(
      ...screensInLevel.map(s => getScreenDimensions(s).width),
    )

    // Calculate total height needed for this level
    const totalHeight = screensInLevel.reduce((sum, screen, idx) => {
      const dims = getScreenDimensions(screen)
      return sum + dims.height + (idx > 0 ? VERTICAL_SPACING : 0)
    }, 0)

    // Center the column vertically
    let currentY =
      START_Y - totalHeight / 2 + (maxHeightPerLevel.get(level) || 0) / 2

    screensInLevel.forEach(screen => {
      const dims = getScreenDimensions(screen)

      // Center screen horizontally in its column
      const x = currentX + (maxWidth - dims.width) / 2
      const y = currentY

      positions.set(screen.screen_id, { x, y })

      currentY += dims.height + VERTICAL_SPACING
    })

    // Move to next column
    currentX += maxWidth + HORIZONTAL_SPACING
  })

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
