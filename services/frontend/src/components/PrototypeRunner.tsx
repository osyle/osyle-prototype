import { useState, useRef } from 'react'
import type { FlowGraph } from '../types/home.types'
import type { ParameterValues } from '../types/parametric.types'
import MultiFileReactRenderer from './MultiFileReactRenderer'

interface PrototypeRunnerProps {
  flow: FlowGraph
  deviceInfo: {
    screen: { width: number; height: number }
  }
  parametricValues?: ParameterValues
}

export default function PrototypeRunner({
  flow,
  deviceInfo,
  /* parametricValues = {}, */
}: PrototypeRunnerProps) {
  const projectFiles = flow.project.files
  const projectEntry = flow.project.entry
  const projectDependencies = flow.project.dependencies

  const [activeScreenId, setActiveScreenId] = useState(
    flow.entry_screen_id ?? flow.screens[0]?.screen_id,
  )
  const tabsRef = useRef<HTMLDivElement>(null)

  const activeScreen = flow.screens.find(s => s.screen_id === activeScreenId)
  const entry = activeScreen?.component_path ?? projectEntry

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: deviceInfo.screen.width,
      }}
    >
      {/* Browser-style tab bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: 36,
          backgroundColor: '#f0f0f0',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          flexShrink: 0,
        }}
        ref={tabsRef}
      >
        {flow.screens.map(screen => {
          const isActive = screen.screen_id === activeScreenId
          return (
            <button
              key={screen.screen_id}
              onClick={() => setActiveScreenId(screen.screen_id)}
              title={screen.name}
              style={{
                flexShrink: 0,
                minWidth: 60,
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: isActive ? 500 : 400,
                fontFamily: 'system-ui, sans-serif',
                color: isActive ? '#111' : '#666',
                backgroundColor: isActive ? '#fff' : 'transparent',
                border: 'none',
                borderRight: '1px solid rgba(0,0,0,0.07)',
                borderBottom: isActive
                  ? '2px solid #fff'
                  : '2px solid transparent',
                borderTop: isActive
                  ? '2px solid #6366f1'
                  : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                transition: 'background 0.15s, color 0.15s',
                outline: 'none',
              }}
            >
              {/* Favicon dot */}
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: isActive ? '#6366f1' : '#bbb',
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {screen.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Screen content — sized to exact device dimensions */}
      <div
        style={{
          width: deviceInfo.screen.width,
          height: deviceInfo.screen.height,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <MultiFileReactRenderer
          key={entry}
          files={projectFiles}
          entry={entry}
          dependencies={projectDependencies}
          isConceptMode={true}
          allowInteractions={true}
        />
      </div>
    </div>
  )
}
