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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="text-sm font-medium text-gray-700">
          Multi-Screen App
        </div>
        <div className="text-xs text-gray-400">
          {flow.screens.length} screens
        </div>
      </div>

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
          <MultiFileReactRenderer
            files={projectFiles}
            entry={projectEntry}
            dependencies={projectDependencies}
            isConceptMode={true}
            allowInteractions={true}
          />
        </div>
      </div>
    </div>
  )
}
