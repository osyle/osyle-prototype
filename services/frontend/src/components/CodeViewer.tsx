import { useState, useMemo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { FlowGraph } from '../types/home.types'

interface CodeViewerProps {
  flow: FlowGraph | null
}

export default function CodeViewer({ flow }: CodeViewerProps) {
  const [activeScreenId, setActiveScreenId] = useState<string | null>(
    flow?.screens?.[0]?.screen_id || null,
  )

  const activeScreen = useMemo(() => {
    if (!flow || !activeScreenId) return null
    return flow.screens.find(s => s.screen_id === activeScreenId)
  }, [flow, activeScreenId])

  const highlightDTMValues = (code: string) => {
    // Will implement DTM value detection in future iterations
    return code
  }

  if (!flow || !flow.screens || flow.screens.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0A0A0F]">
        <div className="text-center">
          <div className="text-gray-500 text-sm mb-2">No code to display</div>
          <div className="text-gray-600 text-xs">
            Generate a flow to see the code
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0A0A0F]">
      {/* Screen Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#13131A] border-b border-[#1F1F28] overflow-x-auto">
        {flow.screens.map((screen, index) => {
          const isActive = screen.screen_id === activeScreenId
          const hasError = screen.ui_error
          const isLoading = screen.ui_loading

          return (
            <button
              key={screen.screen_id}
              onClick={() => setActiveScreenId(screen.screen_id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium
                transition-all duration-200 whitespace-nowrap
                ${
                  isActive
                    ? 'bg-[#0A0A0F] text-white border-t-2 border-t-[#6C63FF]'
                    : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-[#1A1A24]'
                }
              `}
            >
              {/* Status Indicator */}
              <div
                className={`w-2 h-2 rounded-full ${
                  hasError
                    ? 'bg-red-500'
                    : isLoading
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-green-500'
                }`}
              />

              {/* Screen Name */}
              <span>{screen.name || `Screen ${index + 1}`}</span>

              {/* Screen Type Badge */}
              {screen.screen_type === 'entry' && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400">
                  ENTRY
                </span>
              )}
              {screen.screen_type === 'success' && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-500/20 text-green-400">
                  SUCCESS
                </span>
              )}
              {screen.screen_type === 'error' && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/20 text-red-400">
                  ERROR
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Code Display Area */}
      <div className="flex-1 overflow-auto">
        {activeScreen ? (
          activeScreen.ui_code ? (
            <div className="relative">
              {/* Code Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-[#13131A]/95 backdrop-blur-sm border-b border-[#1F1F28]">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {activeScreen.name}.jsx
                  </span>
                  <span className="text-xs text-gray-600">•</span>
                  <span className="text-xs text-gray-500">
                    {activeScreen.ui_code.split('\n').length} lines
                  </span>
                  <span className="text-xs text-gray-600">•</span>
                  <span className="text-xs text-gray-500">
                    {Math.round(activeScreen.ui_code.length / 1024)}KB
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Read-only indicator */}
                  <div className="px-2 py-1 text-[10px] rounded bg-gray-800/50 text-gray-500 font-medium">
                    READ-ONLY
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeScreen.ui_code!)
                    }}
                    className="px-3 py-1 text-xs rounded bg-[#1A1A24] text-gray-400 hover:text-white hover:bg-[#232330] transition-colors"
                  >
                    Copy Code
                  </button>
                </div>
              </div>

              {/* Syntax Highlighted Code */}
              <SyntaxHighlighter
                language="jsx"
                style={vscDarkPlus}
                showLineNumbers
                customStyle={{
                  margin: 0,
                  padding: '20px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  background: '#0A0A0F',
                }}
                lineNumberStyle={{
                  minWidth: '3em',
                  paddingRight: '1em',
                  color: '#4A4A5A',
                  userSelect: 'none',
                }}
                codeTagProps={{
                  style: {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  },
                }}
              >
                {highlightDTMValues(activeScreen.ui_code)}
              </SyntaxHighlighter>
            </div>
          ) : activeScreen.ui_loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-gray-700 border-t-[#6C63FF] rounded-full animate-spin mx-auto mb-3" />
                <div className="text-gray-400 text-sm">Generating code...</div>
              </div>
            </div>
          ) : activeScreen.ui_error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-red-500 text-4xl mb-3">⚠️</div>
                <div className="text-gray-300 text-sm mb-2">
                  Code generation failed
                </div>
                <div className="text-gray-500 text-xs">
                  An error occurred while generating the code for this screen
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-500 text-sm mb-2">
                  No code generated
                </div>
                <div className="text-gray-600 text-xs">
                  This screen hasn&apos;t been generated yet
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-sm">Select a screen to view</div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#13131A] border-t border-[#1F1F28] text-xs">
        <div className="flex items-center gap-4 text-gray-500">
          <span>
            Screen {flow.screens.findIndex(s => s.screen_id === activeScreenId) + 1} of{' '}
            {flow.screens.length}
          </span>
          {activeScreen && (
            <>
              <span>•</span>
              <span>{activeScreen.platform}</span>
              <span>•</span>
              <span>
                {activeScreen.dimensions?.width}x{activeScreen.dimensions?.height}
              </span>
            </>
          )}
        </div>

        <div className="text-gray-600">
          JSX • React
        </div>
      </div>
    </div>
  )
}