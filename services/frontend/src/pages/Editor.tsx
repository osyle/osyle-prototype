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
    sessionStorage.setItem('came_from_editor', 'true')
    navigate('/')
  }

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'https://bj7i7munz2.execute-api.us-east-1.amazonaws.com'

  // Start generation process on mount (only if not already generated)
  useEffect(() => {
    checkAndStartGeneration()
  }, [])

  const checkDtrExists = async (
    token: string,
    tasteId: string,
    resourceId: string,
  ) => {
    const res = await fetch(
      `${API_BASE_URL}/api/llm/resource/${resourceId}/dtr-exists?taste_id=${tasteId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!res.ok) {
      throw new Error('Failed to check DTR existence')
    }

    const data = await res.json()
    return data.dtr_exists as boolean
  }

  const checkAndStartGeneration = async () => {
    try {
      // Get current project from localStorage
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) {
        setError('No active project found')
        setGenerationStage('error')
        return
      }

      const project = JSON.parse(currentProject)
      const token = localStorage.getItem('token')

      // Validate project has required fields
      if (!project.selected_taste_id) {
        setError('Project missing taste selection')
        setGenerationStage('error')
        console.error('Project data:', project)
        return
      }

      // Note: selected_resource_id is optional - if not provided, UI will be generated from scratch
      if (!project.selected_resource_id) {
        console.log('No resource selected - will generate UI from scratch')
      }

      // Check if UI already exists for this project
      try {
        const existingUIResponse = await fetch(
          `${API_BASE_URL}/api/llm/ui/get?project_id=${project.project_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (existingUIResponse.ok) {
          const existingUIData = await existingUIResponse.json()
          console.log('Loaded existing UI:', existingUIData)
          setGeneratedUI(existingUIData.ui as UINode)
          setGenerationStage('complete')
          return // Don't regenerate
        }
      } catch (err) {
        console.log('No existing UI found, will generate new one:', err)
      }

      // No existing UI, decide whether to build DTR
      const hasResource =
        project.selected_resource_id && project.selected_taste_id

      let shouldBuildDtr = false

      if (hasResource) {
        shouldBuildDtr = !(await checkDtrExists(
          token!,
          project.selected_taste_id,
          project.selected_resource_id,
        ))
      }

      // Start generation with decision
      startGeneration(shouldBuildDtr)
    } catch (err) {
      console.error('Error checking for existing UI:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setGenerationStage('error')
    }
  }

  const startGeneration = async (shouldBuildDtr: boolean) => {
    try {
      const currentProject = localStorage.getItem('current_project')
      if (!currentProject) {
        setError('No active project found')
        setGenerationStage('error')
        return
      }

      const project = JSON.parse(currentProject)
      const token = localStorage.getItem('token')

      // ✅ Stage 1: Build DTR only if needed
      if (shouldBuildDtr && project.selected_resource_id) {
        setGenerationStage('learning')

        const dtrResponse = await fetch(`${API_BASE_URL}/api/llm/build-dtr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            resource_id: project.selected_resource_id,
            taste_id: project.selected_taste_id,
          }),
        })

        if (!dtrResponse.ok) {
          throw new Error('Failed to build design representation')
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // ✅ Stage 2: Generate UI
      setGenerationStage('generating')

      const uiResponse = await fetch(`${API_BASE_URL}/api/llm/generate-ui`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: project.project_id,
          task_description: project.task_description,
          model: 'haiku',
          device_info,
          rendering_mode,
        }),
      })

      if (!uiResponse.ok) {
        throw new Error('Failed to generate UI')
      }

      const uiData = await uiResponse.json()
      setGeneratedUI(uiData.ui)
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
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
          {/* Animated brain icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping">
              <Brain size={48} className="text-blue-400 opacity-40" />
            </div>
            <Brain size={48} className="text-blue-500 relative z-10" />
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs mb-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Text */}
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800 mb-1">
              Learning design taste
            </p>
            <p className="text-xs text-gray-500">
              Analyzing your reference designs...
            </p>
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-20"
                style={{
                  left: `${20 + i * 10}%`,
                  animation: `float ${2 + i * 0.5}s ease-in-out infinite`,
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
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
          {/* Animated wand icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping">
              <Wand2 size={48} className="text-purple-400 opacity-40" />
            </div>
            <Wand2
              size={48}
              className="text-purple-500 relative z-10 animate-pulse"
            />
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs mb-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-pink-600 rounded-full"
                style={{
                  width: '100%',
                  animation: 'shimmer 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {/* Text */}
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800 mb-1">
              Generating your design
            </p>
            <p className="text-xs text-gray-500">
              Creating UI based on your task...
            </p>
          </div>

          {/* Sparkles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <Sparkles
                key={i}
                size={16}
                className="absolute text-yellow-400 opacity-30"
                style={{
                  left: `${10 + i * 12}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  animation: `twinkle ${1.5 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      )
    }

    if (generationStage === 'complete' && generatedUI) {
      return (
        <div className="w-full h-full overflow-hidden p-0 flex items-center justify-center">
          <div
            style={{
              width: device_info.screen.width,
              height: device_info.screen.height,
            }}
          >
            {/* Render the DML UI tree directly in the DeviceFrame */}
            <DeviceRenderer uiTree={generatedUI} />
          </div>
        </div>
      )
    }

    if (generationStage === 'error') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            Generation Failed
          </p>
          <p className="text-xs text-gray-500 mb-4">
            {error || 'An error occurred during generation'}
          </p>
          <button
            onClick={() => startGeneration(true)}
            className="px-4 py-2 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }

    // Idle state (shouldn't show)
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm text-gray-400">Generated UI will appear here</p>
          <p className="text-xs text-gray-300 mt-1">
            Start generating to see your design
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen min-w-screen flex"
      style={{ backgroundColor: '#EDEBE9' }}
    >
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.2); }
          }
          
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>

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

      {/* Left Section - 60% width */}
      <div className="flex flex-col" style={{ width: 'calc(80% - 80px)' }}>
        {/* Top Section with Back Button and Tabs */}
        <div className="flex items-center justify-between px-16 py-6">
          {/* Back Button */}
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

          {/* Empty space for balance */}
          <div className="w-12" />
        </div>

        {/* Center Device Frame */}
        <div className="flex-1 px-16 pb-6 flex items-center justify-center">
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
                  className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#F5C563',
                    color: '#1F1F20',
                    boxShadow: '0 2px 12px rgba(245, 197, 99, 0.3)',
                  }}
                >
                  <Smile size={16} />
                  <span>Generate</span>
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - unchanged */}
      <div
        className="flex flex-col p-6 gap-6"
        style={{ width: '20%', backgroundColor: '#FFFFFF' }}
      >
        {/* Style selector */}
        <div className="relative">
          <button
            onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
            className="w-full rounded-xl p-4 transition-all hover:scale-[1.02] relative"
            style={{ background: selectedStyle.bg }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-sm font-semibold"
                style={{ color: '#3B3B3B' }}
              >
                {selectedStyle.title}
              </span>
              <ChevronDown
                size={20}
                style={{
                  color: '#3B3B3B',
                  transform: styleDropdownOpen
                    ? 'rotate(180deg)'
                    : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </div>
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
                style={{ backgroundColor: '#3B3B3B', width: `${energyValue}%` }}
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
                style={{ backgroundColor: '#3B3B3B', width: `${craftValue}%` }}
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
      </div>
    </div>
  )
}
