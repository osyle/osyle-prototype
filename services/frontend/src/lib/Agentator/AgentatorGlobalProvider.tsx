/**
 * AgentatorGlobalProvider
 *
 * Central state management for all Agentator instances in the app.
 * Manages annotations per screen, global inspect mode, and controls.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Annotation, InspectedElement, AgentatorMode } from './types'

// =============================================================================
// Types
// =============================================================================

interface AnnotationsPerScreen {
  [screenName: string]: Annotation[]
}

interface InspectedElementWithScreen {
  screenName: string
  element: InspectedElement
}

interface AgentatorGlobalState {
  // Mode
  mode: AgentatorMode
  isActive: boolean

  // Annotations per screen
  annotations: AnnotationsPerScreen

  // Inspect mode (only one element at a time globally)
  inspectedElement: InspectedElementWithScreen | null

  // Settings
  annotationColor: string
  markersVisible: boolean
}

interface AgentatorGlobalContextValue extends AgentatorGlobalState {
  // Mode control
  // eslint-disable-next-line no-unused-vars
  setMode: (mode: AgentatorMode) => void
  // eslint-disable-next-line no-unused-vars
  setIsActive: (active: boolean) => void
  toggleActive: () => void

  // Annotation management
  // eslint-disable-next-line no-unused-vars
  addAnnotation: (screenName: string, annotation: Annotation) => void
  // eslint-disable-next-line no-unused-vars
  deleteAnnotation: (screenName: string, annotationId: string) => void
  // eslint-disable-next-line no-unused-vars
  updateAnnotation: (screenName: string, annotation: Annotation) => void
  // eslint-disable-next-line no-unused-vars
  clearAnnotations: (screenName?: string) => void // Clear one screen or all
  // eslint-disable-next-line no-unused-vars
  getAnnotations: (screenName: string) => Annotation[]
  getTotalAnnotationCount: () => number

  // Inspect mode
  setInspectedElement: (
    // eslint-disable-next-line no-unused-vars
    screenName: string,
    // eslint-disable-next-line no-unused-vars
    element: InspectedElement | null,
  ) => void
  clearInspectedElement: () => void

  // Settings
  // eslint-disable-next-line no-unused-vars
  setAnnotationColor: (color: string) => void
  // eslint-disable-next-line no-unused-vars
  setMarkersVisible: (visible: boolean) => void

  // Export
  getAnnotationsAsMarkdown: () => string
  getAnnotationsForConversation: () => AnnotationsPerScreen
}

// =============================================================================
// Context
// =============================================================================

const AgentatorGlobalContext =
  createContext<AgentatorGlobalContextValue | null>(null)

export const useAgentatorGlobal = () => {
  const context = useContext(AgentatorGlobalContext)
  if (!context) {
    throw new Error(
      'useAgentatorGlobal must be used within AgentatorGlobalProvider',
    )
  }
  return context
}

// =============================================================================
// Provider
// =============================================================================

interface AgentatorGlobalProviderProps {
  children: React.ReactNode
  initialColor?: string
}

export const AgentatorGlobalProvider: React.FC<
  AgentatorGlobalProviderProps
> = ({ children, initialColor = '#3c82f7' }) => {
  const [mode, setMode] = useState<AgentatorMode>('annotate')
  const [isActive, setIsActive] = useState(false)
  const [annotations, setAnnotations] = useState<AnnotationsPerScreen>({})
  const [inspectedElement, setInspectedElementState] =
    useState<InspectedElementWithScreen | null>(null)
  const [annotationColor, setAnnotationColor] = useState(initialColor)
  const [markersVisible, setMarkersVisible] = useState(true)

  // Mode control
  const toggleActive = useCallback(() => {
    setIsActive(prev => !prev)
  }, [])

  // Annotation management
  const addAnnotation = useCallback(
    (screenName: string, annotation: Annotation) => {
      setAnnotations(prev => ({
        ...prev,
        [screenName]: [...(prev[screenName] || []), annotation],
      }))
    },
    [],
  )

  const deleteAnnotation = useCallback(
    (screenName: string, annotationId: string) => {
      setAnnotations(prev => ({
        ...prev,
        [screenName]: (prev[screenName] || []).filter(
          a => a.id !== annotationId,
        ),
      }))
    },
    [],
  )

  const updateAnnotation = useCallback(
    (screenName: string, annotation: Annotation) => {
      setAnnotations(prev => ({
        ...prev,
        [screenName]: (prev[screenName] || []).map(a =>
          a.id === annotation.id ? annotation : a,
        ),
      }))
    },
    [],
  )

  const clearAnnotations = useCallback((screenName?: string) => {
    if (screenName) {
      // Clear specific screen
      setAnnotations(prev => ({
        ...prev,
        [screenName]: [],
      }))
    } else {
      // Clear all screens
      setAnnotations({})
    }
  }, [])

  const getAnnotations = useCallback(
    (screenName: string): Annotation[] => {
      return annotations[screenName] || []
    },
    [annotations],
  )

  const getTotalAnnotationCount = useCallback((): number => {
    return Object.values(annotations).reduce((sum, arr) => sum + arr.length, 0)
  }, [annotations])

  // Inspect mode
  const setInspectedElement = useCallback(
    (screenName: string, element: InspectedElement | null) => {
      if (element) {
        setInspectedElementState({ screenName, element })
      } else {
        setInspectedElementState(null)
      }
    },
    [],
  )

  const clearInspectedElement = useCallback(() => {
    setInspectedElementState(null)
  }, [])

  // Export functions
  const getAnnotationsAsMarkdown = useCallback((): string => {
    const screenNames = Object.keys(annotations).filter(
      name => annotations[name].length > 0,
    )

    if (screenNames.length === 0) return ''

    let markdown = '# Screen Annotations\n\n'

    screenNames.forEach(screenName => {
      const screenAnnotations = annotations[screenName]
      if (screenAnnotations.length === 0) return

      markdown += `## ${screenName}\n\n`

      screenAnnotations.forEach((ann, idx) => {
        markdown += `### ${idx + 1}. ${ann.element}\n`
        markdown += `**Location:** ${ann.elementPath}\n`

        if (ann.selectedText) {
          markdown += `**Selected text:** "${ann.selectedText}"\n`
        }

        if (ann.cssClasses) {
          markdown += `**Classes:** ${ann.cssClasses}\n`
        }

        markdown += `**Feedback:** ${ann.comment}\n\n`
      })

      markdown += '\n'
    })

    return markdown
  }, [annotations])

  const getAnnotationsForConversation =
    useCallback((): AnnotationsPerScreen => {
      return annotations
    }, [annotations])

  // Context value
  const value: AgentatorGlobalContextValue = {
    // State
    mode,
    isActive,
    annotations,
    inspectedElement,
    annotationColor,
    markersVisible,

    // Mode control
    setMode,
    setIsActive,
    toggleActive,

    // Annotation management
    addAnnotation,
    deleteAnnotation,
    updateAnnotation,
    clearAnnotations,
    getAnnotations,
    getTotalAnnotationCount,

    // Inspect mode
    setInspectedElement,
    clearInspectedElement,

    // Settings
    setAnnotationColor,
    setMarkersVisible,

    // Export
    getAnnotationsAsMarkdown,
    getAnnotationsForConversation,
  }

  return (
    <AgentatorGlobalContext.Provider value={value}>
      {children}
    </AgentatorGlobalContext.Provider>
  )
}
