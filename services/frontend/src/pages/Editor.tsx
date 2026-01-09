import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth'
import {
  ArrowLeft,
  Settings,
  Smartphone,
  Smile,
  Maximize2,
  ChevronDown,
  RotateCcw,
  Palette,
  Sparkles,
  Plus,
  List,
  Wand2,
  Sliders,
  MessageSquare,
  Layers,
  Eye,
  Type,
  Layout,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AddInspirationModal from '../components/AddInspirationModal'
import DeviceFrame from '../components/DeviceFrame'
import DynamicReactRenderer from '../components/DynamicReactRenderer'
import FlowConnections from '../components/FlowConnections'
import InfiniteCanvas, {
  type InfiniteCanvasHandle,
} from '../components/InfiniteCanvas'
import ParametricControls from '../components/ParametricControls'
import ProfileDropdown from '../components/ProfileDropdown'
import PrototypeCanvas from '../components/PrototypeCanvas'
import PrototypeRunner from '../components/PrototypeRunner'
import VersionHistory from '../components/VersionHistory'
import { useDeviceContext } from '../hooks/useDeviceContext'
import api from '../services/api'
import { type FlowGraph } from '../types/home.types'
import type {
  ParameterValues,
  VariationSpace,
  VariationDimension,
} from '../types/parametric.types'

type GenerationStage = 'idle' | 'generating' | 'complete' | 'error'
type RethinkStage =
  | 'analyzing'
  | 'principles'
  | 'exploring'
  | 'synthesizing'
  | 'flow'
  | 'screens'
  | null

interface UserInfo {
  name: string
  email: string
  initials: string
  picture?: string
}

// Extended screen type with loading states
// These fields are added dynamically during progressive generation
interface ScreenWithLoadingState {
  screen_id: string
  name: string
  description?: string
  task_description: string
  platform: string
  dimensions: { width: number; height: number }
  screen_type?: string
  semantic_role?: string
  ui_code?: string | null
  ui_loading?: boolean
  ui_error?: boolean
  [key: string]: unknown // Allow other fields from FlowGraph
}

export default function Editor() {
  const navigate = useNavigate()

  const { device_info, rendering_mode, setDeviceInfo, setRenderingMode } =
    useDeviceContext()

  // Canvas ref for programmatic control
  const canvasRef = useRef<InfiniteCanvasHandle>(null)
  const hasInitialized = useRef(false)

  const [activeTab, setActiveTab] = useState('Concept')
  const [inputText, setInputText] = useState('')
  const [selectedStyle, setSelectedStyle] = useState({
    title: 'Playful & bold',
    bg: 'linear-gradient(135deg, #FFB6A3 0%, #E8C5E8 33%, #B8D4E8 66%, #A8E8C0 100%)',
  })

  // Parametric controls state
  const [parameterValues, setParameterValues] = useState<ParameterValues>({})

  // User info state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  // Editable project title/description state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')

  // Right panel tab state
  const [activeRightTab, setActiveRightTab] = useState<
    'explore' | 'refine' | 'iterate'
  >('explore')

  // Style dropdown state
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false)

  // Generation state
  const [generationStage, setGenerationStage] =
    useState<GenerationStage>('idle')
  const [rethinkStage, setRethinkStage] = useState<RethinkStage>(null)
  const [flowGraph, setFlowGraph] = useState<FlowGraph | null>(null)
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null)
  const [isFlowNavigatorOpen, setIsFlowNavigatorOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Compute selected screen for parametric controls
  const selectedScreen =
    flowGraph?.screens.find(s => s.screen_id === selectedScreenId) || null

  // Right panel collapsed state
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)

  // Fullscreen prototype state
  const [isFullscreenPrototype, setIsFullscreenPrototype] = useState(false)

  // Inspiration images state
  const [inspirationImages, setInspirationImages] = useState<
    Array<{ key: string; url: string; filename: string }>
  >([])
  const [isAddInspirationModalOpen, setIsAddInspirationModalOpen] =
    useState(false)
  const [isAddingInspiration, setIsAddingInspiration] = useState(false)

  // Version history state - RESTORED!
  const [currentFlowVersion, setCurrentFlowVersion] = useState<number>(1)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)
  const [isReverting, setIsReverting] = useState(false)

  // Initialize parameter values from variation_space when screen changes
  useEffect(() => {
    if (selectedScreen && rendering_mode === 'parametric') {
      // Type assertion for variation_space since it's from dynamic data
      const variationSpace = selectedScreen['variation_space'] as
        | VariationSpace
        | undefined
      if (variationSpace && variationSpace.dimensions) {
        const defaults: ParameterValues = {}
        variationSpace.dimensions.forEach((dim: VariationDimension) => {
          defaults[dim.id] = dim.default_value
        })
        setParameterValues(defaults)
      }
    }
  }, [selectedScreenId, rendering_mode, selectedScreen])

  // 4 tabs - Video pitch and Presentation disabled for now
  const tabs = [
    { name: 'Concept', enabled: true },
    { name: 'Prototype', enabled: true },
    { name: 'Video pitch', enabled: false },
    { name: 'Presentation', enabled: false },
  ]

  const styleOptions = [
    {
      title: 'Playful & bold',
      bg: 'linear-gradient(135deg, #FFB6A3 0%, #E8C5E8 33%, #B8D4E8 66%, #A8E8C0 100%)',
    },
    {
      title: 'Minimal & clean',
      bg: 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 50%, #D8D8D8 100%)',
    },
    {
      title: 'Dark & moody',
      bg: 'linear-gradient(135deg, #2D2D2D 0%, #1F1F20 50%, #000000 100%)',
    },
  ]

  const handleBackToHome = () => {
    if (generationStage !== 'complete' && generationStage !== 'error') {
      return
    }

    const currentProject = localStorage.getItem('current_project')
    if (currentProject) {
      try {
        const project = JSON.parse(currentProject)
        project.flow_graph = flowGraph
        localStorage.setItem('current_project', JSON.stringify(project))
      } catch (err) {
        console.error('Failed to update project:', err)
      }
    }

    sessionStorage.setItem('came_from_editor', 'true')
    navigate('/')
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (err) {
      console.error('Sign out failed:', err)
    }
  }

  const handleTitleEdit = () => {
    setEditedTitle(flowGraph?.display_title || 'Untitled Project')
    setIsEditingTitle(true)
  }

  const handleTitleSave = async () => {
    if (flowGraph && editedTitle.trim()) {
      const updatedFlowGraph = {
        ...flowGraph,
        display_title: editedTitle.trim(),
      }
      setFlowGraph(updatedFlowGraph)

      // Update in localStorage
      const currentProject = localStorage.getItem('current_project')
      if (currentProject) {
        try {
          const project = JSON.parse(currentProject)
          project.flow_graph = updatedFlowGraph
          localStorage.setItem('current_project', JSON.stringify(project))

          // Save to database
          await api.projects.updateFlowGraph(
            project.project_id,
            updatedFlowGraph,
          )
          console.log('✅ Title saved to database')
        } catch (err) {
          console.error('Failed to update title in database:', err)
        }
      }
    }
    setIsEditingTitle(false)
  }

  const handleTitleCancel = () => {
    setIsEditingTitle(false)
    setEditedTitle('')
  }

  const handleDescriptionEdit = () => {
    setEditedDescription(flowGraph?.display_description || 'No description')
    setIsEditingDescription(true)
  }

  const handleDescriptionSave = async () => {
    if (flowGraph && editedDescription.trim()) {
      const updatedFlowGraph = {
        ...flowGraph,
        display_description: editedDescription.trim(),
      }
      setFlowGraph(updatedFlowGraph)

      // Update in localStorage
      const currentProject = localStorage.getItem('current_project')
      if (currentProject) {
        try {
          const project = JSON.parse(currentProject)
          project.flow_graph = updatedFlowGraph
          localStorage.setItem('current_project', JSON.stringify(project))

          // Save to database
          await api.projects.updateFlowGraph(
            project.project_id,
            updatedFlowGraph,
          )
          console.log('✅ Description saved to database')
        } catch (err) {
          console.error('Failed to update description in database:', err)
        }
      }
    }
    setIsEditingDescription(false)
  }

  const handleDescriptionCancel = () => {
    setIsEditingDescription(false)
    setEditedDescription('')
  }

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasInitialized.current) return
    hasInitialized.current = true

    checkAndStartGeneration()
    loadInspirationImages()
  }, [])

  // Load user info
  useEffect(() => {
    async function loadUserInfo() {
      try {
        await getCurrentUser()
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

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenPrototype) {
        setIsFullscreenPrototype(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreenPrototype])

  // Load version info when flow is loaded
  const loadVersionInfo = async () => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) return

      const project = JSON.parse(currentProject)
      const versionData = await api.llm.getFlowVersions(project.project_id)
      setCurrentFlowVersion(versionData.current_version)
    } catch (err) {
      console.error('Failed to load version info:', err)
    }
  }

  // Handle version selection
  const handleVersionSelect = async (version: number) => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) return

      const project = JSON.parse(currentProject)
      const versionData = await api.llm.getFlow(project.project_id, version)

      setFlowGraph(versionData.flow_graph)
      setViewingVersion(version)
    } catch (err) {
      console.error('Failed to load version:', err)
      alert(err instanceof Error ? err.message : 'Failed to load version')
    }
  }

  // Handle version revert
  const handleRevertVersion = async (version: number) => {
    if (
      !confirm(
        `Revert to version ${version}? This will create a new version as a copy.`,
      )
    ) {
      return
    }

    try {
      setIsReverting(true)
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) return

      const project = JSON.parse(currentProject)
      const result = await api.llm.revertFlowVersion(
        project.project_id,
        version,
      )

      setFlowGraph(result.flow_graph)
      setCurrentFlowVersion(result.new_version)
      setViewingVersion(null)

      alert(
        `Successfully reverted to version ${version}. Now viewing version ${result.new_version}.`,
      )
    } catch (err) {
      console.error('Failed to revert version:', err)
      alert(err instanceof Error ? err.message : 'Failed to revert version')
    } finally {
      setIsReverting(false)
    }
  }

  // Calculate optimized layout positions for flow screens
  const calculateFlowLayout = (flow: FlowGraph) => {
    if (!flow || !flow.screens.length) return {}

    // Calculate actual device dimensions (including bezel/chrome)
    const deviceWidth =
      device_info.platform === 'phone'
        ? device_info.screen.width + 24
        : device_info.screen.width
    const deviceHeight =
      device_info.platform === 'phone'
        ? device_info.screen.height + 48
        : device_info.screen.height + 40

    // Generous proportional spacing based on device size
    const HORIZONTAL_GAP = deviceWidth * 1.2 // 120% of device width for better spacing
    const VERTICAL_GAP = deviceHeight * 0.8 // 80% of device height

    // Find entry screen
    const entryScreen = flow.screens.find(s => s.screen_type === 'entry')
    if (!entryScreen) return flow.layout_positions || {}

    // Build adjacency map from transitions
    const adjacency: Record<string, string[]> = {}
    flow.screens.forEach(s => (adjacency[s.screen_id] = []))

    flow.transitions.forEach(t => {
      if (!adjacency[t.from_screen_id]) adjacency[t.from_screen_id] = []
      adjacency[t.from_screen_id].push(t.to_screen_id)
    })

    // BFS to assign levels (columns)
    const levels: Record<string, number> = {}
    const queue: Array<{ id: string; level: number }> = [
      { id: entryScreen.screen_id, level: 0 },
    ]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const { id, level } = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      levels[id] = level

      const children = adjacency[id] || []
      children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push({ id: childId, level: level + 1 })
        }
      })
    }

    // Assign any unvisited screens to the end
    flow.screens.forEach(s => {
      if (!(s.screen_id in levels)) {
        levels[s.screen_id] = Math.max(...Object.values(levels), 0) + 1
      }
    })

    // Group screens by level
    const levelGroups: Record<number, string[]> = {}
    Object.entries(levels).forEach(([id, level]) => {
      if (!levelGroups[level]) levelGroups[level] = []
      levelGroups[level].push(id)
    })

    // Calculate positions using device dimensions
    const positions: Record<string, { x: number; y: number }> = {}

    Object.entries(levelGroups).forEach(([levelStr, screenIds]) => {
      const level = parseInt(levelStr)
      const x = level * (deviceWidth + HORIZONTAL_GAP)

      // Center vertically within this column with generous spacing
      screenIds.forEach((id, index) => {
        const totalHeight =
          screenIds.length * (deviceHeight + VERTICAL_GAP) - VERTICAL_GAP
        const startY = -totalHeight / 2
        const y = startY + index * (deviceHeight + VERTICAL_GAP)

        positions[id] = { x, y }
      })
    })

    return positions
  }

  // Calculate available viewport bounds (excluding UI elements)
  const getAvailableViewport = () => {
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // Left side: 80px for menus/buttons
    const leftOffset = 80

    // Right side: 20% when panel open + 40px padding, or 80px when closed
    const rightOffset = isRightPanelCollapsed ? 80 : windowWidth * 0.2 + 40

    // Top: ~80px for tabs
    const topOffset = 80

    // Bottom: ~100px for feedback bar
    const bottomOffset = 100

    return {
      x: leftOffset,
      y: topOffset,
      width: windowWidth - leftOffset - rightOffset,
      height: windowHeight - topOffset - bottomOffset,
    }
  }

  // Center a specific screen in the available viewport
  const centerScreen = (screenId: string, animated: boolean = true) => {
    if (!flowGraph || !canvasRef.current) return

    const positions = calculateFlowLayout(flowGraph)
    const screenPosition = positions[screenId]

    if (!screenPosition) return

    const viewport = getAvailableViewport()

    // Calculate device dimensions (including bezel for phone, chrome for web)
    const deviceWidth =
      device_info.platform === 'phone'
        ? device_info.screen.width + 24
        : device_info.screen.width
    const deviceHeight =
      device_info.platform === 'phone'
        ? device_info.screen.height + 48
        : device_info.screen.height + 40 // Add browser chrome

    // Calculate zoom to fit with margins (15% on each side = 70% of viewport)
    const targetWidth = viewport.width * 0.7
    const targetHeight = viewport.height * 0.7
    const zoomX = targetWidth / deviceWidth
    const zoomY = targetHeight / deviceHeight
    const fitZoom = Math.min(zoomX, zoomY, 1) // Don't zoom in beyond 100%

    // Calculate scaled device dimensions
    const scaledWidth = deviceWidth * fitZoom
    const scaledHeight = deviceHeight * fitZoom

    // Calculate pan to center the screen in viewport
    // Screen is at (screenPosition.x, screenPosition.y) in world coordinates
    // We want it centered in the viewport
    const targetPanX =
      viewport.x +
      (viewport.width - scaledWidth) / 2 -
      screenPosition.x * fitZoom
    const targetPanY =
      viewport.y +
      (viewport.height - scaledHeight) / 2 -
      screenPosition.y * fitZoom

    canvasRef.current.panToPosition(targetPanX, targetPanY, fitZoom, animated)
  }

  // Center start screen on mount and when flow loads
  useEffect(() => {
    if (
      generationStage === 'complete' &&
      flowGraph &&
      activeTab === 'Concept'
    ) {
      // Find entry screen
      const entryScreen = flowGraph.screens.find(s => s.screen_type === 'entry')
      if (entryScreen) {
        setSelectedScreenId(entryScreen.screen_id)
        // Delay to ensure canvas is rendered
        setTimeout(() => centerScreen(entryScreen.screen_id, false), 200)
      }
    }
  }, [generationStage, flowGraph, activeTab])

  // Re-center when right panel toggles
  useEffect(() => {
    if (selectedScreenId && activeTab === 'Concept') {
      setTimeout(() => centerScreen(selectedScreenId, true), 100)
    }
  }, [isRightPanelCollapsed])

  const checkAndStartGeneration = async () => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) {
        setError('No active project found')
        setGenerationStage('error')
        return
      }

      const project = JSON.parse(currentProject)

      // Apply project's device settings if they exist
      if (project.device_info) {
        setDeviceInfo(project.device_info)
      }
      if (project.rendering_mode) {
        setRenderingMode(project.rendering_mode)
      }

      if (!project.selected_taste_id) {
        setError('Project missing taste selection')
        setGenerationStage('error')
        console.error('Project data:', project)
        return
      }

      // Check if flow_graph already exists
      if (project.flow_graph && project.flow_graph.screens?.length > 0) {
        console.log('✅ Loaded existing flow graph from project')
        setFlowGraph(project.flow_graph)
        setGenerationStage('complete')

        // Load version info
        await loadVersionInfo()
        return
      }

      // Try to load from S3
      try {
        const flowData = await api.llm.getFlow(project.project_id)
        console.log('✅ Loaded existing flow from S3')
        setFlowGraph(flowData.flow_graph)
        setGenerationStage('complete')

        // Load version info
        await loadVersionInfo()
        return
      } catch (err) {
        console.log('No existing flow found, will generate new one:', err)
      }

      // No existing flow - generate new one
      startGeneration()
    } catch (err) {
      console.error('Error in checkAndStartGeneration:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setGenerationStage('error')
    }
  }

  const startGeneration = async () => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) {
        setError('No active project found')
        setGenerationStage('error')
        return
      }

      const project = JSON.parse(currentProject)
      setGenerationStage('generating')

      console.log('🚀 Starting progressive flow generation...')

      // Note: All updates happen via callbacks, no return value needed
      await api.llm.generateFlowProgressive(project.project_id, {
        onProgress: (stage, message) => {
          console.log(`[${stage}] ${message}`)

          // Track rethink substages based on progress messages
          if (stage === 'rethinking') {
            if (message.includes('Analyzing') || message.includes('intent')) {
              setRethinkStage('analyzing')
            } else if (
              message.includes('Deriving') ||
              message.includes('principles')
            ) {
              setRethinkStage('principles')
            } else if (
              message.includes('Generating') ||
              message.includes('explorations')
            ) {
              setRethinkStage('exploring')
            } else if (
              message.includes('Synthesizing') ||
              message.includes('optimal')
            ) {
              setRethinkStage('synthesizing')
            }
          } else if (stage === 'generating_flow') {
            setRethinkStage('flow')
          } else if (stage === 'generating_screen') {
            setRethinkStage('screens')
          }
        },
        onRethinkComplete: rethinkData => {
          console.log('✅ Rethink complete!', rethinkData)
          // Transition to flow generation stage
          setRethinkStage('flow')
        },
        onFlowArchitecture: flowArch => {
          console.log('✅ Flow architecture ready!')
          // Dismiss modal and show flow graph
          setGenerationStage('complete')
          // Add ui_loading flag to each screen for progressive rendering
          const flowWithLoading: FlowGraph = {
            ...flowArch,
            screens: flowArch.screens.map(s => ({
              ...s,
              ui_loading: true,
              ui_code: null,
            })),
          }
          setFlowGraph(flowWithLoading)
        },
        onScreenReady: (screenId, uiCode, variationSpace) => {
          console.log(`✅ Screen ready: ${screenId}`)
          if (variationSpace) {
            console.log(
              `  📊 Variation space with ${(variationSpace['dimensions'] as VariationSpace['dimensions'])?.length || 0} dimensions`,
            )
          }
          setFlowGraph(prev => {
            if (!prev) return prev
            return {
              ...prev,
              screens: prev.screens.map(s =>
                s.screen_id === screenId
                  ? {
                      ...s,
                      ui_code: uiCode,
                      ui_loading: false,
                      ...(variationSpace && {
                        variation_space: variationSpace,
                      }),
                    }
                  : s,
              ),
            }
          })
        },
        onScreenError: (screenId, error) => {
          console.error(`❌ Screen ${screenId} failed:`, error)
          setFlowGraph(prev => {
            if (!prev) return prev
            return {
              ...prev,
              screens: prev.screens.map(s =>
                s.screen_id === screenId
                  ? { ...s, ui_error: true, ui_loading: false }
                  : s,
              ),
            }
          })
        },
        onComplete: result => {
          console.log('✅ Flow generation complete!')
          console.log('  Version:', result.version)
          setCurrentFlowVersion(result.version)
          setViewingVersion(null)

          // Update project in localStorage
          project.flow_graph = result.flow_graph
          localStorage.setItem('current_project', JSON.stringify(project))
        },
        onError: error => {
          console.error('❌ Generation error:', error)
          setError(error)
          setGenerationStage('error')
        },
      })
    } catch (err) {
      console.error('❌ Generation error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setGenerationStage('error')
    }
  }

  const loadInspirationImages = async () => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) return

      const project = JSON.parse(currentProject)
      const images = await api.projects.getInspirationImages(project.project_id)
      setInspirationImages(images)
    } catch (err) {
      console.error('Failed to load inspiration images:', err)
    }
  }

  const handleAddInspiration = async (files: File[]) => {
    try {
      setIsAddingInspiration(true)
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) return

      const project = JSON.parse(currentProject)

      await api.projects.addInspirationImages(project.project_id, files)
      await loadInspirationImages()
      setIsAddInspirationModalOpen(false)

      // Regenerate flow with new inspiration - this will create a new version
      console.log('🔄 Regenerating flow with new inspiration images...')
      await startGeneration()
    } catch (err) {
      console.error('Failed to add inspiration images:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add images and regenerate',
      )
      setGenerationStage('error')
    } finally {
      setIsAddingInspiration(false)
    }
  }

  // Render device content - FLOW MODE ONLY
  const renderDeviceContent = () => {
    // Don't render anything during idle stage
    if (generationStage === 'idle') {
      return null
    }

    // During generating, show flow if architecture is ready
    if (generationStage === 'generating' && !flowGraph) {
      return null
    }

    if (generationStage === 'error') {
      return (
        <div
          className="flex flex-col items-center justify-center h-full gap-6 px-8"
          style={{ backgroundColor: '#EDEBE9' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <span style={{ fontSize: '32px' }}>⚠️</span>
          </div>
          <div className="text-center max-w-md">
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: '#DC2626' }}
            >
              Generation Failed
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              {error || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                setError(null)
                setGenerationStage('idle')
                checkAndStartGeneration()
              }}
              className="px-6 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-105"
              style={{
                backgroundColor: '#4A90E2',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    if (
      (generationStage === 'complete' || generationStage === 'generating') &&
      flowGraph
    ) {
      if (activeTab === 'Prototype') {
        return (
          <DeviceFrame>
            <div
              style={{
                width: '100%',
                height: '100%',
                paddingTop: device_info.platform === 'phone' ? '28px' : '0', // Notch space
                paddingBottom: device_info.platform === 'phone' ? '16px' : '0', // Home indicator space
                boxSizing: 'border-box',
                overflow: 'auto',
              }}
            >
              <PrototypeRunner
                flow={flowGraph}
                deviceInfo={device_info}
                parametricValues={parameterValues}
              />
            </div>
          </DeviceFrame>
        )
      } else {
        // Use calculated positions instead of backend positions
        const calculatedPositions = calculateFlowLayout(flowGraph)
        const positions = calculatedPositions

        return (
          <>
            <FlowConnections
              transitions={flowGraph.transitions}
              screenPositions={positions}
              screenDimensions={{
                width:
                  device_info.platform === 'phone'
                    ? device_info.screen.width + 24 // Include phone bezel
                    : device_info.screen.width,
                height:
                  device_info.platform === 'phone'
                    ? device_info.screen.height + 48 // Include phone bezel
                    : device_info.screen.height + 40, // Include web browser chrome
              }}
            />
            {flowGraph.screens.map(screen => {
              const position = positions[screen.screen_id] || { x: 0, y: 0 }
              const isEntry = screen.screen_type === 'entry'

              return (
                <div
                  key={screen.screen_id}
                  style={{
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    pointerEvents: 'none',
                  }}
                >
                  {/* START badge for entry screen */}
                  {isEntry && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-32px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#10B981',
                        color: '#FFFFFF',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                        zIndex: 10,
                      }}
                    >
                      START
                    </div>
                  )}

                  <DeviceFrame>
                    {(screen as ScreenWithLoadingState).ui_loading ? (
                      // Loading state with spinner
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#F9FAFB',
                          flexDirection: 'column',
                          gap: '16px',
                        }}
                      >
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid #E5E7EB',
                            borderTop: '4px solid #3B82F6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                          }}
                        />
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#9CA3AF',
                            fontWeight: 500,
                          }}
                        >
                          Generating...
                        </div>
                      </div>
                    ) : (screen as ScreenWithLoadingState).ui_error ? (
                      // Error state
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#FEF2F2',
                          padding: '20px',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <div
                            style={{ fontSize: '32px', marginBottom: '8px' }}
                          >
                            ⚠️
                          </div>
                          <div
                            style={{
                              fontSize: '14px',
                              color: '#DC2626',
                              fontWeight: 600,
                            }}
                          >
                            Generation Failed
                          </div>
                        </div>
                      </div>
                    ) : screen.ui_code ? (
                      <DynamicReactRenderer
                        jsxCode={screen.ui_code}
                        propsToInject={{
                          onTransition: () => {},
                          // Pass parameters for parametric mode
                          ...(rendering_mode === 'parametric' &&
                          selectedScreenId === screen.screen_id
                            ? { parameters: parameterValues }
                            : {}),
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-400">Loading...</div>
                      </div>
                    )}
                  </DeviceFrame>
                  <div
                    style={{
                      position: 'absolute',
                      top: '-28px',
                      left: 0,
                      fontSize: '13px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontWeight: 500,
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {screen.name}
                  </div>
                </div>
              )
            })}
          </>
        )
      }
    }

    // Fallback - should not be reached
    return null
  }

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        className="relative h-screen w-screen overflow-hidden"
        style={{
          backgroundColor: '#EDEBE9',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        {/* Back Button */}
        {(generationStage === 'complete' || generationStage === 'error') && (
          <button
            onClick={handleBackToHome}
            className="fixed top-6 left-6 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 z-50"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <ArrowLeft size={20} style={{ color: '#3B3B3B' }} />
          </button>
        )}

        {/* Flow Navigator */}
        {flowGraph && generationStage === 'complete' && (
          <div className="fixed top-24 left-6 z-50">
            <button
              onClick={() => setIsFlowNavigatorOpen(!isFlowNavigatorOpen)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 mb-2"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <List size={20} style={{ color: '#3B3B3B' }} />
            </button>

            {isFlowNavigatorOpen && (
              <div
                className="rounded-2xl p-4 max-h-96 overflow-y-auto"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  width: '240px',
                }}
              >
                <div
                  className="text-xs font-semibold mb-3"
                  style={{ color: '#929397' }}
                >
                  FLOW SCREENS ({flowGraph.screens.length})
                </div>
                {flowGraph.screens.map((screen, index) => (
                  <button
                    key={screen.screen_id}
                    onClick={() => {
                      setSelectedScreenId(screen.screen_id)
                      centerScreen(screen.screen_id, true)
                      setIsFlowNavigatorOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg mb-1 transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor:
                        selectedScreenId === screen.screen_id
                          ? '#F0F7FF'
                          : 'transparent',
                      color: '#3B3B3B',
                      border:
                        selectedScreenId === screen.screen_id
                          ? '1px solid #3B82F6'
                          : '1px solid transparent',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-semibold"
                        style={{
                          backgroundColor:
                            screen.screen_type === 'entry'
                              ? '#10B981'
                              : screen.screen_type === 'success'
                                ? '#3B82F6'
                                : '#E5E7EB',
                          color:
                            screen.screen_type === 'entry' ||
                            screen.screen_type === 'success'
                              ? '#FFFFFF'
                              : '#6B7280',
                        }}
                      >
                        {screen.screen_type === 'entry' ? '→' : index + 1}
                      </div>
                      <div className="flex-1 text-sm font-medium">
                        {screen.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Left Side Menu */}
        <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40">
          <button
            className="rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{
              width: '56px',
              height: '40px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex flex-col gap-1">
              <div
                style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: '#929397',
                }}
              />
              <div
                style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: '#929397',
                }}
              />
            </div>
          </button>

          {inspirationImages.slice(-3).map(image => (
            <button
              key={image.key}
              className="rounded-xl transition-all hover:scale-105"
              style={{
                width: '56px',
                height: '56px',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
              title={image.filename}
            >
              <img
                src={image.url}
                alt={image.filename}
                className="w-full h-full object-cover"
              />
            </button>
          ))}

          <button
            onClick={() => setIsAddInspirationModalOpen(true)}
            className="rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            title="Add inspiration images"
          >
            <Plus size={24} style={{ color: '#929397' }} />
          </button>

          {/* Version History - RESTORED! */}
          {generationStage === 'complete' && currentFlowVersion > 0 && (
            <div className="mt-4">
              <VersionHistory
                currentVersion={currentFlowVersion}
                onVersionSelect={handleVersionSelect}
                onRevert={handleRevertVersion}
                isReverting={isReverting}
                viewingVersion={viewingVersion}
              />
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div
          className="fixed top-6 transition-all duration-300 z-40"
          style={{
            left: '80px',
            right: isRightPanelCollapsed ? '80px' : 'calc(28% + 40px)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            className="flex items-center gap-1 rounded-full px-2 py-1.5"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
            }}
          >
            {tabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => tab.enabled && setActiveTab(tab.name)}
                disabled={!tab.enabled}
                className="px-6 py-2 rounded-full transition-all duration-300 text-sm font-medium relative group"
                style={{
                  backgroundColor:
                    activeTab === tab.name ? '#F4F4F4' : 'transparent',
                  color:
                    activeTab === tab.name
                      ? '#1F1F20'
                      : tab.enabled
                        ? '#6B7280'
                        : '#D1D5DB',
                  cursor: tab.enabled ? 'pointer' : 'not-allowed',
                  opacity: tab.enabled ? 1 : 0.6,
                }}
              >
                {tab.name}
                {!tab.enabled && (
                  <span className="ml-2 text-xs opacity-50">🔒</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Container - Different for Concept vs Prototype */}
        {activeTab === 'Prototype' &&
        generationStage === 'complete' &&
        flowGraph ? (
          // Prototype mode - dark box container with light background
          <div
            className="fixed"
            style={{
              top: '80px',
              bottom: '100px',
              left: '80px',
              right: isRightPanelCollapsed ? '80px' : 'calc(28% + 40px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Fullscreen button */}
            <button
              onClick={() => setIsFullscreenPrototype(true)}
              className="absolute top-6 right-6 z-10 w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              }}
              title="Enter fullscreen mode"
            >
              <Maximize2 size={20} style={{ color: '#3B3B3B' }} />
            </button>

            {/* Wrapper to make box 20% narrower */}
            <div
              style={{
                width: '80%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#1F1F20',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <PrototypeCanvas
                  deviceWidth={
                    device_info.platform === 'phone'
                      ? device_info.screen.width + 24 // Total width including DeviceFrame bezel
                      : device_info.screen.width
                  }
                  deviceHeight={
                    device_info.platform === 'phone'
                      ? device_info.screen.height + 48 // Total height including DeviceFrame bezel
                      : device_info.screen.height + 40 // Total height including browser chrome
                  }
                >
                  {renderDeviceContent()}
                </PrototypeCanvas>
              </div>
            </div>
          </div>
        ) : (
          // Concept mode - infinite canvas with dark background
          <InfiniteCanvas
            ref={canvasRef}
            width={
              flowGraph && generationStage === 'complete'
                ? (() => {
                    const positions = calculateFlowLayout(flowGraph)
                    const deviceWidth =
                      device_info.platform === 'phone'
                        ? device_info.screen.width + 24
                        : device_info.screen.width
                    return (
                      Math.max(...Object.values(positions).map(p => p.x), 0) +
                      deviceWidth +
                      deviceWidth * 0.6
                    ) // Match HORIZONTAL_GAP
                  })()
                : device_info.screen.width
            }
            height={
              flowGraph && generationStage === 'complete'
                ? (() => {
                    const positions = calculateFlowLayout(flowGraph)
                    const yValues = Object.values(positions).map(p => p.y)
                    const minY = Math.min(...yValues, 0)
                    const maxY = Math.max(...yValues, 0)
                    const deviceHeight =
                      device_info.platform === 'phone'
                        ? device_info.screen.height + 48
                        : device_info.screen.height + 40
                    return maxY - minY + deviceHeight + deviceHeight * 0.5 // Match VERTICAL_GAP
                  })()
                : device_info.screen.height
            }
          >
            {renderDeviceContent()}
          </InfiniteCanvas>
        )}

        {/* Bottom Control Bar */}
        <div
          className="fixed bottom-6 transition-all duration-300 z-40"
          style={{
            left: '80px',
            right: isRightPanelCollapsed ? '80px' : 'calc(28% + 40px)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              width: '800px',
              maxWidth: '90%',
            }}
          >
            <div className="flex items-center justify-between">
              <input
                type="text"
                placeholder="Give feedback or direction..."
                className="flex-1 bg-transparent border-none outline-none text-sm"
                style={{ color: '#3B3B3B' }}
              />
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                  style={{ backgroundColor: '#F7F5F3', color: '#3B3B3B' }}
                >
                  <Settings size={16} />
                </button>
                <button
                  className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                  style={{ backgroundColor: '#F7F5F3', color: '#3B3B3B' }}
                >
                  <Smartphone size={16} />
                  iOS
                </button>
                <button
                  className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                  style={{ backgroundColor: '#F7F5F3', color: '#3B3B3B' }}
                >
                  <Smile size={16} />
                  Mood
                </button>
                <button
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                  style={{ backgroundColor: '#F7F5F3' }}
                >
                  <Maximize2 size={16} style={{ color: '#3B3B3B' }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div
          className="fixed right-0 top-0 h-screen transition-all duration-300 z-30"
          style={{
            width: isRightPanelCollapsed ? '0' : '28%',
          }}
        >
          <div
            className="relative rounded-3xl mt-6 mr-6 mb-6 ml-0 flex flex-col gap-6 h-[calc(100vh-48px)]"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              opacity: isRightPanelCollapsed ? 0 : 1,
              overflow: isRightPanelCollapsed ? 'hidden' : 'auto',
              paddingLeft: '24px',
              paddingRight: '24px',
              paddingTop: '24px',
              paddingBottom: '24px',
            }}
          >
            {!isRightPanelCollapsed && (
              <>
                {/* Top Row: Tabs (left) + User Profile (right) */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  {/* Tab Navigation - Figma Style */}
                  <div
                    className="flex items-center gap-0 border-b"
                    style={{ borderColor: '#E8E1DD' }}
                  >
                    <button
                      onClick={() => setActiveRightTab('explore')}
                      className="px-3 py-2 text-xs font-medium transition-colors border-b-2"
                      style={{
                        color:
                          activeRightTab === 'explore' ? '#3B3B3B' : '#929397',
                        borderColor:
                          activeRightTab === 'explore'
                            ? '#3B3B3B'
                            : 'transparent',
                      }}
                    >
                      Explore
                    </button>
                    <button
                      onClick={() => setActiveRightTab('refine')}
                      className="px-3 py-2 text-xs font-medium transition-colors border-b-2"
                      style={{
                        color:
                          activeRightTab === 'refine' ? '#3B3B3B' : '#929397',
                        borderColor:
                          activeRightTab === 'refine'
                            ? '#3B3B3B'
                            : 'transparent',
                      }}
                    >
                      Refine
                    </button>
                    <button
                      onClick={() => setActiveRightTab('iterate')}
                      className="px-3 py-2 text-xs font-medium transition-colors border-b-2"
                      style={{
                        color:
                          activeRightTab === 'iterate' ? '#3B3B3B' : '#929397',
                        borderColor:
                          activeRightTab === 'iterate'
                            ? '#3B3B3B'
                            : 'transparent',
                      }}
                    >
                      Iterate
                    </button>
                  </div>

                  {/* User Profile */}
                  <ProfileDropdown
                    userInfo={userInfo}
                    onSignOut={handleSignOut}
                  />
                </div>

                {/* Project Title & Description - Editable */}
                <div>
                  {/* Title */}
                  {isEditingTitle ? (
                    <div className="mb-1">
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={e => setEditedTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleTitleSave()
                          } else if (e.key === 'Escape') {
                            handleTitleCancel()
                          }
                        }}
                        onBlur={handleTitleSave}
                        autoFocus
                        className="w-full text-2xl font-semibold px-2 py-1 -ml-2 rounded-lg border-2 outline-none"
                        style={{
                          color: '#3B3B3B',
                          borderColor: '#3B3B3B',
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                    </div>
                  ) : (
                    <h2
                      onClick={handleTitleEdit}
                      className="text-2xl font-semibold mb-1 px-2 py-1 -ml-2 rounded-lg cursor-pointer transition-colors"
                      style={{ color: '#3B3B3B' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#F7F5F3'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                      title="Click to edit"
                    >
                      {flowGraph?.display_title || 'Untitled Project'}
                    </h2>
                  )}

                  {/* Description */}
                  {isEditingDescription ? (
                    <div>
                      <textarea
                        value={editedDescription}
                        onChange={e => setEditedDescription(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleDescriptionSave()
                          } else if (e.key === 'Escape') {
                            handleDescriptionCancel()
                          }
                        }}
                        onBlur={handleDescriptionSave}
                        autoFocus
                        rows={2}
                        className="w-full text-sm px-2 py-1 -ml-2 rounded-lg border-2 outline-none resize-none"
                        style={{
                          color: '#929397',
                          borderColor: '#929397',
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                    </div>
                  ) : (
                    <p
                      onClick={handleDescriptionEdit}
                      className="text-sm px-2 py-1 -ml-2 rounded-lg cursor-pointer transition-colors"
                      style={{ color: '#929397' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#F7F5F3'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                      title="Click to edit"
                    >
                      {flowGraph?.display_description || 'No description'}
                    </p>
                  )}
                </div>

                {/* Tab Content - Explore */}
                {activeRightTab === 'explore' && (
                  <div
                    className="flex-1 flex flex-col gap-5 overflow-y-auto"
                    style={{ paddingRight: '4px' }}
                  >
                    {/* Parametric Controls - Only in parametric mode */}
                    {rendering_mode === 'parametric' &&
                      !!selectedScreen?.['variation_space'] && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{
                                background:
                                  'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                              }}
                            >
                              <Sliders size={16} style={{ color: '#FFFFFF' }} />
                            </div>
                            <div>
                              <div
                                className="text-sm font-semibold"
                                style={{ color: '#3B3B3B' }}
                              >
                                Variation Space
                              </div>
                              <div
                                className="text-xs"
                                style={{ color: '#929397' }}
                              >
                                Explore design parameters
                              </div>
                            </div>
                          </div>
                          <ParametricControls
                            variationSpace={
                              selectedScreen[
                                'variation_space'
                              ] as VariationSpace
                            }
                            initialValues={parameterValues}
                            onChange={newValues =>
                              setParameterValues(newValues)
                            }
                          />
                        </div>
                      )}

                    {/* Style Selector - Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
                        className="w-full rounded-2xl p-4 flex flex-col transition-all hover:scale-[1.02]"
                        style={{
                          background: selectedStyle.bg,
                          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div
                              className="text-xs mb-1"
                              style={{ color: '#3B3B3B', opacity: 0.7 }}
                            >
                              Style
                            </div>
                            <div
                              className="text-sm font-semibold"
                              style={{ color: '#3B3B3B' }}
                            >
                              {selectedStyle.title}
                            </div>
                          </div>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                          >
                            <ChevronDown
                              size={16}
                              style={{
                                color: '#3B3B3B',
                                transform: styleDropdownOpen
                                  ? 'rotate(180deg)'
                                  : 'rotate(0deg)',
                                transition: 'transform 0.3s',
                              }}
                            />
                          </div>
                        </div>
                        <div
                          className="h-16 rounded-xl"
                          style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
                        />
                      </button>

                      {styleDropdownOpen && (
                        <div
                          className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl z-50"
                          style={{
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                          }}
                        >
                          {styleOptions.map((option, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setSelectedStyle(option)
                                setStyleDropdownOpen(false)
                              }}
                              className="w-full rounded-xl p-3 mb-2 last:mb-0 transition-all hover:scale-[1.02]"
                              style={{ background: option.bg }}
                            >
                              <div
                                className="text-sm font-semibold text-left"
                                style={{ color: '#3B3B3B' }}
                              >
                                {option.title}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Action Buttons - 4 buttons in grid */}
                    <div className="grid grid-cols-4 gap-3">
                      <button
                        className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
                        style={{ backgroundColor: '#F7F5F3' }}
                      >
                        <RotateCcw size={20} style={{ color: '#4F515A' }} />
                        <span className="text-xs" style={{ color: '#929397' }}>
                          Vary
                        </span>
                      </button>
                      <button
                        className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
                        style={{ backgroundColor: '#F7F5F3' }}
                      >
                        <Palette size={20} style={{ color: '#4F515A' }} />
                        <span className="text-xs" style={{ color: '#929397' }}>
                          Colors
                        </span>
                      </button>
                      <button
                        className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
                        style={{ backgroundColor: '#F7F5F3' }}
                      >
                        <Sparkles size={20} style={{ color: '#4F515A' }} />
                        <span className="text-xs" style={{ color: '#929397' }}>
                          Taste
                        </span>
                      </button>
                      <button
                        className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
                        style={{ backgroundColor: '#F7F5F3' }}
                      >
                        <span className="text-lg">08</span>
                        <span className="text-xs" style={{ color: '#929397' }}>
                          Style
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab Content - Refine */}
                {activeRightTab === 'refine' && (
                  <div
                    className="flex-1 flex flex-col gap-5 overflow-y-auto"
                    style={{ paddingRight: '4px' }}
                  >
                    {/* Layout Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background:
                              'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
                          }}
                        >
                          <Layout size={16} style={{ color: '#FFFFFF' }} />
                        </div>
                        <div>
                          <div
                            className="text-sm font-semibold"
                            style={{ color: '#3B3B3B' }}
                          >
                            Layout & Spacing
                          </div>
                          <div className="text-xs" style={{ color: '#929397' }}>
                            Fine-tune structure
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          className="p-3 rounded-lg transition-all hover:scale-[1.02]"
                          style={{
                            backgroundColor: '#F7F5F3',
                            border: '1px solid #E8E1DD',
                          }}
                        >
                          <div
                            className="w-full h-16 rounded flex items-center justify-center mb-2"
                            style={{ backgroundColor: '#FFFFFF' }}
                          >
                            <div
                              className="text-xs"
                              style={{ color: '#929397' }}
                            >
                              □
                            </div>
                          </div>
                          <div
                            className="text-xs text-center"
                            style={{ color: '#3B3B3B' }}
                          >
                            Compact
                          </div>
                        </button>
                        <button
                          className="p-3 rounded-lg transition-all hover:scale-[1.02]"
                          style={{
                            backgroundColor: '#F7F5F3',
                            border: '2px solid #3B3B3B',
                          }}
                        >
                          <div
                            className="w-full h-16 rounded flex items-center justify-center mb-2"
                            style={{ backgroundColor: '#FFFFFF' }}
                          >
                            <div
                              className="text-xs"
                              style={{ color: '#929397' }}
                            >
                              ▭
                            </div>
                          </div>
                          <div
                            className="text-xs text-center font-semibold"
                            style={{ color: '#3B3B3B' }}
                          >
                            Balanced
                          </div>
                        </button>
                        <button
                          className="p-3 rounded-lg transition-all hover:scale-[1.02]"
                          style={{
                            backgroundColor: '#F7F5F3',
                            border: '1px solid #E8E1DD',
                          }}
                        >
                          <div
                            className="w-full h-16 rounded flex items-center justify-center mb-2"
                            style={{ backgroundColor: '#FFFFFF' }}
                          >
                            <div
                              className="text-xs"
                              style={{ color: '#929397' }}
                            >
                              ▬
                            </div>
                          </div>
                          <div
                            className="text-xs text-center"
                            style={{ color: '#3B3B3B' }}
                          >
                            Spacious
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background:
                              'linear-gradient(135deg, #A8EDEA 0%, #FED6E3 100%)',
                          }}
                        >
                          <Type size={16} style={{ color: '#3B3B3B' }} />
                        </div>
                        <div>
                          <div
                            className="text-sm font-semibold"
                            style={{ color: '#3B3B3B' }}
                          >
                            Typography Scale
                          </div>
                          <div className="text-xs" style={{ color: '#929397' }}>
                            Text sizing and hierarchy
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: '#F7F5F3' }}
                        >
                          <span
                            className="text-sm"
                            style={{ color: '#3B3B3B' }}
                          >
                            Scale
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-mono"
                              style={{ color: '#929397' }}
                            >
                              1.25
                            </span>
                            <input
                              type="range"
                              min="1.1"
                              max="1.6"
                              step="0.05"
                              defaultValue="1.25"
                              className="w-24"
                              style={{ accentColor: '#3B3B3B' }}
                            />
                          </div>
                        </div>
                        <div
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: '#F7F5F3' }}
                        >
                          <span
                            className="text-sm"
                            style={{ color: '#3B3B3B' }}
                          >
                            Line Height
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-mono"
                              style={{ color: '#929397' }}
                            >
                              1.5
                            </span>
                            <input
                              type="range"
                              min="1.2"
                              max="2.0"
                              step="0.1"
                              defaultValue="1.5"
                              className="w-24"
                              style={{ accentColor: '#3B3B3B' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Component Overrides */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background:
                              'linear-gradient(135deg, #FFD89B 0%, #19547B 100%)',
                          }}
                        >
                          <Layers size={16} style={{ color: '#FFFFFF' }} />
                        </div>
                        <div>
                          <div
                            className="text-sm font-semibold"
                            style={{ color: '#3B3B3B' }}
                          >
                            Component Details
                          </div>
                          <div className="text-xs" style={{ color: '#929397' }}>
                            Element-level adjustments
                          </div>
                        </div>
                      </div>

                      <div
                        className="p-4 rounded-xl"
                        style={{
                          backgroundColor: '#F7F5F3',
                          border: '1px solid #E8E1DD',
                        }}
                      >
                        <div
                          className="flex items-center justify-center gap-2 py-6"
                          style={{ color: '#929397' }}
                        >
                          <Eye size={16} />
                          <span className="text-xs">
                            Select a component to edit
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content - Iterate */}
                {activeRightTab === 'iterate' && (
                  <div
                    className="flex-1 flex flex-col gap-5 overflow-y-auto"
                    style={{ paddingRight: '4px' }}
                  >
                    {/* AI Feedback */}
                    <div className="flex-1 flex flex-col space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background:
                              'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                          }}
                        >
                          <MessageSquare
                            size={16}
                            style={{ color: '#FFFFFF' }}
                          />
                        </div>
                        <div className="flex-1">
                          <div
                            className="text-sm font-semibold"
                            style={{ color: '#3B3B3B' }}
                          >
                            AI Feedback
                          </div>
                          <div className="text-xs" style={{ color: '#929397' }}>
                            Describe what you&apos;d like to change
                          </div>
                        </div>
                        <div
                          className="px-2 py-1 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor: '#F7F5F3',
                            color: '#929397',
                          }}
                        >
                          ⌘K
                        </div>
                      </div>

                      <div className="relative flex-1">
                        <textarea
                          placeholder="E.g., 'Make the header more prominent' or 'Adjust spacing between cards'..."
                          value={inputText}
                          onChange={e => setInputText(e.target.value)}
                          className="w-full h-full px-4 py-3 rounded-xl resize-none focus:outline-none transition-all"
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '2px solid #E8E1DD',
                            color: '#3B3B3B',
                            fontSize: '14px',
                            minHeight: '180px',
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = '#3B3B3B'
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = '#E8E1DD'
                          }}
                        />
                        {inputText.length > 0 && (
                          <div className="absolute bottom-3 right-3 flex items-center gap-2">
                            <div
                              className="px-2 py-1 rounded text-xs"
                              style={{
                                backgroundColor: '#F7F5F3',
                                color: '#929397',
                              }}
                            >
                              {inputText.length} characters
                            </div>
                            <div
                              className="px-2 py-1 rounded text-xs"
                              style={{
                                backgroundColor: '#3B3B3B',
                                color: '#FFFFFF',
                              }}
                            >
                              Enter
                            </div>
                          </div>
                        )}
                      </div>

                      {inputText.length > 0 && (
                        <button
                          className="w-full px-6 py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                          style={{
                            background:
                              'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                            color: '#FFFFFF',
                            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                          }}
                        >
                          <Wand2 size={16} />
                          Apply Changes
                        </button>
                      )}
                    </div>

                    {/* Feedback History */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className="text-xs font-semibold"
                          style={{ color: '#3B3B3B' }}
                        >
                          Recent Changes
                        </div>
                        <button
                          className="text-xs"
                          style={{ color: '#929397' }}
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div
                          className="p-3 rounded-lg"
                          style={{
                            backgroundColor: '#F7F5F3',
                            border: '1px solid #E8E1DD',
                          }}
                        >
                          <div
                            className="text-xs mb-1"
                            style={{ color: '#929397' }}
                          >
                            2 minutes ago
                          </div>
                          <div className="text-xs" style={{ color: '#3B3B3B' }}>
                            Increased header font size
                          </div>
                        </div>
                        <div
                          className="p-3 rounded-lg"
                          style={{
                            backgroundColor: '#F7F5F3',
                            border: '1px solid #E8E1DD',
                          }}
                        >
                          <div
                            className="text-xs mb-1"
                            style={{ color: '#929397' }}
                          >
                            5 minutes ago
                          </div>
                          <div className="text-xs" style={{ color: '#3B3B3B' }}>
                            Adjusted card spacing
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!isRightPanelCollapsed && (
          <button
            onClick={() => setIsRightPanelCollapsed(true)}
            className="fixed bottom-1/6 right-0 -translate-y-1/2 w-10 h-16 rounded-l-xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg z-50 group"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '-4px 4px 12px rgba(0,0,0,0.12)',
            }}
          >
            <ChevronDown
              size={20}
              style={{
                color: '#3B3B3B',
                transform: 'rotate(-90deg)',
              }}
              className="group-hover:scale-110 transition-transform"
            />
          </button>
        )}

        {isRightPanelCollapsed && (
          <button
            onClick={() => setIsRightPanelCollapsed(false)}
            className="fixed bottom-1/6 right-0 -translate-y-1/2 w-10 h-16 rounded-l-xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg z-50 group"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '-4px 4px 12px rgba(0,0,0,0.12)',
            }}
          >
            <ChevronDown
              size={20}
              style={{
                color: '#3B3B3B',
                transform: 'rotate(90deg)',
              }}
              className="group-hover:scale-110 transition-transform"
            />
          </button>
        )}

        {/* Initializing Overlay */}
        {generationStage === 'idle' && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(237, 235, 233, 0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div
              className="rounded-3xl p-8 flex flex-col items-center gap-6 animate-in fade-in duration-500"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                maxWidth: '420px',
                width: '90%',
              }}
            >
              {/* Animated Loading Icon - Expanding Ripples */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                      boxShadow: '0 8px 32px rgba(245, 158, 11, 0.5)',
                    }}
                  >
                    <Sparkles size={28} style={{ color: '#FFFFFF' }} />
                  </div>
                </div>

                {/* Expanding Ripples */}
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: '3px solid',
                      borderColor: i % 2 === 0 ? '#F59E0B' : '#EF4444',
                      opacity: 0,
                      animation: `ripple 3s ease-out infinite`,
                      animationDelay: `${i * 0.75}s`,
                    }}
                  />
                ))}

                {/* Rotating Particles */}
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div
                    key={`particle-${i}`}
                    className="absolute"
                    style={{
                      width: '100%',
                      height: '100%',
                      animation: `rotate-particles 4s linear infinite`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  >
                    <div
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background:
                          i % 3 === 0
                            ? 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)'
                            : i % 3 === 1
                              ? 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)'
                              : 'linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                        top: '0',
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Loading Text */}
              <div className="text-center">
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{ color: '#1F1F20' }}
                >
                  Initializing...
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: '#929397' }}
                >
                  Setting up your workspace
                </p>
              </div>

              {/* Pulsing Bar Indicator */}
              <div className="w-full flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="flex-1 h-1.5 rounded-full"
                    style={{
                      background:
                        'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                      animation: 'pulse-bar 1.5s ease-in-out infinite',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>

              {/* Animation Styles */}
              <style>{`
              @keyframes ripple {
                0% {
                  transform: scale(0.5);
                  opacity: 1;
                }
                50% {
                  opacity: 0.4;
                }
                100% {
                  transform: scale(1.8);
                  opacity: 0;
                }
              }
              @keyframes rotate-particles {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes pulse-bar {
                0%, 100% { 
                  opacity: 0.3;
                  transform: scaleY(0.8);
                }
                50% { 
                  opacity: 1;
                  transform: scaleY(1.2);
                }
              }
              @keyframes fade-in {
                from { 
                  opacity: 0;
                  transform: scale(0.95);
                }
                to { 
                  opacity: 1;
                  transform: scale(1);
                }
              }
              .animate-in {
                animation: fade-in 0.5s ease-out;
              }
            `}</style>
            </div>
          </div>
        )}

        {/* Multi-Stage Generation Overlay */}
        {generationStage === 'generating' && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(237, 235, 233, 0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {/* Stage 1: Analyzing Intent */}
            {rethinkStage === 'analyzing' && (
              <div
                key="analyzing"
                className="rounded-3xl p-8 flex flex-col items-center gap-6 animate-modal-in"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                  maxWidth: '420px',
                  width: '90%',
                }}
              >
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* Center Magnifying Glass */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      animation: 'pulse-slow 3s ease-in-out infinite',
                    }}
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
                        boxShadow: '0 8px 32px rgba(79, 172, 254, 0.4)',
                      }}
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                      </svg>
                    </div>
                  </div>

                  {/* Scanning Rays */}
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="absolute inset-0"
                      style={{
                        animation: `scan-ray 2s ease-in-out infinite`,
                        animationDelay: `${i * 0.6}s`,
                      }}
                    >
                      <div
                        className="absolute w-full h-0.5"
                        style={{
                          background:
                            'linear-gradient(90deg, transparent, #4FACFE, transparent)',
                          top: '50%',
                          left: '0',
                        }}
                      />
                    </div>
                  ))}

                  {/* Pulsing Rings */}
                  {[0, 1].map(i => (
                    <div
                      key={i}
                      className="absolute inset-0"
                      style={{
                        border: '2px solid #4FACFE',
                        borderRadius: '50%',
                        animation: `ping 2s cubic-bezier(0, 0, 0.2, 1) infinite`,
                        animationDelay: `${i * 1}s`,
                      }}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: '#1F1F20' }}
                  >
                    Analyzing design intent
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#929397' }}
                  >
                    Questioning assumptions and understanding user needs...
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
                        animation: 'bounce 1.4s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stage 2: Deriving Principles */}
            {rethinkStage === 'principles' && (
              <div
                key="principles"
                className="rounded-3xl p-8 flex flex-col items-center gap-6 animate-modal-in"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                  maxWidth: '420px',
                  width: '90%',
                }}
              >
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* Center Foundation */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      animation: 'pulse-slow 3s ease-in-out infinite',
                    }}
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          'linear-gradient(135deg, #A18AFF 0%, #6E56CF 100%)',
                        boxShadow: '0 8px 32px rgba(161, 138, 255, 0.4)',
                      }}
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                      >
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                      </svg>
                    </div>
                  </div>

                  {/* Stacking Blocks */}
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        animation: `stack-up 2.5s ease-out infinite`,
                        animationDelay: `${i * 0.3}s`,
                        top: `${60 - i * 12}px`,
                        left: '50%',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{
                          background:
                            i % 2 === 0
                              ? 'linear-gradient(135deg, #FFD6A5 0%, #FFAB73 100%)'
                              : 'linear-gradient(135deg, #A18AFF 0%, #6E56CF 100%)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          transform: 'translateX(-50%)',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: '#1F1F20' }}
                  >
                    Deriving core principles
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#929397' }}
                  >
                    Building UX foundations from first principles...
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          'linear-gradient(135deg, #A18AFF 0%, #6E56CF 100%)',
                        animation: 'bounce 1.4s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stage 3: Exploring Directions */}
            {rethinkStage === 'exploring' && (
              <div
                key="exploring"
                className="rounded-3xl p-8 flex flex-col items-center gap-6 animate-modal-in"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                  maxWidth: '420px',
                  width: '90%',
                }}
              >
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* Center Node */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      animation: 'pulse-slow 3s ease-in-out infinite',
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
                        boxShadow: '0 8px 32px rgba(240, 147, 251, 0.4)',
                      }}
                    >
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                      </svg>
                    </div>
                  </div>

                  {/* Branching Lines & Nodes */}
                  {[0, 1, 2, 3, 4, 5].map(i => {
                    const angle = i * 60 * (Math.PI / 180)
                    const x = Math.cos(angle) * 56
                    const y = Math.sin(angle) * 56
                    return (
                      <div key={i}>
                        {/* Line */}
                        <div
                          className="absolute"
                          style={{
                            width: '60px',
                            height: '2px',
                            background: `linear-gradient(90deg, #F093FB, ${
                              i % 3 === 0
                                ? '#4FACFE'
                                : i % 3 === 1
                                  ? '#10B981'
                                  : '#F59E0B'
                            })`,
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${i * 60}deg)`,
                            transformOrigin: 'left center',
                            animation: `branch-grow 2s ease-out infinite`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                        {/* End Node */}
                        <div
                          className="absolute w-3 h-3 rounded-full"
                          style={{
                            background:
                              i % 3 === 0
                                ? '#4FACFE'
                                : i % 3 === 1
                                  ? '#10B981'
                                  : '#F59E0B',
                            top: `calc(50% + ${y}px)`,
                            left: `calc(50% + ${x}px)`,
                            transform: 'translate(-50%, -50%)',
                            animation: `pop-in 2s ease-out infinite`,
                            animationDelay: `${i * 0.15 + 0.5}s`,
                          }}
                        />
                      </div>
                    )
                  })}
                </div>

                <div className="text-center">
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: '#1F1F20' }}
                  >
                    Exploring strategic directions
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#929397' }}
                  >
                    Generating multiple design approaches...
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
                        animation: 'bounce 1.4s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stage 4: Synthesizing Design */}
            {rethinkStage === 'synthesizing' && (
              <div
                key="synthesizing"
                className="rounded-3xl p-8 flex flex-col items-center gap-6 animate-modal-in"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                  maxWidth: '420px',
                  width: '90%',
                }}
              >
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* Center Merged Icon */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      animation: 'pulse-slow 3s ease-in-out infinite',
                    }}
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      <Sparkles size={36} style={{ color: '#FFFFFF' }} />
                    </div>
                  </div>

                  {/* Converging Particles */}
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                    const angle = i * 45 * (Math.PI / 180)
                    const startX = Math.cos(angle) * 60
                    const startY = Math.sin(angle) * 60
                    return (
                      <div
                        key={i}
                        className="absolute w-3 h-3 rounded-full"
                        style={{
                          background:
                            i % 2 === 0
                              ? 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)'
                              : 'linear-gradient(135deg, #FFD6A5 0%, #FFAB73 100%)',
                          animation: `converge-${i} 2s ease-in-out infinite`,
                        }}
                      >
                        <style>{`
                          @keyframes converge-${i} {
                            0% {
                              transform: translate(${startX}px, ${startY}px) scale(1);
                              opacity: 1;
                            }
                            50% {
                              transform: translate(0, 0) scale(0.5);
                              opacity: 0.8;
                            }
                            100% {
                              transform: translate(${startX}px, ${startY}px) scale(1);
                              opacity: 1;
                            }
                          }
                        `}</style>
                      </div>
                    )
                  })}

                  {/* Merging Rings */}
                  {[0, 1, 2].map(i => (
                    <div
                      key={`ring-${i}`}
                      className="absolute inset-0"
                      style={{
                        border: '2px solid #10B981',
                        borderRadius: '50%',
                        animation: `merge-ring 2s ease-in-out infinite`,
                        animationDelay: `${i * 0.3}s`,
                      }}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: '#1F1F20' }}
                  >
                    Synthesizing optimal design
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#929397' }}
                  >
                    Combining the best elements into a cohesive solution...
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        animation: 'bounce 1.4s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stage 5: Flow & Screens (Combined) */}
            {(rethinkStage === 'flow' ||
              rethinkStage === 'screens' ||
              rethinkStage === null) && (
              <div
                key="flow"
                className="rounded-3xl p-8 flex flex-col items-center gap-6 animate-modal-in"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                  maxWidth: '420px',
                  width: '90%',
                }}
              >
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                      }}
                    >
                      <Sparkles size={28} style={{ color: '#FFFFFF' }} />
                    </div>
                  </div>

                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="absolute inset-0"
                      style={{
                        animation: `orbit 3s linear infinite`,
                        animationDelay: `${i * 0.75}s`,
                      }}
                    >
                      <div
                        className="absolute w-4 h-4 rounded-full"
                        style={{
                          background:
                            i % 2 === 0
                              ? 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)'
                              : 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
                          boxShadow:
                            i % 2 === 0
                              ? '0 4px 12px rgba(245, 87, 108, 0.5)'
                              : '0 4px 12px rgba(0, 242, 254, 0.5)',
                          top: '0',
                          left: '50%',
                          transform: 'translateX(-50%)',
                        }}
                      />
                    </div>
                  ))}

                  <div
                    className="absolute inset-4"
                    style={{
                      border: '2px solid transparent',
                      borderTopColor: '#667EEA',
                      borderRightColor: '#667EEA',
                      borderRadius: '50%',
                      animation: 'spin 4s linear infinite',
                      opacity: 0.3,
                    }}
                  />
                </div>

                <div className="text-center">
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: '#1F1F20' }}
                  >
                    {rethinkStage === 'flow'
                      ? 'Architecting flow'
                      : 'Generating screens'}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#929397' }}
                  >
                    {rethinkStage === 'flow'
                      ? 'Creating flow structure and screen transitions...'
                      : 'Bringing your design to life with beautiful UI...'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                        animation: 'bounce 1.4s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Animation Styles */}
            <style>{`
              @keyframes orbit {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
              @keyframes pulse-slow {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.08); }
              }
              @keyframes bounce {
                0%, 80%, 100% { 
                  transform: scale(0.8);
                  opacity: 0.5;
                }
                40% { 
                  transform: scale(1.2);
                  opacity: 1;
                }
              }
              @keyframes modal-in {
                from { 
                  opacity: 0;
                  transform: scale(0.95);
                }
                to { 
                  opacity: 1;
                  transform: scale(1);
                }
              }
              @keyframes scan-ray {
                0% {
                  opacity: 0;
                  transform: scaleX(0);
                }
                50% {
                  opacity: 1;
                  transform: scaleX(1);
                }
                100% {
                  opacity: 0;
                  transform: scaleX(0);
                }
              }
              @keyframes ping {
                75%, 100% {
                  transform: scale(2);
                  opacity: 0;
                }
              }
              @keyframes stack-up {
                0% {
                  opacity: 0;
                  transform: translateY(60px) scale(0.5);
                }
                20% {
                  opacity: 1;
                }
                40% {
                  transform: translateY(0) scale(1);
                }
                80% {
                  opacity: 1;
                }
                100% {
                  opacity: 0;
                  transform: translateY(-20px) scale(0.8);
                }
              }
              @keyframes branch-grow {
                0% {
                  opacity: 0;
                  transform: scaleX(0);
                }
                50% {
                  opacity: 1;
                  transform: scaleX(1);
                }
                100% {
                  opacity: 0;
                  transform: scaleX(0);
                }
              }
              @keyframes pop-in {
                0%, 30% {
                  opacity: 0;
                  transform: scale(0);
                }
                50% {
                  opacity: 1;
                  transform: scale(1.2);
                }
                70% {
                  transform: scale(0.9);
                }
                85% {
                  transform: scale(1);
                }
                100% {
                  opacity: 0;
                  transform: scale(0);
                }
              }
              @keyframes merge-ring {
                0% {
                  opacity: 0;
                  transform: scale(1.5);
                }
                50% {
                  opacity: 0.6;
                  transform: scale(0.8);
                }
                100% {
                  opacity: 0;
                  transform: scale(0.3);
                }
              }
              .animate-modal-in {
                animation: modal-in 0.5s ease-out;
              }
            `}</style>
          </div>
        )}

        <AddInspirationModal
          isOpen={isAddInspirationModalOpen}
          onClose={() => setIsAddInspirationModalOpen(false)}
          onConfirm={handleAddInspiration}
          isLoading={isAddingInspiration}
          maxImages={5}
          currentCount={inspirationImages.length}
        />

        {/* Fullscreen Prototype Mode */}
        {isFullscreenPrototype && activeTab === 'Prototype' && flowGraph && (
          <div
            className="fixed inset-0 z-[200]"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Exit Fullscreen Button */}
            <button
              onClick={() => setIsFullscreenPrototype(false)}
              className="absolute top-8 right-8 z-10 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 group"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
              title="Exit fullscreen"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:rotate-90"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Scaled Device Container */}
            <div className="w-full h-full flex items-center justify-center p-12">
              <div
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  aspectRatio:
                    device_info.platform === 'phone'
                      ? `${device_info.screen.width + 24} / ${device_info.screen.height + 48}`
                      : `${device_info.screen.width} / ${device_info.screen.height + 40}`,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    maxWidth:
                      device_info.platform === 'phone'
                        ? `${device_info.screen.width + 24}px`
                        : `${device_info.screen.width}px`,
                    maxHeight:
                      device_info.platform === 'phone'
                        ? `${device_info.screen.height + 48}px`
                        : `${device_info.screen.height + 40}px`,
                    transform: 'scale(var(--scale))',
                    transformOrigin: 'center center',
                  }}
                  ref={el => {
                    if (!el) return

                    // Calculate scale to fit within viewport
                    const container = el.parentElement
                    if (!container) return

                    const deviceWidth =
                      device_info.platform === 'phone'
                        ? device_info.screen.width + 24
                        : device_info.screen.width
                    const deviceHeight =
                      device_info.platform === 'phone'
                        ? device_info.screen.height + 48
                        : device_info.screen.height + 40

                    const scaleX = container.clientWidth / deviceWidth
                    const scaleY = container.clientHeight / deviceHeight
                    const scale = Math.min(scaleX, scaleY, 1.5) // Cap at 1.5x for very large screens

                    el.style.setProperty('--scale', scale.toString())
                  }}
                >
                  <DeviceFrame>
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        paddingTop:
                          device_info.platform === 'phone' ? '28px' : '0',
                        paddingBottom:
                          device_info.platform === 'phone' ? '16px' : '0',
                        boxSizing: 'border-box',
                        overflow: 'auto',
                      }}
                    >
                      <PrototypeRunner
                        flow={flowGraph}
                        deviceInfo={device_info}
                      />
                    </div>
                  </DeviceFrame>
                </div>
              </div>
            </div>

            {/* Fullscreen Mode Indicator */}
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              Press ESC or click ✕ to exit fullscreen
            </div>
          </div>
        )}
      </div>
    </>
  )
}
