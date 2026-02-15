import React, { useMemo } from 'react'
import { type ProjectDisplay } from '../types/home.types'
import MultiFileReactRenderer from './MultiFileReactRenderer'

interface ProjectCardPreviewProps {
  project: ProjectDisplay
  cardHeight: number
}

const ProjectCardPreview: React.FC<ProjectCardPreviewProps> = ({
  project,
  cardHeight,
}) => {
  // Build files for the entry screen (similar to ScreenNode)
  // Must be called unconditionally at top level
  const files = useMemo(() => {
    if (!project.flow_mode || !project.flow_graph?.project?.files) {
      return null
    }

    const entryScreen = project.flow_graph.screens?.find(
      s => s.screen_id === project.flow_graph!.entry_screen_id,
    )

    if (!entryScreen) {
      return null
    }

    const projectFiles = project.flow_graph.project.files
    const screenComponent = entryScreen.component_path
    const screenComponentName =
      screenComponent?.split('/').pop()?.replace('.tsx', '') || 'Screen'

    return {
      '/App.tsx': `import ${screenComponentName} from '${screenComponent?.replace('.tsx', '') || '/screens/Screen'}'

export default function App() {
  return <${screenComponentName} onTransition={() => {}} />
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
  }, [project.flow_mode, project.flow_graph])

  // For flow projects, render the entry screen
  if (project.flow_mode && project.flow_graph) {
    if (
      !project.flow_graph.screens ||
      !Array.isArray(project.flow_graph.screens) ||
      project.flow_graph.screens.length === 0
    ) {
      return (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: '#F7F5F3' }}
        >
          <div className="text-sm" style={{ color: '#929397' }}>
            No screens available
          </div>
        </div>
      )
    }

    const entryScreen = project.flow_graph.screens.find(
      s => s.screen_id === project.flow_graph!.entry_screen_id,
    )

    if (!entryScreen || entryScreen.ui_loading) {
      return (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: '#F7F5F3' }}
        >
          <div className="text-sm" style={{ color: '#929397' }}>
            Loading preview...
          </div>
        </div>
      )
    }

    if (!project.flow_graph.project?.files || !files) {
      return (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: '#F7F5F3' }}
        >
          <div className="text-sm" style={{ color: '#929397' }}>
            Preview unavailable
          </div>
        </div>
      )
    }

    // Get dimensions from entry screen (with fallback for old projects)
    const dimensions = entryScreen.dimensions || { width: 1280, height: 720 }
    const baseWidth = dimensions.width
    const baseHeight = dimensions.height

    // Card content area height (subtract footer height ~70px)
    const availableHeight = cardHeight - 70
    const availableWidth = 280 // Card width

    // Calculate scale to fit
    const scaleX = (availableWidth / baseWidth) * 1.2
    const scaleY = (availableHeight / baseHeight) * 1.2
    const scale = Math.min(scaleX, scaleY, 0.6)

    return (
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#F7F5F3' }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            width: baseWidth,
            height: baseHeight,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MultiFileReactRenderer
            files={files}
            entry="/App.tsx"
            dependencies={project.flow_graph.project.dependencies || {}}
          />
        </div>
      </div>
    )
  }

  // Legacy single-screen projects not supported with new renderer
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ backgroundColor: '#F7F5F3' }}
    >
      <div className="text-sm" style={{ color: '#929397' }}>
        Legacy project format
      </div>
    </div>
  )
}

export default ProjectCardPreview
