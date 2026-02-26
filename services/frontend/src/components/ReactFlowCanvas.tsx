import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
  useReactFlow,
} from '@xyflow/react'
import type { Node, Edge, Connection, OnNodesChange } from '@xyflow/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import '@xyflow/react/dist/style.css'
import type { FlowGraph, Project } from '../types/home.types'

import BackEdge from './edges/BackEdge'
import BranchEdge from './edges/BranchEdge'
import ErrorEdge from './edges/ErrorEdge'
import ForwardEdge from './edges/ForwardEdge'
import SuccessEdge from './edges/SuccessEdge'
import ScreenNode from './nodes/ScreenNode'
import type { ScreenNodeData } from './nodes/ScreenNode'

interface ReactFlowCanvasProps {
  flowGraph: FlowGraph
  selectedScreenId: string | null
  // eslint-disable-next-line no-unused-vars
  onScreenSelect: (id: string | null) => void
  screenCheckpoints: Record<string, string>
  screenSizes: Map<string, { width: number; height: number }>
  screenPositions: Map<string, { x: number; y: number }>
  // eslint-disable-next-line no-unused-vars
  onScreenResize: (id: string, width: number, height: number) => void
  // eslint-disable-next-line no-unused-vars
  onScreenMove: (id: string, x: number, y: number) => void
  currentIteratingScreenId: string | null
  deviceInfo: {
    screen: { width: number; height: number }
  }
  project: Project
  // eslint-disable-next-line no-unused-vars
  onVariationRequest?: (data: {
    element: string
    elementPath: string
    elementText: string
    elementType: 'leaf' | 'container'
    screenId: string
    screenName: string
  }) => void
}

const nodeTypes = {
  screen: ScreenNode,
}

const edgeTypes = {
  forward: ForwardEdge,
  back: BackEdge,
  error: ErrorEdge,
  branch: BranchEdge,
  success: SuccessEdge,
}

function FlowController() {
  const { fitView } = useReactFlow()

  useEffect(() => {
    const handleFocusScreen = (event: Event) => {
      const { screenId } = (event as CustomEvent<{ screenId: string }>).detail
      fitView({
        nodes: [{ id: screenId }],
        duration: 400,
        padding: 0.6,
      })
    }

    window.addEventListener('focusScreen', handleFocusScreen)
    return () => window.removeEventListener('focusScreen', handleFocusScreen)
  }, [fitView])

  return null
}

