import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'
import {
  ArrowLeft,
  Send,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendCopyMessage, finalizeCopy } from '../services/copyWebSocket'

interface UserInfo {
  name: string
  email: string
  initials: string
  picture?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function CopyEditor() {
  const navigate = useNavigate()

  // User info
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  // Project info from localStorage
  const [projectId, setProjectId] = useState<string>('')
  const [projectName, setProjectName] = useState<string>('')

  // Copy generation state
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [finalCopy, setFinalCopy] = useState<string>('')
  const [isCopied, setIsCopied] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  // Load project info from localStorage
  useEffect(() => {
    const currentProject = localStorage.getItem('current_project')
    if (currentProject) {
      const project = JSON.parse(currentProject)
      setProjectId(project.project_id || '')
      setProjectName(project.project_name || 'Untitled Project')

      // Initialize first message with task description
      if (project.task_description) {
        const initialMessage: Message = {
          id: 'init',
          role: 'assistant',
          content: `I'll help you develop the copy for your project. Based on your description:\n\n"${project.task_description}"\n\nLet's start by exploring what content this application will need. What key information or messages should users see?`,
          timestamp: new Date(),
        }
        setMessages([initialMessage])
      }
    } else {
      // No project found, redirect back to home
      navigate('/', { replace: true })
    }
  }, [navigate])

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isGenerating || !projectId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsGenerating(true)

    // Create placeholder for streaming assistant message
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      // Build conversation history for backend (excluding the new empty assistant message)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      // Send message via WebSocket with streaming
      await sendCopyMessage(
        projectId,
        userMessage.content,
        conversationHistory,
        {
          onChunk: chunk => {
            // Append chunk to the assistant message
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg,
              ),
            )
          },
          onMessage: responseText => {
            // Final complete message (in case streaming didn't work)
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: responseText }
                  : msg,
              ),
            )
          },
          onError: error => {
            console.error('Copy generation error:', error)
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: `Sorry, I encountered an error: ${error}. Please try again.`,
                    }
                  : msg,
              ),
            )
          },
        },
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  'Sorry, I encountered a connection error. Please try again.',
              }
            : msg,
        ),
      )
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle key press in textarea
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle copy to clipboard
  const handleCopyToClipboard = () => {
    if (finalCopy) {
      navigator.clipboard.writeText(finalCopy)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  // Handle finalize copy
  const handleFinalizeCopy = async () => {
    if (!projectId || messages.length === 0) return

    setIsFinalizing(true)

    try {
      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      // Finalize copy via WebSocket
      const finalizedCopy = await finalizeCopy(projectId, conversationHistory, {
        onProgress: (stage, message) => {
          console.log(`[${stage}] ${message}`)
        },
        onComplete: copy => {
          setFinalCopy(copy)
        },
        onError: error => {
          console.error('Finalize error:', error)
          alert(`Failed to finalize copy: ${error}`)
        },
      })

      setFinalCopy(finalizedCopy)
    } catch (error) {
      console.error('Failed to finalize copy:', error)
      alert('Failed to finalize copy. Please try again.')
    } finally {
      setIsFinalizing(false)
    }
  }

  // Handle proceed to design
  const handleProceedToDesign = () => {
    // Save the final copy to the project
    const currentProject = localStorage.getItem('current_project')
    if (currentProject) {
      const project = JSON.parse(currentProject)
      project.generated_copy = finalCopy
      localStorage.setItem('current_project', JSON.stringify(project))
    }

    // Navigate to editor to continue with flow architecture
    navigate('/editor', { replace: true })
  }

  return (
    <div
      className="h-screen flex flex-col"
      style={{ backgroundColor: '#F7F5F3' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#E8E1DD',
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ backgroundColor: '#F4F4F4' }}
          >
            <ArrowLeft size={18} style={{ color: '#3B3B3B' }} />
          </button>
          <div>
            <h1 className="text-lg font-medium" style={{ color: '#3B3B3B' }}>
              {projectName}
            </h1>
            <p className="text-sm" style={{ color: '#929397' }}>
              Copy Development
            </p>
          </div>
        </div>

        {userInfo && (
          <div className="flex items-center gap-3">
            {userInfo.picture ? (
              <img
                src={userInfo.picture}
                alt={userInfo.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                style={{
                  backgroundColor: '#F5C563',
                  color: '#1F1F20',
                }}
              >
                {userInfo.initials}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Conversation */}
        <div className="flex-1 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Info Card */}
              <div
                className="rounded-2xl p-6"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E8E1DD',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#F5C563' }}
                  >
                    <Sparkles size={20} style={{ color: '#1F1F20' }} />
                  </div>
                  <div>
                    <h3
                      className="text-base font-medium mb-1"
                      style={{ color: '#3B3B3B' }}
                    >
                      Copy-First Design Process
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: '#929397' }}
                    >
                      Let&apos;s develop all the written content your
                      application will need before jumping into screen design.
                      This helps ensure clear messaging and better information
                      architecture. We&apos;ll iterate on the copy together
                      until you&apos;re satisfied, then use it to inform the
                      screen structure.
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#F5C563' }}
                    >
                      <Sparkles size={16} style={{ color: '#1F1F20' }} />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-2xl ${
                      message.role === 'user'
                        ? 'rounded-tr-sm'
                        : 'rounded-tl-sm'
                    }`}
                    style={{
                      backgroundColor:
                        message.role === 'user' ? '#F5C563' : '#FFFFFF',
                      color: message.role === 'user' ? '#1F1F20' : '#3B3B3B',
                      border:
                        message.role === 'assistant'
                          ? '1px solid #E8E1DD'
                          : 'none',
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                  {message.role === 'user' && userInfo && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium"
                      style={{
                        backgroundColor: '#E8E1DD',
                        color: '#3B3B3B',
                      }}
                    >
                      {userInfo.initials}
                    </div>
                  )}
                </div>
              ))}

              {isGenerating && (
                <div className="flex gap-3 justify-start">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#F5C563' }}
                  >
                    <Sparkles size={16} style={{ color: '#1F1F20' }} />
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3 rounded-tl-sm"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E8E1DD',
                    }}
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: '#929397',
                          animationDelay: '0ms',
                        }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: '#929397',
                          animationDelay: '150ms',
                        }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: '#929397',
                          animationDelay: '300ms',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div
            className="border-t px-6 py-4"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E8E1DD',
            }}
          >
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Refine the copy, add details, or ask questions..."
                    className="w-full px-4 py-3 rounded-xl resize-none focus:outline-none transition-all"
                    style={{
                      backgroundColor: '#F7F5F3',
                      color: '#3B3B3B',
                      border: '2px solid transparent',
                      minHeight: '56px',
                      maxHeight: '200px',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#F5C563'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'transparent'
                    }}
                    rows={1}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isGenerating}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  style={{
                    backgroundColor:
                      inputText.trim() && !isGenerating ? '#F5C563' : '#E8E1DD',
                    color:
                      inputText.trim() && !isGenerating ? '#1F1F20' : '#929397',
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Final Copy & Actions */}
        <div
          className="w-96 border-l flex flex-col"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E8E1DD',
          }}
        >
          <div
            className="px-6 py-4 border-b"
            style={{ borderColor: '#E8E1DD' }}
          >
            <h2 className="text-base font-medium" style={{ color: '#3B3B3B' }}>
              Final Copy
            </h2>
            <p className="text-xs mt-1" style={{ color: '#929397' }}>
              When satisfied, proceed to design
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {finalCopy ? (
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: '#F7F5F3',
                  border: '1px solid #E8E1DD',
                }}
              >
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: '#3B3B3B' }}
                >
                  {finalCopy}
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  backgroundColor: '#F7F5F3',
                  border: '2px dashed #E8E1DD',
                }}
              >
                <Sparkles
                  size={24}
                  style={{ color: '#929397', margin: '0 auto 8px' }}
                />
                <p className="text-sm" style={{ color: '#929397' }}>
                  Your final copy will appear here as you develop it through
                  conversation
                </p>
              </div>
            )}
          </div>

          <div
            className="px-6 py-4 space-y-3 border-t"
            style={{ borderColor: '#E8E1DD' }}
          >
            {!finalCopy && messages.length > 1 && (
              <button
                onClick={handleFinalizeCopy}
                disabled={isFinalizing}
                className="w-full px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#F5C563',
                  color: '#1F1F20',
                  boxShadow: '0 4px 12px rgba(245, 197, 99, 0.3)',
                }}
              >
                {isFinalizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Finalize Copy
                  </>
                )}
              </button>
            )}

            {finalCopy && (
              <button
                onClick={handleCopyToClipboard}
                className="w-full px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#F4F4F4',
                  color: '#3B3B3B',
                }}
              >
                {isCopied ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy to Clipboard
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleProceedToDesign}
              disabled={!finalCopy}
              className="w-full px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: finalCopy ? '#F5C563' : '#E8E1DD',
                color: finalCopy ? '#1F1F20' : '#929397',
                boxShadow: finalCopy
                  ? '0 4px 12px rgba(245, 197, 99, 0.3)'
                  : 'none',
              }}
            >
              Proceed to Design
              <ChevronRight size={16} />
            </button>

            <p className="text-xs text-center" style={{ color: '#929397' }}>
              {finalCopy
                ? 'Or continue refining the copy above'
                : 'Finalize when ready to proceed'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
