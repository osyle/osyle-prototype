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
import PrototypeCanvas from '../components/PrototypeCanvas'
import PrototypeRunner from '../components/PrototypeRunner'
import VersionHistory from '../components/VersionHistory'
import { useDeviceContext } from '../hooks/useDeviceContext'
import api from '../services/api'
import { type FlowGraph } from '../types/home.types'

type GenerationStage = 'idle' | 'generating' | 'complete' | 'error'

export default function Editor() {
  const navigate = useNavigate()

  const { device_info, setDeviceInfo, setRenderingMode } = useDeviceContext()

  // Canvas ref for programmatic control
  const canvasRef = useRef<InfiniteCanvasHandle>(null)

  const [activeTab, setActiveTab] = useState('Concept')
  const [detailsValue, setDetailsValue] = useState(66)
  const [energyValue, setEnergyValue] = useState(50)
  const [craftValue, setCraftValue] = useState(10)
  const [inputText, setInputText] = useState('')
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState({
    title: 'Playful & bold',
    bg: 'linear-gradient(135deg, #FFB6A3 0%, #E8C5E8 33%, #B8D4E8 66%, #A8E8C0 100%)',
  })

  // Generation state
  const [generationStage, setGenerationStage] =
    useState<GenerationStage>('idle')
  const [flowGraph, setFlowGraph] = useState<FlowGraph | null>(null)
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null)
  const [isFlowNavigatorOpen, setIsFlowNavigatorOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Right panel collapsed state
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)

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

  const getDetailsLabel = () => {
    if (detailsValue < 33) return 'Light'
    if (detailsValue < 66) return 'Medium'
    return 'Bold'
  }

  const getEnergyValue = () => Math.max(1, Math.round((energyValue / 100) * 10))
  const getCraftValue = () => Math.max(1, Math.round((craftValue / 100) * 10))

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

  useEffect(() => {
    checkAndStartGeneration()
    loadInspirationImages()
  }, [])

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

      console.log('🚀 Starting flow generation...')

      const flowResult = await api.llm.generateFlow(project.project_id)

      console.log('✅ Flow generation complete!')
      console.log('  Version:', flowResult.version)

      setFlowGraph(flowResult.flow_graph)
      setCurrentFlowVersion(flowResult.version)
      setGenerationStage('complete')
      setViewingVersion(null) // Reset viewing version

      // Update project in localStorage
      project.flow_graph = flowResult.flow_graph
      localStorage.setItem('current_project', JSON.stringify(project))
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
    // Don't render anything during idle or generating states
    if (generationStage === 'idle' || generationStage === 'generating') {
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

    if (generationStage === 'complete' && flowGraph) {
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
              <PrototypeRunner flow={flowGraph} deviceInfo={device_info} />
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
                    {screen.ui_code ? (
                      <DynamicReactRenderer
                        jsxCode={screen.ui_code}
                        propsToInject={{
                          onTransition: () => {},
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
          right: isRightPanelCollapsed ? '80px' : 'calc(20% + 40px)',
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
            right: isRightPanelCollapsed ? '80px' : 'calc(20% + 40px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
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
          right: isRightPanelCollapsed ? '80px' : 'calc(20% + 40px)',
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
          width: isRightPanelCollapsed ? '0' : '20%',
        }}
      >
        <div
          className="relative rounded-3xl mt-6 mr-6 mb-6 ml-0 p-6 flex flex-col gap-6 h-[calc(100vh-48px)]"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            opacity: isRightPanelCollapsed ? 0 : 1,
            overflow: isRightPanelCollapsed ? 'hidden' : 'auto',
          }}
        >
          {!isRightPanelCollapsed && (
            <>
              <div className="flex items-center justify-between">
                <button
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold transition-all hover:scale-105"
                  style={{ backgroundColor: '#F7F5F3', color: '#3B3B3B' }}
                >
                  L
                </button>
                <div className="flex items-center gap-3">
                  <div
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#F7F5F3', color: '#3B3B3B' }}
                  >
                    25%
                  </div>
                  <button
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
                    style={{ backgroundColor: '#3B3B3B', color: '#FFFFFF' }}
                  >
                    NI
                  </button>
                </div>
              </div>

              <div>
                <h2
                  className="text-2xl font-semibold mb-1"
                  style={{ color: '#3B3B3B' }}
                >
                  Travel interface
                </h2>
                <p className="text-sm" style={{ color: '#929397' }}>
                  App for travelling with partner, iOS app
                </p>
              </div>

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
                    className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl z-10"
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

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-medium"
                        style={{ color: '#3B3B3B' }}
                      >
                        Details
                      </span>
                      <span className="text-xs" style={{ color: '#929397' }}>
                        ||
                      </span>
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: '#3B3B3B' }}
                    >
                      {getDetailsLabel()}
                    </span>
                  </div>
                  <div
                    className="relative h-2 rounded-full"
                    style={{ backgroundColor: '#F4F4F4' }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{
                        backgroundColor: '#3B3B3B',
                        width: `${detailsValue}%`,
                      }}
                    />
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={detailsValue}
                      onChange={e => setDetailsValue(Number(e.target.value))}
                      className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-medium"
                        style={{ color: '#3B3B3B' }}
                      >
                        Energy
                      </span>
                      <span className="text-xs" style={{ color: '#929397' }}>
                        ||
                      </span>
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: '#3B3B3B' }}
                    >
                      {getEnergyValue()}
                    </span>
                  </div>
                  <div
                    className="relative h-2 rounded-full"
                    style={{ backgroundColor: '#F4F4F4' }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{
                        backgroundColor: '#3B3B3B',
                        width: `${energyValue}%`,
                      }}
                    />
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={energyValue}
                      onChange={e => setEnergyValue(Number(e.target.value))}
                      className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-medium"
                        style={{ color: '#3B3B3B' }}
                      >
                        Craft
                      </span>
                      <span className="text-xs" style={{ color: '#929397' }}>
                        ||
                      </span>
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: '#3B3B3B' }}
                    >
                      {getCraftValue()}
                    </span>
                  </div>
                  <div
                    className="relative h-2 rounded-full"
                    style={{ backgroundColor: '#F4F4F4' }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{
                        backgroundColor: '#3B3B3B',
                        width: `${craftValue}%`,
                      }}
                    />
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={craftValue}
                      onChange={e => setCraftValue(Number(e.target.value))}
                      className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

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

              <div className="mt-auto">
                <div className="relative">
                  <textarea
                    placeholder="Add suggestions or feedback..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl resize-none focus:outline-none"
                    style={{
                      backgroundColor: '#F7F5F3',
                      border: 'none',
                      color: '#3B3B3B',
                      fontSize: '14px',
                    }}
                    rows={3}
                  />
                  {inputText.length > 0 && (
                    <div
                      className="absolute bottom-3 right-4 px-2 py-1 rounded text-xs"
                      style={{ backgroundColor: '#FFFFFF', color: '#929397' }}
                    >
                      Enter
                    </div>
                  )}
                </div>
                {inputText.length > 0 && (
                  <button
                    className="w-full mt-3 px-6 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: '#F5C563',
                      color: '#1F1F20',
                      boxShadow: '0 2px 12px rgba(245, 197, 99, 0.3)',
                    }}
                  >
                    Submit
                  </button>
                )}
              </div>
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

      {/* Generating Flow Overlay */}
      {generationStage === 'generating' && (
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
            {/* Animated Loading Icon - Orbiting Dots */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Center Circle */}
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

              {/* Orbiting Dots */}
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

              {/* Rotating Ring */}
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

            {/* Loading Text */}
            <div className="text-center">
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: '#1F1F20' }}
              >
                Generating your flow
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: '#929397' }}
              >
                Creating screens and connecting interactions...
              </p>
            </div>

            {/* Animated Progress Dots */}
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

      <AddInspirationModal
        isOpen={isAddInspirationModalOpen}
        onClose={() => setIsAddInspirationModalOpen(false)}
        onConfirm={handleAddInspiration}
        isLoading={isAddingInspiration}
        maxImages={5}
        currentCount={inspirationImages.length}
      />
    </div>
  )
}
