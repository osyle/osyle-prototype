import {
    ChevronDown,
    Sparkles,
    MessageSquare,
    Eye,
    AlertCircle,
    CheckCircle,
    X,
  } from 'lucide-react'
  import { useState } from 'react'
  import type { FlowGraph, FlowScreen } from '../types/home.types'
  import type { ParameterValues, VariationSpace } from '../types/parametric.types'
  import ParametricControls from './ParametricControls'
  import VersionHistory from './VersionHistory'
  
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
    // For Refine tab
    flowGraph: FlowGraph | null
    selectedScreen: FlowScreen | null
    parameterValues: ParameterValues
    // eslint-disable-next-line no-unused-vars
    setParameterValues: (values: ParameterValues) => void
    renderingMode: 'react' | 'parametric'
    // For version history
    currentFlowVersion: number
    viewingVersion: number | null
    // eslint-disable-next-line no-unused-vars
    onVersionSelect: (version: number) => void
    // eslint-disable-next-line no-unused-vars
    onVersionRevert: (version: number) => void
    isReverting: boolean
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    flowGraph,
    selectedScreen,
    parameterValues,
    setParameterValues,
    renderingMode,
    currentFlowVersion,
    viewingVersion,
    onVersionSelect,
    onVersionRevert,
    isReverting,
  }: RightPanelProps) {
    // AI Suggestions state
    const [suggestions] = useState<AISuggestion[]>([
      {
        id: '1',
        title: 'Inconsistent Button Sizes',
        description: 'Login button (48px) differs from other primary buttons (56px) in your flow',
        severity: 'recommended',
        category: 'consistency',
        affectedElements: 3,
      },
      {
        id: '2',
        title: 'Low Color Contrast',
        description: 'Text on cards has 3.2:1 contrast ratio, below WCAG AA standard (4.5:1)',
        severity: 'critical',
        category: 'accessibility',
        affectedElements: 8,
      },
      {
        id: '3',
        title: 'Spacing Could Be More Generous',
        description: 'Using 8px in 15 places, but your DTM typically uses 16px for similar contexts',
        severity: 'optional',
        category: 'spacing',
        affectedElements: 15,
      },
    ])
  
    const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([])
  
    // Conversation state
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
        content: 'I increased the font size from 32px to 48px and added your signature gradient overlay. The header now follows your typical hero section pattern.',
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
      s => !dismissedSuggestions.includes(s.id)
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
                {/* Top Row: Tabs + User Profile */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  {/* Tab Navigation */}
                  <div
                    className="flex items-center gap-0 border-b"
                    style={{ borderColor: '#E8E1DD' }}
                  >
                    {(['explore', 'refine', 'iterate'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className="px-4 py-2 text-sm font-medium transition-all relative"
                        style={{
                          color: activeTab === tab ? '#3B3B3B' : '#929397',
                          borderBottom:
                            activeTab === tab ? '2px solid #3B3B3B' : '2px solid transparent',
                          marginBottom: '-2px',
                        }}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
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
                          <div className="text-xs text-gray-500">{userInfo.email}</div>
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
  
                {/* Tab Content */}
                {activeTab === 'explore' && (
                  <div className="flex-1 overflow-y-auto">
                    <div className="text-sm text-gray-500">
                      Explore tab content (placeholder)
                    </div>
                  </div>
                )}
  
                {activeTab === 'refine' && (
                  <div className="flex-1 flex flex-col gap-5 overflow-y-auto">
                    {/* Parametric Controls */}
                    {renderingMode === 'parametric' && selectedScreen && (
                      (() => {
                        const variationSpace = selectedScreen['variation_space'] as VariationSpace | undefined
                        return variationSpace ? (
                          <ParametricControls
                            variationSpace={variationSpace}
                            initialValues={parameterValues}
                            onChange={setParameterValues}
                          />
                        ) : null
                      })()
                    )}
  
                    {/* Version History */}
                    <VersionHistory
                      currentVersion={currentFlowVersion}
                      onVersionSelect={onVersionSelect}
                      onRevert={onVersionRevert}
                      isReverting={isReverting}
                      viewingVersion={viewingVersion}
                    />
                  </div>
                )}
  
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
                          <div className="text-sm font-semibold" style={{ color: '#3B3B3B' }}>
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
                                  <div className="text-sm font-semibold" style={{ color: colors.text }}>
                                    {suggestion.title}
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    setDismissedSuggestions([...dismissedSuggestions, suggestion.id])
                                  }
                                  className="p-1 hover:bg-white/50 rounded transition-colors"
                                >
                                  <X size={14} style={{ color: colors.text }} />
                                </button>
                              </div>
  
                              <div className="text-xs mb-3" style={{ color: colors.text, opacity: 0.8 }}>
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
                                <div className="text-xs ml-auto" style={{ color: colors.text, opacity: 0.6 }}>
                                  {suggestion.affectedElements} elements
                                </div>
                              </div>
                            </div>
                          )
                        })}
  
                        {activeSuggestions.length === 0 && (
                          <div className="text-center py-8">
                            <CheckCircle size={32} className="mx-auto mb-2" style={{ color: '#10B981' }} />
                            <div className="text-sm font-medium" style={{ color: '#3B3B3B' }}>
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
                          {activeSuggestions.length} suggestions • {conversation.length} messages
                        </div>
                      </div>
                    )}
  
                    {/* Conversation Section */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={16} style={{ color: '#667EEA' }} />
                        <div className="text-sm font-semibold" style={{ color: '#3B3B3B' }}>
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
                                backgroundColor: msg.type === 'user' ? '#F0F7FF' : '#F7F5F3',
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-xs font-medium" style={{ color: '#3B3B3B' }}>
                                  {msg.type === 'user' ? 'You' : 'AI'}
                                </div>
                                <div className="text-xs" style={{ color: '#929397' }}>
                                  {msg.timestamp.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                              <div className="text-sm" style={{ color: '#3B3B3B' }}>
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
                            <MessageSquare size={32} className="mx-auto mb-2" style={{ color: '#929397' }} />
                            <div className="text-sm font-medium" style={{ color: '#3B3B3B' }}>
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