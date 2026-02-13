import type { FlowGraph } from '../types/home.types'
import type { ParameterValues } from '../types/parametric.types'
import SandpackRenderer from './SandpackRenderer'

interface PrototypeRunnerProps {
  flow: FlowGraph
  deviceInfo: {
    platform: 'web' | 'phone'
    screen: { width: number; height: number }
  }
  parametricValues?: ParameterValues // NEW: Accept parametric state from Concept tab
}

export default function PrototypeRunner({
  flow,
  deviceInfo,
  parametricValues = {},
}: PrototypeRunnerProps) {
  // UNIFIED PROJECT ONLY: Run the full app with router
  const projectFiles = flow.project.files
  const projectEntry = flow.project.entry
  const projectDependencies = flow.project.dependencies

  console.log('PrototypeRunner: Running unified project with router')

  return (
    <div className="flex flex-col h-full">
      {/* Prototype Controls Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="text-sm font-medium text-gray-700">
          Multi-Screen App
        </div>
        <div className="text-xs text-gray-400">
          {flow.screens.length} screens
        </div>
      </div>

      {/* Prototype Viewport */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 overflow-auto">
        <div
          className="relative bg-white shadow-xl"
          style={{
            width: deviceInfo.screen.width,
            height: deviceInfo.screen.height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <SandpackRenderer
            files={projectFiles}
            entry={projectEntry}
            dependencies={projectDependencies}
            onError={err => console.error('Sandpack error:', err)}
          />
        </div>
      </div>
    </div>
  )
}
