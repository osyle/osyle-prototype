import {
  Send,
  Loader2,
  Eye,
  Pen,
  XCircle,
  Move,
  ChevronUp,
  Layers,
} from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { useAgentatorGlobal } from '../lib/Agentator'
import type { Annotation, CodeAnnotation } from '../lib/Agentator'

type ConversationAnnotation = Annotation | CodeAnnotation

export interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  screen?: string
  annotations?: Record<string, ConversationAnnotation[]> // Store annotations with message
}

interface ConversationBarProps {
  isRightPanelCollapsed: boolean
  messages: Message[]
  onSendMessage: (
    // eslint-disable-next-line no-unused-vars
    message: string,
    // eslint-disable-next-line no-unused-vars
    annotations?: Record<string, ConversationAnnotation[]>,
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
  const [wasAutoExpanded, setWasAutoExpanded] = useState(false) // Track if expansion was automatic
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
    codeAnnotations,
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
      setWasAutoExpanded(true) // Mark as auto-expanded
    }
  }, [isProcessing, isExpanded])

  // Auto-collapse when processing finishes (only if it was auto-expanded)
  useEffect(() => {
    if (!isProcessing && isExpanded && wasAutoExpanded) {
      // Add a small delay to let the user see the final message
      const timer = setTimeout(() => {
        setIsExpanded(false)
        setWasAutoExpanded(false) // Reset the flag
      }, 1500) // 1.5 second delay after processing completes
      return () => clearTimeout(timer)
    }
  }, [isProcessing, isExpanded, wasAutoExpanded])

  const handleSend = () => {
    if (!inputText.trim() && totalAnnotations === 0) return
    if (isProcessing) return

    // If there are annotations, include them
    if (totalAnnotations > 0) {
      const visualAnnotationsData = getAnnotationsForConversation()

      // Merge visual and code annotations per screen
      // Backend will handle both Annotation and CodeAnnotation types
      const allAnnotations: Record<string, ConversationAnnotation[]> = {}

      // Add visual annotations
      Object.keys(visualAnnotationsData).forEach(screenName => {
        allAnnotations[screenName] = [...visualAnnotationsData[screenName]]
      })

      // Add code annotations
      Object.keys(codeAnnotations).forEach(screenName => {
        if (!allAnnotations[screenName]) {
          allAnnotations[screenName] = []
        }
        allAnnotations[screenName].push(...codeAnnotations[screenName])
      })

      // Track which screens have annotations so we can clear them later
      Object.keys(allAnnotations).forEach(screenName => {
        if (allAnnotations[screenName].length > 0) {
          sentAnnotationsRef.current.add(screenName)
        }
      })

      onSendMessage(
        inputText.trim() || 'Please apply these annotations',
        allAnnotations,
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

  // Toggle drag mode
  const handleDragToggle = () => {
    if (isActive && mode === 'drag') {
      // Already in drag mode - turn off
      setIsActive(false)
    } else {
      // Turn on drag mode
      setMode('drag')
      setIsActive(true)
    }
  }

  // Toggle variation mode
  const handleVariationToggle = () => {
    if (isActive && mode === 'variation') {
      setIsActive(false)
    } else {
      setMode('variation')
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

  const handleToggleExpanded = () => {
    setIsExpanded(v => !v)
    setWasAutoExpanded(false)
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

      {/* Conversation Bar — anchored to centre of available canvas, slides up via transform */}
      <div
        className="fixed z-50"
        style={{
          left: isRightPanelCollapsed
            ? 'calc(80px + (100vw - 80px) / 2)'
            : 'calc(80px + (100vw - 80px - (28% + 40px)) / 2)',
          bottom: '24px',
          width: '800px',
          maxWidth: isRightPanelCollapsed
            ? 'calc(100vw - 160px)'
            : 'calc(72% - 120px)',
          transform: isExpanded
            ? 'translate(-50%, calc(-50vh + 50% + 24px))'
            : 'translateX(-50%)',
          transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: isExpanded
              ? '0 20px 60px rgba(0,0,0,0.2)'
              : '0 4px 16px rgba(0,0,0,0.06)',
            transition: 'box-shadow 400ms ease-out',
          }}
        >
          {/* Expanded Message History */}
          {isExpanded && (
            <div style={{ borderBottom: '1px solid #E8E1DD' }}>
              {/* Header */}
              <div
                className="px-6 pt-4 pb-3"
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

                {/* Drag Button */}
                <button
                  onClick={handleDragToggle}
                  className={`p-2 rounded-lg transition-all group relative disabled:opacity-50 ${
                    isActive && mode === 'drag'
                      ? 'bg-purple-500 text-white scale-105 shadow-lg'
                      : 'hover:bg-gray-50'
                  }`}
                  title={
                    isActive && mode === 'drag'
                      ? 'Exit drag mode'
                      : 'Enter drag mode'
                  }
                  disabled={isProcessing}
                >
                  <Move
                    size={16}
                    style={{
                      color:
                        isActive && mode === 'drag' ? '#FFFFFF' : '#3B3B3B',
                    }}
                  />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {isActive && mode === 'drag' ? 'Exit Drag' : 'Drag'}
                  </span>
                </button>

                {/* Variation Button */}
                <button
                  onClick={handleVariationToggle}
                  className={`p-2 rounded-lg transition-all group relative disabled:opacity-50 ${
                    isActive && mode === 'variation'
                      ? 'bg-emerald-500 text-white scale-105 shadow-lg'
                      : 'hover:bg-gray-50'
                  }`}
                  title={
                    isActive && mode === 'variation'
                      ? 'Exit variation mode'
                      : 'Enter variation mode'
                  }
                  disabled={isProcessing}
                >
                  <Layers
                    size={16}
                    style={{
                      color:
                        isActive && mode === 'variation'
                          ? '#FFFFFF'
                          : '#3B3B3B',
                    }}
                  />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {isActive && mode === 'variation'
                      ? 'Exit Variation'
                      : 'Variation'}
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

                {/* Expand / Collapse toggle — always visible at end of row */}
                {!isProcessing && (
                  <button
                    onClick={handleToggleExpanded}
                    className="p-2 rounded-lg transition-all"
                    title={isExpanded ? 'Collapse' : 'Expand conversation'}
                    style={{
                      backgroundColor: isExpanded ? '#EEF2FF' : '#EEF2FF',
                      color: '#667EEA',
                    }}
                  >
                    <ChevronUp
                      size={16}
                      style={{
                        color: '#667EEA',
                        transition: 'transform 300ms',
                        transform: isExpanded
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                      }}
                    />
                  </button>
                )}
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
