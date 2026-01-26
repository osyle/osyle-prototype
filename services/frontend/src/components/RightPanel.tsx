import {
  ChevronDown,
  Sparkles,
  Eye,
  AlertCircle,
  CheckCircle,
  X,
  Sliders,
  RotateCcw,
  Palette,
  Layers,
  MessageCircle,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useAgentatorGlobal } from '../lib/Agentator'
import api from '../services/api'
import type { FlowGraph, FlowScreen } from '../types/home.types'
import type { ParameterValues, VariationSpace } from '../types/parametric.types'
import type { StyleOverride } from '../types/styleEditor.types'
import ParametricControls from './ParametricControls'
import { StyleEditorPanel } from './StyleEditorPanel'

interface RightPanelProps {
  isCollapsed: boolean
  onCollapse: () => void
  activeTab: 'explore' | 'refine' | 'annotate' | 'reflect'
  // eslint-disable-next-line no-unused-vars
  setActiveTab: (tab: 'explore' | 'refine' | 'annotate' | 'reflect') => void
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
  // Get Agentator state
  const {
    annotations,
    codeAnnotations,
    inspectedElement,
    deleteAnnotation: deleteAnnotationGlobal,
    deleteCodeAnnotation,
    getTotalAnnotationCount,
    addStyleOverride,
    getStyleOverrides,
    clearStyleOverrides,
    saveStyleOverrides,
    clearAllMutations,
    hasUnsavedChanges,
  } = useAgentatorGlobal()

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

