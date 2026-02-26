import { Layers, X } from 'lucide-react'
import React from 'react'

interface VariationPopupProps {
  elementPath: string
  element: string
  position: {
    x: number // % of canvas width
    y: number // px from top
    canvasWidth: number
  }
  onConfirm: () => void
  onCancel: () => void
}

export const VariationPopup: React.FC<VariationPopupProps> = ({
  elementPath,
  element,
  position,
  onConfirm,
  onCancel,
}) => {
  const POPUP_WIDTH = 320

  // Compute left position (same logic as AnnotationPopup)
  let left = (position.x / 100) * position.canvasWidth
  if (left + POPUP_WIDTH > position.canvasWidth) {
    left = position.canvasWidth - POPUP_WIDTH - 8
  }
  if (left < 8) left = 8

  return (
    <div
      data-annotation-ui
      style={{
        position: 'absolute',
        left,
        top: position.y + 12,
        width: POPUP_WIDTH,
        zIndex: 10000,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E1DD',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: '#F7F5F3',
          borderBottom: '1px solid #E8E1DD',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={14} style={{ color: '#667EEA' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#3B3B3B' }}>
            Create Variation
          </span>
        </div>
        <button
          data-annotation-ui
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            color: '#929397',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {/* Element label */}
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#929397', fontWeight: 500 }}>
            Element
          </span>
          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              color: '#3B3B3B',
              fontWeight: 600,
            }}
          >
            {element}
          </div>
        </div>

        {/* Path / code segment */}
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: '#929397', fontWeight: 500 }}>
            Path
          </span>
          <div
            style={{
              marginTop: 3,
              padding: '6px 8px',
              backgroundColor: '#F7F5F3',
              borderRadius: 6,
              fontSize: 11,
              color: '#667EEA',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              border: '1px solid #E8E1DD',
            }}
          >
            {elementPath}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            data-annotation-ui
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: 8,
              border: '1px solid #E8E1DD',
              background: '#FFFFFF',
              fontSize: 12,
              fontWeight: 500,
              color: '#3B3B3B',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            data-annotation-ui
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
              fontSize: 12,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            Create Variation
          </button>
        </div>
      </div>
    </div>
  )
}
