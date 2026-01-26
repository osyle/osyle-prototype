/**
 * Agentator - Simplified wrapper for multi-instance use
 *
 * Connects to AgentatorGlobalProvider for centralized control.
 * No FloatingButton - controls are in ConversationBar.
 */

import React from 'react'
import { useAgentatorGlobal } from './AgentatorGlobalProvider'
import { AnnotationCanvas } from './components/AnnotationCanvas'
import type { Annotation, InspectedElement } from './types'
import './styles.css'

export interface AgentatorProps {
  children: React.ReactNode
  screenId: string
  screenName: string
  disabled?: boolean
  isConceptMode?: boolean // NEW: Pass through to AnnotationCanvas
}

export const Agentator: React.FC<AgentatorProps> = ({
  children,
  screenId,
  screenName,
  disabled = false,
  isConceptMode = false,
}) => {
  const {
    mode,
    isActive,
    getAnnotations,
    addAnnotation,
    deleteAnnotation,
    updateAnnotation,
    setInspectedElement,
    annotationColor,
    markersVisible,
  } = useAgentatorGlobal()

  if (disabled) {
    return <>{children}</>
  }

  const screenAnnotations = getAnnotations(screenName)

  const handleAnnotationAdd = (annotation: Annotation) => {
    // Ensure annotation has screen metadata
    const annotationWithScreen = {
      ...annotation,
      screenId,
      screenName,
    }
    addAnnotation(screenName, annotationWithScreen)
  }

  const handleAnnotationDelete = (annotation: Annotation) => {
    deleteAnnotation(screenName, annotation.id)
  }

  const handleAnnotationUpdate = (annotation: Annotation) => {
    updateAnnotation(screenName, annotation)
  }

  const handleInspect = (element: InspectedElement | null) => {
    setInspectedElement(screenName, element)
  }

  return (
    <AnnotationCanvas
      screenId={screenId}
      screenName={screenName}
      onAnnotationAdd={handleAnnotationAdd}
      onAnnotationDelete={handleAnnotationDelete}
      onAnnotationUpdate={handleAnnotationUpdate}
      onInspect={handleInspect}
      annotations={markersVisible ? screenAnnotations : []}
      isActive={isActive}
      mode={mode}
      annotationColor={annotationColor}
      isConceptMode={isConceptMode}
    >
      {children}
    </AnnotationCanvas>
  )
}

export default Agentator

export { AnnotationCanvas } from './components/AnnotationCanvas'
export { CodeAnnotator } from './CodeAnnotator'

// Re-export everything
export type {
  Annotation,
  AnnotationSettings,
  PendingAnnotation,
  HoverInfo,
  OutputDetailLevel,
  InspectedElement,
  AgentatorMode,
  CodeAnnotation,
} from './types'

export {
  AgentatorGlobalProvider,
  useAgentatorGlobal,
} from './AgentatorGlobalProvider'
