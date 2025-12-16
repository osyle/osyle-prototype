import React from 'react'
import { type ProjectDisplay } from '../types/home.types'
import DesignMLv2Renderer from './DesignMLRenderer'
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

  // Calculate scale to fit the UI in the card
  // Assume typical design is 1024x768 or phone size 375x812
  const isDesignML = project.rendering_mode === 'design-ml'
  const baseWidth = isDesignML ? 1024 : 375
  const baseHeight = isDesignML ? 768 : 812

  // Card content area height (subtract footer height ~70px)
  const availableHeight = cardHeight - 70
  const availableWidth = 280 // Card width

  // Calculate scale to fit with 1.2x zoom for better visibility
  const scaleX = (availableWidth / baseWidth) * 1.2
  const scaleY = (availableHeight / baseHeight) * 1.2
  const scale = Math.min(scaleX, scaleY, 0.6) // Max scale of 0.6 (increased from 0.5)

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
          pointerEvents: 'none', // Disable interactions in preview
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {project.rendering_mode === 'design-ml' ? (
          <DesignMLv2Renderer document={project.ui} />
        ) : (
          <DynamicReactRenderer jsxCode={project.ui as string} />
        )}
      </div>
    </div>
  )
}

export default ProjectCardPreview
