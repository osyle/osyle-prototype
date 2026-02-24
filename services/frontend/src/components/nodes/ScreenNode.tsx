import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useRef, useEffect, useMemo } from 'react'
import { Agentator, useAgentatorGlobal } from '../../lib/Agentator'
import type { FlowScreen, Project } from '../../types/home.types'
import DeviceFrame from '../DeviceFrame'
import MultiFileReactRenderer from '../MultiFileReactRenderer'
import { StyleOverlayApplicator } from '../StyleOverlayApplicator'

declare global {
  interface Window {
    __annotationModeActive?: boolean
  }
}

export interface ScreenNodeData extends Record<string, unknown> {
  screen: FlowScreen
  checkpoint?: string
  isSelected: boolean
  isEntry: boolean
  isIterating: boolean
  isGenerating: boolean
  deviceInfo: {
    screen: { width: number; height: number }
  }
  project: Project
  flowGraph?: import('../../types/home.types').FlowGraph
  actualScreenSize: { width: number; height: number }
}

function ScreenNode({ data, selected }: NodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const {
    getStyleOverrides,
    loadStyleOverrides,
    applyReorderMutations,
    isActive,
    mode,
  } = useAgentatorGlobal()

  const typedData = data as unknown as ScreenNodeData
  const {
    screen,
    isEntry,
    isIterating,
    isGenerating,
    deviceInfo,
    project,
    flowGraph,
    actualScreenSize,
  } = typedData

  // Calculate if annotation mode is active
  const isAnnotationModeActive =
    isActive && (mode === 'annotate' || mode === 'inspect' || mode === 'drag')

  // Set global flag for ReactFlowCanvas to check
  useEffect(() => {
    window.__annotationModeActive = isAnnotationModeActive
  }, [isAnnotationModeActive])

  // Compute files using useMemo to avoid recreating on every render
  const files = useMemo(() => {
    // Don't render if project doesn't exist
    if (!flowGraph?.project) return null

    // Don't render if screen is still loading
    if (screen.ui_loading) return null

    const projectFiles = flowGraph.project.files
    const screenComponent = screen.component_path
    const screenComponentName =
      screenComponent?.split('/').pop()?.replace('.tsx', '') || 'Screen'

    // Don't render if the screen component file doesn't exist yet
    if (screenComponent && !projectFiles[screenComponent]) return null

    return {
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
  }, [flowGraph, screen.component_path, screen.ui_loading])

  const styleOverrides = getStyleOverrides(screen.screen_id)

  // Load style overrides effect
  useEffect(() => {
    if (project?.project_id && screen.screen_id) {
      loadStyleOverrides(project.project_id, screen.screen_id)
    }
  }, [project?.project_id, screen.screen_id, loadStyleOverrides])

  // Apply reorder mutations effect
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

  // Early return if project not loaded or screen is loading
  if (!flowGraph?.project || screen.ui_loading) {
    return (
      <div
        ref={nodeRef}
        style={{
          width: actualScreenSize.width,
          height: actualScreenSize.height,
          position: 'relative',
        }}
      >
        <DeviceFrame variant="canvas">
          <div
            style={{
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(to bottom, #0a0a0a 0%, #000000 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Animated background gradient */}
            <div
              style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background:
                  'radial-gradient(circle at center, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                animation: 'pulse 3s ease-in-out infinite',
              }}
            />

            {/* Content skeleton */}
            <div
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Header skeleton */}
              <div
                style={{
                  height: '32px',
                  background:
                    'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
                  borderRadius: '8px',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite',
                  width: '60%',
                }}
              />

              {/* Card skeletons */}
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    animationDelay: `${i * 0.2}s`,
                  }}
                >
                  <div
                    style={{
                      height: '20px',
                      background:
                        'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
                      borderRadius: '6px',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite',
                      marginBottom: '12px',
                      width: '80%',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                  <div
                    style={{
                      height: '16px',
                      background:
                        'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
                      borderRadius: '6px',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite',
                      width: '95%',
                      animationDelay: `${i * 0.15 + 0.1}s`,
                    }}
                  />
                </div>
              ))}

              {/* Loading indicator */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '20px',
                }}
              >
                {/* Spinning dots */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'rgba(99, 102, 241, 0.8)',
                        animation: 'bounce 1.4s infinite ease-in-out both',
                        animationDelay: `${i * 0.16}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Keyframe animations */}
            <style>
              {`
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
                @keyframes pulse {
                  0%, 100% { 
                    opacity: 0.3;
                    transform: translate(-50%, -50%) scale(1);
                  }
                  50% { 
                    opacity: 0.5;
                    transform: translate(-50%, -50%) scale(1.1);
                  }
                }
                @keyframes bounce {
                  0%, 80%, 100% {
                    transform: scale(0);
                  }
                  40% {
                    transform: scale(1);
                  }
                }
              `}
            </style>
          </div>
        </DeviceFrame>
      </div>
    )
  }

  const entry = '/App.tsx'
  const dependencies = flowGraph.project.dependencies || {}

  // Node dimensions match exactly the screen size — no bezel inflation
  const displayWidth = actualScreenSize.width
  const displayHeight = actualScreenSize.height

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

      {selected && (
        <div
          style={{
            position: 'absolute',
            top: '-110px', // More gap from device frame
            left: '0',
            right: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            pointerEvents: 'auto',
            zIndex: 100000,
            minWidth: '320px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
          onPointerDown={e => {
            e.stopPropagation()
          }}
          onClick={e => {
            e.stopPropagation()
          }}
        >
          {/* Header with Reset */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Screen Size
            </span>
            <button
              onClick={e => {
                e.stopPropagation()
                window.dispatchEvent(
                  new CustomEvent('screenResize', {
                    detail: {
                      screenId: screen.screen_id,
                      width: deviceInfo.screen.width,
                      height: deviceInfo.screen.height,
                    },
                  }),
                )
              }}
              onPointerDown={e => e.stopPropagation()}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.8)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              }}
            >
              Reset
            </button>
          </div>

          {/* Width Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                Width
              </label>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#3B82F6',
                  fontFamily: 'monospace',
                }}
              >
                {actualScreenSize.width}px
              </span>
            </div>
            <input
              type="range"
              min="280"
              max="2560"
              step="10"
              value={actualScreenSize.width}
              onChange={e => {
                e.stopPropagation()
                const newWidth = parseInt(e.target.value)
                window.dispatchEvent(
                  new CustomEvent('screenResize', {
                    detail: {
                      screenId: screen.screen_id,
                      width: newWidth,
                      height: actualScreenSize.height,
                    },
                  }),
                )
              }}
              onPointerDown={e => {
                e.stopPropagation()
              }}
              onPointerUp={e => {
                e.stopPropagation()
              }}
              onClick={e => {
                e.stopPropagation()
              }}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((actualScreenSize.width - 280) / (2560 - 280)) * 100}%, rgba(255, 255, 255, 0.15) ${((actualScreenSize.width - 280) / (2560 - 280)) * 100}%, rgba(255, 255, 255, 0.15) 100%)`,
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            />
          </div>

          {/* Height Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                Height
              </label>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#3B82F6',
                  fontFamily: 'monospace',
                }}
              >
                {actualScreenSize.height}px
              </span>
            </div>
            <input
              type="range"
              min="400"
              max="1600"
              step="10"
              value={actualScreenSize.height}
              onChange={e => {
                e.stopPropagation()
                const newHeight = parseInt(e.target.value)
                window.dispatchEvent(
                  new CustomEvent('screenResize', {
                    detail: {
                      screenId: screen.screen_id,
                      width: actualScreenSize.width,
                      height: newHeight,
                    },
                  }),
                )
              }}
              onPointerDown={e => {
                e.stopPropagation()
              }}
              onPointerUp={e => {
                e.stopPropagation()
              }}
              onClick={e => {
                e.stopPropagation()
              }}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((actualScreenSize.height - 400) / (1600 - 400)) * 100}%, rgba(255, 255, 255, 0.15) ${((actualScreenSize.height - 400) / (1600 - 400)) * 100}%, rgba(255, 255, 255, 0.15) 100%)`,
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            />
          </div>

          <style>
            {`
              input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #3B82F6;
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
              }
              input[type="range"]::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #3B82F6;
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
              }
              input[type="range"]::-webkit-slider-thumb:hover {
                transform: scale(1.1);
              }
              input[type="range"]::-moz-range-thumb:hover {
                transform: scale(1.1);
              }
            `}
          </style>
        </div>
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

      <DeviceFrame variant="canvas">
        <div
          ref={contentRef}
          onMouseDown={e => {
            // Prevent drag when selected or annotation mode - but only from this div, not sliders above
            if (selected || isAnnotationModeActive) {
              e.stopPropagation()
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            cursor: selected || isAnnotationModeActive ? 'default' : 'grab',
          }}
        >
          {/* 
            Overlay logic:
            - Show overlay when: NOT selected AND NOT in annotation mode
            - Hide overlay when: selected OR annotation mode active
          */}
          {!selected && !isAnnotationModeActive && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                cursor: 'grab',
                pointerEvents: 'auto',
                backgroundColor: 'transparent',
              }}
            />
          )}

          <div
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'auto', // Always enabled for content and annotations
            }}
          >
            <Agentator screenId={screen.screen_id} screenName={screen.name}>
              <>
                <StyleOverlayApplicator
                  overrides={styleOverrides}
                  containerRef={contentRef}
                >
                  {files && (
                    <MultiFileReactRenderer
                      files={files}
                      entry={entry}
                      dependencies={dependencies}
                      isConceptMode={true}
                    />
                  )}
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
        </div>
      </DeviceFrame>
    </div>
  )
}

export default ScreenNode
