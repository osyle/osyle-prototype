import {
  Zap,
  Palette,
  Sparkles,
  Send,
  ChevronUp,
  Loader2,
  Eye,
  Pen,
  XCircle,
} from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { useAgentatorGlobal } from '../lib/Agentator'
import type { Annotation } from '../lib/Agentator'

export interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  screen?: string
  annotations?: Record<string, Annotation[]> // Store annotations with message
}

interface ConversationBarProps {
  isRightPanelCollapsed: boolean
  messages: Message[]
  onSendMessage: (
    // eslint-disable-next-line no-unused-vars
    message: string,
    // eslint-disable-next-line no-unused-vars
    annotations?: Record<string, Annotation[]>,
  ) => void
  isProcessing: boolean
  processingStatus?: string
}

export default function ConversationBar({
  isRightPanelCollapsed,
  messages,
  onSendMessage,
  isProcessing,
  processingStatus = 'Processing...',
}: ConversationBarProps) {
  const [inputText, setInputText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sentAnnotationsRef = useRef<Set<string>>(new Set()) // Track screens with sent annotations

  // Get Agentator global state
  const {
    mode,
    isActive,
    setMode,
    setIsActive,
    getTotalAnnotationCount,
    clearAnnotations,
    getAnnotationsForConversation,
    annotations,
  } = useAgentatorGlobal()

  const totalAnnotations = getTotalAnnotationCount()

  // Clear sent annotations when processing completes successfully
  useEffect(() => {
    if (!isProcessing && sentAnnotationsRef.current.size > 0) {
      // Iteration completed - clear the annotations we sent
      sentAnnotationsRef.current.forEach(screenName => {
        clearAnnotations(screenName)
      })
      sentAnnotationsRef.current.clear()
    }
  }, [isProcessing, clearAnnotations])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isExpanded])

  // Auto-expand when processing starts
  useEffect(() => {
    if (isProcessing && !isExpanded) {
      setIsExpanded(true)
    }
  }, [isProcessing])

  const handleSend = () => {
    if (!inputText.trim() && totalAnnotations === 0) return
    if (isProcessing) return

    // If there are annotations, include them
    if (totalAnnotations > 0) {
      const annotationsData = getAnnotationsForConversation()

      // Track which screens have annotations so we can clear them later
      Object.keys(annotationsData).forEach(screenName => {
        if (annotationsData[screenName].length > 0) {
          sentAnnotationsRef.current.add(screenName)
        }
      })

      onSendMessage(
        inputText.trim() || 'Please apply these annotations',
        annotationsData,
      )
    } else {
      onSendMessage(inputText.trim())
    }

    setInputText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Toggle annotate mode
  const handleAnnotateToggle = () => {
    if (isActive && mode === 'annotate') {
      // Already in annotate mode - turn off
      setIsActive(false)
    } else {
      // Turn on annotate mode
      setMode('annotate')
      setIsActive(true)
    }
  }

  // Toggle inspect mode
  const handleInspectToggle = () => {
    if (isActive && mode === 'inspect') {
      // Already in inspect mode - turn off
      setIsActive(false)
    } else {
      // Turn on inspect mode
      setMode('inspect')
      setIsActive(true)
    }
  }

  // Clear all annotations
  const handleClearAll = () => {
    if (totalAnnotations > 0) {
      if (
        window.confirm(
          `Clear all ${totalAnnotations} annotations across all screens?`,
        )
      ) {
        clearAnnotations() // Clear all screens
      }
    }
  }

  return (
    <>
      {/* Expanded Overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => !isProcessing && setIsExpanded(false)}
        />
      )}

      {/* Conversation Bar */}
      <div
        className={`fixed transition-all duration-500 ease-out z-50 ${
          isExpanded ? 'bottom-1/2 translate-y-1/2' : 'bottom-6'
        }`}
        style={{
          left: '80px',
          right: isRightPanelCollapsed ? '80px' : 'calc(28% + 40px)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          className={`rounded-2xl transition-all duration-500 ease-out ${
            isExpanded ? 'w-[800px] max-w-[90%]' : 'w-[800px] max-w-[90%]'
          }`}
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: isExpanded
              ? '0 20px 60px rgba(0,0,0,0.2)'
              : '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          {/* Expanded Message History */}
          {isExpanded && (
            <div
              style={{
                borderBottom: '1px solid #E8E1DD',
              }}
            >
              {/* Fixed Header */}
              <div
                className="px-6 pt-6 pb-3 flex items-center justify-between"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderBottom: '1px solid #F7F5F3',
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: '#3B3B3B' }}
                >
                  Conversation
                </div>
                {!isProcessing && (
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-xs hover:underline"
                    style={{ color: '#929397' }}
                  >
                    Collapse
                  </button>
                )}
              </div>

              {/* Scrollable Messages */}
              <div className="px-6 py-4 max-h-[400px] overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div
                    className="text-sm text-center py-8"
                    style={{ color: '#929397' }}
                  >
                    Start a conversation to iterate on your design...
                  </div>
                ) : (
                  <>
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className="rounded-lg px-4 py-2 max-w-[70%]"
                          style={{
                            backgroundColor:
                              msg.type === 'user' ? '#F0F7FF' : '#F7F5F3',
                          }}
                        >
                          <div
                            className="text-xs mb-1 flex items-center justify-between gap-2"
                            style={{ color: '#929397' }}
                          >
                            <span>
                              {msg.type === 'user' ? 'You' : 'AI'} •{' '}
                              {msg.timestamp.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                            {msg.type === 'ai' && msg.screen && (
                              <span
                                className="font-semibold"
                                style={{ color: '#667EEA' }}
                              >
                                {msg.screen}
                              </span>
                            )}
                          </div>
                          <div
                            className="text-sm whitespace-pre-wrap"
                            style={{ color: '#3B3B3B' }}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Processing indicator */}
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div
                          className="rounded-lg px-4 py-3 max-w-[70%]"
                          style={{ backgroundColor: '#FFF9E6' }}
                        >
                          <div className="flex items-center gap-2">
                            <Loader2
                              size={16}
                              className="animate-spin"
                              style={{ color: '#F5C563' }}
                            />
                            <div
                              className="text-sm"
                              style={{ color: '#92400E' }}
                            >
                              {processingStatus}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4">
            <div className="flex items-center gap-3">
              {/* Input Field */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isProcessing}
                  placeholder={
                    isProcessing
                      ? 'Processing...'
                      : totalAnnotations > 0
                        ? `${totalAnnotations} annotation${totalAnnotations > 1 ? 's' : ''} ready • Add text or press Send`
                        : "Describe what you'd like to change..."
                  }
                  className="w-full bg-transparent border-none outline-none text-sm pr-10 disabled:opacity-50"
                  style={{ color: '#3B3B3B' }}
                />
                {!isExpanded && messages.length > 0 && !isProcessing && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-gray-100 transition-colors"
                    title="Show conversation history"
                  >
                    <ChevronUp size={16} style={{ color: '#929397' }} />
                  </button>
                )}
              </div>

              {/* Agentator Control Buttons */}
              <div className="flex items-center gap-2">
                {/* Annotate Button */}
                <button
                  onClick={handleAnnotateToggle}
                  className={`p-2 rounded-lg transition-all group relative disabled:opacity-50 ${
                    isActive && mode === 'annotate'
                      ? 'bg-blue-500 text-white scale-105 shadow-lg'
                      : 'hover:bg-gray-50'
                  }`}
                  title={
                    isActive && mode === 'annotate'
                      ? 'Exit annotate mode'
                      : 'Enter annotate mode'
                  }
                  disabled={isProcessing}
                >
                  <Pen
                    size={16}
                    style={{
                      color:
                        isActive && mode === 'annotate' ? '#FFFFFF' : '#3B3B3B',
                    }}
                  />
                  {totalAnnotations > 0 && (
                    <span
                      className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
                      style={{ fontSize: '10px' }}
                    >
                      {totalAnnotations}
                    </span>
                  )}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {isActive && mode === 'annotate'
                      ? 'Exit Annotate'
                      : 'Annotate'}
                  </span>
                </button>

                {/* Inspect Button */}
                <button
                  onClick={handleInspectToggle}
                  className={`p-2 rounded-lg transition-all group relative disabled:opacity-50 ${
                    isActive && mode === 'inspect'
                      ? 'bg-orange-500 text-white scale-105 shadow-lg'
                      : 'hover:bg-gray-50'
                  }`}
                  title={
                    isActive && mode === 'inspect'
                      ? 'Exit inspect mode'
                      : 'Enter inspect mode'
                  }
                  disabled={isProcessing}
                >
                  <Eye
                    size={16}
                    style={{
                      color:
                        isActive && mode === 'inspect' ? '#FFFFFF' : '#3B3B3B',
                    }}
                  />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {isActive && mode === 'inspect'
                      ? 'Exit Inspect'
                      : 'Inspect'}
                  </span>
                </button>

                {/* Clear All Button */}
                {totalAnnotations > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-2 rounded-lg hover:bg-red-50 transition-all group relative disabled:opacity-50"
                    title="Clear all annotations"
                    disabled={isProcessing}
                  >
                    <XCircle size={16} style={{ color: '#EF4444' }} />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      Clear All ({totalAnnotations})
                    </span>
                  </button>
                )}

                {/* Original Quick Action Buttons (kept for future use) */}
                <button
                  className="p-2 rounded-lg hover:bg-gray-50 transition-all group relative disabled:opacity-50"
                  title="Quick fixes"
                  disabled={isProcessing}
                >
                  <Zap size={16} style={{ color: '#3B3B3B' }} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Quick Fix
                  </span>
                </button>

                <button
                  className="p-2 rounded-lg hover:bg-gray-50 transition-all group relative disabled:opacity-50"
                  title="Adjust theme"
                  disabled={isProcessing}
                >
                  <Palette size={16} style={{ color: '#3B3B3B' }} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Theme
                  </span>
                </button>

                <button
                  className="p-2 rounded-lg hover:bg-gray-50 transition-all group relative disabled:opacity-50"
                  title="Polish design"
                  disabled={isProcessing}
                >
                  <Sparkles size={16} style={{ color: '#3B3B3B' }} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Polish
                  </span>
                </button>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={
                    (!inputText.trim() && totalAnnotations === 0) ||
                    isProcessing
                  }
                  className="relative px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  style={{
                    background:
                      (inputText.trim() || totalAnnotations > 0) &&
                      !isProcessing
                        ? 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
                        : '#F7F5F3',
                    color:
                      (inputText.trim() || totalAnnotations > 0) &&
                      !isProcessing
                        ? '#FFFFFF'
                        : '#929397',
                  }}
                >
                  {isProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      {totalAnnotations > 0 && (
                        <span
                          className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{
                            backgroundColor: '#FF3B30',
                            color: '#FFFFFF',
                          }}
                        >
                          {totalAnnotations > 9 ? '9+' : totalAnnotations}
                        </span>
                      )}
                    </>
                  )}
                  Send
                </button>
              </div>
            </div>

            {/* Annotation count indicator */}
            {totalAnnotations > 0 && !isExpanded && (
              <div
                className="mt-2 text-xs flex items-center gap-2"
                style={{ color: '#667EEA' }}
              >
                <Pen size={12} />
                {totalAnnotations} annotation{totalAnnotations > 1 ? 's' : ''}{' '}
                across{' '}
                {
                  Object.keys(annotations).filter(
                    k => annotations[k].length > 0,
                  ).length
                }{' '}
                screen
                {Object.keys(annotations).filter(k => annotations[k].length > 0)
                  .length > 1
                  ? 's'
                  : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
