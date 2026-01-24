import {
  ChevronDown,
  Sparkles,
  MessageSquare,
  Eye,
  AlertCircle,
  CheckCircle,
  X,
  Sliders,
  RotateCcw,
  Palette,
  Layout,
  Type,
  Layers,
} from 'lucide-react'
import { useState } from 'react'
import api from '../services/api'
import type { FlowGraph, FlowScreen } from '../types/home.types'
import type { ParameterValues, VariationSpace } from '../types/parametric.types'
import ParametricControls from './ParametricControls'

interface RightPanelProps {
  isCollapsed: boolean
  onCollapse: () => void
  activeTab: 'explore' | 'refine' | 'iterate'
  // eslint-disable-next-line no-unused-vars
  setActiveTab: (tab: 'explore' | 'refine' | 'iterate') => void
  userInfo: {
    name: string
    email: string
    initials: string
    picture?: string
  } | null
  onSignOut: () => void
  flowGraph: FlowGraph | null
  // eslint-disable-next-line no-unused-vars
  setFlowGraph: (flowGraph: FlowGraph) => void
  selectedScreen: FlowScreen | null
  parameterValues: ParameterValues
  // eslint-disable-next-line no-unused-vars
  setParameterValues: (values: ParameterValues) => void
  renderingMode: 'react' | 'parametric'
}

interface AISuggestion {
  id: string
  title: string
  description: string
  severity: 'critical' | 'recommended' | 'optional'
  category: 'spacing' | 'color' | 'typography' | 'accessibility' | 'consistency'
  affectedElements: number
}

interface ConversationMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  hasChanges?: boolean
}