export default function ReactFlowCanvas({
  flowGraph,
  selectedScreenId,
  onScreenSelect,
  screenCheckpoints,
  screenSizes,
  screenPositions,
  onScreenResize,
  onScreenMove,
  currentIteratingScreenId,
  deviceInfo,
  project,
  onVariationRequest,
}: ReactFlowCanvasProps) {
  // Track annotation mode via global flag
  const [isAnnotationMode, setIsAnnotationMode] = useState(false)

  // Poll for annotation mode changes
  useEffect(() => {
    const checkAnnotationMode = () => {
      const active =
        (window as Window & { __annotationModeActive?: boolean })
          .__annotationModeActive || false
      setIsAnnotationMode(active)
    }

    // Check immediately
    checkAnnotationMode()

    // Check periodically
    const interval = setInterval(checkAnnotationMode, 100)

    return () => clearInterval(interval)
  }, [])
  // Convert screens to React Flow nodes
  const initialNodes: Node[] = useMemo(
    () =>
      flowGraph.screens.map(screen => {
        const pos = screenPositions.get(screen.screen_id) || { x: 0, y: 0 }
        const size = screenSizes.get(screen.screen_id) || {
          width: deviceInfo.screen.width,
          height: deviceInfo.screen.height,
        }

        // Node width matches configured screen width; height is auto-measured
        const displayWidth = size.width

        const nodeData: ScreenNodeData = {
          screen,
          checkpoint: screenCheckpoints[screen.screen_id],
          isSelected: selectedScreenId === screen.screen_id,
          isEntry: screen.screen_type === 'entry',
          isIterating: currentIteratingScreenId === screen.screen_id,
          isGenerating: screenCheckpoints[screen.screen_id] !== undefined,
          deviceInfo,
          project,
          flowGraph, // NEW: Pass flowGraph for unified project access
          actualScreenSize: size, // Pass the actual screen size for this node
          onVariationRequest,
        }

        return {
          id: screen.screen_id,
          type: 'screen',
          position: pos,
          data: nodeData as Record<string, unknown>,
          selected: selectedScreenId === screen.screen_id,
          width: displayWidth,
          // height intentionally omitted — React Flow measures actual DOM height
          // so tall content screens expand naturally without clipping
          draggable: selectedScreenId !== screen.screen_id && !isAnnotationMode,
          selectable: true,
        }
      }),
    [
      flowGraph, // NEW: Include entire flowGraph for unified project
      screenPositions,
      screenSizes,
      selectedScreenId,
      screenCheckpoints,
      currentIteratingScreenId,
      deviceInfo,
      project,
      isAnnotationMode,
      onVariationRequest,
    ],
  )

  // Convert transitions to React Flow edges
  const initialEdges: Edge[] = useMemo(
    () =>
      flowGraph.transitions.map((transition, index) => ({
        id: transition.transition_id,
        source: transition.from_screen_id,
        target: transition.to_screen_id,
        type: transition.flow_type,
        label: transition.label,
        labelBgStyle: { fill: 'rgba(0, 0, 0, 0.8)', fillOpacity: 0.9 },
        labelStyle: { fill: 'white', fontSize: 12, fontWeight: 500 },
        animated: transition.flow_type === 'forward',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          strokeWidth: 3.5,
        },
        data: { index },
      })),
    [flowGraph.transitions],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when flowGraph or other props change
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  // Update edges when transitions change
  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onScreenSelect(node.id)
    },
    [onScreenSelect],
  )

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    onScreenSelect(null)
  }, [onScreenSelect])

  // Handle node drag end
  const handleNodesChange: OnNodesChange = useCallback(
    changes => {
      onNodesChange(changes)

      // Update positions when drag ends
      changes.forEach(change => {
        if (
          change.type === 'position' &&
          change.position &&
          change.dragging === false
        ) {
          onScreenMove(change.id, change.position.x, change.position.y)
        }
      })
    },
    [onNodesChange, onScreenMove],
  )

  // Handle screen resize from sliders
  useEffect(() => {
    const handleResize = (event: Event) => {
      const customEvent = event as CustomEvent<{
        screenId: string
        width: number
        height: number
      }>
      const { screenId, width, height } = customEvent.detail
      onScreenResize(screenId, width, height)
    }

    window.addEventListener('screenResize', handleResize)
    return () => {
      window.removeEventListener('screenResize', handleResize)
    }
  }, [onScreenResize])

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges],
  )

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#0F0F0F' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid={true}
        snapGrid={[10, 10]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={4}
        selectNodesOnDrag={false}
        nodesDraggable={true} // Nodes are draggable (controlled in ScreenNode)
        panOnDrag={[2]} // Right mouse button for panning (middle button removed)
        panOnScroll={false} // Disable pan on scroll to allow element interactions
        zoomOnScroll={true} // Enable zoom on scroll
        deleteKeyCode={null} // Disable delete key
        multiSelectionKeyCode="Meta" // Cmd/Ctrl for multi-select
        style={{ backgroundColor: '#0F0F0F' }}
      >
        <FlowController />
        <Background
          color="rgba(255, 255, 255, 0.06)"
          gap={24}
          size={1}
          style={{ backgroundColor: '#0F0F0F' }}
        />
        <Controls
          showInteractive={false}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
          }}
        />
        <MiniMap
          nodeColor={node => {
            if (node.selected) return '#3B82F6'
            const screen = flowGraph.screens.find(s => s.screen_id === node.id)
            return screen?.screen_type === 'entry' ? '#10B981' : '#374151'
          }}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
          }}
        />

        {/* Keyboard hints */}
        <Panel position="top-right" style={{ margin: '16px' }}>
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontFamily: 'system-ui, sans-serif',
              minWidth: '200px',
            }}
          >
            <div
              style={{ fontWeight: 600, marginBottom: '8px', color: 'white' }}
            >
              Canvas Controls
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <div>
                <kbd
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 500,
                  }}
                >
                  Right Click + Drag
                </kbd>{' '}
                Pan
              </div>
              <div>
                <kbd
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 500,
                  }}
                >
                  Scroll
                </kbd>{' '}
                Zoom
              </div>
              <div>
                <kbd
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 500,
                  }}
                >
                  Click + Drag
                </kbd>{' '}
                Move Screen
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
