import React, { useEffect, useRef, useState } from 'react'

interface AnnotationPopupProps {
  element: string
  selectedText?: string
  placeholder: string
  initialValue?: string
  submitLabel?: string
  // eslint-disable-next-line no-unused-vars
  onSubmit: (comment: string) => void
  onCancel: () => void
  accentColor: string
  position: {
    x: number // percentage
    y: number // pixels from top
    canvasWidth: number
  }
}

export const AnnotationPopup: React.FC<AnnotationPopupProps> = ({
  element,
  selectedText,
  placeholder,
  initialValue = '',
  submitLabel = 'Add Annotation',
  onSubmit,
  onCancel,
  accentColor,
  position,
}) => {
  const [comment, setComment] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (comment.trim()) {
      onSubmit(comment.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (comment.trim()) {
        onSubmit(comment.trim())
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  // Calculate position
  const left = (position.x / 100) * position.canvasWidth
  const POPUP_WIDTH = 320
  const POPUP_HEIGHT = 220

  // Adjust horizontal position if would go off screen
  let adjustedLeft = left - POPUP_WIDTH / 2 // Center on marker
  if (adjustedLeft < 10) adjustedLeft = 10
  if (adjustedLeft + POPUP_WIDTH > position.canvasWidth - 10) {
    adjustedLeft = position.canvasWidth - POPUP_WIDTH - 10
  }

  // Position above or below based on space
  const showAbove = position.y > 300
  const top = showAbove ? position.y - POPUP_HEIGHT - 10 : position.y + 40

  return (
    <div
      ref={popupRef}
      className="agentator-popup"
      style={{
        left: adjustedLeft,
        top: top,
      }}
      onClick={e => e.stopPropagation()}
      data-annotation-ui
    >
      <div className="agentator-popup-header">
        <div className="agentator-popup-title">{element}</div>
        <button className="agentator-popup-close" onClick={onCancel}>
          ×
        </button>
      </div>

      {selectedText && (
        <div className="agentator-popup-selected">
          &quot;{selectedText}&quot;
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="agentator-popup-textarea"
          placeholder={placeholder}
          value={comment}
          onChange={e => setComment(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
        />

        <div className="agentator-popup-footer">
          <div className="agentator-popup-hint">
            <kbd>⌘</kbd>+<kbd>↵</kbd> to submit • <kbd>Esc</kbd> to cancel
          </div>
          <div className="agentator-popup-buttons">
            <button
              type="button"
              className="agentator-popup-button secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="agentator-popup-button primary"
              disabled={!comment.trim()}
              style={{
                backgroundColor: accentColor,
                borderColor: accentColor,
              }}
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
