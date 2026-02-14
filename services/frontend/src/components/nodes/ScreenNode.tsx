import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useRef, useEffect } from 'react'
import { Agentator, useAgentatorGlobal } from '../../lib/Agentator'
import type { FlowScreen, Project } from '../../types/home.types'
import DeviceFrame from '../DeviceFrame'
import MultiFileReactRenderer from '../MultiFileReactRenderer'
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
  flowGraph?: import('../../types/home.types').FlowGraph
}

function ScreenNode({ data, selected }: NodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const { getStyleOverrides, loadStyleOverrides, applyReorderMutations } =
    useAgentatorGlobal()

  const typedData = data as unknown as ScreenNodeData
  const {
    screen,
    isEntry,
    isIterating,
    isGenerating,
    deviceInfo,
    project,
    flowGraph,
  } = typedData

  useEffect(() => {
    if (project?.project_id && screen.screen_id) {
      loadStyleOverrides(project.project_id, screen.screen_id)
    }
  }, [project?.project_id, screen.screen_id, loadStyleOverrides])

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

  const projectFiles = flowGraph.project.files
  const screenComponent = screen.component_path

  const screenComponentName =
    screenComponent?.split('/').pop()?.replace('.tsx', '') || 'Screen'

  const files: Record<string, string> = {
    '/App.tsx': `import ${screenComponentName} from '${screenComponent?.replace('.tsx', '') || '/screens/Screen'}'

export default function App() {
  const handleTransition = (transitionId: string) => {
    console.log('Preview transition:', transitionId)
  }
  
  return <${screenComponentName} onTransition={handleTransition} />
}`,
    ...(screenComponent
      ? { [screenComponent]: projectFiles[screenComponent] || '' }
      : {}),
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
    `ScreenNode ${screen.screen_id}: Extracted ${Object.keys(files).length} files`,
  )

  const styleOverrides = getStyleOverrides(screen.screen_id)

  useEffect(() => {
    if (files && contentRef.current) {
      const timer = setTimeout(() => {
        if (contentRef.current) {
          applyReorderMutations(screen.screen_id, contentRef.current)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [files, screen.screen_id, applyReorderMutations])

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

      <DeviceFrame>
        <div ref={contentRef} style={{ width: '100%', height: '100%' }}>
          <Agentator screenId={screen.screen_id} screenName={screen.name}>
            <>
              <StyleOverlayApplicator
                overrides={styleOverrides}
                containerRef={contentRef}
              >
                <MultiFileReactRenderer
                  files={files}
                  entry={entry}
                  dependencies={dependencies}
                />
              </StyleOverlayApplicator>

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
          </Agentator>
        </div>
      </DeviceFrame>
    </div>
  )
}

export default ScreenNode
