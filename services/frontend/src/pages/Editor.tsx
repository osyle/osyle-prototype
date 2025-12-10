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
  Brain,
  Wand2,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { type UINode } from '../components/DesignMLRenderer'
import DeviceFrame from '../components/DeviceFrame'
import DeviceRenderer from '../components/DeviceRenderer'
import { useDeviceContext } from '../hooks/useDeviceContext'

type GenerationStage = 'idle' | 'learning' | 'generating' | 'complete' | 'error'

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

  // View-only mode (when viewing random UI or continuing existing project)
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false)

  // Right panel collapsed state
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)

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
        // Add view_only flag so it doesn't regenerate when continuing
        project.view_only = true
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
  }, [])

  // ✅ CHANGE: Use centralized API
  const checkAndStartGeneration = async () => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) {
        setError('No active project found')
        setGenerationStage('error')
        return
      }

      const project = JSON.parse(currentProject)

      // Check if this is view-only mode (viewing random UI or continuing project)
      if (project.view_only) {
        console.log('View-only mode detected - loading existing UI')
        setIsViewOnlyMode(true)
        setGeneratedUI(project.ui_data as UINode)
        setGenerationStage('complete')
        return
      }

      if (!project.selected_taste_id) {
        setError('Project missing taste selection')
        setGenerationStage('error')
        console.error('Project data:', project)
        return
      }

      if (!project.selected_resource_id) {
        console.log('No resource selected - will generate UI from scratch')
      }

      // Check if UI already exists for this project
      try {
        const existingUIData = await api.llm.getUI(project.project_id)
        console.log('Loaded existing UI:', existingUIData)
        setGeneratedUI(existingUIData.ui as UINode)
        setGenerationStage('complete')
        setIsViewOnlyMode(true) // Treat existing UIs as view-only
        return
      } catch (err) {
        console.log('No existing UI found, will generate new one:', err)
      }

      // Decide whether to build DTR
      const hasResource =
        project.selected_resource_id && project.selected_taste_id
      let shouldBuildDtr = false

      if (hasResource) {
        const dtrCheck = await api.llm.checkDtrExists(
          project.selected_resource_id,
          project.selected_taste_id,
        )
        shouldBuildDtr = !dtrCheck.dtr_exists
      }

      startGeneration(shouldBuildDtr)
    } catch (err) {
      console.error('Error checking for existing UI:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setGenerationStage('error')
    }
  }

  // ✅ CHANGE: Use centralized API
  const startGeneration = async (shouldBuildDtr: boolean) => {
    // Prevent regeneration if in view-only mode
    if (isViewOnlyMode) {
      console.log('View-only mode active - skipping generation')
      return
    }

    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) {
        setError('No active project found')
        setGenerationStage('error')
        return
      }

      const project = JSON.parse(currentProject)

      if (shouldBuildDtr && project.selected_resource_id) {
        setGenerationStage('learning')
        await api.llm.buildDtr(
          project.selected_resource_id,
          project.selected_taste_id,
        )
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      setGenerationStage('generating')

      const uiData = await api.llm.generateUI(
        project.project_id,
        project.task_description,
        device_info,
        rendering_mode,
        'haiku',
      )

      setGeneratedUI(uiData.ui as UINode)
      setGenerationStage('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setGenerationStage('error')
    }
  }

  // Render device content based on generation stage
  const renderDeviceContent = () => {
    if (generationStage === 'learning') {
      return (
        <div
          className="flex flex-col items-center justify-center h-full gap-6 px-8"
          style={{ backgroundColor: '#EDEBE9' }}
        >
          <div className="relative">
            <Brain
              size={64}
              className="animate-pulse"
              style={{ color: '#4A90E2' }}
            />
            <div className="absolute -bottom-2 -right-2">
              <Sparkles size={24} style={{ color: '#F5C563' }} />
            </div>
          </div>
          <div className="text-center">
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Learning your design taste
            </h3>
            <p className="text-sm max-w-md" style={{ color: '#929397' }}>
              Analyzing your reference designs to understand your style
              preferences...
            </p>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  backgroundColor: '#4A90E2',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      )
    }

    if (generationStage === 'generating') {
      return (
        <div
          className="flex flex-col items-center justify-center h-full gap-6 px-8"
          style={{ backgroundColor: '#EDEBE9' }}
        >
          <div className="relative">
            <Wand2
              size={64}
              className="animate-spin"
              style={{ color: '#F5C563' }}
            />
            <div className="absolute -top-2 -right-2">
              <Sparkles
                size={24}
                className="animate-pulse"
                style={{ color: '#4A90E2' }}
              />
            </div>
          </div>
          <div className="text-center">
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Generating your design
            </h3>
            <p className="text-sm max-w-md" style={{ color: '#929397' }}>
              Creating a beautiful{' '}
              {rendering_mode === 'react' ? 'React' : 'DesignML'} design based
              on your task description...
            </p>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: '#F5C563',
                  animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )
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
      className="flex h-screen w-screen"
      style={{
        backgroundColor: '#EDEBE9',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Left Menu Buttons - Centered vertically */}
      <div
        className="flex flex-col items-center justify-center py-6 gap-3"
        style={{ width: '80px' }}
      >
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

        {/* Image square 1 */}
        <button
          className="rounded-xl transition-all hover:scale-105"
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-400" />
        </button>

        {/* Image square 2 */}
        <button
          className="rounded-xl transition-all hover:scale-105"
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
        </button>

        {/* Add button */}
        <button
          className="rounded-xl flex items-center justify-center transition-all hover:scale-105"
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#929397"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Left Section - Responsive width based on panel state */}
      <div
        className="flex flex-col transition-all duration-300"
        style={{
          width: isRightPanelCollapsed
            ? 'calc(100% - 80px)'
            : 'calc(80% - 80px)',
        }}
      >
        {/* Top Section with Back Button and Tabs */}
        <div className="flex items-center justify-between px-16 py-6">
          {/* Back Button - Only show when generation is complete or error */}
          {(generationStage === 'complete' || generationStage === 'error') && (
            <button
              onClick={handleBackToHome}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <ArrowLeft size={20} style={{ color: '#3B3B3B' }} />
            </button>
          )}

          {/* Tab Navigation */}
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
                  backgroundColor:
                    activeTab === tab ? '#F4F4F4' : 'transparent',
                  color: activeTab === tab ? '#3B3B3B' : '#929397',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* View Only Badge or Empty space for balance */}
          {isViewOnlyMode ? (
            <div
              className="px-4 py-2 rounded-full text-xs font-medium"
              style={{
                backgroundColor: '#E8F4FF',
                color: '#4A90E2',
                border: '1px solid #4A90E2',
              }}
            >
              View Only
            </div>
          ) : (
            <div className="w-12" />
          )}
        </div>

        {/* Device Frame - Replaces center white rectangle */}
        <div className="flex-1 pb-6">
          <DeviceFrame>{renderDeviceContent()}</DeviceFrame>
        </div>

        {/* Bottom Control Bar */}
        <div className="px-16 pb-6">
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
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
      </div>

      {/* Right Sidebar - 20% width, full height, collapsible */}
      <div
        className="relative rounded-3xl m-6 p-6 flex flex-col gap-6 transition-all duration-300"
        style={{
          width: isRightPanelCollapsed ? '0%' : '20%',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          opacity: isRightPanelCollapsed ? 0 : 1,
          padding: isRightPanelCollapsed ? 0 : '24px',
          margin: isRightPanelCollapsed ? '0' : '24px',
          overflow: 'hidden',
        }}
      >
        {/* Collapse/Expand Toggle Button - Always visible */}
        {!isRightPanelCollapsed && (
          <button
            onClick={() => setIsRightPanelCollapsed(true)}
            className="absolute top-6 -left-4 w-8 h-12 rounded-l-lg flex items-center justify-center transition-all hover:scale-110 z-10"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '-2px 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <ChevronDown
              size={20}
              style={{
                color: '#3B3B3B',
                transform: 'rotate(-90deg)',
                transition: 'transform 0.3s',
              }}
            />
          </button>
        )}

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

      {/* Floating Expand Button - Only visible when panel is collapsed */}
      {isRightPanelCollapsed && (
        <button
          onClick={() => setIsRightPanelCollapsed(false)}
          className="fixed top-1/2 right-4 -translate-y-1/2 w-10 h-16 rounded-l-xl flex items-center justify-center transition-all hover:scale-110 z-50"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '-4px 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          <ChevronDown
            size={24}
            style={{
              color: '#3B3B3B',
              transform: 'rotate(90deg)',
            }}
          />
        </button>
      )}
    </div>
  )
}
