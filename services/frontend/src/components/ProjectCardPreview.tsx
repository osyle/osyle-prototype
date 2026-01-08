import React from 'react'
import { type ProjectDisplay } from '../types/home.types'
import DynamicReactRenderer from './DynamicReactRenderer'

// ============================================================================
// TYPES
// ============================================================================

interface ProjectCardPreviewProps {
  project: ProjectDisplay
  cardHeight: number
}

// ============================================================================
// PROJECT CARD PREVIEW COMPONENT
// ============================================================================

const ProjectCardPreview: React.FC<ProjectCardPreviewProps> = ({
  project,
  cardHeight,
}) => {
  // For flow projects, render the entry screen
  if (project.flow_mode && project.flow_graph) {
    // Check if flow_graph has the required structure
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

    if (entryScreen.ui_error || !entryScreen.ui_code) {
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

    // Get dimensions from entry screen
    const baseWidth = entryScreen.dimensions.width
    const baseHeight = entryScreen.dimensions.height

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
            pointerEvents: 'none', // Disable all interactions in preview
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DynamicReactRenderer jsxCode={entryScreen.ui_code} />
        </div>
      </div>
    )
  }

  // Legacy single-screen project handling (won't be used anymore)
  if (project.ui_loading) {
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

  if (project.ui_error || !project.ui) {
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

  const baseWidth = 375
  const baseHeight = 812

  const availableHeight = cardHeight - 70
  const availableWidth = 280

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
        {typeof project.ui === 'string' ? (
          // Handle JSX code strings from backend
          <DynamicReactRenderer jsxCode={project.ui} />
        ) : (
          // Handle React component trees
          <DynamicReactRenderer jsxCode={JSON.stringify(project.ui)} />
        )}
      </div>
    </div>
  )
}

export default ProjectCardPreview
