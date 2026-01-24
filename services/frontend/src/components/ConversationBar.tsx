import { Zap, Palette, Sparkles, Send, ChevronUp } from 'lucide-react'
import React, { useState } from 'react'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface ConversationBarProps {
  isRightPanelCollapsed: boolean
}

export default function ConversationBar({
  isRightPanelCollapsed,
}: ConversationBarProps) {
  const [inputText, setInputText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'user',
      content: 'Make spacing more generous',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: '2',
      type: 'ai',
      content: 'Updated 12 spacing values from 8px to 16px',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
  ])

  const handleSend = () => {
    if (!inputText.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date(),
    }

    setMessages([...messages, newMessage])
    setInputText('')

    // TODO: Send to backend via WebSocket
    // For now, just a placeholder AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Processing your request...',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
    }, 500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Get last 2-3 messages for preview
  const recentMessages = messages.slice(-3)

  return (
    <>
      {/* Expanded Overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
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
              className="px-6 pt-6 pb-4 max-h-[300px] overflow-y-auto space-y-3"
              style={{
                borderBottom: '1px solid #E8E1DD',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="text-xs font-semibold"
                  style={{ color: '#3B3B3B' }}
                >
                  Conversation so far
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-xs"
                  style={{ color: '#929397' }}
                >
                  Collapse
                </button>
              </div>

              {recentMessages.map(msg => (
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
                    <div className="text-xs mb-1" style={{ color: '#929397' }}>
                      {msg.type === 'user' ? 'You' : 'AI'} •{' '}
                      {msg.timestamp.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="text-sm" style={{ color: '#3B3B3B' }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
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
                  placeholder="Ask AI to self-reflect..."
                  className="w-full bg-transparent border-none outline-none text-sm pr-10"
                  style={{ color: '#3B3B3B' }}
                />
                {!isExpanded && messages.length > 0 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-gray-100 transition-colors"
                    title="Show conversation history"
                  >
                    <ChevronUp size={16} style={{ color: '#929397' }} />
                  </button>
                )}
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-lg hover:bg-gray-50 transition-all group relative"
                  title="Quick fixes"
                >
                  <Zap size={16} style={{ color: '#3B3B3B' }} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Quick Fix
                  </span>
                </button>

                <button
                  className="p-2 rounded-lg hover:bg-gray-50 transition-all group relative"
                  title="Adjust theme"
                >
                  <Palette size={16} style={{ color: '#3B3B3B' }} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Theme
                  </span>
                </button>

                <button
                  className="p-2 rounded-lg hover:bg-gray-50 transition-all group relative"
                  title="Polish design"
                >
                  <Sparkles size={16} style={{ color: '#3B3B3B' }} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Polish
                  </span>
                </button>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  style={{
                    background: inputText.trim()
                      ? 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
                      : '#F7F5F3',
                    color: inputText.trim() ? '#FFFFFF' : '#929397',
                  }}
                >
                  <Send size={16} />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
