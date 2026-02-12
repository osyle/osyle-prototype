import React, { useState, useRef, useEffect } from 'react'

interface ResizableScreenProps {
  children: React.ReactNode
  initialWidth: number
  initialHeight: number
  isSelected: boolean
  onSelect: () => void
  // eslint-disable-next-line no-unused-vars
  onResize: (width: number, height: number) => void
  // eslint-disable-next-line no-unused-vars
  onPositionChange: (x: number, y: number) => void
  position: { x: number; y: number }
}

const SNAP_BREAKPOINTS = [320, 375, 390, 412, 768, 1024, 1280, 1440, 1920]
const SNAP_THRESHOLD = 20 // px

export default function ResizableScreen({
  children,
  initialWidth,
  initialHeight,
  isSelected,
  onSelect,
  onResize,
  onPositionChange,
  position,
}: ResizableScreenProps) {
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight,
  })
  const [isResizing, setIsResizing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 })

  // Update size when initial dimensions change
  useEffect(() => {
    setSize({ width: initialWidth, height: initialHeight })
  }, [initialWidth, initialHeight])

  const snapToBreakpoint = (value: number, isWidth: boolean = true): number => {
    if (!isWidth) return value // Only snap width for now

    for (const breakpoint of SNAP_BREAKPOINTS) {
      if (Math.abs(value - breakpoint) < SNAP_THRESHOLD) {
        return breakpoint
      }
    }
    return value
  }

  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    }
  }

  const handleDragStart = (e: React.MouseEvent) => {
    // Only start drag if clicking on screen content, not resize handles
    if ((e.target as HTMLElement).closest('.resize-handle')) return

    e.preventDefault()
    setIsDragging(true)
    onSelect()
    startPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
      width: 0,
      height: 0,
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && resizeHandle) {
        const deltaX = e.clientX - startPos.current.x
        const deltaY = e.clientY - startPos.current.y

        let newWidth = size.width
        let newHeight = size.height

        // Handle different resize directions
        if (resizeHandle.includes('e')) {
          newWidth = Math.max(320, startPos.current.width + deltaX)
        }
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(320, startPos.current.width - deltaX)
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(568, startPos.current.height + deltaY)
        }
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(568, startPos.current.height - deltaY)
        }

        // Snap to breakpoints
        newWidth = snapToBreakpoint(newWidth, true)

        setSize({ width: newWidth, height: newHeight })
      } else if (isDragging) {
        const newX = e.clientX - startPos.current.x
        const newY = e.clientY - startPos.current.y
        onPositionChange(newX, newY)
      }
    }

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false)
        setResizeHandle(null)
        onResize(size.width, size.height)
      }
      if (isDragging) {
        setIsDragging(false)
      }
    }

    if (isResizing || isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [
    isResizing,
    isDragging,
    resizeHandle,
    size,
    position,
    onResize,
    onPositionChange,
  ])

  const renderResizeHandles = () => {
    const handleStyle = {
      position: 'absolute' as const,
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      border: '2px solid white',
      borderRadius: '4px',
    }

    const cornerSize = 10
    const edgeSize = 6

    return (
      <>
        {/* Corner handles */}
        <div
          className="resize-handle"
          onMouseDown={e => handleMouseDown(e, 'nw')}
          style={{
            ...handleStyle,
            top: -cornerSize / 2,
            left: -cornerSize / 2,
            width: cornerSize,
            height: cornerSize,
            cursor: 'nw-resize',
          }}
        />
        <div
          className="resize-handle"
          onMouseDown={e => handleMouseDown(e, 'ne')}
          style={{
            ...handleStyle,
            top: -cornerSize / 2,
            right: -cornerSize / 2,
            width: cornerSize,
            height: cornerSize,
            cursor: 'ne-resize',
          }}
        />
        <div
          className="resize-handle"
          onMouseDown={e => handleMouseDown(e, 'sw')}
          style={{
            ...handleStyle,
            bottom: -cornerSize / 2,
            left: -cornerSize / 2,
            width: cornerSize,
            height: cornerSize,
            cursor: 'sw-resize',
          }}
        />
        <div
          className="resize-handle"
          onMouseDown={e => handleMouseDown(e, 'se')}
          style={{
            ...handleStyle,
            bottom: -cornerSize / 2,
            right: -cornerSize / 2,
            width: cornerSize,
            height: cornerSize,
            cursor: 'se-resize',
          }}
        />

        {/* Edge handles */}
        <div
          className="resize-handle"
          onMouseDown={e => handleMouseDown(e, 'n')}
          style={{
            ...handleStyle,
            top: -edgeSize / 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 40,
            height: edgeSize,
            cursor: 'n-resize',
          }}
        />
        <div
          className="resize-handle"
          onMouseDown={e => handleMouseDown(e, 's')}
          style={{
            ...handleStyle,
            bottom: -edgeSize / 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 40,
            height: edgeSize,
            cursor: 's-resize',
          }}
        />
        <div
          className="resize-handle"
          onMouseDown={e => handleMouseDown(e, 'w')}
          style={{
            ...handleStyle,
            left: -edgeSize / 2,
            top: '50%',
            transform: 'translateY(-50%)',
            width: edgeSize,
            height: 40,
            cursor: 'w-resize',
          }}
        />
        <div
          className="resize-handle"
          onMouseDown={e => handleMouseDown(e, 'e')}
          style={{
            ...handleStyle,
            right: -edgeSize / 2,
            top: '50%',
            transform: 'translateY(-50%)',
            width: edgeSize,
            height: 40,
            cursor: 'e-resize',
          }}
        />
      </>
    )
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleDragStart}
      onClick={e => {
        e.stopPropagation()
        onSelect()
      }}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isResizing || isDragging ? 'none' : 'all 0.2s ease',
      }}
    >
      {/* Border highlight when selected */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: -2,
            border: '2px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Content */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
      >
        {children}
      </div>

      {/* Resize handles - only show when selected */}
      {isSelected && renderResizeHandles()}

      {/* Dimension tooltip while resizing */}
      {isResizing && (
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          {size.width} × {size.height}
        </div>
      )}
    </div>
  )
}