export default function RightPanel({
  isCollapsed,
  onCollapse,
  activeTab,
  setActiveTab,
  userInfo,
  onSignOut,
  flowGraph,
  setFlowGraph,
  selectedScreen,
  parameterValues,
  setParameterValues,
  renderingMode,
}: RightPanelProps) {
  // Project title/description editing state (MOVED FROM Editor.tsx)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')

  // Style selection state (MOVED FROM Editor.tsx)
  const [selectedStyle, setSelectedStyle] = useState({
    title: 'Playful & bold',
    bg: 'linear-gradient(135deg, #FFB6A3 0%, #E8C5E8 33%, #B8D4E8 66%, #A8E8C0 100%)',
  })
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false)

  // Style options constant (MOVED FROM Editor.tsx)
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

  // Handler functions for title/description editing (MOVED FROM Editor.tsx)
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

      const currentProject = localStorage.getItem('current_project')
      if (currentProject) {
        try {
          const project = JSON.parse(currentProject)
          project.flow_graph = updatedFlowGraph
          localStorage.setItem('current_project', JSON.stringify(project))

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

      const currentProject = localStorage.getItem('current_project')
      if (currentProject) {
        try {
          const project = JSON.parse(currentProject)
          project.flow_graph = updatedFlowGraph
          localStorage.setItem('current_project', JSON.stringify(project))

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

  // AI Suggestions state (NEW - for Iterate tab redesign)
  const [suggestions] = useState<AISuggestion[]>([
    {
      id: '1',
      title: 'Inconsistent Button Sizes',
      description:
        'Login button (48px) differs from other primary buttons (56px) in your flow',
      severity: 'recommended',
      category: 'consistency',
      affectedElements: 3,
    },
    {
      id: '2',
      title: 'Low Color Contrast',
      description:
        'Text on cards has 3.2:1 contrast ratio, below WCAG AA standard (4.5:1)',
      severity: 'critical',
      category: 'accessibility',
      affectedElements: 8,
    },
    {
      id: '3',
      title: 'Spacing Could Be More Generous',
      description:
        'Using 8px in 15 places, but your DTM typically uses 16px for similar contexts',
      severity: 'optional',
      category: 'spacing',
      affectedElements: 15,
    },
  ])

  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([])

  // Conversation state (NEW - for Iterate tab redesign)
  const [conversation] = useState<ConversationMessage[]>([
    {
      id: '1',
      type: 'user',
      content: 'Make the header more prominent',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
    },
    {
      id: '2',
      type: 'ai',
      content:
        'I increased the font size from 32px to 48px and added your signature gradient overlay. The header now follows your typical hero section pattern.',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      hasChanges: true,
    },
    {
      id: '3',
      type: 'user',
      content: 'Perfect, now fix the button spacing',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
  ])

  const activeSuggestions = suggestions.filter(
    s => !dismissedSuggestions.includes(s.id),
  )

  const getSeverityColor = (severity: AISuggestion['severity']) => {
    switch (severity) {
      case 'critical':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }
      case 'recommended':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' }
      case 'optional':
        return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }
    }
  }

  const getCategoryIcon = (category: AISuggestion['category']) => {
    switch (category) {
      case 'accessibility':
        return <Eye size={14} />
      case 'consistency':
        return <CheckCircle size={14} />
      default:
        return <AlertCircle size={14} />
    }
  }

  return (
    <>
      <div
        className="fixed right-0 top-0 h-screen transition-all duration-300 z-30"
        style={{
          width: isCollapsed ? '0' : '28%',
        }}
      >
        <div
          className="relative rounded-3xl mt-6 mr-6 mb-6 ml-0 flex flex-col gap-6 h-[calc(100vh-48px)]"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            opacity: isCollapsed ? 0 : 1,
            overflow: isCollapsed ? 'hidden' : 'auto',
            paddingLeft: '24px',
            paddingRight: '24px',
            paddingTop: '24px',
            paddingBottom: '24px',
          }}
        >
          {!isCollapsed && (
            <>
              {/* Top Row: Tabs (left) + User Profile (right) */}
              <div className="flex items-center justify-between gap-4 mb-4">
                {/* Tab Navigation - Figma Style */}
                <div
                  className="flex items-center gap-0 border-b"
                  style={{ borderColor: '#E8E1DD' }}
                >
                  <button
                    onClick={() => setActiveTab('explore')}
                    className="px-3 py-2 text-xs font-medium transition-colors border-b-2"
                    style={{
                      color: activeTab === 'explore' ? '#3B3B3B' : '#929397',
                      borderColor:
                        activeTab === 'explore' ? '#3B3B3B' : 'transparent',
                    }}
                  >
                    Explore
                  </button>
                  <button
                    onClick={() => setActiveTab('refine')}
                    className="px-3 py-2 text-xs font-medium transition-colors border-b-2"
                    style={{
                      color: activeTab === 'refine' ? '#3B3B3B' : '#929397',
                      borderColor:
                        activeTab === 'refine' ? '#3B3B3B' : 'transparent',
                    }}
                  >
                    Refine
                  </button>
                  <button
                    onClick={() => setActiveTab('iterate')}
                    className="px-3 py-2 text-xs font-medium transition-colors border-b-2"
                    style={{
                      color: activeTab === 'iterate' ? '#3B3B3B' : '#929397',
                      borderColor:
                        activeTab === 'iterate' ? '#3B3B3B' : 'transparent',
                    }}
                  >
                    Iterate
                  </button>
                </div>

                {/* User Profile */}
                {userInfo && (
                  <div className="relative group">
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all hover:scale-110"
                      style={{
                        backgroundColor: '#F0F7FF',
                        color: '#3B82F6',
                      }}
                    >
                      {userInfo.initials}
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <div className="p-3 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900">
                          {userInfo.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {userInfo.email}
                        </div>
                      </div>
                      <button
                        onClick={onSignOut}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
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
              {activeTab === 'explore' && (
                <div
                  className="flex-1 flex flex-col gap-5 overflow-y-auto"
                  style={{ paddingRight: '4px' }}
                >
                  {/* Parametric Controls - Only in parametric mode */}
                  {renderingMode === 'parametric' &&
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
                            selectedScreen['variation_space'] as VariationSpace
                          }
                          initialValues={parameterValues}
                          onChange={newValues => setParameterValues(newValues)}
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
              {activeTab === 'refine' && (
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
                          <div className="text-xs" style={{ color: '#929397' }}>
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
                          <div className="text-xs" style={{ color: '#929397' }}>
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
                          <div className="text-xs" style={{ color: '#929397' }}>
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
                        <span className="text-sm" style={{ color: '#3B3B3B' }}>
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
                        <span className="text-sm" style={{ color: '#3B3B3B' }}>
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

              {/* Tab Content - Iterate (REDESIGNED) */}
              {activeTab === 'iterate' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* AI Suggestions Section */}
                  <div
                    className="flex flex-col mb-4"
                    style={{
                      maxHeight: activeSuggestions.length > 0 ? '45%' : '0',
                      transition: 'max-height 0.3s ease',
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} style={{ color: '#667EEA' }} />
                        <div
                          className="text-sm font-semibold"
                          style={{ color: '#3B3B3B' }}
                        >
                          AI Suggestions
                        </div>
                        <div
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: '#F0F7FF',
                            color: '#3B82F6',
                          }}
                        >
                          {activeSuggestions.length}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                      {activeSuggestions.map(suggestion => {
                        const colors = getSeverityColor(suggestion.severity)
                        return (
                          <div
                            key={suggestion.id}
                            className="rounded-xl p-3 border"
                            style={{
                              backgroundColor: colors.bg,
                              borderColor: colors.border,
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div style={{ color: colors.text }}>
                                  {getCategoryIcon(suggestion.category)}
                                </div>
                                <div
                                  className="text-sm font-semibold"
                                  style={{ color: colors.text }}
                                >
                                  {suggestion.title}
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  setDismissedSuggestions([
                                    ...dismissedSuggestions,
                                    suggestion.id,
                                  ])
                                }
                                className="p-1 hover:bg-white/50 rounded transition-colors"
                              >
                                <X size={14} style={{ color: colors.text }} />
                              </button>
                            </div>

                            <div
                              className="text-xs mb-3"
                              style={{ color: colors.text, opacity: 0.8 }}
                            >
                              {suggestion.description}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  color: colors.text,
                                  border: `1px solid ${colors.border}`,
                                }}
                              >
                                Apply
                              </button>
                              <button
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/50"
                                style={{
                                  color: colors.text,
                                }}
                              >
                                Explain
                              </button>
                              <div
                                className="text-xs ml-auto"
                                style={{ color: colors.text, opacity: 0.6 }}
                              >
                                {suggestion.affectedElements} elements
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {activeSuggestions.length === 0 && (
                        <div className="text-center py-8">
                          <CheckCircle
                            size={32}
                            className="mx-auto mb-2"
                            style={{ color: '#10B981' }}
                          />
                          <div
                            className="text-sm font-medium"
                            style={{ color: '#3B3B3B' }}
                          >
                            All Suggestions Addressed
                          </div>
                          <div className="text-xs" style={{ color: '#929397' }}>
                            Your design looks great!
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  {activeSuggestions.length > 0 && (
                    <div
                      className="flex items-center gap-3 py-3"
                      style={{ borderTop: '1px solid #E8E1DD' }}
                    >
                      <div className="text-xs" style={{ color: '#929397' }}>
                        {activeSuggestions.length} suggestions •{' '}
                        {conversation.length} messages
                      </div>
                    </div>
                  )}

                  {/* Conversation Section */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare size={16} style={{ color: '#667EEA' }} />
                      <div
                        className="text-sm font-semibold"
                        style={{ color: '#3B3B3B' }}
                      >
                        Conversation
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {conversation.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className="rounded-lg px-4 py-2 max-w-[85%]"
                            style={{
                              backgroundColor:
                                msg.type === 'user' ? '#F0F7FF' : '#F7F5F3',
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="text-xs font-medium"
                                style={{ color: '#3B3B3B' }}
                              >
                                {msg.type === 'user' ? 'You' : 'AI'}
                              </div>
                              <div
                                className="text-xs"
                                style={{ color: '#929397' }}
                              >
                                {msg.timestamp.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                            <div
                              className="text-sm"
                              style={{ color: '#3B3B3B' }}
                            >
                              {msg.content}
                            </div>
                            {msg.hasChanges && (
                              <button
                                className="mt-2 text-xs font-medium"
                                style={{ color: '#3B82F6' }}
                              >
                                View Changes →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {conversation.length === 0 && (
                        <div className="text-center py-8">
                          <MessageSquare
                            size={32}
                            className="mx-auto mb-2"
                            style={{ color: '#929397' }}
                          />
                          <div
                            className="text-sm font-medium"
                            style={{ color: '#3B3B3B' }}
                          >
                            No conversation yet
                          </div>
                          <div className="text-xs" style={{ color: '#929397' }}>
                            Use the input below to start iterating
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Collapse Button */}
      {!isCollapsed && (
        <button
          onClick={onCollapse}
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
    </>
  )
}
