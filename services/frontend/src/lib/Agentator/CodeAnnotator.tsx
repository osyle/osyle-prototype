/**
 * CodeAnnotator
 *
 * Allows users to select code lines and add annotations directly in the code viewer.
 * Integrates with AgentatorGlobalProvider for unified annotation storage.
 */

import { MessageSquare, X, Check } from 'lucide-react'
import React, { useState } from 'react'
import { useAgentatorGlobal } from './AgentatorGlobalProvider'
import type { CodeAnnotation } from './types'

interface CodeAnnotatorProps {
  screenName: string
  code: string
  lineHeight: number // Height of each line in pixels
  isActive: boolean
  children: React.ReactNode // The SyntaxHighlighter component
}

export const CodeAnnotator: React.FC<CodeAnnotatorProps> = ({
  screenName,
  code,
  lineHeight,
  isActive,
  children,
}) => {
  const [selectedLines, setSelectedLines] = useState<{
    start: number
    end: number
  } | null>(null)
  const [annotationText, setAnnotationText] = useState('')
  const [dragStart, setDragStart] = useState<number | null>(null)

  const { addCodeAnnotation, getCodeAnnotations, deleteCodeAnnotation, mode } =
    useAgentatorGlobal()

  // Get existing code annotations for this screen
  const existingAnnotations = getCodeAnnotations(screenName)

  const totalLines = code.split('\n').length

  // Only allow code annotation in annotate mode, not inspect mode
  const canAnnotate = isActive && mode === 'annotate'

  // Debug logging
  console.log('CodeAnnotator render:', {
    isActive,
    mode,
    canAnnotate,
    totalLines,
    screenName,
    existingAnnotations: existingAnnotations.length,
  })

  // Handle line click
  const handleLineClick = (lineNumber: number, event: React.MouseEvent) => {
    if (!canAnnotate) return // Only allow in annotate mode

    if (event.shiftKey && selectedLines) {
      // Extend selection with shift-click
      setSelectedLines({
        start: Math.min(selectedLines.start, lineNumber),
        end: Math.max(selectedLines.start, lineNumber),
      })
    } else {
      // New selection
      setSelectedLines({ start: lineNumber, end: lineNumber })
    }
  }

  // Handle drag selection
  const handleLineDragStart = (lineNumber: number) => {
    if (!canAnnotate) return // Only allow in annotate mode
    setDragStart(lineNumber)
    setSelectedLines({ start: lineNumber, end: lineNumber })
  }

  const handleLineDragOver = (lineNumber: number) => {
    if (!canAnnotate || dragStart === null) return // Only allow in annotate mode
    setSelectedLines({
      start: Math.min(dragStart, lineNumber),
      end: Math.max(dragStart, lineNumber),
    })
  }

  const handleLineDragEnd = () => {
    setDragStart(null)
  }

  // Add annotation
  const handleAddAnnotation = () => {
    if (!selectedLines || !annotationText.trim()) return

    const codeLines = code.split('\n')
    const selectedCode = codeLines
      .slice(selectedLines.start - 1, selectedLines.end)
      .join('\n')

    const annotation: CodeAnnotation = {
      id: `code_ann_${Date.now()}`,
      type: 'code',
      screenName,
      startLine: selectedLines.start,
      endLine: selectedLines.end,
      selectedCode,
      comment: annotationText.trim(),
      timestamp: new Date(),
      boundingBox: {
        x: 0,
        y: (selectedLines.start - 1) * lineHeight,
        width: 0,
        height: (selectedLines.end - selectedLines.start + 1) * lineHeight,
      },
    }

    addCodeAnnotation(screenName, annotation)

    // Reset state
    setSelectedLines(null)
    setAnnotationText('')
  }

  // Cancel annotation
  const handleCancel = () => {
    setSelectedLines(null)
    setAnnotationText('')
  }

  // Delete annotation
  const handleDeleteAnnotation = (annotationId: string) => {
    deleteCodeAnnotation(screenName, annotationId)
  }

  return (
    <div
      className="relative"
      style={{
        // Visual indicator that annotation mode is active (only in annotate mode)
        outline: canAnnotate ? '2px solid rgba(59, 130, 246, 0.3)' : 'none',
        outlineOffset: '-2px',
      }}
    >
      {/* The actual code display */}
      {children}

      {/* Selection highlights - render over code */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '20px', // Account for SyntaxHighlighter padding
          left: '0',
          right: '0',
          bottom: '0',
          zIndex: 10,
        }}
      >
        {/* Current selection */}
        {selectedLines && (
          <div
            style={{
              top: `${(selectedLines.start - 1) * lineHeight}px`,
              height: `${(selectedLines.end - selectedLines.start + 1) * lineHeight}px`,
            }}
            className="absolute left-0 right-0 bg-blue-500/20 border-l-4 border-blue-500"
          />
        )}

        {/* Existing annotations */}
        {existingAnnotations.map((ann: CodeAnnotation) => (
          <div
            key={ann.id}
            style={{
              top: `${(ann.startLine - 1) * lineHeight}px`,
              height: `${(ann.endLine - ann.startLine + 1) * lineHeight}px`,
            }}
            className="absolute left-0 right-0 bg-yellow-500/10 border-l-4 border-yellow-500"
          />
        ))}
      </div>

      {/* Interactive line overlay - captures clicks (only in annotate mode) */}
      {canAnnotate && (
        <div
          className="absolute"
          style={{
            top: '20px', // Account for SyntaxHighlighter padding
            left: '0',
            right: '0',
            bottom: '0',
            zIndex: 9999, // Very high to ensure we're on top
            pointerEvents: 'auto', // CRITICAL: Enable pointer events
          }}
        >
          {Array.from({ length: totalLines }, (_, i) => i + 1).map(lineNum => (
            <div
              key={lineNum}
              style={{
                height: `${lineHeight}px`,
                top: `${(lineNum - 1) * lineHeight}px`,
                pointerEvents: 'auto', // CRITICAL: Enable pointer events on each line
                position: 'absolute',
                left: 0,
                right: 0,
              }}
              className="cursor-pointer hover:bg-blue-500/10 transition-colors"
              onClick={e => handleLineClick(lineNum, e)}
              onMouseDown={() => handleLineDragStart(lineNum)}
              onMouseEnter={() => handleLineDragOver(lineNum)}
              onMouseUp={handleLineDragEnd}
            />
          ))}
        </div>
      )}

      {/* Annotation input - floating near code (only in annotate mode) */}
      {selectedLines && canAnnotate && (
        <div
          style={{
            position: 'absolute',
            top: `${20 + (selectedLines.start - 1) * lineHeight}px`, // 20px for padding offset
            right: '20px', // Align right edge with code viewer's right edge
            zIndex: 10000, // FIXED: Above interactive overlay (9999)
            pointerEvents: 'auto', // FIXED: Enable clicks
          }}
          className="w-80"
        >
          <div className="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <MessageSquare size={16} />
                <span>
                  Lines {selectedLines.start}
                  {selectedLines.end !== selectedLines.start &&
                    `-${selectedLines.end}`}
                </span>
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-300"
              >
                <X size={16} />
              </button>
            </div>

            {/* Selected code preview */}
            <div className="mb-3 p-2 bg-black/30 rounded text-xs font-mono text-gray-400 max-h-32 overflow-auto">
              {code
                .split('\n')
                .slice(selectedLines.start - 1, selectedLines.end)
                .join('\n')}
            </div>

            {/* Annotation input */}
            <textarea
              value={annotationText}
              onChange={e => setAnnotationText(e.target.value)}
              placeholder="What change do you want here?"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAddAnnotation()
                } else if (e.key === 'Escape') {
                  handleCancel()
                }
              }}
            />

            {/* Actions */}
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-gray-500">
                ⌘+Enter to save, Esc to cancel
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-400 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAnnotation}
                  disabled={!annotationText.trim()}
                  className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Add Annotation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Annotation markers in gutter */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '0',
          top: '20px', // Account for SyntaxHighlighter padding
          width: '3em',
          zIndex: 15,
        }}
      >
        {existingAnnotations.map((ann: CodeAnnotation) => (
          <div
            key={ann.id}
            style={{
              top: `${(ann.startLine - 1) * lineHeight}px`,
            }}
            className="relative"
          >
            <div className="absolute left-2 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-black pointer-events-auto cursor-pointer hover:scale-110 transition-transform group">
              !{/* Tooltip on hover */}
              <div className="absolute left-8 top-0 hidden group-hover:block w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 z-40">
                <div className="text-xs text-gray-300 mb-2">
                  Lines {ann.startLine}
                  {ann.endLine !== ann.startLine && `-${ann.endLine}`}
                </div>
                <div className="text-xs text-gray-400 mb-2 font-mono bg-black/30 p-2 rounded max-h-20 overflow-auto">
                  {ann.selectedCode}
                </div>
                <div className="text-sm text-gray-200 mb-2">{ann.comment}</div>
                <button
                  onClick={() => handleDeleteAnnotation(ann.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
