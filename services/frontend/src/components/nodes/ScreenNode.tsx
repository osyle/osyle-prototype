import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useRef, useEffect, useMemo } from 'react'
import { Agentator, useAgentatorGlobal } from '../../lib/Agentator'
import type { FlowScreen, Project } from '../../types/home.types'
import DeviceFrame from '../DeviceFrame'
import SandpackRenderer from '../SandpackRenderer'
import { StyleOverlayApplicator } from '../StyleOverlayApplicator'

export interface ScreenNodeData extends Record<string, unknown> {
  screen: FlowScreen
  checkpoint?: string
  isSelected: boolean
  isEntry: boolean
  isIterating: boolean
  isGenerating: boolean
  deviceInfo: {
    platform: 'phone' | 'web'
    screen: { width: number; height: number }
  }
  project: Project
  flowGraph?: import('../../types/home.types').FlowGraph // NEW: Access to full flow graph for unified project
}

function ScreenNode({ data, selected }: NodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null) // Ref for actual screen content
  const { getStyleOverrides, loadStyleOverrides, applyReorderMutations } =
    useAgentatorGlobal()

  const typedData = data as unknown as ScreenNodeData
  const {
    screen,
    checkpoint,
    isEntry,
    isIterating,
    isGenerating,
    deviceInfo,
    project,
    flowGraph,
  } = typedData

  // Load style overrides from database when component mounts
  useEffect(() => {
    if (project?.project_id && screen.screen_id) {
      loadStyleOverrides(project.project_id, screen.screen_id)
    }
  }, [project?.project_id, screen.screen_id, loadStyleOverrides])

  // SAFETY: During generation, flowGraph.project might not exist yet
  // Show loading state until project is ready
  if (!flowGraph?.project) {
    return (
      <div
        ref={nodeRef}
        style={{
          width:
            deviceInfo.screen.width +
            (deviceInfo.platform === 'phone' ? 24 : 0),
          height:
            deviceInfo.screen.height +
            (deviceInfo.platform === 'phone' ? 48 : 40),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          borderRadius: '16px',
        }}
      >
        <div style={{ color: '#888', fontSize: '14px' }}>
          {isGenerating ? 'Generating...' : 'Loading...'}
        </div>
      </div>
    )
  }

  // UNIFIED PROJECT ONLY: Extract this screen from the shared project
  const projectFiles = flowGraph.project.files
  const screenComponent = screen.component_path

  // Create a wrapper App.tsx that renders just this screen for preview
  const screenComponentName =
    screenComponent?.split('/').pop()?.replace('.tsx', '') || 'Screen'

  const files: Record<string, string> = {
    '/App.tsx': `import ${screenComponentName} from '${screenComponent?.replace('.tsx', '') || '/screens/Screen'}'

export default function App() {
  // Mock onTransition for preview
  const handleTransition = (transitionId: string) => {
    console.log('Preview transition:', transitionId)
  }
  
  return <${screenComponentName} onTransition={handleTransition} />
}`,
    // Include the screen component
    ...(screenComponent
      ? { [screenComponent]: projectFiles[screenComponent] || '' }
      : {}),
    // Include ALL shared files (components, utils, etc.)
    ...Object.fromEntries(
      Object.entries(projectFiles).filter(
        ([path]) =>
          path.startsWith('/components/') ||
          path.startsWith('/lib/') ||
          path === '/tsconfig.json' ||
          path === '/package.json',
      ),
    ),
  }

  const entry = '/App.tsx'
  const dependencies = flowGraph.project.dependencies || {}

  console.log(
    `ScreenNode ${screen.screen_id}: Unified project, extracted ${Object.keys(files).length} files`,
  )

  // Get style overrides for this screen
  const styleOverrides = getStyleOverrides(screen.screen_id)

  // Apply reorder mutations after DOM is rendered
  useEffect(() => {
    if (uiCode && contentRef.current) {
      // Small delay to ensure React has finished rendering
      const timer = setTimeout(() => {
        if (contentRef.current) {
          applyReorderMutations(screen.screen_id, contentRef.current)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [uiCode, screen.screen_id, applyReorderMutations])

  // Calculate device display dimensions (including bezel/chrome)
  const displayWidth =
    deviceInfo.platform === 'phone'
      ? deviceInfo.screen.width + 24
      : deviceInfo.screen.width
  const displayHeight =
    deviceInfo.platform === 'phone'
      ? deviceInfo.screen.height + 48
      : deviceInfo.screen.height + 40

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'relative',
        pointerEvents: 'auto',
        width: displayWidth,
        height: displayHeight,
      }}
    >
      {/* Invisible handles for edge connections */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      {/* Node resizer - only show when selected */}
      {selected && (
        <NodeResizer
          minWidth={320 + (deviceInfo.platform === 'phone' ? 24 : 0)}
          minHeight={568 + (deviceInfo.platform === 'phone' ? 48 : 40)}
          handleStyle={{
            width: 12,
            height: 12,
            borderRadius: 4,
            backgroundColor: 'rgba(59, 130, 246, 0.9)',
            border: '2px solid white',
          }}
          lineStyle={{
            border: '3px solid rgba(59, 130, 246, 0.7)',
            borderRadius: 6,
          }}
        />
      )}

      {/* Selection highlight */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            inset: -3,
            border: '3px solid rgba(59, 130, 246, 0.7)',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: -1,
            boxShadow:
              '0 0 0 1px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(59, 130, 246, 0.2)',
          }}
        />
      )}

      {/* START badge for entry screen */}
      {isEntry && (
        <div
          style={{
            position: 'absolute',
            top: '-32px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          START
        </div>
      )}

      {/* Screen name label */}
      <div
        style={{
          position: 'absolute',
          top: '-28px',
          left: 0,
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontWeight: 500,
          fontFamily: 'system-ui, sans-serif',
          pointerEvents: 'none',
        }}
      >
        {screen.name}
      </div>

      {/* Device frame with screen content */}
      <DeviceFrame>
        <div ref={contentRef} style={{ width: '100%', height: '100%' }}>
          <Agentator screenId={screen.screen_id} screenName={screen.name}>
            {uiCode ? (
              <>
                <StyleOverlayApplicator
                  overrides={styleOverrides}
                  containerRef={contentRef}
                >
                  <SandpackRenderer
                    files={files}
                    entry={entry}
                    dependencies={dependencies}
                    propsToInject={{
                      onNavigate: () => {},
                      formData: {},
                    }}
                    onError={err => console.error('Sandpack error:', err)}
                  />
                </StyleOverlayApplicator>

                {/* Iteration indicator */}
                {isIterating && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(249, 115, 22, 0.9)',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      zIndex: 100,
                      pointerEvents: 'none',
                    }}
                  >
                    🔄 Iterating...
                  </div>
                )}

                {/* Generation indicator */}
                {isGenerating && !isIterating && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(59, 130, 246, 0.9)',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      zIndex: 100,
                      pointerEvents: 'none',
                    }}
                  >
                    ⏳ Generating...
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">Loading...</div>
              </div>
            )}
          </Agentator>
        </div>
      </DeviceFrame>
    </div>
  )
}

export default ScreenNode
