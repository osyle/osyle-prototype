/**
 * AgentatorGlobalProvider
 *
 * Central state management for all Agentator instances in the app.
 * Manages annotations per screen, global inspect mode, and controls.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import type {
  StyleOverride,
  DesignMutation,
} from '../../types/styleEditor.types'
import type {
  Annotation,
  InspectedElement,
  AgentatorMode,
  CodeAnnotation,
} from './types'

// =============================================================================
// Types
// =============================================================================

interface AnnotationsPerScreen {
  [screenName: string]: Annotation[]
}

interface CodeAnnotationsPerScreen {
  [screenName: string]: CodeAnnotation[]
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
  codeAnnotations: CodeAnnotationsPerScreen

  // Inspect mode (only one element at a time globally)
  inspectedElement: InspectedElementWithScreen | null

  // Style editing (NEW)
  styleOverrides: Record<string, StyleOverride[]> // screenId -> overrides
  designMutations: Record<string, DesignMutation[]> // screenId -> mutations

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

  // Annotation management (visual)
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

  // Code annotation management
  // eslint-disable-next-line no-unused-vars
  addCodeAnnotation: (screenName: string, annotation: CodeAnnotation) => void
  // eslint-disable-next-line no-unused-vars
  deleteCodeAnnotation: (screenName: string, annotationId: string) => void
  // eslint-disable-next-line no-unused-vars
  getCodeAnnotations: (screenName: string) => CodeAnnotation[]

  // Inspect mode
  setInspectedElement: (
    // eslint-disable-next-line no-unused-vars
    screenName: string,
    // eslint-disable-next-line no-unused-vars
    element: InspectedElement | null,
  ) => void
  clearInspectedElement: () => void

  // Style editing (NEW)
  // eslint-disable-next-line no-unused-vars
  addStyleOverride: (screenId: string, override: StyleOverride) => void
  // eslint-disable-next-line no-unused-vars
  getStyleOverrides: (screenId: string) => StyleOverride[]
  // eslint-disable-next-line no-unused-vars
  clearStyleOverrides: (screenId: string) => void
  // eslint-disable-next-line no-unused-vars
  addDesignMutation: (screenId: string, mutation: DesignMutation) => void
  // eslint-disable-next-line no-unused-vars
  getDesignMutations: (screenId: string) => DesignMutation[]
  // eslint-disable-next-line no-unused-vars
  clearDesignMutations: (screenId: string) => void

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
  const [codeAnnotations, setCodeAnnotations] =
    useState<CodeAnnotationsPerScreen>({})
  const [inspectedElement, setInspectedElementState] =
    useState<InspectedElementWithScreen | null>(null)
  const [annotationColor, setAnnotationColor] = useState(initialColor)
  const [markersVisible, setMarkersVisible] = useState(true)

  // Style editing state (NEW)
  const [styleOverrides, setStyleOverrides] = useState<
    Record<string, StyleOverride[]>
  >({})
  const [designMutations, setDesignMutations] = useState<
    Record<string, DesignMutation[]>
  >({})

  // Mode control
  const toggleActive = useCallback(() => {
    setIsActive(prev => !prev)
  }, [])

  // Annotation management (visual)
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
      // Clear specific screen (both visual and code)
      setAnnotations(prev => ({
        ...prev,
        [screenName]: [],
      }))
      setCodeAnnotations(prev => ({
        ...prev,
        [screenName]: [],
      }))
    } else {
      // Clear all screens (both visual and code)
      setAnnotations({})
      setCodeAnnotations({})
    }
  }, [])

  const getAnnotations = useCallback(
    (screenName: string): Annotation[] => {
      return annotations[screenName] || []
    },
    [annotations],
  )

  const getTotalAnnotationCount = useCallback((): number => {
    const visualCount = Object.values(annotations).reduce(
      (sum, arr) => sum + arr.length,
      0,
    )
    const codeCount = Object.values(codeAnnotations).reduce(
      (sum, arr) => sum + arr.length,
      0,
    )
    return visualCount + codeCount
  }, [annotations, codeAnnotations])

  // Code annotation management
  const addCodeAnnotation = useCallback(
    (screenName: string, annotation: CodeAnnotation) => {
      setCodeAnnotations(prev => ({
        ...prev,
        [screenName]: [...(prev[screenName] || []), annotation],
      }))
    },
    [],
  )

  const deleteCodeAnnotation = useCallback(
    (screenName: string, annotationId: string) => {
      setCodeAnnotations(prev => ({
        ...prev,
        [screenName]: (prev[screenName] || []).filter(
          a => a.id !== annotationId,
        ),
      }))
    },
    [],
  )

  const getCodeAnnotations = useCallback(
    (screenName: string): CodeAnnotation[] => {
      return codeAnnotations[screenName] || []
    },
    [codeAnnotations],
  )

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

  // Style editing methods (NEW)
  const addStyleOverride = useCallback(
    (screenId: string, override: StyleOverride) => {
      setStyleOverrides(prev => {
        const existing = prev[screenId] || []
        // Check if override for same element exists
        const filtered = existing.filter(
          o =>
            o.elementPath !== override.elementPath ||
            o.elementIndex !== override.elementIndex,
        )
        return {
          ...prev,
          [screenId]: [...filtered, override],
        }
      })
    },
    [],
  )

  const getStyleOverrides = useCallback(
    (screenId: string): StyleOverride[] => {
      return styleOverrides[screenId] || []
    },
    [styleOverrides],
  )

  const clearStyleOverrides = useCallback((screenId: string) => {
    setStyleOverrides(prev => ({
      ...prev,
      [screenId]: [],
    }))
  }, [])

  const addDesignMutation = useCallback(
    (screenId: string, mutation: DesignMutation) => {
      setDesignMutations(prev => ({
        ...prev,
        [screenId]: [...(prev[screenId] || []), mutation],
      }))
    },
    [],
  )

  const getDesignMutations = useCallback(
    (screenId: string): DesignMutation[] => {
      return designMutations[screenId] || []
    },
    [designMutations],
  )

  const clearDesignMutations = useCallback((screenId: string) => {
    setDesignMutations(prev => ({
      ...prev,
      [screenId]: [],
    }))
  }, [])

  // Context value
  const value: AgentatorGlobalContextValue = {
    // State
    mode,
    isActive,
    annotations,
    codeAnnotations,
    inspectedElement,
    annotationColor,
    markersVisible,
    styleOverrides,
    designMutations,

    // Mode control
    setMode,
    setIsActive,
    toggleActive,

    // Annotation management (visual)
    addAnnotation,
    deleteAnnotation,
    updateAnnotation,
    clearAnnotations,
    getAnnotations,
    getTotalAnnotationCount,

    // Code annotation management
    addCodeAnnotation,
    deleteCodeAnnotation,
    getCodeAnnotations,

    // Inspect mode
    setInspectedElement,
    clearInspectedElement,

    // Style editing (NEW)
    addStyleOverride,
    getStyleOverrides,
    clearStyleOverrides,
    addDesignMutation,
    getDesignMutations,
    clearDesignMutations,

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
