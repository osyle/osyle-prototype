import React, { useState, useRef, useCallback, useEffect } from 'react'
import type {
  Annotation,
  PendingAnnotation,
  HoverInfo,
  InspectedElement,
  AgentatorMode,
} from '../types'
import {
  identifyElement,
  getElementClasses,
  getNearbyText,
  getRelativeBoundingBox,
  getElementTextContent,
  getElementIndex,
} from '../utils/elementIdentification'
import {
  getSelectedTextInfo,
  clearTextSelection,
  hasTextSelection,
} from '../utils/textSelection'
import { AnnotationPopup } from './AnnotationPopup'

interface AnnotationCanvasProps {
  screenId: string
  screenName: string
  children: React.ReactNode
  // eslint-disable-next-line no-unused-vars
  onAnnotationAdd: (annotation: Annotation) => void
  // eslint-disable-next-line no-unused-vars
  onAnnotationDelete: (annotation: Annotation) => void
  // eslint-disable-next-line no-unused-vars
  onAnnotationUpdate: (annotation: Annotation) => void
  annotations: Annotation[]
  isActive: boolean
  mode: AgentatorMode
  annotationColor?: string
  // eslint-disable-next-line no-unused-vars
  onInspect?: (element: InspectedElement | null) => void
  isConceptMode?: boolean // NEW: Whether this is in Concept tab (non-interactive) vs Prototype tab
}

/**
 * Get the cumulative transform (scale/translate) applied to an element by its parents
 * This is needed because InfiniteCanvas applies transform: scale() and translate()
 */
