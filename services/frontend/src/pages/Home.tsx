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
} from 'lucide-react'
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfigurationMenu from '../components/ConfigurationMenu'

// New component imports
import CreateNewCard from '../components/CreateNewCard'
import CreateProjectModal from '../components/CreateProjectModal'
import CreateResourceModal from '../components/CreateResourceModal'
import CreateTasteModal from '../components/CreateTasteModal'
import ProfileDropdown from '../components/ProfileDropdown'
import ProjectCardPreview from '../components/ProjectCardPreview'
import StyleCard from '../components/StyleCard'
import TasteCard from '../components/TasteCard'

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
  const [error, setError] = useState<string | null>(null)

  // Accordion state
  const [expandedStage, setExpandedStage] = useState<number | null>(1)
  const [selectedTasteId, setSelectedTasteId] = useState<string | null>(null)
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]) // ✅ CHANGED: Now array

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
  const [inspirationImages, setInspirationImages] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Continue project state
  const [hasActiveProject, setHasActiveProject] = useState(false)
  const [activeProjectName, setActiveProjectName] = useState<string | null>(
    null,
  )

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
        const apiProjects = await api.projects.list()

        // Transform to display format
        const displayProjects: ProjectDisplay[] = apiProjects
          .filter(p => p.metadata?.['has_ui']) // Only show projects with generated UIs
          .map(p => ({
            project_id: p.project_id,
            name: p.name,
            task_description: p.task_description,
            rendering_mode:
              (p.metadata?.['rendering_mode'] as 'design-ml' | 'react') ||
              'design-ml',
            created_at: p.created_at,
            ui: undefined,
            ui_loading: true,
            ui_error: false,
          }))
          // Sort by created_at descending (newest first)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )

        setProjects(displayProjects)

        // Fetch UI data for each project in parallel
        const projectsWithUI: ProjectDisplay[] = await Promise.all(
          displayProjects.map(async project => {
            try {
              const uiResponse = await api.llm.getUI(project.project_id)
              return {
                ...project,
                ui: uiResponse.ui as Record<string, unknown> | string,
                ui_loading: false,
                ui_error: false,
              }
            } catch (err) {
              console.error(
                `Failed to load UI for project ${project.project_id}:`,
                err,
              )
              return {
                ...project,
                ui: undefined,
                ui_loading: false,
                ui_error: true,
              }
            }
          }),
        )

        setProjects(projectsWithUI)
      } catch (err) {
        console.error('Failed to load projects:', err)
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
    }

    // Clear the came_from_editor flag after checking
    sessionStorage.removeItem('came_from_editor')
  }, [])

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
      setSelectedResourceIds([]) // ✅ CHANGED: Reset to empty array

      // ✅ CHANGED: Go to Stage 2 (resources), not Stage 3
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

  // ✅ NEW: Handler for creating resource from Stage 2 modal
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
      setTastes(
        tastes.map(t =>
          t.taste_id === selectedTasteId
            ? { ...t, resources: [...t.resources, displayResource] }
            : t,
        ),
      )

      // ✅ CHANGED: Auto-select the new resource
      setSelectedResourceIds(prev => [...prev, resource.resource_id])

      // Close modal
      setIsCreateResourceModalOpen(false)
    } catch (err) {
      console.error('Failed to create resource:', err)
      alert('Failed to create resource. Please try again.')
    } finally {
      setIsCreatingResource(false)
    }
  }

  const handleCreateProject = async (projectName: string) => {
    if (!selectedTasteId) return

    try {
      setIsCreatingProject(true)

      // ✅ CHANGED: Create project with array of resource IDs
      const project = await api.projects.create({
        name: projectName,
        task_description: ideaText,
        selected_taste_id: selectedTasteId,
        selected_resource_ids: selectedResourceIds, // ✅ Now array
        inspiration_images: inspirationImages, // ✅ NEW: Add inspiration images
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
          selected_resource_ids: project.selected_resource_ids, // ✅ Array
        }),
      )

      // Close modal
      setIsCreateProjectModalOpen(false)

      // Reset form and clear active project flag
      setIdeaText('')
      setSelectedResourceIds([]) // ✅ Reset array
      setInspirationImages([]) // ✅ NEW: Clear inspiration images
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
      // Fetch full project details from API to get taste and resource IDs
      const projectDetails = await api.projects.get(project.project_id)

      // Save project info to localStorage for Editor
      localStorage.setItem(
        'current_project',
        JSON.stringify({
          project_id: projectDetails.project_id,
          project_name: projectDetails.name,
          task_description: projectDetails.task_description,
          selected_taste_id: projectDetails.selected_taste_id,
          selected_resource_ids: projectDetails.selected_resource_ids, // ✅ Array
        }),
      )

      // Navigate to Editor
      navigate('/editor', { replace: true })
    } catch (err) {
      console.error('Failed to load project:', err)
      alert('Failed to open project. Please try again.')
    }
  }

  const handleSubmitIdea = async () => {
    if (!ideaText.trim()) return
    if (!selectedTasteId) return

    // Resources are selected in Stage 2, go straight to project
    setIsCreateProjectModalOpen(true)
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
                isSelected={selectedResourceIds.includes(resource.resource_id)} // ✅ CHANGED
                onClick={() => {
                  // ✅ CHANGED: Toggle selection instead of single select
                  setSelectedResourceIds(prev =>
                    prev.includes(resource.resource_id)
                      ? prev.filter(id => id !== resource.resource_id)
                      : [...prev, resource.resource_id],
                  )
                }}
              />
            ))}
          </div>
        </div>

        {/* ✅ NEW: Continue button when resources are selected */}
        {selectedResourceIds.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setExpandedStage(3)}
              className="px-6 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105"
              style={{
                backgroundColor: '#4A90E2',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)',
              }}
            >
              Continue ({selectedResourceIds.length} selected)
            </button>
          </div>
        )}
      </div>
    )
  }, [selectedTaste, selectedResourceIds]) // ✅ CHANGED: Depend on array

  // ============================================================================
  // STAGE LOGIC
  // ============================================================================

  // Stage 2 unlocks as soon as a taste is selected (so user can create/select resources)
  const canOpenStage2 = selectedTasteId !== null

  // Stage 3 opens when resources are selected
  const canOpenStage3 =
    selectedTasteId !== null && selectedResourceIds.length > 0

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
      hasNewButton: true, // ✅ CHANGED: Enable New button
      content: chooseStyleContent,
      canOpen: canOpenStage2,
    },
    {
      id: 3,
      title: 'Describe & Inspire',
      icon: Sparkles,
      hasNewButton: false,
      content: (
        <div className="p-6">
          {/* Task description textarea */}
          <div className="relative mb-6">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Task Description
            </label>
            <textarea
              placeholder="Describe what you want to create..."
              value={ideaText}
              onChange={e => setIdeaText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && ideaText.trim()) {
                  e.preventDefault()
                  handleSubmitIdea()
                }
              }}
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
            {ideaText.length > 0 && (
              <div
                className="absolute bottom-3 right-4 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: '#FFFFFF', color: '#929397' }}
              >
                ⏎ Enter
              </div>
            )}
          </div>

          {/* Inspiration images drag-drop area */}
          <div className="mb-6">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Inspiration Images{' '}
              <span style={{ color: '#929397' }}>(optional)</span>
            </label>
            <div
              className="rounded-xl border-2 border-dashed transition-all cursor-pointer"
              style={{
                borderColor: isDragging
                  ? '#F5C563'
                  : inspirationImages.length > 0
                    ? '#4A90E2'
                    : '#E8E1DD',
                backgroundColor: isDragging
                  ? '#FFF9E6'
                  : inspirationImages.length > 0
                    ? '#F0F7FF'
                    : '#FAFAFA',
                minHeight: '120px',
              }}
              onDragEnter={e => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={e => {
                e.preventDefault()
                if (e.currentTarget === e.target) {
                  setIsDragging(false)
                }
              }}
              onDragOver={e => {
                e.preventDefault()
              }}
              onDrop={e => {
                e.preventDefault()
                setIsDragging(false)
                const files = Array.from(e.dataTransfer.files).filter(f =>
                  f.type.startsWith('image/'),
                )
                if (files.length > 0) {
                  setInspirationImages(prev => [
                    ...prev,
                    ...files.slice(0, 5 - prev.length),
                  ])
                }
              }}
              onClick={() =>
                document.getElementById('inspiration-input')?.click()
              }
            >
              <input
                id="inspiration-input"
                type="file"
                accept="image/*"
                multiple
                onChange={e => {
                  const files = Array.from(e.target.files || [])
                  setInspirationImages(prev => [
                    ...prev,
                    ...files.slice(0, 5 - prev.length),
                  ])
                }}
                className="hidden"
              />

              {inspirationImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6">
                  <ImageIcon
                    size={32}
                    style={{ color: '#929397', marginBottom: '8px' }}
                  />
                  <p
                    className="text-sm font-medium mb-1"
                    style={{ color: '#3B3B3B' }}
                  >
                    Add inspiration images
                  </p>
                  <p className="text-xs" style={{ color: '#929397' }}>
                    Drop images here or click to browse (max 5)
                  </p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {inspirationImages.map((file, index) => (
                      <div
                        key={index}
                        className="relative w-20 h-20 rounded-lg overflow-hidden"
                        style={{ backgroundColor: '#E8E1DD' }}
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Inspiration ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setInspirationImages(prev =>
                              prev.filter((_, i) => i !== index),
                            )
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#FFFFFF',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: '#929397' }}>
                    {inspirationImages.length} / 5 images • Click to add more
                  </p>
                </div>
              )}
            </div>
          </div>

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
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setIsCreateResourceModalOpen(true) // ✅ Open modal
                        }}
                        className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:scale-105"
                        style={{ backgroundColor: '#F5C563' }}
                      >
                        <span
                          className="text-sm font-medium"
                          style={{ color: '#1F1F20' }}
                        >
                          New
                        </span>
                        <Plus size={16} style={{ color: '#1F1F20' }} />
                      </button>
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
            {projects.length === 0 ? (
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
                        className="p-4"
                        style={{ backgroundColor: '#FFFFFF' }}
                      >
                        <div
                          className="text-sm font-medium mb-1 truncate"
                          style={{ color: '#3B3B3B' }}
                        >
                          {project.name}
                        </div>
                        <div className="text-xs" style={{ color: '#929397' }}>
                          {project.rendering_mode === 'react'
                            ? 'React'
                            : 'Design ML'}
                        </div>
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

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onConfirm={handleCreateProject}
        isLoading={isCreatingProject}
      />

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