  // AI Suggestions state (NEW - for Reflect tab redesign)
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
                    onClick={() => setActiveTab('annotate')}
                    className="px-3 py-2 text-xs font-medium transition-colors border-b-2 relative"
                    style={{
                      color: activeTab === 'annotate' ? '#3B3B3B' : '#929397',
                      borderColor:
                        activeTab === 'annotate' ? '#3B3B3B' : 'transparent',
                    }}
                  >
                    Annotate
                    {getTotalAnnotationCount() > 0 && (
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                        style={{
                          backgroundColor: '#FF3B30',
                          color: '#FFFFFF',
                        }}
                      >
                        {getTotalAnnotationCount()}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('reflect')}
                    className="px-3 py-2 text-xs font-medium transition-colors border-b-2"
                    style={{
                      color: activeTab === 'reflect' ? '#3B3B3B' : '#929397',
                      borderColor:
                        activeTab === 'reflect' ? '#3B3B3B' : 'transparent',
                    }}
                  >
                    Reflect
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
                  {/* Component Details - NOW FIRST */}
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
                          Selected element info
                        </div>
                      </div>
                    </div>

                    {inspectedElement ? (
                      <div
                        className="p-4 rounded-xl space-y-3"
                        style={{
                          backgroundColor: '#F7F5F3',
                          border: '1px solid #E8E1DD',
                        }}
                      >
                        {/* Screen Name */}
                        <div>
                          <div
                            className="text-xs font-semibold mb-1"
                            style={{ color: '#929397' }}
                          >
                            SCREEN
                          </div>
                          <div
                            className="text-sm font-medium"
                            style={{ color: '#3B3B3B' }}
                          >
                            {inspectedElement.screenName}
                          </div>
                        </div>

                        {/* Element Name */}
                        <div>
                          <div
                            className="text-xs font-semibold mb-1"
                            style={{ color: '#929397' }}
                          >
                            ELEMENT
                          </div>
                          <div
                            className="text-sm font-medium"
                            style={{ color: '#3B3B3B' }}
                          >
                            {inspectedElement.element.element}
                          </div>
                        </div>

                        {/* Element Path */}
                        <div>
                          <div
                            className="text-xs font-semibold mb-1"
                            style={{ color: '#929397' }}
                          >
                            PATH
                          </div>
                          <div
                            className="text-xs font-mono px-2 py-1 rounded"
                            style={{
                              color: '#FF9500',
                              backgroundColor: 'rgba(255, 149, 0, 0.1)',
                            }}
                          >
                            {inspectedElement.element.elementPath}
                          </div>
                        </div>

                        {/* Tag Name */}
                        {inspectedElement.element.tagName && (
                          <div>
                            <div
                              className="text-xs font-semibold mb-1"
                              style={{ color: '#929397' }}
                            >
                              TAG
                            </div>
                            <div
                              className="text-xs font-mono"
                              style={{ color: '#667EEA' }}
                            >
                              &lt;
                              {inspectedElement.element.tagName.toLowerCase()}
                              &gt;
                            </div>
                          </div>
                        )}

                        {/* CSS Classes */}
                        {inspectedElement.element.cssClasses && (
                          <div>
                            <div
                              className="text-xs font-semibold mb-1"
                              style={{ color: '#929397' }}
                            >
                              CLASSES
                            </div>
                            <div
                              className="text-xs font-mono px-2 py-1 rounded"
                              style={{
                                color: '#34C759',
                                backgroundColor: 'rgba(52, 199, 89, 0.1)',
                              }}
                            >
                              {inspectedElement.element.cssClasses}
                            </div>
                          </div>
                        )}

                        {/* Text Content */}
                        {inspectedElement.element.textContent && (
                          <div>
                            <div
                              className="text-xs font-semibold mb-1"
                              style={{ color: '#929397' }}
                            >
                              TEXT
                            </div>
                            <div
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                color: '#3B3B3B',
                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                              }}
                            >
                              &amp;{inspectedElement.element.textContent}&amp;
                            </div>
                          </div>
                        )}

                        {/* Position */}
                        {inspectedElement.element.boundingBox && (
                          <div>
                            <div
                              className="text-xs font-semibold mb-1"
                              style={{ color: '#929397' }}
                            >
                              POSITION
                            </div>
                            <div
                              className="text-xs font-mono"
                              style={{ color: '#3B3B3B' }}
                            >
                              {Math.round(
                                inspectedElement.element.boundingBox.x,
                              )}
                              px,{' '}
                              {Math.round(
                                inspectedElement.element.boundingBox.y,
                              )}
                              px (
                              {Math.round(
                                inspectedElement.element.boundingBox.width,
                              )}{' '}
                              ×{' '}
                              {Math.round(
                                inspectedElement.element.boundingBox.height,
                              )}
                              px)
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="p-4 rounded-xl"
                        style={{
                          backgroundColor: '#F7F5F3',
                          border: '1px solid #E8E1DD',
                        }}
                      >
                        <div
                          className="flex flex-col items-center justify-center gap-2 py-6"
                          style={{ color: '#929397' }}
                        >
                          <Eye size={20} />
                          <span className="text-xs text-center">
                            Use Inspect mode to select an element
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Style Editor Panel - Replaces placeholder controls */}
                  <StyleEditorPanel
                    inspectedElement={inspectedElement?.element || null}
                    screenId={selectedScreen?.screen_id || ''}
                    onStyleChange={(path, index, property, value) => {
                      if (!selectedScreen?.screen_id) return

                      // Get existing override for this element
                      const existingOverrides = getStyleOverrides(
                        selectedScreen.screen_id,
                      )
                      const existing = existingOverrides.find(
                        o => o.elementPath === path && o.elementIndex === index,
                      )

                      // Create or update style override
                      const override: StyleOverride = {
                        elementPath: path,
                        elementIndex: index,
                        styles: {
                          ...(existing?.styles || {}),
                          [property]: value,
                        },
                        timestamp: Date.now(),
                      }

                      addStyleOverride(selectedScreen.screen_id, override)
                    }}
                    onReset={async () => {
                      if (!selectedScreen?.screen_id) return

                      // Show confirmation dialog
                      if (
                        !confirm(
                          'Reset all manual edits? This will restore the AI-generated original.',
                        )
                      ) {
                        return
                      }

                      try {
                        const currentProject =
                          localStorage.getItem('current_project')
                        if (currentProject) {
                          const project = JSON.parse(currentProject)
                          await clearAllMutations(
                            project.project_id,
                            selectedScreen.screen_id,
                          )
                          console.log('✅ All edits cleared!')
                        } else {
                          // If no projectId (not saved yet), just clear local state
                          clearStyleOverrides(selectedScreen.screen_id)
                        }
                      } catch (error) {
                        console.error('Failed to clear edits:', error)
                        alert('Failed to clear edits. Please try again.')
                      }
                    }}
                    onSave={async () => {
                      if (!selectedScreen?.screen_id) return

                      try {
                        const currentProject =
                          localStorage.getItem('current_project')
                        if (currentProject) {
                          const project = JSON.parse(currentProject)
                          await saveStyleOverrides(
                            project.project_id,
                            selectedScreen.screen_id,
                          )
                          console.log('✅ Changes saved successfully!')
                        } else {
                          console.warn(
                            'No project found, cannot save to database',
                          )
                          alert(
                            'Project not found. Please save the project first.',
                          )
                        }
                      } catch (error) {
                        console.error('Failed to save changes:', error)
                        alert('Failed to save changes. Please try again.')
                      }
                    }}
                    hasUnsavedChanges={
                      selectedScreen?.screen_id
                        ? hasUnsavedChanges(selectedScreen.screen_id)
                        : false
                    }
                    currentOverrides={
                      inspectedElement && selectedScreen?.screen_id
                        ? getStyleOverrides(selectedScreen.screen_id).find(
                            o =>
                              o.elementPath ===
                                inspectedElement.element.elementPath &&
                              o.elementIndex ===
                                inspectedElement.element.elementIndex,
                          ) || null
                        : null
                    }
                  />
                </div>
              )}
              {activeTab === 'annotate' && (
                <div
                  className="flex-1 flex flex-col overflow-hidden"
                  style={{ paddingRight: '4px' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, #3C82F7 0%, #667EEA 100%)',
                        }}
                      >
                        <MessageCircle size={16} style={{ color: '#FFFFFF' }} />
                      </div>
                      <div>
                        <div
                          className="text-sm font-semibold"
                          style={{ color: '#3B3B3B' }}
                        >
                          Annotations
                        </div>
                        <div className="text-xs" style={{ color: '#929397' }}>
                          {getTotalAnnotationCount()} total across all screens
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Annotations List */}
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {/* Get all unique screen names from both annotation types */}
                    {Array.from(
                      new Set([
                        ...Object.keys(annotations),
                        ...Object.keys(codeAnnotations),
                      ]),
                    ).map(screenName => {
                      const visualAnns = annotations[screenName] || []
                      const codeAnns = codeAnnotations[screenName] || []
                      const totalAnns = visualAnns.length + codeAnns.length

                      if (totalAnns === 0) return null

                      return (
                        <div key={screenName} className="space-y-2">
                          {/* Screen Header */}
                          <div
                            className="sticky top-0 px-3 py-2 rounded-lg z-10"
                            style={{
                              backgroundColor: '#F0F7FF',
                              border: '1px solid #E0EFFF',
                            }}
                          >
                            <div
                              className="text-xs font-semibold"
                              style={{ color: '#3B82F6' }}
                            >
                              {screenName}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: '#929397' }}
                            >
                              {totalAnns} annotation
                              {totalAnns !== 1 ? 's' : ''}
                              {visualAnns.length > 0 && codeAnns.length > 0 && (
                                <span>
                                  {' '}
                                  • {visualAnns.length} visual,{' '}
                                  {codeAnns.length} code
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Visual Annotations */}
                          <div className="space-y-2">
                            {visualAnns.map((annotation, index) => (
                              <div
                                key={annotation.id}
                                className="rounded-xl p-3 group relative"
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E8E1DD',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                }}
                              >
                                {/* Annotation Number Badge */}
                                <div className="flex items-start gap-3">
                                  <div
                                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{
                                      backgroundColor: '#3C82F7',
                                      color: '#FFFFFF',
                                    }}
                                  >
                                    {index + 1}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    {/* Element Name */}
                                    <div
                                      className="text-sm font-semibold mb-1"
                                      style={{ color: '#3B3B3B' }}
                                    >
                                      {annotation.element}
                                    </div>

                                    {/* Selected Text */}
                                    {annotation.selectedText && (
                                      <div
                                        className="text-xs italic mb-2 px-2 py-1 rounded"
                                        style={{
                                          color: '#FF9500',
                                          backgroundColor:
                                            'rgba(255, 149, 0, 0.1)',
                                        }}
                                      >
                                        &amp;{annotation.selectedText}&amp;
                                      </div>
                                    )}

                                    {/* Text Content */}
                                    {annotation.textContent &&
                                      !annotation.selectedText && (
                                        <div
                                          className="text-xs mb-2 px-2 py-1 rounded"
                                          style={{
                                            color: '#929397',
                                            backgroundColor:
                                              'rgba(0, 0, 0, 0.03)',
                                          }}
                                        >
                                          Text: &amp;{annotation.textContent}
                                          &amp;
                                        </div>
                                      )}

                                    {/* Element Index */}
                                    {annotation.elementIndex !== undefined && (
                                      <div
                                        className="text-xs mb-2"
                                        style={{ color: '#929397' }}
                                      >
                                        {annotation.elementIndex + 1}
                                        {annotation.elementIndex === 0
                                          ? 'st'
                                          : annotation.elementIndex === 1
                                            ? 'nd'
                                            : annotation.elementIndex === 2
                                              ? 'rd'
                                              : 'th'}{' '}
                                        occurrence
                                      </div>
                                    )}

                                    {/* Comment */}
                                    <div
                                      className="text-sm mb-2"
                                      style={{ color: '#3B3B3B' }}
                                    >
                                      {annotation.comment}
                                    </div>

                                    {/* Element Path */}
                                    <div
                                      className="text-xs font-mono px-2 py-1 rounded"
                                      style={{
                                        color: '#667EEA',
                                        backgroundColor:
                                          'rgba(102, 126, 234, 0.08)',
                                      }}
                                    >
                                      {annotation.elementPath}
                                    </div>
                                  </div>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() =>
                                      deleteAnnotationGlobal(
                                        screenName,
                                        annotation.id,
                                      )
                                    }
                                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                    style={{
                                      backgroundColor: 'rgba(255, 59, 48, 0.1)',
                                    }}
                                    title="Delete annotation"
                                  >
                                    <Trash2
                                      size={14}
                                      style={{ color: '#FF3B30' }}
                                    />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* Code Annotations */}
                            {codeAnns.map((annotation, index) => (
                              <div
                                key={annotation.id}
                                className="rounded-xl p-3 group relative"
                                style={{
                                  backgroundColor: '#FFFBF0',
                                  border: '1px solid #FFE4A3',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                }}
                              >
                                {/* Annotation Number Badge */}
                                <div className="flex items-start gap-3">
                                  <div
                                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{
                                      backgroundColor: '#F59E0B',
                                      color: '#FFFFFF',
                                    }}
                                  >
                                    {visualAnns.length + index + 1}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    {/* Code Location */}
                                    <div
                                      className="text-sm font-semibold mb-1 flex items-center gap-2"
                                      style={{ color: '#3B3B3B' }}
                                    >
                                      <span>Lines {annotation.startLine}</span>
                                      {annotation.endLine !==
                                        annotation.startLine &&
                                        `-${annotation.endLine}`}
                                      <span
                                        className="text-xs px-2 py-0.5 rounded"
                                        style={{
                                          backgroundColor: '#F59E0B',
                                          color: '#FFFFFF',
                                        }}
                                      >
                                        CODE
                                      </span>
                                    </div>

                                    {/* Selected Code */}
                                    <div
                                      className="text-xs font-mono mb-2 px-2 py-1 rounded overflow-x-auto"
                                      style={{
                                        color: '#92400E',
                                        backgroundColor: '#FEF3C7',
                                        maxHeight: '80px',
                                      }}
                                    >
                                      <pre className="whitespace-pre">
                                        {annotation.selectedCode}
                                      </pre>
                                    </div>

                                    {/* Comment */}
                                    <div
                                      className="text-sm mb-2"
                                      style={{ color: '#3B3B3B' }}
                                    >
                                      {annotation.comment}
                                    </div>
                                  </div>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() =>
                                      deleteCodeAnnotation(
                                        screenName,
                                        annotation.id,
                                      )
                                    }
                                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                    style={{
                                      backgroundColor: 'rgba(255, 59, 48, 0.1)',
                                    }}
                                    title="Delete annotation"
                                  >
                                    <Trash2
                                      size={14}
                                      style={{ color: '#FF3B30' }}
                                    />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {/* Empty State */}
                    {getTotalAnnotationCount() === 0 && (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                          style={{
                            background:
                              'linear-gradient(135deg, #3C82F7 0%, #667EEA 100%)',
                          }}
                        >
                          <MessageCircle
                            size={28}
                            style={{ color: '#FFFFFF' }}
                          />
                        </div>
                        <div
                          className="text-sm font-semibold mb-1"
                          style={{ color: '#3B3B3B' }}
                        >
                          No Annotations Yet
                        </div>
                        <div
                          className="text-xs text-center max-w-[200px]"
                          style={{ color: '#929397' }}
                        >
                          Use Annotate mode to add feedback on your screens
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'reflect' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* AI Suggestions Section */}
                  <div
                    className="flex flex-col mb-4"
                    style={{
                      maxHeight: activeSuggestions.length > 0 ? '100%' : '0',
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
