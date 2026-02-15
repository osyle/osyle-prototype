import { signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'
import {
  ChevronDown,
  Plus,
  Palette,
  Sparkles,
  Sprout,
  Layers,
  Eye,
  Image as ImageIcon,
  X,
  FileJson,
  Trash2,
} from 'lucide-react'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfigurationMenu from '../components/ConfigurationMenu'

// New component imports
import CreateNewCard from '../components/CreateNewCard'
import CreateProjectModal from '../components/CreateProjectModal'
import CreateResourceModal from '../components/CreateResourceModal'
import CreateTasteModal from '../components/CreateTasteModal'
import DtmTrainingModal, {
  type DtmTrainingState,
} from '../components/DtmTrainingModal'
import DtrLearningModal, {
  type DtrLearningState,
} from '../components/DtrLearningModal'

import ProfileDropdown from '../components/ProfileDropdown'
import ProjectCardPreview from '../components/ProjectCardPreview'
import StyleCard from '../components/StyleCard'
import TasteCard from '../components/TasteCard'

import { useDeviceContext } from '../hooks/useDeviceContext'
import api from '../services/api'

// Type imports
import type {
  UserInfo,
  TasteDisplay,
  ResourceDisplay,
  ProjectDisplay,
} from '../types/home.types'

// ============================================================================
// MAIN HOME COMPONENT
// ============================================================================

export default function Home() {
  // ============================================================================
  // HOOKS
  // ============================================================================

  const navigate = useNavigate()
  const {
    device_info,
    rendering_mode,
    responsive_mode,
    setDeviceInfo,
    setRenderingMode,
  } = useDeviceContext()

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // User state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  // UI state
  // const [toggleOn, setToggleOn] = useState(false)
  const [activeTab, setActiveTab] = useState<'left' | 'middle' | 'right'>(
    () => {
      // Restore last active tab from localStorage
      const savedTab = localStorage.getItem('home_active_tab')
      if (
        savedTab === 'left' ||
        savedTab === 'middle' ||
        savedTab === 'right'
      ) {
        return savedTab
      }
      return 'left'
    },
  )

  // Data state
  const [tastes, setTastes] = useState<TasteDisplay[]>([])
  const [projects, setProjects] = useState<ProjectDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Accordion state
  const [expandedStage, setExpandedStage] = useState<number | null>(1)
  const [selectedTasteId, setSelectedTasteId] = useState<string | null>(null)
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([])

  // Modal state
  const [isCreateTasteModalOpen, setIsCreateTasteModalOpen] = useState(false)
  const [isCreatingTaste, setIsCreatingTaste] = useState(false)

  const [isCreateResourceModalOpen, setIsCreateResourceModalOpen] =
    useState(false)
  const [isCreatingResource, setIsCreatingResource] = useState(false)

  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)

  // Stage 3 state
  const [ideaText, setIdeaText] = useState('')

  // Screen-based design inputs
  type ScreenMode = 'exact' | 'redesign' | 'inspiration' | 'rethink'
  interface ScreenInput {
    id: string
    name: string
    description?: string
    mode: ScreenMode
    figmaFile: File | null
    imageFiles: File[] // Single for exact, multiple for inspiration
  }
  const [screens, setScreens] = useState<ScreenInput[]>([])

  // Continue project state
  const [hasActiveProject, setHasActiveProject] = useState(false)
  const [activeProjectName, setActiveProjectName] = useState<string | null>(
    null,
  )

  // DTR Learning state
  const [isDtrLearningModalOpen, setIsDtrLearningModalOpen] = useState(false)
  const [dtrLearningState, setDtrLearningState] =
    useState<DtrLearningState>('learning')
  const [dtrLearningResourceName, setDtrLearningResourceName] = useState('')
  const [dtrLearningError, setDtrLearningError] = useState<string | null>(null)
  const [pendingResourceData, setPendingResourceData] = useState<{
    tasteId: string
    resourceId: string
    resourceCount: number
  } | null>(null)

  // DTM Training state
  const [isDtmTrainingModalOpen, setIsDtmTrainingModalOpen] = useState(false)
  const [dtmTrainingState, setDtmTrainingState] =
    useState<DtmTrainingState>('training')
  const [dtmResourceCount, setDtmResourceCount] = useState(0)
  const [dtmTrainingError, setDtmTrainingError] = useState<string | null>(null)

  // DTM Rebuild state
  const [isRebuildingDtm, setIsRebuildingDtm] = useState(false)

  // Ref to track DTR close timeout (for smooth DTR→DTM transition)
  const dtrCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Project loading state
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [loadingProjectName, setLoadingProjectName] = useState<string>('')

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const selectedTaste = useMemo(
    () => tastes.find(t => t.taste_id === selectedTasteId),
    [tastes, selectedTasteId],
  )

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load user info
  useEffect(() => {
    async function loadUserInfo() {
      try {
        await getCurrentUser() // Verify user is authenticated
        const session = await fetchAuthSession()
        const email = session.tokens?.idToken?.payload['email'] as
          | string
          | undefined
        const name = session.tokens?.idToken?.payload['name'] as
          | string
          | undefined
        const picture = session.tokens?.idToken?.payload['picture'] as
          | string
          | undefined

        if (email) {
          const nameParts = (name || email.split('@')[0]).split(' ')
          const initials =
            nameParts.length > 1
              ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
              : nameParts[0].slice(0, 2).toUpperCase()

          setUserInfo({
            name: name || email.split('@')[0],
            email,
            initials,
            picture,
          })
        }
      } catch (err) {
        console.error('Failed to load user info:', err)
      }
    }

    loadUserInfo()
  }, [])

  // Load tastes from database
  useEffect(() => {
    async function loadTastes() {
      try {
        setLoading(true)
        setError(null)

        const apiTastes = await api.tastes.list()

        // Transform API tastes to display format with resources
        const displayTastes: TasteDisplay[] = await Promise.all(
          apiTastes.map(async taste => {
            try {
              // Fetch resources for this taste
              const resources = await api.resources.list(taste.taste_id)

              // Transform resources to display format with download URLs
              const displayResources: ResourceDisplay[] = await Promise.all(
                resources.map(async resource => {
                  let imageUrl: string | null = null

                  // If resource has an image, get the download URL
                  if (resource.has_image) {
                    try {
                      const resourceWithUrls = await api.resources.get(
                        taste.taste_id,
                        resource.resource_id,
                        true, // include download URLs
                      )
                      imageUrl =
                        resourceWithUrls.download_urls?.image_get_url || null
                    } catch (err) {
                      console.error(
                        `Failed to get image URL for resource ${resource.resource_id}:`,
                        err,
                      )
                    }
                  }

                  return {
                    resource_id: resource.resource_id,
                    name: resource.name,
                    imageUrl,
                    has_image: resource.has_image,
                    has_figma: resource.has_figma,
                  }
                }),
              )

              return {
                taste_id: taste.taste_id,
                name: taste.name,
                resources: displayResources,
                resource_count: taste.resource_count,
                metadata: taste.metadata,
              }
            } catch (err) {
              console.error(
                `Failed to load resources for taste ${taste.taste_id}:`,
                err,
              )
              return {
                taste_id: taste.taste_id,
                name: taste.name,
                resources: [],
                resource_count: taste.resource_count,
                metadata: taste.metadata,
              }
            }
          }),
        )

        setTastes(displayTastes)
      } catch (err) {
        console.error('Failed to load tastes:', err)
        setError('Failed to load tastes. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    loadTastes()
  }, [])

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        setProjectsLoading(true)
        const apiProjects = await api.projects.list()

        // Transform to display format - only show flow-based projects
        const displayProjects: ProjectDisplay[] = apiProjects
          .filter(
            p =>
              p.flow_mode === true &&
              p.flow_graph &&
              p.flow_graph.screens &&
              Array.isArray(p.flow_graph.screens) &&
              p.flow_graph.screens.length > 0,
          ) // Only show flow projects with generated flow graphs and screens
          .map(p => ({
            project_id: p.project_id,
            name: p.name,
            task_description: p.task_description,
            flow_mode: p.flow_mode,
            flow_graph: p.flow_graph,
            rendering_mode: p.rendering_mode || 'react',
            created_at: p.created_at,
            ui: undefined, // Not used for flows
            ui_loading: false,
            ui_error: false,
          }))
          // Sort by created_at descending (newest first)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )

        setProjects(displayProjects)
      } catch (err) {
        console.error('Failed to load projects:', err)
      } finally {
        setProjectsLoading(false)
      }
    }

    loadProjects()
  }, [])

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('home_active_tab', activeTab)
  }, [activeTab])

  // Save state to sessionStorage to preserve during navigation
  useEffect(() => {
    const stateToSave = {
      selectedTasteId,
      selectedResourceIds,
      ideaText,
      expandedStage,
    }
    sessionStorage.setItem('home_state', JSON.stringify(stateToSave))
  }, [selectedTasteId, selectedResourceIds, ideaText, expandedStage])

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('home_state')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed.selectedTasteId) setSelectedTasteId(parsed.selectedTasteId)
        if (parsed.selectedResourceIds)
          setSelectedResourceIds(parsed.selectedResourceIds)
        if (parsed.ideaText) setIdeaText(parsed.ideaText)
        if (parsed.expandedStage) setExpandedStage(parsed.expandedStage)
      } catch (err) {
        console.error('Failed to restore home state:', err)
      }
    }

    // Check for active project (user came back from Editor)
    const currentProject = localStorage.getItem('current_project')
    const cameFromEditor = sessionStorage.getItem('came_from_editor')
    if (currentProject && cameFromEditor === 'true') {
      try {
        const project = JSON.parse(currentProject)
        setHasActiveProject(true)
        setActiveProjectName(project.project_name)
      } catch (err) {
        console.error('Failed to load active project:', err)
      }

      // Restore device settings when returning from Editor (BEFORE clearing flag)
      const savedSettings = localStorage.getItem('home_device_settings')
      if (savedSettings) {
        try {
          const {
            device_info: savedDeviceInfo,
            rendering_mode: savedRenderingMode,
          } = JSON.parse(savedSettings)
          // Restore the device settings
          if (savedDeviceInfo) {
            setDeviceInfo(savedDeviceInfo)
          }
          if (savedRenderingMode) {
            setRenderingMode(savedRenderingMode)
          }
          // Clean up the saved settings
          localStorage.removeItem('home_device_settings')
        } catch (err) {
          console.error('Failed to restore device settings:', err)
        }
      }
    }

    // Clear the came_from_editor flag after checking
    sessionStorage.removeItem('came_from_editor')
  }, [setDeviceInfo, setRenderingMode])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSignOut = async () => {
    try {
      await signOut()
      // Dispatch custom event to notify App.tsx
      window.dispatchEvent(new Event('auth-signout'))
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleCreateTaste = async (name: string) => {
    try {
      setIsCreatingTaste(true)

      // Create taste in database
      const newTaste = await api.tastes.create(name, {})

      // Add to local state
      const displayTaste: TasteDisplay = {
        taste_id: newTaste.taste_id,
        name: newTaste.name,
        resources: [],
      }

      setTastes([...tastes, displayTaste])

      // Select the new taste
      setSelectedTasteId(newTaste.taste_id)
      setSelectedResourceIds([]) // Reset to empty array

      // Go to Stage 2 (resources), not Stage 3
      setExpandedStage(2)

      // Close modal
      setIsCreateTasteModalOpen(false)

      // Scroll to the new taste
      setTimeout(() => {
        const scrollContainer = document.querySelector(
          '[data-taste-scroll]',
        ) as HTMLElement
        if (scrollContainer) {
          scrollContainer.scrollLeft = scrollContainer.scrollWidth
        }
      }, 100)
    } catch (err) {
      console.error('Failed to create taste:', err)
      alert('Failed to create taste. Please try again.')
    } finally {
      setIsCreatingTaste(false)
    }
  }

  // Handler for creating resource from Stage 2 modal
  const handleCreateResource = async (
    resourceName: string,
    figmaFile: File | null,
    imageFile: File | null,
  ) => {
    if (!selectedTasteId) return

    try {
      setIsCreatingResource(true)

      // Create resource and get upload URLs
      const { resource, upload_urls } = await api.resources.create(
        selectedTasteId,
        resourceName,
        {},
      )

      // Upload files if they exist
      let hasFigma = false
      let hasImage = false

      const uploads: Promise<void>[] = []

      if (figmaFile && upload_urls.figma_put_url) {
        const figmaText = await figmaFile.text()
        const figmaJson = JSON.parse(figmaText)
        uploads.push(
          api.resources
            .uploadFiles(
              { figma_put_url: upload_urls.figma_put_url },
              figmaJson,
              undefined,
            )
            .then(() => {
              hasFigma = true
              console.log('Figma file uploaded successfully')
            })
            .catch(err => {
              console.error('Failed to upload figma file:', err)
              throw err
            }),
        )
      }

      if (imageFile && upload_urls.image_put_url) {
        uploads.push(
          api.resources
            .uploadFiles(
              { image_put_url: upload_urls.image_put_url },
              undefined,
              imageFile,
            )
            .then(() => {
              hasImage = true
              console.log('Image file uploaded successfully')
            })
            .catch(err => {
              console.error('Failed to upload image file:', err)
              throw err
            }),
        )
      }

      await Promise.all(uploads)

      // Mark files as uploaded
      await api.resources.markUploaded(
        selectedTasteId,
        resource.resource_id,
        hasFigma,
        hasImage,
      )

      // Get image download URL if image was uploaded
      const imageUrl =
        hasImage && upload_urls.image_put_url
          ? await api.resources
              .get(selectedTasteId, resource.resource_id, true)
              .then(r => r.download_urls?.image_get_url || null)
              .catch(() => null)
          : null

      const displayResource: ResourceDisplay = {
        resource_id: resource.resource_id,
        name: resource.name,
        imageUrl,
        has_image: hasImage,
        has_figma: hasFigma,
      }

      // Update local state

      const updatedTastes = tastes.map(t =>
        t.taste_id === selectedTasteId
          ? {
              ...t,
              resources: [...t.resources, displayResource],
            }
          : t,
      )

      setTastes(updatedTastes)

      // Auto-select the new resource

      setSelectedResourceIds(prev => [...prev, resource.resource_id])

      // Close modal

      setIsCreateResourceModalOpen(false)

      // Calculate resource count from updated tastes for DTM training
      const updatedTaste = updatedTastes.find(
        t => t.taste_id === selectedTasteId,
      )
      const resourceCount = updatedTaste?.resources.length || 0

      // Start DTR learning process
      setDtrLearningResourceName(resourceName)

      setPendingResourceData({
        tasteId: selectedTasteId,
        resourceId: resource.resource_id,
        resourceCount: resourceCount,
      })

      setDtrLearningState('learning')

      setDtrLearningError(null)

      setIsDtrLearningModalOpen(true)

      // Trigger DTR learning (Phase 1: Pass 1 extraction only)
      buildDtrForResource(selectedTasteId, resource.resource_id)
    } catch (err) {
      console.error('Failed to create resource:', err)

      alert('Failed to create resource. Please try again.')
    } finally {
      setIsCreatingResource(false)
    }
  }

  // ============================================================================
  // DTR LEARNING HANDLERS
  // ============================================================================

  const buildDtrForResource = async (tasteId: string, resourceId: string) => {
    try {
      // Build DTR via WebSocket (Passes 1-6)
      console.log('Building DTR for resource:', resourceId)

      // WebSocket callbacks to handle both DTR and DTM progress
      await api.llm.buildDtr(resourceId, tasteId, {
        onProgress: (stage, message, data) => {
          console.log(`[DTR Progress] ${stage}: ${message}`, data)

          // Handle DTM build trigger (backend starts this after Pass 6)
          if (stage === 'building_dtm') {
            console.log(
              'DTM build started - will transition from DTR to DTM modal',
            )

            // Cancel the DTR auto-close timeout (we'll handle closing manually)
            if (dtrCloseTimeoutRef.current) {
              clearTimeout(dtrCloseTimeoutRef.current)
              dtrCloseTimeoutRef.current = null
            }

            // Set DTR to success state immediately
            setDtrLearningState('success')

            const resourceCount = (data?.['resource_count'] as number) || 0

            // Wait 2s to show DTR success, then transition to DTM
            setTimeout(() => {
              console.log('Closing DTR modal, opening DTM modal')
              setIsDtrLearningModalOpen(false) // Close DTR modal

              // Open DTM modal after short delay for smooth transition
              setTimeout(() => {
                setDtmResourceCount(resourceCount)
                setDtmTrainingState('training')
                setDtmTrainingError(null)
                setIsDtmTrainingModalOpen(true)
              }, 300) // Small delay for visual smoothness
            }, 2000)
          } else if (stage === 'dtm_complete') {
            console.log('DTM build complete')
            setDtmTrainingState('success')

            // Close DTM modal after 2 seconds
            setTimeout(() => {
              setIsDtmTrainingModalOpen(false)
            }, 2000)
          } else if (stage === 'dtm_error') {
            console.error('DTM build error detected via progress stage')
            setDtmTrainingState('error')
            setDtmTrainingError(message)

            // Close DTR modal if still open
            setIsDtrLearningModalOpen(false)

            // DTM modal stays open to show error
          }
        },
        onComplete: result => {
          console.log('DTR build complete:', result)
          setDtrLearningState('success')

          // Auto-close DTR modal after 2s (if no DTM build triggers)
          // This timeout will be cancelled if DTM build starts
          dtrCloseTimeoutRef.current = setTimeout(() => {
            console.log('Auto-closing DTR modal (no DTM needed)')
            setIsDtrLearningModalOpen(false)
            dtrCloseTimeoutRef.current = null
          }, 2000)
        },
        onError: error => {
          console.error('DTR build error:', error)

          // Check if this is a DTM error (happens after DTM build started)
          if (error.includes('DTM build failed') || error.includes('dtm')) {
            console.error('DTM-specific error detected')
            setDtmTrainingState('error')
            setDtmTrainingError(error)

            // Close DTR modal if still open
            setIsDtrLearningModalOpen(false)

            // DTM modal will stay open to show error
            // (DtmTrainingModal handles error display)
          } else {
            // Regular DTR error
            setDtrLearningState('error')
            setDtrLearningError(error)
          }

          // Cancel any pending close timeout on error
          if (dtrCloseTimeoutRef.current) {
            clearTimeout(dtrCloseTimeoutRef.current)
            dtrCloseTimeoutRef.current = null
          }
        },
      })

      console.log('Pass 1-6 complete')
    } catch (err) {
      console.error('Failed to build DTR:', err)
      setDtrLearningState('error')
      setDtrLearningError(
        err instanceof Error ? err.message : 'Failed to learn design taste',
      )
    }
  }

  const handleDtrRetry = async () => {
    if (!pendingResourceData) return

    setDtrLearningState('learning')
    setDtrLearningError(null)

    await buildDtrForResource(
      pendingResourceData.tasteId,
      pendingResourceData.resourceId,
    )
  }

  const handleDtrClose = () => {
    setIsDtrLearningModalOpen(false)
    setPendingResourceData(null)
    setDtrLearningError(null)
  }

  const handleDtmRetry = async () => {
    // DTM retry is not supported - DTM builds automatically via WebSocket
    // Just close the modal
    setIsDtmTrainingModalOpen(false)
    setDtmTrainingError(null)
  }

  const handleDtmClose = () => {
    setIsDtmTrainingModalOpen(false)
    setDtmTrainingError(null)
    setPendingResourceData(null)
  }

  const handleRebuildDtm = async () => {
    if (!selectedTasteId) return

    try {
      setIsRebuildingDtm(true)
      setDtmTrainingError(null)

      // Count resources in selected taste
      const selectedTaste = tastes.find(t => t.taste_id === selectedTasteId)
      const resourceCount = selectedTaste?.resources.length || 0

      // Open DTM training modal with resource count
      setDtmResourceCount(resourceCount)
      setDtmTrainingState('training')
      setIsDtmTrainingModalOpen(true)

      // Call rebuild API
      const response = await api.dtm.rebuild(selectedTasteId)

      console.log('DTM rebuilt successfully:', response)

      // Update state
      setDtmTrainingState('success')

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsDtmTrainingModalOpen(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to rebuild DTM:', err)
      setDtmTrainingState('error')
      setDtmTrainingError(
        err instanceof Error ? err.message : 'Failed to rebuild taste model',
      )
    } finally {
      setIsRebuildingDtm(false)
    }
  }

  const handleCreateProject = async (projectName: string) => {
    if (!selectedTasteId) return

    try {
      setIsCreatingProject(true)

      // Filter out blank screens (screens with no meaningful content)
      // This ensures empty defaults don't get sent as screen definitions
      const nonBlankScreens = screens.filter(sd => {
        const hasName = sd.name.trim().length > 0
        const hasDescription = (sd.description?.trim().length ?? 0) > 0
        const hasFigma = sd.figmaFile !== null
        const hasImages = sd.imageFiles.length > 0

        return hasName || hasDescription || hasFigma || hasImages
      })

      // Build screen_definitions metadata array from non-blank screens only
      const screenDefsMetadata = nonBlankScreens.map(sd => ({
        name: sd.name || '',
        description: sd.description || '',
        mode: sd.mode,
        has_figma: sd.figmaFile !== null,
        has_images: sd.imageFiles.length > 0,
        image_count: sd.imageFiles.length,
      }))

      // Build screen_files object with dynamic keys (only for non-blank screens)
      const screenFiles: Record<string, File> = {}
      nonBlankScreens.forEach((sd, idx) => {
        if (sd.figmaFile) {
          screenFiles[`screen_${idx}_figma`] = sd.figmaFile
        }
        if (sd.imageFiles.length > 0) {
          sd.imageFiles.forEach((file, imgIdx) => {
            screenFiles[`screen_${idx}_image_${imgIdx}`] = file
          })
        }
      })

      // Create project with screen definitions and files
      const project = await api.projects.create({
        name: projectName,
        task_description: ideaText,
        selected_taste_id: selectedTasteId,
        selected_resource_ids: selectedResourceIds,
        device_info: device_info, // Save current device settings
        rendering_mode: rendering_mode, // Save current rendering mode
        responsive_mode: responsive_mode, // Save responsive mode setting
        // PARAMETRIC MODE RESTRICTIONS: Force single screen, no flow mode, no screen definitions
        flow_mode: rendering_mode === 'parametric' ? false : true,
        max_screens:
          rendering_mode === 'parametric'
            ? 1
            : screenDefsMetadata.length > 0
              ? screenDefsMetadata.length
              : 5,
        screen_definitions:
          rendering_mode === 'parametric' ? [] : screenDefsMetadata,
        screen_files: screenFiles, // NEW: Screen reference files
        metadata: {},
      })

      // Save project info to localStorage for Editor
      localStorage.setItem(
        'current_project',
        JSON.stringify({
          project_id: project.project_id,
          project_name: project.name,
          task_description: project.task_description,
          selected_taste_id: project.selected_taste_id,
          selected_resource_ids: project.selected_resource_ids,
          device_info: project.device_info,
          rendering_mode: project.rendering_mode,
          responsive_mode: project.responsive_mode,
          flow_mode: project.flow_mode, // NEW: Store flow_mode
          max_screens: project.max_screens, // NEW: Store max_screens
        }),
      )

      // Close modal
      setIsCreateProjectModalOpen(false)

      // Reset form and clear active project flag
      setIdeaText('')
      setSelectedResourceIds([])
      setScreens([]) // Reset to empty array
      setHasActiveProject(false)
      setActiveProjectName(null)

      // Smooth transition to Editor with a slight delay for UX
      setTimeout(() => {
        navigate('/editor', { replace: true })
      }, 300)
    } catch (err) {
      console.error('Failed to create project:', err)
      alert('Failed to create project. Please try again.')
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleContinueProject = () => {
    // User wants to continue working on existing project
    navigate('/editor', { replace: true })
  }

  const handleOpenProject = async (project: ProjectDisplay) => {
    try {
      // Show loading modal
      setLoadingProjectName(project.name)
      setIsLoadingProject(true)

      // Fetch full project details from API to get taste and resource IDs
      const projectDetails = await api.projects.get(project.project_id)

      // Save current device settings so we can restore them when user returns to Home
      localStorage.setItem(
        'home_device_settings',
        JSON.stringify({
          device_info: device_info,
          rendering_mode: rendering_mode,
        }),
      )

      // Save project info to localStorage for Editor (including project's device settings)
      localStorage.setItem(
        'current_project',
        JSON.stringify({
          project_id: projectDetails.project_id,
          project_name: projectDetails.name,
          task_description: projectDetails.task_description,
          selected_taste_id: projectDetails.selected_taste_id,
          selected_resource_ids: projectDetails.selected_resource_ids,
          device_info: projectDetails.device_info,
          rendering_mode: projectDetails.rendering_mode,
          flow_mode: projectDetails.flow_mode ?? true, // NEW: Default to true if not set
          max_screens: projectDetails.max_screens ?? 5, // NEW: Default to 5 if not set
          flow_graph: projectDetails.flow_graph, // NEW: Include flow_graph if exists
        }),
      )

      // Navigate to Editor
      navigate('/editor', { replace: true })
    } catch (err) {
      console.error('Failed to load project:', err)
      setIsLoadingProject(false)
      alert('Failed to open project. Please try again.')
    }
  }

  const handleDeleteProject = async (
    project: ProjectDisplay,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()

    if (
      !confirm(
        `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
      )
    ) {
      return
    }

    try {
      await api.projects.delete(project.project_id)

      // Remove from local state
      setProjects(prev => prev.filter(p => p.project_id !== project.project_id))

      // If this was the current project in localStorage, clear it
      const currentProject = localStorage.getItem('current_project')
      if (currentProject) {
        try {
          const parsed = JSON.parse(currentProject)
          if (parsed.project_id === project.project_id) {
            localStorage.removeItem('current_project')
          }
        } catch {
          // Ignore parsing errors
        }
      }

      console.log(`Successfully deleted project: ${project.name}`)
    } catch (err) {
      console.error('Failed to delete project:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  const handleSubmitIdea = async () => {
    if (!ideaText.trim()) return
    if (!selectedTasteId) return

    // ========================================================================
    // BUILD DTM (subset or full based on selection)
    // ========================================================================
    try {
      // Determine if using entire taste profile or specific resources
      const isUsingEntireTaste = selectedResourceIds.length === 0

      // If using entire taste, get all resource IDs
      let resourceIdsToUse = selectedResourceIds
      if (isUsingEntireTaste) {
        console.log('🌍 Using entire taste profile - fetching all resources...')
        const selectedTaste = tastes.find(t => t.taste_id === selectedTasteId)
        if (selectedTaste) {
          // Get all resource IDs (backend will validate which have DTRs)
          resourceIdsToUse = selectedTaste.resources.map(r => r.resource_id)
          console.log(`Found ${resourceIdsToUse.length} total resources`)
        }
      }

      // Show DTM training modal
      setDtmResourceCount(resourceIdsToUse.length)
      setDtmTrainingState('training')
      setDtmTrainingError(null)
      setIsDtmTrainingModalOpen(true)

      console.log('🎨 Building DTM...')
      console.log('Taste ID:', selectedTasteId)
      console.log(
        'Mode:',
        isUsingEntireTaste ? 'full (entire taste)' : 'subset (selected)',
      )
      console.log('Resource IDs:', resourceIdsToUse)

      const dtmResult = await api.dtm.getOrBuild(selectedTasteId, {
        resource_ids: resourceIdsToUse,
        mode: 'auto',
      })

      console.log('✅ Subset DTM Result:', dtmResult)
      console.log('Mode:', dtmResult.mode)
      console.log('Cached:', dtmResult.was_cached)
      console.log('Build Time:', dtmResult.build_time_ms, 'ms')
      if (dtmResult.hash) {
        console.log('Hash:', dtmResult.hash)
      }

      // Show success state
      setDtmTrainingState('success')

      // After brief pause, close DTM modal and open project modal
      setTimeout(() => {
        setIsDtmTrainingModalOpen(false)
        setIsCreateProjectModalOpen(true)
      }, 1000)
    } catch (err) {
      console.error('Failed to build subset DTM:', err)
      setDtmTrainingState('error')
      setDtmTrainingError(
        err instanceof Error ? err.message : 'Failed to build subset DTM',
      )
    }
  }

  const handleDeleteTaste = async (
    taste: TasteDisplay,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()

    if (
      !confirm(
        `Are you sure you want to delete "${taste.name}" and all its resources? This action cannot be undone.`,
      )
    ) {
      return
    }

    try {
      await api.tastes.delete(taste.taste_id)

      // Remove from local state
      setTastes(prev => prev.filter(t => t.taste_id !== taste.taste_id))

      // If this taste was selected, clear selection
      if (selectedTasteId === taste.taste_id) {
        setSelectedTasteId(null)
        setSelectedResourceIds([])
      }

      console.log(`Successfully deleted taste: ${taste.name}`)
    } catch (err) {
      console.error('Failed to delete taste:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete taste')
    }
  }

  const handleDeleteResource = async (
    tasteId: string,
    resourceId: string,
    resourceName: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()

    if (
      !confirm(
        `Are you sure you want to delete "${resourceName}"? This action cannot be undone.`,
      )
    ) {
      return
    }

    try {
      await api.resources.delete(tasteId, resourceId)

      // Refresh tastes to get updated metadata from server
      const apiTastes = await api.tastes.list()

      // Transform to TasteDisplay format (same as loadTastes)
      const displayTastes: TasteDisplay[] = await Promise.all(
        apiTastes.map(async taste => {
          try {
            // Fetch resources for this taste
            const resources = await api.resources.list(taste.taste_id)

            // Transform resources to display format with download URLs
            const displayResources: ResourceDisplay[] = await Promise.all(
              resources.map(async resource => {
                let imageUrl: string | null = null

                // If resource has an image, get the download URL
                if (resource.has_image) {
                  try {
                    const resourceWithUrls = await api.resources.get(
                      taste.taste_id,
                      resource.resource_id,
                      true, // include download URLs
                    )
                    imageUrl =
                      resourceWithUrls.download_urls?.image_get_url || null
                  } catch (err) {
                    console.error(
                      `Failed to get image URL for resource ${resource.resource_id}:`,
                      err,
                    )
                  }
                }

                return {
                  resource_id: resource.resource_id,
                  name: resource.name,
                  imageUrl,
                  has_image: resource.has_image,
                  has_figma: resource.has_figma,
                }
              }),
            )

            return {
              taste_id: taste.taste_id,
              name: taste.name,
              resources: displayResources,
              resource_count: taste.resource_count,
              metadata: taste.metadata,
            }
          } catch (err) {
            console.error(
              `Failed to load resources for taste ${taste.taste_id}:`,
              err,
            )
            return {
              taste_id: taste.taste_id,
              name: taste.name,
              resources: [],
              resource_count: taste.resource_count,
              metadata: taste.metadata,
            }
          }
        }),
      )

      setTastes(displayTastes)

      // If this resource was selected, remove it from selection
      setSelectedResourceIds(prev => prev.filter(id => id !== resourceId))

      console.log(`Successfully deleted resource: ${resourceName}`)
    } catch (err) {
      console.error('Failed to delete resource:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete resource')
    }
  }

  // ============================================================================
  // ACCORDION CONTENT
  // ============================================================================

  const startWithTasteContent = useMemo(() => {
    if (loading) {
      return (
        <div className="p-6 flex justify-center items-center min-h-[120px]">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-6 flex justify-center items-center min-h-[120px]">
          <div className="text-center" style={{ color: '#FF7262' }}>
            {error}
          </div>
        </div>
      )
    }

    if (tastes.length === 0) {
      return (
        <div className="p-6 flex justify-center items-center min-h-[120px]">
          <div style={{ width: '220px' }}>
            <CreateNewCard onClick={() => setIsCreateTasteModalOpen(true)} />
          </div>
        </div>
      )
    }

    return (
      <div className="p-6 flex gap-6 items-stretch">
        {/* Left area: scrollable tastes */}
        <div
          data-taste-scroll
          className="flex-1 overflow-x-auto overflow-y-visible taste-scroll-container"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>{`
            .taste-scroll-container::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div
            className="flex gap-6 h-full"
            style={{ minWidth: 'min-content' }}
          >
            {tastes.map(taste => (
              <div
                key={taste.taste_id}
                style={{ width: '220px' }}
                className="flex-none"
              >
                <TasteCard
                  taste={taste}
                  isSelected={selectedTasteId === taste.taste_id}
                  onClick={() => {
                    setSelectedTasteId(taste.taste_id)
                    setSelectedResourceIds([])

                    // Always go to Stage 2 after selecting taste
                    setExpandedStage(2)
                  }}
                  onDelete={e => handleDeleteTaste(taste, e)}
                />
              </div>
            ))}
          </div>
        </div>
        {/* Right area: fixed-size create card */}
        <div style={{ width: '220px' }} className="flex-none">
          <CreateNewCard onClick={() => setIsCreateTasteModalOpen(true)} />
        </div>
      </div>
    )
  }, [tastes, selectedTasteId, loading, error])

  const chooseStyleContent = useMemo(() => {
    if (!selectedTaste) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <div className="text-center" style={{ color: '#929397' }}>
            Please select a taste first
          </div>
        </div>
      )
    }

    if (selectedTaste.resources.length === 0) {
      return (
        <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
          <div className="text-center mb-4" style={{ color: '#929397' }}>
            No resources available for this taste
          </div>
          <button
            onClick={() => setIsCreateResourceModalOpen(true)}
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all hover:scale-105"
            style={{ backgroundColor: '#F5C563', color: '#1F1F20' }}
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add Resource</span>
          </button>
        </div>
      )
    }

    return (
      <div className="p-6">
        <div
          className="overflow-x-auto overflow-y-visible style-scroll-container"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>{`
            .style-scroll-container::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
            {selectedTaste.resources.map(resource => (
              <StyleCard
                key={resource.resource_id}
                resource={resource}
                isSelected={selectedResourceIds.includes(resource.resource_id)}
                onClick={() => {
                  // Toggle selection instead of single select
                  setSelectedResourceIds(prev =>
                    prev.includes(resource.resource_id)
                      ? prev.filter(id => id !== resource.resource_id)
                      : [...prev, resource.resource_id],
                  )
                }}
                onDelete={e =>
                  handleDeleteResource(
                    selectedTaste.taste_id,
                    resource.resource_id,
                    resource.name,
                    e,
                  )
                }
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex justify-end gap-3">
          {/* Rebuild DTM button - shown whenever taste has 2+ resources */}
          {selectedTaste && selectedTaste.resources.length >= 2 && (
            <button
              onClick={handleRebuildDtm}
              disabled={isRebuildingDtm}
              className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                backgroundColor: '#F59E0B',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              }}
            >
              {isRebuildingDtm ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Rebuilding...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Rebuild DTM
                </>
              )}
            </button>
          )}

          {/* Use Entire Taste button - always visible when taste is selected */}
          <button
            onClick={() => {
              setSelectedResourceIds([]) // Clear any selected resources
              setExpandedStage(3)
            }}
            className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105"
            style={{
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            Use Entire Taste Profile
          </button>

          {/* Continue button when resources are selected */}
          {selectedResourceIds.length > 0 && (
            <button
              onClick={() => setExpandedStage(3)}
              className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105"
              style={{
                backgroundColor: '#4A90E2',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)',
              }}
            >
              Continue ({selectedResourceIds.length} selected)
            </button>
          )}
        </div>
      </div>
    )
  }, [selectedTaste, selectedResourceIds])

  // ============================================================================
  // STAGE LOGIC
  // ============================================================================

  // Stage 2 unlocks as soon as a taste is selected (so user can create/select resources)
  const canOpenStage2 = selectedTasteId !== null

  // Stage 3 opens when a taste is selected (resources are optional)
  const canOpenStage3 = selectedTasteId !== null

  const stages = [
    {
      id: 1,
      title: 'Start with taste',
      icon: ChevronDown,
      hasNewButton: false,
      content: startWithTasteContent,
      canOpen: true,
    },
    {
      id: 2,
      title: 'Choose a style',
      icon: Palette,
      hasNewButton: true,
      content: chooseStyleContent,
      canOpen: canOpenStage2,
    },
    {
      id: 3,
      title: 'Describe & Inspire',
      icon: Sparkles,
      hasNewButton: false,
      content: (
        <div className="p-6 max-h-[700px] overflow-y-auto stage3-scroll">
          <style>{`
            .stage3-scroll::-webkit-scrollbar {
              width: 8px;
            }
            .stage3-scroll::-webkit-scrollbar-track {
              background: #F7F5F3;
              border-radius: 4px;
            }
            .stage3-scroll::-webkit-scrollbar-thumb {
              background: #E8E1DD;
              border-radius: 4px;
            }
            .stage3-scroll::-webkit-scrollbar-thumb:hover {
              background: #D1C7BE;
            }
          `}</style>
          {/* Project description - textarea */}
          <div className="mb-6">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Describe Your Idea
            </label>
            <textarea
              placeholder="Describe what you want to create in as much detail as you'd like..."
              value={ideaText}
              onChange={e => setIdeaText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl resize-none focus:outline-none transition-all"
              style={{
                backgroundColor: '#F7F5F3',
                color: '#3B3B3B',
                border: '2px solid transparent',
                fontSize: '14px',
                minHeight: '100px',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#F5C563'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'transparent'
              }}
              rows={4}
            />
          </div>

          {/* Parametric Mode Notice */}
          {rendering_mode === 'parametric' && (
            <div
              className="mb-6 rounded-2xl p-4"
              style={{
                backgroundColor: 'rgba(147, 51, 234, 0.08)',
                border: '2px solid rgba(147, 51, 234, 0.2)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex-shrink-0"
                  style={{ fontSize: '24px' }}
                >
                  ✨
                </div>
                <div>
                  <div
                    className="text-sm font-semibold mb-1"
                    style={{ color: '#3B3B3B' }}
                  >
                    Parametric Mode Active
                  </div>
                  <div className="text-xs" style={{ color: '#6B7280' }}>
                    Single screen generation with real-time adjustable
                    parameters. Switch to React mode in Config for multi-screen
                    flows.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Screens section - HIDDEN FOR PHASE 1 */}
          {false && rendering_mode !== 'parametric' && (
            <div className="mb-6">
              <label
                className="block text-sm font-medium mb-4"
                style={{ color: '#3B3B3B' }}
              >
                Screen Definitions{' '}
                <span style={{ color: '#929397' }}>(optional)</span>
              </label>

              {/* Screen cards - elegant design */}
              <div className="space-y-4">
                {screens.map((screen, index) => (
                  <div
                    key={screen.id}
                    className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
                    style={{
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Header */}
                    <div
                      className="px-5 py-4 flex items-center justify-between"
                      style={{ backgroundColor: '#F7F5F3' }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
                          style={{
                            backgroundColor: '#F5C563',
                            color: '#1F1F20',
                          }}
                        >
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          placeholder="Screen name (e.g., Login, Dashboard)"
                          value={screen.name}
                          onChange={e => {
                            const newScreens = [...screens]
                            newScreens[index].name = e.target.value
                            setScreens(newScreens)
                          }}
                          className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
                          style={{
                            backgroundColor: '#FFFFFF',
                            color: '#3B3B3B',
                            border: '1px solid transparent',
                          }}
                          onFocus={e => {
                            e.target.style.borderColor = '#F5C563'
                            e.target.style.boxShadow =
                              '0 0 0 3px rgba(245,197,99,0.1)'
                          }}
                          onBlur={e => {
                            e.target.style.borderColor = 'transparent'
                            e.target.style.boxShadow = 'none'
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          setScreens(screens.filter((_, i) => i !== index))
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          marginLeft: '12px',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                      {/* Description */}
                      <div>
                        <textarea
                          placeholder="What should this screen do? (optional)"
                          value={screen.description || ''}
                          onChange={e => {
                            const newScreens = [...screens]
                            newScreens[index].description = e.target.value
                            setScreens(newScreens)
                          }}
                          className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none transition-all"
                          style={{
                            backgroundColor: '#F7F5F3',
                            color: '#3B3B3B',
                            border: '2px solid transparent',
                            minHeight: '70px',
                          }}
                          onFocus={e => {
                            e.target.style.borderColor = '#F5C563'
                          }}
                          onBlur={e => {
                            e.target.style.borderColor = 'transparent'
                          }}
                          rows={2}
                        />
                      </div>

                      {/* Mode selection - elegant pill buttons */}
                      <div>
                        <p
                          className="text-xs font-medium mb-2"
                          style={{ color: '#929397' }}
                        >
                          Mode
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const newScreens = [...screens]
                              newScreens[index].mode = 'exact'
                              setScreens(newScreens)
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                            style={{
                              backgroundColor:
                                screen.mode === 'exact' ? '#9333EA' : '#F7F5F3',
                              color:
                                screen.mode === 'exact' ? '#FFFFFF' : '#929397',
                              boxShadow:
                                screen.mode === 'exact'
                                  ? '0 4px 12px rgba(147,51,234,0.2)'
                                  : 'none',
                            }}
                          >
                            Exact Recreation
                          </button>
                          <button
                            onClick={() => {
                              const newScreens = [...screens]
                              newScreens[index].mode = 'redesign'
                              setScreens(newScreens)
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                            style={{
                              backgroundColor:
                                screen.mode === 'redesign'
                                  ? '#4A90E2'
                                  : '#F7F5F3',
                              color:
                                screen.mode === 'redesign'
                                  ? '#FFFFFF'
                                  : '#929397',
                              boxShadow:
                                screen.mode === 'redesign'
                                  ? '0 4px 12px rgba(74,144,226,0.2)'
                                  : 'none',
                            }}
                          >
                            Redesign
                          </button>
                          <button
                            onClick={() => {
                              const newScreens = [...screens]
                              newScreens[index].mode = 'rethink'
                              setScreens(newScreens)
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                            style={{
                              backgroundColor:
                                screen.mode === 'rethink'
                                  ? '#F59E0B'
                                  : '#F7F5F3',
                              color:
                                screen.mode === 'rethink'
                                  ? '#FFFFFF'
                                  : '#929397',
                              boxShadow:
                                screen.mode === 'rethink'
                                  ? '0 4px 12px rgba(245,158,11,0.2)'
                                  : 'none',
                            }}
                          >
                            Rethink
                          </button>
                          <button
                            onClick={() => {
                              const newScreens = [...screens]
                              newScreens[index].mode = 'inspiration'
                              newScreens[index].figmaFile = null
                              setScreens(newScreens)
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                            style={{
                              backgroundColor:
                                screen.mode === 'inspiration'
                                  ? '#10B981'
                                  : '#F7F5F3',
                              color:
                                screen.mode === 'inspiration'
                                  ? '#FFFFFF'
                                  : '#929397',
                              boxShadow:
                                screen.mode === 'inspiration'
                                  ? '0 4px 12px rgba(16,185,129,0.2)'
                                  : 'none',
                            }}
                          >
                            Loose Inspiration
                          </button>
                        </div>
                      </div>

                      {/* Upload zones - elegant design */}
                      {screen.mode === 'exact' ||
                      screen.mode === 'redesign' ||
                      screen.mode === 'rethink' ? (
                        <div className="grid grid-cols-2 gap-3">
                          {/* Figma upload - elegant */}
                          <div>
                            <input
                              id={`figma-${screen.id}`}
                              type="file"
                              accept=".json"
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (file && file.name.endsWith('.json')) {
                                  const newScreens = [...screens]
                                  newScreens[index].figmaFile = file
                                  setScreens(newScreens)
                                }
                              }}
                              className="hidden"
                            />
                            <div
                              onClick={() =>
                                document
                                  .getElementById(`figma-${screen.id}`)
                                  ?.click()
                              }
                              className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02]"
                              style={{
                                backgroundColor: screen.figmaFile
                                  ? '#EFF6FF'
                                  : '#F7F5F3',
                                border: screen.figmaFile
                                  ? '2px dashed #4A90E2'
                                  : '2px dashed #E8E1DD',
                                minHeight: '120px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {screen.figmaFile ? (
                                <>
                                  <FileJson
                                    size={32}
                                    style={{
                                      color: '#4A90E2',
                                      marginBottom: '8px',
                                    }}
                                  />
                                  <p
                                    className="text-xs text-center font-medium mb-1"
                                    style={{ color: '#3B3B3B' }}
                                  >
                                    {screen.figmaFile.name.length > 20
                                      ? screen.figmaFile.name.substring(0, 17) +
                                        '...'
                                      : screen.figmaFile.name}
                                  </p>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation()
                                      const newScreens = [...screens]
                                      newScreens[index].figmaFile = null
                                      setScreens(newScreens)
                                    }}
                                    className="mt-2 px-3 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105"
                                    style={{
                                      backgroundColor: '#FEE2E2',
                                      color: '#DC2626',
                                    }}
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : (
                                <>
                                  <FileJson
                                    size={32}
                                    style={{
                                      color: '#929397',
                                      marginBottom: '8px',
                                    }}
                                  />
                                  <p
                                    className="text-xs text-center font-medium"
                                    style={{ color: '#3B3B3B' }}
                                  >
                                    Figma JSON
                                  </p>
                                  <p
                                    className="text-xs text-center mt-1"
                                    style={{ color: '#929397' }}
                                  >
                                    Click to upload
                                  </p>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Image upload - elegant */}
                          <div>
                            <input
                              id={`image-${screen.id}`}
                              type="file"
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const newScreens = [...screens]
                                  newScreens[index].imageFiles = [file]
                                  setScreens(newScreens)
                                }
                              }}
                              className="hidden"
                            />
                            <div
                              onClick={() =>
                                document
                                  .getElementById(`image-${screen.id}`)
                                  ?.click()
                              }
                              className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02]"
                              style={{
                                backgroundColor:
                                  screen.imageFiles.length > 0
                                    ? '#EFF6FF'
                                    : '#F7F5F3',
                                border:
                                  screen.imageFiles.length > 0
                                    ? '2px dashed #4A90E2'
                                    : '2px dashed #E8E1DD',
                                minHeight: '120px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {screen.imageFiles.length > 0 ? (
                                <>
                                  <ImageIcon
                                    size={32}
                                    style={{
                                      color: '#4A90E2',
                                      marginBottom: '8px',
                                    }}
                                  />
                                  <p
                                    className="text-xs text-center font-medium mb-1"
                                    style={{ color: '#3B3B3B' }}
                                  >
                                    {screen.imageFiles[0].name.length > 20
                                      ? screen.imageFiles[0].name.substring(
                                          0,
                                          17,
                                        ) + '...'
                                      : screen.imageFiles[0].name}
                                  </p>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation()
                                      const newScreens = [...screens]
                                      newScreens[index].imageFiles = []
                                      setScreens(newScreens)
                                    }}
                                    className="mt-2 px-3 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105"
                                    style={{
                                      backgroundColor: '#FEE2E2',
                                      color: '#DC2626',
                                    }}
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : (
                                <>
                                  <ImageIcon
                                    size={32}
                                    style={{
                                      color: '#929397',
                                      marginBottom: '8px',
                                    }}
                                  />
                                  <p
                                    className="text-xs text-center font-medium"
                                    style={{ color: '#3B3B3B' }}
                                  >
                                    Screenshot
                                  </p>
                                  <p
                                    className="text-xs text-center mt-1"
                                    style={{ color: '#929397' }}
                                  >
                                    Click to upload
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Inspiration mode - elegant multi-image upload
                        <div>
                          <input
                            id={`images-${screen.id}`}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={e => {
                              const files = Array.from(e.target.files || [])
                              if (files.length > 0) {
                                const newScreens = [...screens]
                                newScreens[index].imageFiles = [
                                  ...newScreens[index].imageFiles,
                                  ...files,
                                ]
                                setScreens(newScreens)
                              }
                            }}
                            className="hidden"
                          />
                          <div
                            onClick={() =>
                              document
                                .getElementById(`images-${screen.id}`)
                                ?.click()
                            }
                            className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
                            style={{
                              backgroundColor:
                                screen.imageFiles.length > 0
                                  ? '#ECFDF5'
                                  : '#F7F5F3',
                              border:
                                screen.imageFiles.length > 0
                                  ? '2px dashed #10B981'
                                  : '2px dashed #E8E1DD',
                              minHeight: '120px',
                            }}
                          >
                            {screen.imageFiles.length > 0 ? (
                              <div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {screen.imageFiles.map((file, fileIndex) => (
                                    <div
                                      key={fileIndex}
                                      className="relative group"
                                    >
                                      <div
                                        className="w-20 h-20 rounded-lg overflow-hidden"
                                        style={{
                                          backgroundColor: '#E8E1DD',
                                          boxShadow:
                                            '0 2px 8px rgba(0,0,0,0.08)',
                                        }}
                                      >
                                        <img
                                          src={URL.createObjectURL(file)}
                                          alt={`Inspiration ${fileIndex + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation()
                                          const newScreens = [...screens]
                                          newScreens[index].imageFiles =
                                            newScreens[index].imageFiles.filter(
                                              (_, i) => i !== fileIndex,
                                            )
                                          setScreens(newScreens)
                                        }}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                        style={{
                                          backgroundColor: '#DC2626',
                                          color: '#FFFFFF',
                                        }}
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <p
                                  className="text-xs text-center"
                                  style={{ color: '#929397' }}
                                >
                                  Click to add more images
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full">
                                <ImageIcon
                                  size={32}
                                  style={{
                                    color: '#929397',
                                    marginBottom: '8px',
                                  }}
                                />
                                <p
                                  className="text-xs text-center font-medium"
                                  style={{ color: '#3B3B3B' }}
                                >
                                  Inspiration Images
                                </p>
                                <p
                                  className="text-xs text-center mt-1"
                                  style={{ color: '#929397' }}
                                >
                                  Upload multiple references
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Screen button - at the bottom for easy access */}
              <button
                onClick={() => {
                  setScreens([
                    ...screens,
                    {
                      id: Math.random().toString(36).substr(2, 9),
                      name: '',
                      description: '',
                      mode: 'rethink' as const,
                      figmaFile: null,
                      imageFiles: [],
                    },
                  ])
                }}
                className="w-full mt-4 px-4 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.01] border-2 border-dashed flex items-center justify-center gap-2"
                style={{
                  borderColor: '#E8E1DD',
                  backgroundColor: '#FAFAFA',
                  color: '#3B3B3B',
                }}
              >
                <Plus size={18} style={{ color: '#3B3B3B' }} />
                Add Screen
              </button>

              {/* Empty state when no screens */}
              {screens.length === 0 && (
                <div
                  className="rounded-2xl p-8 text-center mt-4"
                  style={{
                    backgroundColor: '#F7F5F3',
                    border: '2px dashed #E8E1DD',
                  }}
                >
                  <Layers
                    size={32}
                    style={{ color: '#929397', margin: '0 auto 12px' }}
                  />
                  <p
                    className="text-sm font-medium mb-1"
                    style={{ color: '#3B3B3B' }}
                  >
                    No screens defined yet
                  </p>
                  <p className="text-xs" style={{ color: '#929397' }}>
                    Optional: Add screens to define your flow structure
                  </p>
                </div>
              )}
            </div>
          )}
          {/* End of screen definitions section - PARAMETRIC MODE CONDITIONAL */}

          {/* Generate button */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmitIdea}
              disabled={!ideaText.trim()}
              className="px-6 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: ideaText.trim() ? '#F5C563' : '#E8E1DD',
                color: ideaText.trim() ? '#1F1F20' : '#929397',
                boxShadow: ideaText.trim()
                  ? '0 4px 12px rgba(245, 197, 99, 0.3)'
                  : 'none',
              }}
            >
              Generate UI →
            </button>
          </div>
        </div>
      ),
      canOpen: canOpenStage3,
    },
  ]

  const tabs = [
    { id: 'left' as const, icon: <Sprout size={18} /> },
    { id: 'middle' as const, icon: <Layers size={18} /> },
    { id: 'right' as const, icon: <Eye size={18} /> },
  ]

  const galleryItems = [
    { id: 1, title: 'Milkinside', bgColor: '#A8B5C8', height: 320 },
    { id: 2, title: 'Futuristic', bgColor: '#B8C5D8', height: 240 },
    { id: 3, title: 'Layouts', bgColor: '#9ABAAA', height: 280 },
    { id: 4, title: 'Ambient', bgColor: '#B5B8C8', height: 360 },
    { id: 5, title: 'RonDesign', bgColor: '#C8B5A5', height: 420 },
  ]

  // ============================================================================
  // RENDER TAB CONTENT
  // ============================================================================

  const renderTabContent = () => {
    if (activeTab === 'left') {
      return (
        <div className="flex-1 flex flex-col items-center justify-start pt-16 px-8">
          <h1
            className="text-5xl font-light mb-12 mt-20"
            style={{ color: '#3B3B3B' }}
          >
            New project
          </h1>

          {/* Accordion */}
          <div className="w-full max-w-2xl">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className="mb-3 rounded-2xl overflow-hidden transition-all duration-500"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  opacity: stage.canOpen ? 1 : 0.5,
                }}
              >
                {/* Stage Header */}
                <button
                  onClick={() => {
                    if (stage.canOpen) {
                      setExpandedStage(
                        expandedStage === stage.id ? null : stage.id,
                      )
                    }
                  }}
                  className="w-full flex items-center justify-between px-6 py-5 transition-all hover:bg-opacity-95"
                  disabled={!stage.canOpen}
                  style={{
                    cursor: stage.canOpen ? 'pointer' : 'not-allowed',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-lg font-medium"
                      style={{ color: '#929397' }}
                    >
                      {index + 1}.
                    </span>
                    <span
                      className="text-lg font-normal"
                      style={{ color: '#3B3B3B' }}
                    >
                      {stage.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {stage.hasNewButton && expandedStage === stage.id && (
                      <div
                        onClick={e => {
                          e.stopPropagation()
                          setIsCreateResourceModalOpen(true)
                        }}
                        className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: '#F5C563' }}
                      >
                        <span
                          className="text-sm font-medium"
                          style={{ color: '#1F1F20' }}
                        >
                          New
                        </span>
                        <Plus size={16} style={{ color: '#1F1F20' }} />
                      </div>
                    )}
                    <div
                      className="transition-transform duration-300"
                      style={{
                        transform:
                          expandedStage === stage.id
                            ? 'rotate(180deg)'
                            : 'rotate(0deg)',
                      }}
                    >
                      {expandedStage === stage.id ? (
                        <ChevronDown size={20} style={{ color: '#3B3B3B' }} />
                      ) : (
                        React.createElement(stage.icon, {
                          size: 20,
                          style: { color: '#929397' },
                        })
                      )}
                    </div>
                  </div>
                </button>
                {/* Stage Content */}
                <div
                  className="overflow-hidden transition-all duration-500 ease-in-out"
                  style={{
                    maxHeight: expandedStage === stage.id ? '800px' : '0px',
                    opacity: expandedStage === stage.id ? 1 : 0,
                  }}
                >
                  <div style={{ backgroundColor: '#F7F5F3' }}>
                    {stage.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    } else if (activeTab === 'middle') {
      return (
        <div className="flex-1 flex px-8 pt-8 gap-6">
          {/* Left column - Gallery items */}
          <div className="flex flex-col gap-4" style={{ width: '280px' }}>
            {galleryItems.map(item => (
              <div
                key={item.id}
                className="cursor-pointer transition-all hover:scale-105"
                style={{
                  height: `${item.height}px`,
                  position: 'relative',
                }}
              >
                {/* Container for the entire card */}
                <div
                  className="rounded-3xl overflow-hidden relative"
                  style={{
                    height: '100%',
                    backgroundColor: item.bgColor,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}
                >
                  {/* 3D Card Stack Container */}
                  <div
                    className="absolute"
                    style={{
                      left: '50%',
                      top: '48%',
                      transform: 'translate(-50%, -50%)',
                      width: '180px',
                      height: '240px',
                    }}
                  >
                    {/* Back card (furthest) - smaller, positioned HIGHER to peek out on top */}
                    <div
                      className="absolute rounded-2xl"
                      style={{
                        width: '150px',
                        height: '210px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        left: '50%',
                        top: '40%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1,
                      }}
                    />

                    {/* Middle card - positioned between, also peeks out on top */}
                    <div
                      className="absolute rounded-2xl"
                      style={{
                        width: '165px',
                        height: '225px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                        left: '50%',
                        top: '45%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2,
                      }}
                    />

                    {/* Front card with image - full size, positioned lowest */}
                    <div
                      className="absolute rounded-2xl overflow-hidden"
                      style={{
                        width: '180px',
                        height: '240px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 3,
                        backgroundImage: `linear-gradient(135deg, ${item.bgColor}40 0%, ${item.bgColor}20 100%)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      {/* Placeholder for resource image - will be replaced with actual image.png */}
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#929397',
                          fontSize: '14px',
                        }}
                      >
                        {/* Image will go here */}
                      </div>
                    </div>
                  </div>

                  {/* Bottom blur envelope with PROPER DEPRESSION */}
                  <div
                    className="absolute left-0 right-0"
                    style={{
                      bottom: 0,
                      height: '35%',
                      zIndex: 5,
                    }}
                  >
                    {/* Frosted glass with depression - middle third dips down */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: '100%',
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        clipPath:
                          'polygon(0 0, 33% 0, 38% 18%, 62% 18%, 67% 0, 100% 0, 100% 100%, 0 100%)',
                      }}
                    />

                    {/* Content over the blur */}
                    <div
                      className="absolute left-0 right-0 bottom-0 px-6 pb-6 pt-8"
                      style={{
                        zIndex: 6,
                      }}
                    >
                      <h3
                        className="text-xl font-semibold mb-1"
                        style={{ color: '#1F1F20' }}
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm" style={{ color: '#929397' }}>
                        by Milkinside
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right area - Main content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">08</div>
              <div className="text-lg" style={{ color: '#929397' }}>
                Gallery Tab
              </div>
            </div>
          </div>
        </div>
      )
    } else {
      // Projects Gallery View (Projects Tab)
      return (
        <div className="flex-1 overflow-y-auto px-8 pt-8 pb-16">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 mt-20">
              <h2
                className="text-2xl font-medium mb-1"
                style={{ color: '#3B3B3B' }}
              >
                Here are your past projects
              </h2>
              <p className="text-sm" style={{ color: '#929397' }}>
                Created with Osyle AI ®
              </p>
            </div>

            {/* Projects Grid */}
            {projectsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div
                    className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-current border-r-transparent mb-4"
                    style={{ color: '#4A90E2' }}
                  ></div>
                  <div className="text-lg mb-2" style={{ color: '#3B3B3B' }}>
                    Loading projects...
                  </div>
                  <div className="text-sm" style={{ color: '#929397' }}>
                    Please wait
                  </div>
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Sparkles
                    size={48}
                    style={{ color: '#929397', margin: '0 auto 16px' }}
                  />
                  <div className="text-lg mb-2" style={{ color: '#3B3B3B' }}>
                    No projects yet
                  </div>
                  <div className="text-sm" style={{ color: '#929397' }}>
                    Create a project to see it here
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '24px',
                  gridAutoFlow: 'dense',
                }}
              >
                {projects.map((project, index) => {
                  // Alternate between two heights: tall and short
                  const isTall = index % 2 === 0
                  const cardHeight = isTall ? 400 : 280

                  return (
                    <div
                      key={project.project_id}
                      className="rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col"
                      style={{
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        height: `${cardHeight}px`,
                      }}
                      onClick={() => handleOpenProject(project)}
                    >
                      {/* Card content area with UI preview */}
                      <div className="flex-1 overflow-hidden">
                        <ProjectCardPreview
                          project={project}
                          cardHeight={cardHeight}
                        />
                      </div>

                      {/* Card footer with project info */}
                      <div
                        className="p-4 flex items-center justify-between"
                        style={{ backgroundColor: '#FFFFFF' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-medium mb-1 truncate"
                            style={{ color: '#3B3B3B' }}
                          >
                            {project.name}
                          </div>
                          <div className="text-xs" style={{ color: '#929397' }}>
                            {project.rendering_mode === 'react'
                              ? 'React'
                              : 'Parametric'}
                          </div>
                        </div>

                        {/* JSON View Button */}
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            const jsonString = JSON.stringify(project, null, 2)
                            const blob = new Blob([jsonString], {
                              type: 'application/json',
                            })
                            const url = URL.createObjectURL(blob)
                            window.open(url, '_blank')
                          }}
                          className="ml-3 p-2 rounded-lg transition-all hover:scale-110"
                          style={{
                            backgroundColor: '#F4F4F4',
                            color: '#4A90E2',
                          }}
                          title="View raw JSON"
                        >
                          <FileJson size={18} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={e => handleDeleteProject(project, e)}
                          className="ml-2 p-2 rounded-lg transition-all hover:scale-110"
                          style={{
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                          }}
                          title="Delete project"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )
    }
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div
      className="min-h-screen min-w-screen flex flex-col"
      style={{ backgroundColor: '#EDEBE9' }}
    >
      {/* Create Taste Modal */}
      <CreateTasteModal
        isOpen={isCreateTasteModalOpen}
        onClose={() => setIsCreateTasteModalOpen(false)}
        onConfirm={handleCreateTaste}
        isLoading={isCreatingTaste}
      />

      {/* Create Resource Modal */}
      <CreateResourceModal
        isOpen={isCreateResourceModalOpen}
        onClose={() => setIsCreateResourceModalOpen(false)}
        onConfirm={handleCreateResource}
        isLoading={isCreatingResource}
      />

      {/* DTR Learning Modal */}
      <DtrLearningModal
        isOpen={isDtrLearningModalOpen}
        state={dtrLearningState}
        resourceName={dtrLearningResourceName}
        errorMessage={dtrLearningError || undefined}
        onRetry={handleDtrRetry}
        onClose={handleDtrClose}
      />

      {/* DTM Training Modal */}
      <DtmTrainingModal
        isOpen={isDtmTrainingModalOpen}
        state={dtmTrainingState}
        resourceCount={dtmResourceCount}
        errorMessage={dtmTrainingError || undefined}
        onRetry={handleDtmRetry}
        onClose={handleDtmClose}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onConfirm={handleCreateProject}
        isLoading={isCreatingProject}
      />

      {/* Project Loading Modal */}
      {isLoadingProject && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
          }}
        >
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-6"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              minWidth: '400px',
            }}
          >
            {/* Spinner */}
            <div
              className="w-12 h-12 border-4 rounded-full animate-spin"
              style={{
                borderColor: '#E5E7EB',
                borderTopColor: '#4A90E2',
              }}
            />

            {/* Loading text */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-lg font-medium" style={{ color: '#3B3B3B' }}>
                Loading Project
              </div>
              <div className="text-sm text-center" style={{ color: '#929397' }}>
                {loadingProjectName}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Project Button - Only shows when coming back from Editor */}
      {hasActiveProject && activeProjectName && (
        <button
          onClick={handleContinueProject}
          className="fixed bottom-8 right-8 px-6 py-4 rounded-full font-medium text-sm flex items-center gap-3 transition-all hover:scale-105 animate-fade-in"
          style={{
            backgroundColor: '#4A90E2',
            color: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(74, 144, 226, 0.3)',
            zIndex: 9999,
          }}
        >
          <span className="text-base">Continue Project</span>
          <div
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          >
            {activeProjectName}
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      )}

      {/* Top Navigation - Fixed */}
      <div className="relative px-8 py-4" style={{ pointerEvents: 'none' }}>
        {/* Left - Toggle (Commented out for now, will implement dark mode later) */}
        {/* <div 
          className="absolute flex items-center gap-3"
          style={{
            left: '32px',
            top: '16px',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
        >
          <button
            onClick={() => setToggleOn(!toggleOn)}
            className="relative transition-all duration-300"
            style={{
              width: '42px',
              height: '42px',
              backgroundColor: toggleOn ? '#3B3B3B' : '#FFFFFF',
              borderRadius: '8px',
              boxShadow: '0 1.6px 6.4px rgba(0,0,0,0.08)',
            }}
          >
            <div
              className="absolute transition-all duration-300"
              style={{
                width: '14px',
                height: '28px',
                backgroundColor: toggleOn ? '#FFFFFF' : '#3B3B3B',
                borderRadius: '6px',
                top: '7px',
                left: toggleOn ? '21px' : '6px',
              }}
            />
          </button>
        </div> */}

        {/* Center - Tabs */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1 p-1"
          style={{
            top: '16px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderRadius: '16px',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-6 py-2 transition-all duration-300 text-sm"
              style={{
                backgroundColor:
                  activeTab === tab.id ? '#F4F4F4' : 'transparent',
                color: activeTab === tab.id ? '#3B3B3B' : '#929397',
                borderRadius: '12px',
              }}
            >
              {tab.icon}
            </button>
          ))}
        </div>

        {/* Right - Config Menu & Profile */}
        <div
          className="absolute flex items-center gap-3"
          style={{
            right: '32px',
            top: '16px',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
        >
          <ConfigurationMenu />

          <ProfileDropdown userInfo={userInfo} onSignOut={handleSignOut} />
        </div>
      </div>

      {/* Main Content - Changes based on active tab */}
      <div className="flex-1 overflow-hidden">
        <div
          className="h-full transition-all duration-500 ease-in-out"
          style={{
            opacity: 1,
            transform: 'translateY(0)',
          }}
        >
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