function getElementTransform(element: HTMLElement): {
  scale: number
  translateX: number
  translateY: number
} {
  let current: HTMLElement | null = element
  let scale = 1
  let translateX = 0
  let translateY = 0

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    const transform = style.transform

    if (transform && transform !== 'none') {
      // Parse transform matrix
      const match = transform.match(/matrix\(([^)]+)\)/)
      if (match) {
        const values = match[1].split(',').map(v => parseFloat(v.trim()))
        // matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)
        if (values.length === 6) {
          scale *= values[0] // scaleX (assuming uniform scale)
          translateX += values[4]
          translateY += values[5]
        }
      }
    }

    current = current.parentElement
  }

  return { scale, translateX, translateY }
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  screenId,
  screenName,
  children,
  onAnnotationAdd,
  onAnnotationDelete,
  onAnnotationUpdate,
  annotations,
  isActive,
  mode,
  annotationColor = '#3c82f7',
  onInspect,
  isConceptMode = false,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [pendingAnnotation, setPendingAnnotation] =
    useState<PendingAnnotation | null>(null)
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(
    null,
  )
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  )
  const [dragCurrent, setDragCurrent] = useState<{
    x: number
    y: number
  } | null>(null)
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null)

  // Selected element in inspect mode (persistent highlight)
  const [selectedInspectElement, setSelectedInspectElement] = useState<{
    boundingBox: { x: number; y: number; width: number; height: number }
    element: string
  } | null>(null)

  // Drag & Reorder state (Phase 3-4)
  const [dragReorderState, setDragReorderState] = useState<{
    isDragging: boolean
    draggedElement: HTMLElement | null
    dragPreview: HTMLElement | null
    dropTarget: HTMLElement | null
    dropPosition: 'before' | 'after' | null
    startX: number
    startY: number
    cooldownUntil: number // Prevent immediate re-drag after drop
    justDropped: boolean // Flag to ignore next click after drop
  }>({
    isDragging: false,
    draggedElement: null,
    dragPreview: null,
    dropTarget: null,
    dropPosition: null,
    startX: 0,
    startY: 0,
    cooldownUntil: 0,
    justDropped: false,
  })

  // Clear selection when mode changes
  useEffect(() => {
    if (mode !== 'inspect') {
      setSelectedInspectElement(null)
    }
  }, [mode])

  // Clear selection when isActive changes
  useEffect(() => {
    if (!isActive) {
      setSelectedInspectElement(null)
    }
  }, [isActive])

  // Handle mouse move for hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isActive || pendingAnnotation || !canvasRef.current) return

      // Continue hover updates during drag for visual feedback
      const canvas = canvasRef.current
      const target = e.target as HTMLElement

      if (target === canvas || target.closest('[data-annotation-ui]')) {
        setHoverInfo(null)
        return
      }

      if (!canvas.contains(target)) {
        setHoverInfo(null)
        return
      }

      const identified = identifyElement(target)
      const targetRect = target.getBoundingClientRect()
      const canvasRect = canvas.getBoundingClientRect()

      // Account for parent transforms (InfiniteCanvas scale/translate)
      const transform = getElementTransform(canvas)

      setHoverInfo({
        element: identified.name,
        elementPath: identified.path,
        rect: new DOMRect(
          (targetRect.left - canvasRect.left) / transform.scale,
          (targetRect.top - canvasRect.top) / transform.scale,
          targetRect.width / transform.scale,
          targetRect.height / transform.scale,
        ),
      })

      // Update drag position during drag
      if (isDragging && dragStart) {
        setDragCurrent({
          x: (e.clientX - canvasRect.left) / transform.scale,
          y: (e.clientY - canvasRect.top) / transform.scale,
        })
      }
    },
    [isActive, isDragging, dragStart, pendingAnnotation],
  )

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    if (!isActive || !canvasRef.current || isDragging) return

    const selectionInfo = getSelectedTextInfo()
    if (!selectionInfo || !selectionInfo.container) return

    const canvas = canvasRef.current
    const container = selectionInfo.container

    if (!canvas.contains(container)) return

    const identified = identifyElement(container)
    const canvasRect = canvas.getBoundingClientRect()
    const selectionRect = selectionInfo.range?.getBoundingClientRect()

    if (!selectionRect) return

    // Account for parent transforms
    const transform = getElementTransform(canvas)

    const clickX =
      (selectionRect.left - canvasRect.left + selectionRect.width / 2) /
      transform.scale
    const clickY = (selectionRect.top - canvasRect.top) / transform.scale

    // Get enhanced metadata
    const textContent = getElementTextContent(container)
    const elementIndex = getElementIndex(container)

    const pending: PendingAnnotation = {
      id: `temp-${Date.now()}`,
      screenId,
      screenName,
      x: (clickX / (canvasRect.width / transform.scale)) * 100,
      y: clickY,
      clientY: clickY,
      comment: '',
      element: identified.name,
      elementPath: identified.path,
      timestamp: Date.now(),
      selectedText: selectionInfo.text,
      boundingBox: {
        x: (selectionRect.left - canvasRect.left) / transform.scale,
        y: clickY,
        width: selectionRect.width / transform.scale,
        height: selectionRect.height / transform.scale,
      },
      cssClasses: getElementClasses(container),
      nearbyText: getNearbyText(container),
      textContent,
      elementIndex,
    }

    setPendingAnnotation(pending)
    setHoverInfo(null)
    clearTextSelection()
  }, [isActive, isDragging, screenId, screenName])

  // Handle click
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isActive || isDragging || pendingAnnotation || !canvasRef.current)
        return

      const canvas = canvasRef.current
      const target = e.target as HTMLElement

      // DRAG MODE - Moved to mousedown handler (see below)
      // Don't start drag on click - only on mousedown + move
      if (mode === 'drag') {
        // Just prevent default click behavior
        e.preventDefault()
        e.stopPropagation()
        return
      }

      // Inspect mode - select the element and show persistent highlight
      if (mode === 'inspect') {
        if (target.closest('[data-annotation-ui]') || target === canvas) {
          // Clicked on UI or canvas - clear selection
          setSelectedInspectElement(null)
          onInspect?.(null)
          return
        }

        if (!canvas.contains(target)) return

        e.preventDefault() // Prevent default actions (checkbox, button, etc.)
        e.stopPropagation()

        const identified = identifyElement(target)
        const boundingBox = getRelativeBoundingBox(target, canvas)

        // Get element attributes
        const attributes: Record<string, string> = {}
        if (target.id) attributes['id'] = target.id
        if (target.getAttribute('name'))
          attributes['name'] = target.getAttribute('name')!
        if (target.getAttribute('href'))
          attributes['href'] = target.getAttribute('href')!
        if (target.getAttribute('type'))
          attributes['type'] = target.getAttribute('type')!
        if (target.getAttribute('placeholder'))
          attributes['placeholder'] = target.getAttribute('placeholder')!
        if (target.getAttribute('aria-label'))
          attributes['aria-label'] = target.getAttribute('aria-label')!

        // PHASE 2 FIX: Extract computed styles for StyleEditor
        const computed = window.getComputedStyle(target)

        const computedStyles: Record<string, string> = {
          // Layout
          display: computed.display,
          position: computed.position,
          width: computed.width,
          height: computed.height,
          minWidth: computed.minWidth,
          maxWidth: computed.maxWidth,
          minHeight: computed.minHeight,
          maxHeight: computed.maxHeight,
          overflow: computed.overflow,
          overflowX: computed.overflowX,
          overflowY: computed.overflowY,
          zIndex: computed.zIndex,

          // Flexbox
          flexDirection: computed.flexDirection,
          justifyContent: computed.justifyContent,
          alignItems: computed.alignItems,
          alignContent: computed.alignContent,
          flexWrap: computed.flexWrap,
          flexGrow: computed.flexGrow,
          flexShrink: computed.flexShrink,
          flexBasis: computed.flexBasis,
          gap: computed.gap,
          rowGap: computed.rowGap,
          columnGap: computed.columnGap,

          // Grid
          gridTemplateColumns: computed.gridTemplateColumns,
          gridTemplateRows: computed.gridTemplateRows,
          gridColumn: computed.gridColumn,
          gridRow: computed.gridRow,
          gridAutoFlow: computed.gridAutoFlow,

          // Spacing
          padding: computed.padding,
          paddingTop: computed.paddingTop,
          paddingRight: computed.paddingRight,
          paddingBottom: computed.paddingBottom,
          paddingLeft: computed.paddingLeft,
          margin: computed.margin,
          marginTop: computed.marginTop,
          marginRight: computed.marginRight,
          marginBottom: computed.marginBottom,
          marginLeft: computed.marginLeft,

          // Position
          top: computed.top,
          right: computed.right,
          bottom: computed.bottom,
          left: computed.left,

          // Typography
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          fontFamily: computed.fontFamily,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,
          color: computed.color,
          textAlign: computed.textAlign,
          textTransform: computed.textTransform,
          textDecoration: computed.textDecoration,
          whiteSpace: computed.whiteSpace,
          wordBreak: computed.wordBreak,

          // Background
          background: computed.background,
          backgroundColor: computed.backgroundColor,
          backgroundImage: computed.backgroundImage,
          backgroundSize: computed.backgroundSize,
          backgroundPosition: computed.backgroundPosition,
          backgroundRepeat: computed.backgroundRepeat,
          backgroundAttachment: computed.backgroundAttachment,

          // Border
          border: computed.border,
          borderWidth: computed.borderWidth,
          borderStyle: computed.borderStyle,
          borderColor: computed.borderColor,
          borderRadius: computed.borderRadius,
          borderTop: computed.borderTop,
          borderRight: computed.borderRight,
          borderBottom: computed.borderBottom,
          borderLeft: computed.borderLeft,
          borderTopLeftRadius: computed.borderTopLeftRadius,
          borderTopRightRadius: computed.borderTopRightRadius,
          borderBottomRightRadius: computed.borderBottomRightRadius,
          borderBottomLeftRadius: computed.borderBottomLeftRadius,

          // Effects
          opacity: computed.opacity,
          boxShadow: computed.boxShadow,
          textShadow: computed.textShadow,
          filter: computed.filter,
          backdropFilter: computed.backdropFilter,

          // Transform
          transform: computed.transform,
          transformOrigin: computed.transformOrigin,
          rotate: computed.rotate,
          scale: computed.scale,
          translate: computed.translate,

          // Animation
          transition: computed.transition,
          transitionDuration: computed.transitionDuration,
          transitionTimingFunction: computed.transitionTimingFunction,
          transitionDelay: computed.transitionDelay,
          animation: computed.animation,

          // Interaction
          cursor: computed.cursor,
          pointerEvents: computed.pointerEvents,
          userSelect: computed.userSelect,
          outline: computed.outline,
        }

        // Get enhanced metadata
        const textContent = getElementTextContent(target)
        const elementIndex = getElementIndex(target)

        const inspected: InspectedElement = {
          element: identified.name,
          elementPath: identified.path,
          cssClasses: getElementClasses(target),
          boundingBox,
          nearbyText: getNearbyText(target),
          tagName: target.tagName,
          attributes,
          computedStyles, // NOW INCLUDED
          timestamp: Date.now(),
          textContent,
          elementIndex,
        }

        // Store selection for persistent highlight
        setSelectedInspectElement({
          boundingBox,
          element: identified.name,
        })

        onInspect?.(inspected)
        return
      }

      // Annotate mode - existing logic
      if (hasTextSelection()) {
        handleTextSelection()
        return
      }

      if (target.closest('[data-annotation-ui]') || target === canvas) return
      if (!canvas.contains(target)) return

      e.preventDefault() // Prevent default actions (checkbox, button, etc.)
      e.stopPropagation()

      const identified = identifyElement(target)
      const canvasRect = canvas.getBoundingClientRect()
      const boundingBox = getRelativeBoundingBox(target, canvas)

      // Account for parent transforms
      const transform = getElementTransform(canvas)

      // Calculate click position relative to canvas (accounting for scale)
      const clickX = (e.clientX - canvasRect.left) / transform.scale
      const clickY = (e.clientY - canvasRect.top) / transform.scale

      // Get enhanced metadata
      const textContent = getElementTextContent(target)
      const elementIndex = getElementIndex(target)

      const pending: PendingAnnotation = {
        id: `temp-${Date.now()}`,
        screenId,
        screenName,
        x: (clickX / (canvasRect.width / transform.scale)) * 100,
        y: clickY,
        clientY: clickY,
        comment: '',
        element: identified.name,
        elementPath: identified.path,
        timestamp: Date.now(),
        boundingBox,
        cssClasses: getElementClasses(target),
        nearbyText: getNearbyText(target),
        textContent,
        elementIndex,
      }

      setPendingAnnotation(pending)
      setHoverInfo(null)
    },
    [
      isActive,
      isDragging,
      pendingAnnotation,
      screenId,
      screenName,
      mode,
      onInspect,
      handleTextSelection,
    ],
  )

  // Handle mouse down to start drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      console.log(
        '🖱️ handleMouseDown called, mode:',
        mode,
        'isActive:',
        isActive,
      )

      if (!isActive || !canvasRef.current) return

      const target = e.target as HTMLElement
      const canvas = canvasRef.current

      if (target.closest('[data-annotation-ui]')) return

      // DRAG MODE - Start drag on mousedown
      if (mode === 'drag') {
        console.log('📍 In drag mode, target:', target.tagName)

        if (target === canvas || !canvas.contains(target)) {
          console.log('❌ Target is canvas or not in canvas')
          return
        }

        // Check if element has siblings (can be reordered)
        const siblings = Array.from(
          target.parentElement?.children || [],
        ).filter(child => !child.hasAttribute('data-annotation-ui'))
        console.log('👥 Siblings count:', siblings.length)

        if (siblings.length <= 1) {
          console.log('❌ Element not draggable (no siblings)')
          return
        }

        // Clean up any stuck previews
        const existingPreviews = document.querySelectorAll(
          '[data-drag-preview]',
        )
        existingPreviews.forEach(preview => preview.remove())

        const rect = target.getBoundingClientRect()
        const path = identifyElement(target).path
        const index = getElementIndex(target)

        // Create drag preview
        const preview = target.cloneNode(true) as HTMLElement
        preview.style.position = 'fixed'
        preview.style.left = `${rect.left}px`
        preview.style.top = `${rect.top}px`
        preview.style.width = `${rect.width}px`
        preview.style.opacity = '0.7'
        preview.style.pointerEvents = 'none'
        preview.style.zIndex = '10000'
        preview.style.transform = 'rotate(-2deg)'
        preview.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.3)'
        preview.setAttribute('data-drag-preview', 'true')
        document.body.appendChild(preview)

        // Dim original element
        target.style.opacity = '0.3'

        setDragReorderState({
          isDragging: true,
          draggedElement: target,
          dragPreview: preview,
          dropTarget: null,
          dropPosition: null,
          startX: e.clientX,
          startY: e.clientY,
          cooldownUntil: 0,
          justDropped: false,
        })

        console.log('🎯 Started dragging:', path, 'index:', index)
        e.preventDefault()
        e.stopPropagation()
        return
      }

      // ANNOTATE MODE - Check if Alt/Option key is pressed for multi-select
      if (mode === 'annotate' && e.altKey) {
        const canvasRect = canvas.getBoundingClientRect()
        const transform = getElementTransform(canvas)

        setIsDragging(true)
        setDragStart({
          x: (e.clientX - canvasRect.left) / transform.scale,
          y: (e.clientY - canvasRect.top) / transform.scale,
        })
        setDragCurrent({
          x: (e.clientX - canvasRect.left) / transform.scale,
          y: (e.clientY - canvasRect.top) / transform.scale,
        })
      }
    },
    [isActive, mode],
  )

  // Mouse up to finish drag
  const handleMouseUp = useCallback(() => {
    if (!isDragging || !canvasRef.current || !dragStart || !dragCurrent) return

    const canvas = canvasRef.current
    const canvasRect = canvas.getBoundingClientRect()
    const transform = getElementTransform(canvas)

    setIsDragging(false)

    const x1 = Math.min(dragStart.x, dragCurrent.x)
    const y1 = Math.min(dragStart.y, dragCurrent.y)
    const x2 = Math.max(dragStart.x, dragCurrent.x)
    const y2 = Math.max(dragStart.y, dragCurrent.y)
    const width = x2 - x1
    const height = y2 - y1

    const centerX = x1 + width / 2
    const centerY = y1 + height / 2

    const pending: PendingAnnotation = {
      id: `temp-${Date.now()}`,
      screenId,
      screenName,
      x: (centerX / (canvasRect.width / transform.scale)) * 100,
      y: centerY,
      clientY: centerY,
      comment: '',
      element: 'Multi-select area',
      elementPath: 'Multiple elements',
      timestamp: Date.now(),
      boundingBox: { x: x1, y: y1, width, height },
      isMultiSelect: true,
    }

    setPendingAnnotation(pending)
    setDragStart(null)
    setDragCurrent(null)
  }, [isDragging, dragStart, dragCurrent, screenId, screenName])

  const addAnnotation = useCallback(
    (comment: string) => {
      if (!pendingAnnotation) return

      const annotation: Annotation = {
        ...pendingAnnotation,
        id: `annotation-${Date.now()}`,
        comment,
      }

      onAnnotationAdd(annotation)
      setPendingAnnotation(null)
    },
    [pendingAnnotation, onAnnotationAdd],
  )

  const cancelAnnotation = useCallback(() => {
    setPendingAnnotation(null)
  }, [])

  const deleteAnnotation = useCallback(
    (id: string) => {
      const annotation = annotations.find(a => a.id === id)
      if (annotation) {
        onAnnotationDelete(annotation)
      }
    },
    [annotations, onAnnotationDelete],
  )

  const startEdit = useCallback((annotation: Annotation) => {
    setEditingAnnotation(annotation)
  }, [])

  const updateAnnotation = useCallback(
    (comment: string) => {
      if (!editingAnnotation) return

      const updated: Annotation = {
        ...editingAnnotation,
        comment,
      }

      onAnnotationUpdate(updated)
      setEditingAnnotation(null)
    },
    [editingAnnotation, onAnnotationUpdate],
  )

  const cancelEdit = useCallback(() => {
    setEditingAnnotation(null)
  }, [])

  // Close popups on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingAnnotation) {
          cancelAnnotation()
        } else if (editingAnnotation) {
          cancelEdit()
        } else if (mode === 'inspect' && selectedInspectElement) {
          // Clear inspect selection on Escape
          setSelectedInspectElement(null)
          onInspect?.(null)
        }
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [
    pendingAnnotation,
    editingAnnotation,
    cancelAnnotation,
    cancelEdit,
    mode,
    selectedInspectElement,
    onInspect,
  ])

  // Drag reorder handlers (Phase 3-4)
  useEffect(() => {
    if (!dragReorderState.isDragging || !dragReorderState.draggedElement) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragReorderState.dragPreview || !dragReorderState.draggedElement)
        return

      // Update preview position
      const preview = dragReorderState.dragPreview
      const offsetX = e.clientX - dragReorderState.startX
      const offsetY = e.clientY - dragReorderState.startY
      const originalLeft = parseFloat(preview.style.left)
      const originalTop = parseFloat(preview.style.top)
      preview.style.left = `${originalLeft + offsetX}px`
      preview.style.top = `${originalTop + offsetY}px`

      setDragReorderState(prev => ({
        ...prev,
        startX: e.clientX,
        startY: e.clientY,
      }))

      // Find drop target
      preview.style.display = 'none'
      const elementBelow = document.elementFromPoint(
        e.clientX,
        e.clientY,
      ) as HTMLElement
      preview.style.display = 'block'

      if (elementBelow && elementBelow !== dragReorderState.draggedElement) {
        // Check if valid drop target (sibling)
        if (
          elementBelow.parentElement ===
          dragReorderState.draggedElement.parentElement
        ) {
          const rect = elementBelow.getBoundingClientRect()
          const midpoint = rect.top + rect.height / 2
          const position = e.clientY < midpoint ? 'before' : 'after'

          setDragReorderState(prev => ({
            ...prev,
            dropTarget: elementBelow,
            dropPosition: position,
          }))
          return
        }
      }

      setDragReorderState(prev => ({
        ...prev,
        dropTarget: null,
        dropPosition: null,
      }))
    }

    const handleMouseUp = () => {
      if (!dragReorderState.draggedElement) return

      console.log('🛑 Ending drag...')

      // Remove preview FIRST (before any state updates)
      if (dragReorderState.dragPreview) {
        console.log('🗑️ Removing drag preview')
        dragReorderState.dragPreview.remove()
      }

      // Also remove any preview that might be stuck (failsafe)
      const stuckPreviews = document.querySelectorAll('[data-drag-preview]')
      stuckPreviews.forEach(preview => {
        console.log('🗑️ Removing stuck preview')
        preview.remove()
      })

      // Restore original element
      dragReorderState.draggedElement.style.opacity = '1'

      // Perform reorder if valid drop
      if (dragReorderState.dropTarget && dragReorderState.dropPosition) {
        const { dropTarget, dropPosition, draggedElement } = dragReorderState
        const parent = draggedElement.parentElement

        if (parent) {
          const oldIndex = Array.from(parent.children).indexOf(draggedElement)

          // Reorder in DOM
          if (dropPosition === 'before') {
            dropTarget.parentElement?.insertBefore(draggedElement, dropTarget)
          } else {
            if (dropTarget.nextSibling) {
              dropTarget.parentElement?.insertBefore(
                draggedElement,
                dropTarget.nextSibling,
              )
            } else {
              dropTarget.parentElement?.appendChild(draggedElement)
            }
          }

          const newIndex = Array.from(parent.children).indexOf(draggedElement)

          console.log('✅ Reordered element:', `${oldIndex} → ${newIndex}`)

          // Note: Mutation saving will be added in AgentatorGlobalProvider integration
        }
      }

      // Clear drag state
      setDragReorderState({
        isDragging: false,
        draggedElement: null,
        dragPreview: null,
        dropTarget: null,
        dropPosition: null,
        startX: 0,
        startY: 0,
        cooldownUntil: Date.now() + 300, // 300ms cooldown
        justDropped: true, // Flag to ignore next click
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragReorderState])

  return (
    <div
      ref={canvasRef}
      className="agentator-canvas"
      onMouseMove={isActive ? handleMouseMove : undefined}
      onClickCapture={isActive ? handleClick : undefined}
      onMouseDown={
        isActive && (mode === 'annotate' || mode === 'drag')
          ? handleMouseDown
          : undefined
      }
      onMouseUp={isDragging ? handleMouseUp : undefined}
      // FIX 3: Universal event blocking in Concept mode
      // BUT: Allow annotation UI to work (popup, markers)
      // AND: Allow drag mode to work
      onMouseDownCapture={
        isConceptMode
          ? e => {
              // Allow annotation UI to work
              const target = e.target as HTMLElement
              if (target.closest('[data-annotation-ui]')) {
                return // Don't block
              }
              // Allow drag mode to work
              if (mode === 'drag') {
                return // Don't block
              }
              e.preventDefault()
              e.stopPropagation()
            }
          : undefined
      }
      onChangeCapture={
        isConceptMode
          ? e => {
              // Allow annotation UI to work
              const target = e.target as HTMLElement
              if (target.closest('[data-annotation-ui]')) {
                return // Don't block
              }
              e.preventDefault()
              e.stopPropagation()
            }
          : undefined
      }
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {children}

      {/* Blocking overlay for Concept mode when Agentator is inactive */}
      {isConceptMode && !isActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9997, // Just below agentator-overlay (9998)
            pointerEvents: 'auto',
            cursor: 'default',
            backgroundColor: 'transparent',
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        />
      )}

      {/* Overlay for hover, markers, drag selection */}
      {isActive && (
        <div className="agentator-overlay" style={{ pointerEvents: 'none' }}>
          {/* Hover highlight (only show if not same as selected element) */}
          {hoverInfo &&
            hoverInfo.rect &&
            !(
              mode === 'inspect' &&
              selectedInspectElement &&
              hoverInfo.rect.x === selectedInspectElement.boundingBox.x &&
              hoverInfo.rect.y === selectedInspectElement.boundingBox.y
            ) && (
              <div
                className={`agentator-hover ${mode === 'inspect' ? 'inspect-mode' : ''}`}
                style={{
                  left: hoverInfo.rect.x,
                  top: hoverInfo.rect.y,
                  width: hoverInfo.rect.width,
                  height: hoverInfo.rect.height,
                  borderColor: mode === 'inspect' ? '#FF9500' : annotationColor,
                }}
              />
            )}

          {/* Persistent selection highlight in inspect mode */}
          {mode === 'inspect' && selectedInspectElement && (
            <div
              className="agentator-hover inspect-mode"
              style={{
                left: selectedInspectElement.boundingBox.x,
                top: selectedInspectElement.boundingBox.y,
                width: selectedInspectElement.boundingBox.width,
                height: selectedInspectElement.boundingBox.height,
                borderColor: '#FF9500',
                borderWidth: '3px',
                borderStyle: 'solid',
                opacity: 1,
                animation: 'none', // No pulse for selected element
              }}
            />
          )}

          {/* Annotation outlines */}
          {annotations.map(annotation => (
            <div
              key={annotation.id}
              className={`agentator-outline ${annotation.isMultiSelect ? 'multi' : ''} ${annotation.selectedText ? 'text' : ''}`}
              style={{
                left: annotation.boundingBox?.x || 0,
                top: annotation.boundingBox?.y || 0,
                width: annotation.boundingBox?.width || 0,
                height: annotation.boundingBox?.height || 0,
                borderColor: annotationColor,
              }}
            />
          ))}

          {/* Drag selection rectangle */}
          {isDragging && dragStart && dragCurrent && (
            <div
              className="agentator-drag"
              style={{
                left: Math.min(dragStart.x, dragCurrent.x),
                top: Math.min(dragStart.y, dragCurrent.y),
                width: Math.abs(dragCurrent.x - dragStart.x),
                height: Math.abs(dragCurrent.y - dragStart.y),
              }}
            />
          )}

          {/* Drop indicator for drag reorder (Phase 3-4) */}
          {dragReorderState.dropTarget && dragReorderState.dropPosition && (
            <div
              style={{
                position: 'absolute',
                left: `${dragReorderState.dropTarget.getBoundingClientRect().left}px`,
                top:
                  dragReorderState.dropPosition === 'before'
                    ? `${dragReorderState.dropTarget.getBoundingClientRect().top}px`
                    : `${dragReorderState.dropTarget.getBoundingClientRect().bottom}px`,
                width: `${dragReorderState.dropTarget.getBoundingClientRect().width}px`,
                height: '3px',
                backgroundColor: '#3B82F6',
                borderRadius: '2px',
                zIndex: 9999,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Annotation markers */}
          {annotations.map((annotation, index) => {
            const left =
              (annotation.x / 100) * (canvasRef.current?.clientWidth || 0)
            const top = annotation.y

            return (
              <div
                key={annotation.id}
                className="agentator-marker"
                style={{
                  left,
                  top,
                  backgroundColor: annotationColor,
                  pointerEvents: 'auto',
                }}
                onClick={e => {
                  e.stopPropagation()
                  startEdit(annotation)
                }}
                onMouseEnter={() => setHoveredMarkerId(annotation.id)}
                onMouseLeave={() => setHoveredMarkerId(null)}
                data-annotation-ui
              >
                {index + 1}
                {hoveredMarkerId === annotation.id && (
                  <button
                    className="agentator-marker-delete"
                    onClick={e => {
                      e.stopPropagation()
                      deleteAnnotation(annotation.id)
                    }}
                    data-annotation-ui
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Annotation popup */}
      {pendingAnnotation && canvasRef.current && (
        <AnnotationPopup
          element={pendingAnnotation.element}
          selectedText={pendingAnnotation.selectedText}
          placeholder="Describe the issue or suggestion..."
          submitLabel="Add Annotation"
          onSubmit={addAnnotation}
          onCancel={cancelAnnotation}
          accentColor={annotationColor}
          position={{
            x: pendingAnnotation.x,
            y: pendingAnnotation.clientY,
            canvasWidth: canvasRef.current.clientWidth,
          }}
        />
      )}

      {/* Edit annotation popup */}
      {editingAnnotation && canvasRef.current && (
        <AnnotationPopup
          element={editingAnnotation.element}
          selectedText={editingAnnotation.selectedText}
          placeholder="Edit your feedback..."
          initialValue={editingAnnotation.comment}
          submitLabel="Update"
          onSubmit={updateAnnotation}
          onCancel={cancelEdit}
          accentColor={annotationColor}
          position={{
            x: editingAnnotation.x,
            y: editingAnnotation.y,
            canvasWidth: canvasRef.current.clientWidth,
          }}
        />
      )}
    </div>
  )
}
