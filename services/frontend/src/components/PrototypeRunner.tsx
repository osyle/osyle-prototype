import { ChevronLeft, Home } from 'lucide-react'
import { useState } from 'react'
import type { FlowGraph } from '../types/home.types'
import type { ParameterValues } from '../types/parametric.types'
import DynamicReactRenderer from './DynamicReactRenderer'

interface PrototypeRunnerProps {
  flow: FlowGraph
  deviceInfo: {
    platform: 'web' | 'phone'
    screen: { width: number; height: number }
  }
  parametricValues?: ParameterValues // NEW: Accept parametric state from Concept tab
}

export default function PrototypeRunner({
  flow,
  deviceInfo,
  parametricValues = {}, // NEW: Default to empty object if not provided
}: PrototypeRunnerProps) {
  const [currentScreenId, setCurrentScreenId] = useState(flow.entry_screen_id)
  const [history, setHistory] = useState<string[]>([])

  const currentScreen = flow.screens.find(s => s.screen_id === currentScreenId)

  if (!currentScreen) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Error: Screen not found</div>
      </div>
    )
  }

  const handleTransition = (transitionId: string) => {
    const transition = flow.transitions.find(
      t =>
        t.transition_id === transitionId &&
        t.from_screen_id === currentScreenId,
    )

    if (transition) {
      // Add current screen to history
      setHistory([...history, currentScreenId])

      // Navigate to next screen
      setCurrentScreenId(transition.to_screen_id)
    } else {
      console.warn(`Transition ${transitionId} not found`)
    }
  }

  const goBack = () => {
    if (history.length > 0) {
      const previousScreen = history[history.length - 1]
      setHistory(history.slice(0, -1))
      setCurrentScreenId(previousScreen)
    }
  }

  const resetToStart = () => {
    setCurrentScreenId(flow.entry_screen_id)
    setHistory([])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Prototype Controls Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            disabled={history.length === 0}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Go back"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={resetToStart}
            className="p-2 rounded hover:bg-gray-100"
            title="Reset to start"
          >
            <Home size={20} />
          </button>
        </div>

        <div className="text-sm font-medium text-gray-700">
          {currentScreen.name}
        </div>

        <div className="text-xs text-gray-400">
          Screen{' '}
          {flow.screens.findIndex(s => s.screen_id === currentScreenId) + 1} /{' '}
          {flow.screens.length}
        </div>
      </div>

      {/* Prototype Viewport */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 overflow-auto">
        <div
          className="relative bg-white shadow-xl"
          style={{
            width: deviceInfo.screen.width,
            height: deviceInfo.screen.height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {currentScreen.ui_code ? (
            <DynamicReactRenderer
              jsxCode={currentScreen.ui_code}
              propsToInject={{
                onTransition: handleTransition,
                // NEW: Pass parametric values to the rendered component
                // This ensures the Prototype tab initializes with the state
                // that was set in the Concept tab
                parameters: parametricValues,
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">
                No UI generated for this screen
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
