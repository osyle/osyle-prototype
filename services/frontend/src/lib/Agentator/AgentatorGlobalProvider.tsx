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

  // Persistence (NEW)
  // eslint-disable-next-line no-unused-vars
  loadStyleOverrides: (projectId: string, screenId: string) => Promise<void>
  // eslint-disable-next-line no-unused-vars
  saveStyleOverrides: (
    // eslint-disable-next-line no-unused-vars
    projectId: string,
    // eslint-disable-next-line no-unused-vars
    screenId: string,
  ) => Promise<{ success: boolean }>
  // eslint-disable-next-line no-unused-vars
  clearAllMutations: (
    // eslint-disable-next-line no-unused-vars
    projectId: string,
    // eslint-disable-next-line no-unused-vars
    screenId: string,
  ) => Promise<{ success: boolean }>
  // eslint-disable-next-line no-unused-vars
  hasUnsavedChanges: (screenId: string) => boolean
  // eslint-disable-next-line no-unused-vars
  isLoadingMutations: (screenId: string) => boolean

  // Drag & Reorder (Phase 3-4)
  // eslint-disable-next-line no-unused-vars
  applyReorderMutations: (screenId: string, containerRef: HTMLElement) => void

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

  // Persistence state (NEW)
  const [dirtyScreens, setDirtyScreens] = useState<Set<string>>(new Set())
  const [loadingScreens, setLoadingScreens] = useState<Set<string>>(new Set())

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

      // Mark screen as dirty (has unsaved changes)
      setDirtyScreens(prev => new Set(prev).add(screenId))
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

  // Persistence methods (NEW)
  const loadStyleOverrides = useCallback(
    async (projectId: string, screenId: string) => {
      setLoadingScreens(prev => new Set(prev).add(screenId))

      try {
        const api = (await import('../../services/api')).default
        const response = await api.projects.getMutations(projectId, screenId)

        type Mutation = {
          id: string
          mutationType: string
          elementPath: string
          elementIndex: number
          data: Record<string, string>
          createdAt: string
          updatedAt: string
        }

        const styleOverridesData = response.mutations
          .filter((m: Mutation) => m.mutationType === 'style_override')
          .map((m: Mutation) => ({
            elementPath: m.elementPath,
            elementIndex: m.elementIndex,
            styles: m.data,
            timestamp: new Date(m.updatedAt).getTime(),
          }))

        setStyleOverrides(prev => ({
          ...prev,
          [screenId]: styleOverridesData,
        }))
      } catch (error) {
        console.error('Failed to load mutations:', error)
      } finally {
        setLoadingScreens(prev => {
          const next = new Set(prev)
          next.delete(screenId)
          return next
        })
      }
    },
    [],
  )

  const saveStyleOverrides = useCallback(
    async (projectId: string, screenId: string) => {
      const overrides = styleOverrides[screenId] || []

      try {
        const api = (await import('../../services/api')).default
        // Map to ensure elementIndex is always a number (default to 0 if undefined)
        const mutations = overrides.map(override => ({
          elementPath: override.elementPath,
          elementIndex: override.elementIndex ?? 0,
          styles: override.styles,
        }))
        await api.projects.saveMutations(projectId, screenId, mutations)

        // Mark as no longer dirty
        setDirtyScreens(prev => {
          const next = new Set(prev)
          next.delete(screenId)
          return next
        })

        return { success: true }
      } catch (error) {
        console.error('Failed to save mutations:', error)
        throw error
      }
    },
    [styleOverrides],
  )

  const clearAllMutations = useCallback(
    async (projectId: string, screenId: string) => {
      try {
        const api = (await import('../../services/api')).default
        await api.projects.clearMutations(projectId, screenId)

        // Clear local state
        setStyleOverrides(prev => ({
          ...prev,
          [screenId]: [],
        }))
        setDirtyScreens(prev => {
          const next = new Set(prev)
          next.delete(screenId)
          return next
        })

        return { success: true }
      } catch (error) {
        console.error('Failed to clear mutations:', error)
        throw error
      }
    },
    [],
  )

  const hasUnsavedChanges = useCallback(
    (screenId: string) => {
      return dirtyScreens.has(screenId)
    },
    [dirtyScreens],
  )

  const isLoadingMutations = useCallback(
    (screenId: string) => {
      return loadingScreens.has(screenId)
    },
    [loadingScreens],
  )

  // Drag & Reorder - Apply reorder mutations to DOM (Phase 3-4)
  const applyReorderMutations = useCallback(
    (screenId: string, containerRef: HTMLElement) => {
      const mutations =
        designMutations[screenId]?.filter(m => m.type === 'reorder') || []

      if (mutations.length === 0) return

      // Sort by timestamp to apply in order
      const sorted = [...mutations].sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
      )

      sorted.forEach(mutation => {
        try {
          // Find element by path
          const elements = containerRef.querySelectorAll(mutation.elementPath)
          const element = elements[mutation.elementIndex || 0] as HTMLElement

          if (element && mutation.newIndex !== undefined) {
            const parent = element.parentElement
            if (parent) {
              const children = Array.from(parent.children)
              const targetIndex = Math.min(
                mutation.newIndex,
                children.length - 1,
              )

              if (targetIndex >= 0 && targetIndex < children.length) {
                // Move element to new position
                if (targetIndex < children.length - 1) {
                  parent.insertBefore(element, children[targetIndex])
                } else {
                  parent.appendChild(element)
                }
              }
            }
          }
        } catch (error) {
          console.warn('Failed to apply reorder mutation:', error)
        }
      })

      console.log(
        `✅ Applied ${sorted.length} reorder mutations to screen ${screenId}`,
      )
    },
    [designMutations],
  )

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

    // Persistence (NEW)
    loadStyleOverrides,
    saveStyleOverrides,
    clearAllMutations,
    hasUnsavedChanges,
    isLoadingMutations,

    // Drag & Reorder (Phase 3-4)
    applyReorderMutations,

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
