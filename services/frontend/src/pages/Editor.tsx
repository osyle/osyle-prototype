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
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AddInspirationModal from '../components/AddInspirationModal'
import { type UINode } from '../components/DeviceRenderer'
import DeviceRenderer from '../components/DeviceRenderer'
import InfiniteCanvas from '../components/InfiniteCanvas'
import VersionHistory from '../components/VersionHistory'
import { useDeviceContext } from '../hooks/useDeviceContext'
import api from '../services/api'

type GenerationStage = 'idle' | 'generating' | 'complete' | 'error'

export default function Editor() {
  const navigate = useNavigate()

  const { device_info, rendering_mode } = useDeviceContext()

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
  const [generatedUI, setGeneratedUI] = useState<UINode | null>(null)

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

  // Version history state
  const [currentUIVersion, setCurrentUIVersion] = useState<number>(1)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)
  const [isReverting, setIsReverting] = useState(false)

  const tabs = ['Concept', 'Prototype', 'Video pitch', 'Presentation']

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

  // Note: getScaledDimensions removed - InfiniteCanvas handles all sizing at true dimensions

  const handleBackToHome = () => {
    // Only allow navigation back if generation is complete or in error state
    if (generationStage !== 'complete' && generationStage !== 'error') {
      return
    }

    // Mark project as completed so "Continue" button appears
    const currentProject = localStorage.getItem('current_project')
    if (currentProject) {
      try {
        const project = JSON.parse(currentProject)
        project.ui_data = generatedUI
        localStorage.setItem('current_project', JSON.stringify(project))
      } catch (err) {
        console.error('Failed to update project:', err)
      }
    }

    sessionStorage.setItem('came_from_editor', 'true')
    navigate('/')
  }

  // Start generation process on mount (only if not already generated)
  useEffect(() => {
    checkAndStartGeneration()
    loadInspirationImages()
  }, [])

  const checkAndStartGeneration = async () => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) {
        setError('No active project found')
        setGenerationStage('error')
        return
      }

      const project = JSON.parse(currentProject)

      if (!project.selected_taste_id) {
        setError('Project missing taste selection')
        setGenerationStage('error')
        console.error('Project data:', project)
        return
      }

      // Check if UI already exists for this project
      try {
        const existingUIData = await api.llm.getUI(project.project_id)
        console.log('Loaded existing UI:', existingUIData)
        setGeneratedUI(existingUIData.ui as UINode)
        setGenerationStage('complete')

        // Load version info when loading existing UI
        await loadVersionInfo()
        return
      } catch (err) {
        console.log('No existing UI found, will generate new one:', err)
      }

      // DTR learning is now done on Home screen, so we skip directly to UI generation
      startGeneration()
    } catch (err) {
      console.error('Error checking for existing UI:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setGenerationStage('error')
    }
  }

  const loadVersionInfo = async () => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) return

      const project = JSON.parse(currentProject)
      const versionData = await api.llm.getUIVersions(project.project_id)
      setCurrentUIVersion(versionData.current_version)
    } catch (err) {
      console.error('Failed to load version info:', err)
    }
  }

  const handleVersionSelect = async (version: number) => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) return

      const project = JSON.parse(currentProject)
      const versionData = await api.llm.getUI(project.project_id, version)

      setGeneratedUI(versionData.ui as UINode)
      setViewingVersion(version)
    } catch (err) {
      console.error('Failed to load version:', err)
      alert(err instanceof Error ? err.message : 'Failed to load version')
    }
  }

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
      const result = await api.llm.revertToVersion(project.project_id, version)

      setGeneratedUI(result.ui as UINode)
      setCurrentUIVersion(result.new_version)
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

  const startGeneration = async () => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) {
        setError('No active project found')
        setGenerationStage('error')
        return
      }

      const project = JSON.parse(currentProject)

      // DTR learning already happened on Home screen
      // Jump straight to UI generation
      setGenerationStage('generating')

      const uiData = await api.llm.generateUI(
        project.project_id,
        project.task_description,
        device_info,
        rendering_mode,
      )

      setGeneratedUI(uiData.ui as UINode)
      setCurrentUIVersion(uiData.version)
      setGenerationStage('complete')
    } catch (err) {
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

      // Add new inspiration images to project
      await api.projects.addInspirationImages(project.project_id, files)

      // Reload inspiration images to show in UI
      await loadInspirationImages()

      // Close modal
      setIsAddInspirationModalOpen(false)

      // Regenerate UI with updated inspiration images
      setGenerationStage('generating')
      setError(null)
      setViewingVersion(null)

      const uiData = await api.llm.generateUI(
        project.project_id,
        project.task_description,
        device_info,
        rendering_mode,
      )

      setGeneratedUI(uiData.ui as UINode)
      setCurrentUIVersion(uiData.version)
      setGenerationStage('complete')
    } catch (err) {
      console.error('Failed to add inspiration images:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add images and regenerate UI',
      )
      setGenerationStage('error')
    } finally {
      setIsAddingInspiration(false)
    }
  }

  // Render device content based on generation stage
  const renderDeviceContent = () => {
    // Loading states are now handled by InfiniteCanvas
    if (generationStage === 'generating') {
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
            <p className="text-sm mb-4" style={{ color: '#929397' }}>
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

    if (generationStage === 'complete' && generatedUI) {
      return <DeviceRenderer uiTree={generatedUI} />
    }

    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ backgroundColor: '#EDEBE9' }}
      >
        <div className="text-center">
          <Smile
            size={48}
            className="mx-auto mb-4"
            style={{ color: '#929397' }}
          />
          <p className="text-sm" style={{ color: '#929397' }}>
            Initializing...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{
        backgroundColor: '#EDEBE9',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Back Button - Fixed top-left */}
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

      {/* Left Side Menu - Fixed left center */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40">
        {/* Menu button */}
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

        {/* Inspiration Images (max 3 most recent) */}
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

        {/* Add button */}
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

        {/* Version History */}
        {generationStage === 'complete' && currentUIVersion > 0 && (
          <div className="mt-4">
            <VersionHistory
              currentVersion={currentUIVersion}
              onVersionSelect={handleVersionSelect}
              onRevert={handleRevertVersion}
              isReverting={isReverting}
              viewingVersion={viewingVersion}
            />
          </div>
        )}
      </div>

      {/* Tab Navigation - Fixed top center (responsive to right panel) */}
      <div
        className="fixed top-6 transition-all duration-300 z-40"
        style={{
          left: '80px',
          right: isRightPanelCollapsed ? '0' : '20%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          className="flex items-center gap-1 rounded-full px-2 py-1.5"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-6 py-2 rounded-full transition-all duration-300 text-sm font-medium"
              style={{
                backgroundColor: activeTab === tab ? '#F4F4F4' : 'transparent',
                color: activeTab === tab ? '#3B3B3B' : '#929397',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Infinite Canvas - Fullscreen background layer */}
      <InfiniteCanvas
        width={device_info.screen.width}
        height={device_info.screen.height}
        isLoading={generationStage === 'generating'}
        loadingStage={
          generationStage === 'generating' ? 'Generating design...' : undefined
        }
      >
        {renderDeviceContent()}
      </InfiniteCanvas>

      {/* Bottom Control Bar - Fixed bottom center (responsive to right panel) */}
      <div
        className="fixed bottom-6 transition-all duration-300 z-40"
        style={{
          left: '80px',
          right: isRightPanelCollapsed ? '0' : '20%',
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
              placeholder="Describe your edits"
              className="flex-1 px-4 py-2 rounded-lg focus:outline-none text-sm"
              style={{ backgroundColor: 'transparent', color: '#3B3B3B' }}
            />
            <div className="flex items-center gap-3">
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style={{ backgroundColor: '#1F1F20' }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#FFFFFF' }}
                />
              </button>
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

      {/* Right Sidebar - Fixed right side, collapsible */}
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
              {/* Top row - L button, 25%, NI */}
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

              {/* Title and subtitle */}
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

              {/* Style dropdown */}
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

              {/* Sliders */}
              <div className="space-y-4">
                {/* Details slider */}
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

                {/* Energy slider */}
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

                {/* Craft slider */}
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

              {/* 4 Control buttons */}
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

              {/* Input area at bottom */}
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

      {/* Floating Collapse Button - Only visible when panel is open */}
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

      {/* Floating Expand Button - Only visible when panel is collapsed */}
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

      {/* Add Inspiration Modal */}
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
