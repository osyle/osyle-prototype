import React, { useState, useRef, useCallback } from 'react';
import { AnnotationPopup } from './AnnotationPopup';
import {
  identifyElement,
  getElementClasses,
  getNearbyText,
  getRelativeBoundingBox
} from '../utils/elementIdentification';
import { getSelectedTextInfo, clearTextSelection, hasTextSelection } from '../utils/textSelection';
import { Annotation, PendingAnnotation, HoverInfo, InspectedElement, AgentatorMode } from '../types';

interface AnnotationCanvasProps {
  screenId: string;
  screenName: string;
  children: React.ReactNode;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationDelete: (annotation: Annotation) => void;
  onAnnotationUpdate: (annotation: Annotation) => void;
  annotations: Annotation[];
  isActive: boolean;
  mode: AgentatorMode;
  annotationColor?: string;
  onInspect?: (element: InspectedElement | null) => void;
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
  onInspect
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);

  // Handle mouse move for hover
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isActive || isDragging || pendingAnnotation || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const target = e.target as HTMLElement;

    if (target === canvas || target.closest('[data-annotation-ui]')) {
      setHoverInfo(null);
      return;
    }

    if (!canvas.contains(target)) {
      setHoverInfo(null);
      return;
    }

    const identified = identifyElement(target);
    const rect = target.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    setHoverInfo({
      element: identified.name,
      elementPath: identified.path,
      rect: new DOMRect(
        rect.left - canvasRect.left,
        rect.top - canvasRect.top + canvas.scrollTop,
        rect.width,
        rect.height
      )
    });
  }, [isActive, isDragging, pendingAnnotation]);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isActive || isDragging || pendingAnnotation || !canvasRef.current) return;

    // Inspect mode - just select the element
    if (mode === 'inspect') {
      const canvas = canvasRef.current;
      const target = e.target as HTMLElement;

      if (target.closest('[data-annotation-ui]') || target === canvas) return;
      if (!canvas.contains(target)) return;

      e.stopPropagation();

      const identified = identifyElement(target);
      const boundingBox = getRelativeBoundingBox(target, canvas);
      
      // Get element attributes
      const attributes: Record<string, string> = {};
      if (target.id) attributes.id = target.id;
      if (target.getAttribute('name')) attributes.name = target.getAttribute('name')!;
      if (target.getAttribute('href')) attributes.href = target.getAttribute('href')!;
      if (target.getAttribute('type')) attributes.type = target.getAttribute('type')!;
      if (target.getAttribute('placeholder')) attributes.placeholder = target.getAttribute('placeholder')!;
      if (target.getAttribute('aria-label')) attributes['aria-label'] = target.getAttribute('aria-label')!;

      const inspected: InspectedElement = {
        element: identified.name,
        elementPath: identified.path,
        cssClasses: getElementClasses(target),
        boundingBox,
        nearbyText: getNearbyText(target),
        tagName: target.tagName,
        attributes,
        timestamp: Date.now()
      };

      setInspectedElement(inspected);
      onInspect?.(inspected);
      return;
    }

    // Annotate mode - existing logic
    if (hasTextSelection()) {
      handleTextSelection();
      return;
    }

    const canvas = canvasRef.current;
    const target = e.target as HTMLElement;

    if (target.closest('[data-annotation-ui]') || target === canvas) return;
    if (!canvas.contains(target)) return;

    e.stopPropagation();

    const identified = identifyElement(target);
    const canvasRect = canvas.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const boundingBox = getRelativeBoundingBox(target, canvas);

    // Calculate click position relative to canvas
    const clickX = e.clientX - canvasRect.left;
    const clickY = e.clientY - canvasRect.top;

    const pending: PendingAnnotation = {
      id: `temp-${Date.now()}`,
      screenId,
      screenName,
      x: (clickX / canvasRect.width) * 100,
      y: clickY + canvas.scrollTop,
      clientY: clickY,
      comment: '',
      element: identified.name,
      elementPath: identified.path,
      timestamp: Date.now(),
      boundingBox,
      cssClasses: getElementClasses(target),
      nearbyText: getNearbyText(target)
    };

    setPendingAnnotation(pending);
    setHoverInfo(null);
  }, [isActive, isDragging, pendingAnnotation, screenId, screenName, mode, onInspect]);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    if (!isActive || !canvasRef.current || isDragging) return;

    const selectionInfo = getSelectedTextInfo();
    if (!selectionInfo || !selectionInfo.container) return;

    const canvas = canvasRef.current;
    const container = selectionInfo.container;

    if (!canvas.contains(container)) return;

    const identified = identifyElement(container);
    const canvasRect = canvas.getBoundingClientRect();
    const selectionRect = selectionInfo.range?.getBoundingClientRect();

    if (!selectionRect) return;

    const clickX = selectionRect.left - canvasRect.left + selectionRect.width / 2;
    const clickY = selectionRect.top - canvasRect.top;

    const pending: PendingAnnotation = {
      id: `temp-${Date.now()}`,
      screenId,
      screenName,
      x: (clickX / canvasRect.width) * 100,
      y: clickY + canvas.scrollTop,
      clientY: clickY,
      comment: '',
      element: identified.name,
      elementPath: identified.path,
      timestamp: Date.now(),
      selectedText: selectionInfo.text,
      boundingBox: {
        x: selectionRect.left - canvasRect.left,
        y: clickY + canvas.scrollTop,
        width: selectionRect.width,
        height: selectionRect.height
      },
      cssClasses: getElementClasses(container),
      nearbyText: getNearbyText(container)
    };

    setPendingAnnotation(pending);
    clearTextSelection();
  }, [isActive, screenId, screenName, isDragging]);

  // Mouse down for drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive || !canvasRef.current) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-annotation-ui]')) return;

    if (e.shiftKey) {
      e.preventDefault();
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      
      setIsDragging(true);
      setDragStart({
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top + canvas.scrollTop
      });
      setDragCurrent({
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top + canvas.scrollTop
      });
    }
  }, [isActive]);

  // Mouse move during drag
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current || !dragStart) return;

    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    
    setDragCurrent({
      x: e.clientX - canvasRect.left,
      y: e.clientY - canvasRect.top + canvas.scrollTop
    });
  }, [isDragging, dragStart]);

  // Mouse up to finish drag
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current || !dragStart || !dragCurrent) return;

    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();

    setIsDragging(false);

    const x1 = Math.min(dragStart.x, dragCurrent.x);
    const y1 = Math.min(dragStart.y, dragCurrent.y);
    const x2 = Math.max(dragStart.x, dragCurrent.x);
    const y2 = Math.max(dragStart.y, dragCurrent.y);
    const width = x2 - x1;
    const height = y2 - y1;

    const centerX = x1 + width / 2;
    const centerY = y1 + height / 2;

    const pending: PendingAnnotation = {
      id: `temp-${Date.now()}`,
      screenId,
      screenName,
      x: (centerX / canvasRect.width) * 100,
      y: centerY,
      clientY: centerY - canvas.scrollTop,
      comment: '',
      element: 'Multi-select area',
      elementPath: 'Multiple elements',
      timestamp: Date.now(),
      boundingBox: { x: x1, y: y1, width, height },
      isMultiSelect: true
    };

    setPendingAnnotation(pending);
    setDragStart(null);
    setDragCurrent(null);
  }, [isDragging, dragStart, dragCurrent, screenId, screenName]);

  const addAnnotation = useCallback((comment: string) => {
    if (!pendingAnnotation) return;

    const annotation: Annotation = {
      ...pendingAnnotation,
      id: `annotation-${Date.now()}`,
      comment
    };

    onAnnotationAdd(annotation);
    setPendingAnnotation(null);
  }, [pendingAnnotation, onAnnotationAdd]);

  const cancelAnnotation = useCallback(() => {
    setPendingAnnotation(null);
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    const annotation = annotations.find(a => a.id === id);
    if (annotation) {
      onAnnotationDelete(annotation);
    }
  }, [annotations, onAnnotationDelete]);

  const startEdit = useCallback((annotation: Annotation) => {
    setEditingAnnotation(annotation);
  }, []);

  const updateAnnotation = useCallback((comment: string) => {
    if (!editingAnnotation) return;

    const updated = { ...editingAnnotation, comment };
    onAnnotationUpdate(updated);
    setEditingAnnotation(null);
  }, [editingAnnotation, onAnnotationUpdate]);

  const cancelEdit = useCallback(() => {
    setEditingAnnotation(null);
  }, []);

  return (
    <div
      ref={canvasRef}
      className="agentator-canvas"
      onMouseMove={(e) => {
        handleMouseMove(e);
        if (isDragging) handleDragMove(e);
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      data-agentator-canvas={screenId}
    >
      {children}

      {isActive && (
        <div className="agentator-overlay" data-annotation-ui>
          {/* Hover highlight */}
          {hoverInfo?.rect && !pendingAnnotation && !isDragging && (
            <div
              className={`agentator-hover ${mode === 'inspect' ? 'inspect-mode' : ''}`}
              style={{
                left: hoverInfo.rect.left,
                top: hoverInfo.rect.top - (canvasRef.current?.scrollTop || 0),
                width: hoverInfo.rect.width,
                height: hoverInfo.rect.height,
                borderColor: mode === 'inspect' ? '#FF9500' : annotationColor,
                backgroundColor: mode === 'inspect' ? 'rgba(255, 149, 0, 0.1)' : `${annotationColor}1A`
              }}
            />
          )}

          {/* Drag selection */}
          {isDragging && dragStart && dragCurrent && (
            <div
              className="agentator-drag"
              style={{
                left: Math.min(dragStart.x, dragCurrent.x),
                top: Math.min(dragStart.y, dragCurrent.y) - (canvasRef.current?.scrollTop || 0),
                width: Math.abs(dragCurrent.x - dragStart.x),
                height: Math.abs(dragCurrent.y - dragStart.y)
              }}
            />
          )}

          {/* Annotation markers - only in annotate mode */}
          {mode === 'annotate' && annotations.map((annotation, index) => {
            const markerY = annotation.y - (canvasRef.current?.scrollTop || 0);
            return (
              <div
                key={annotation.id}
                className={`agentator-marker ${annotation.isMultiSelect ? 'multi' : ''} ${annotation.selectedText ? 'text' : ''} ${hoveredMarkerId === annotation.id ? 'hovered' : ''}`}
                style={{
                  left: `${annotation.x}%`,
                  top: markerY,
                  backgroundColor: annotation.isMultiSelect ? '#34C759' : annotation.selectedText ? '#FF9500' : annotationColor
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(annotation);
                }}
                onMouseEnter={() => setHoveredMarkerId(annotation.id)}
                onMouseLeave={() => setHoveredMarkerId(null)}
                data-annotation-ui
              >
                {index + 1}
                <button
                  className="agentator-marker-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAnnotation(annotation.id);
                  }}
                  data-annotation-ui
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* Pending marker */}
          {pendingAnnotation && mode === 'annotate' && (
            <div
              className={`agentator-marker pending ${pendingAnnotation.isMultiSelect ? 'multi' : ''} ${pendingAnnotation.selectedText ? 'text' : ''}`}
              style={{
                left: `${pendingAnnotation.x}%`,
                top: pendingAnnotation.clientY,
                backgroundColor: pendingAnnotation.isMultiSelect ? '#34C759' : pendingAnnotation.selectedText ? '#FF9500' : annotationColor
              }}
              data-annotation-ui
            >
              +
            </div>
          )}

          {/* Outlines */}
          {pendingAnnotation?.boundingBox && (
            <div
              className={`agentator-outline ${pendingAnnotation.isMultiSelect ? 'multi' : ''} ${pendingAnnotation.selectedText ? 'text' : ''}`}
              style={{
                left: pendingAnnotation.boundingBox.x,
                top: pendingAnnotation.boundingBox.y - (canvasRef.current?.scrollTop || 0),
                width: pendingAnnotation.boundingBox.width,
                height: pendingAnnotation.boundingBox.height,
                borderColor: pendingAnnotation.isMultiSelect ? '#34C759' : pendingAnnotation.selectedText ? '#FF9500' : annotationColor
              }}
              data-annotation-ui
            />
          )}

          {hoveredMarkerId && (() => {
            const annotation = annotations.find(a => a.id === hoveredMarkerId);
            if (!annotation?.boundingBox) return null;
            return (
              <div
                className={`agentator-outline ${annotation.isMultiSelect ? 'multi' : ''}`}
                style={{
                  left: annotation.boundingBox.x,
                  top: annotation.boundingBox.y - (canvasRef.current?.scrollTop || 0),
                  width: annotation.boundingBox.width,
                  height: annotation.boundingBox.height,
                  borderColor: annotation.isMultiSelect ? '#34C759' : annotationColor
                }}
                data-annotation-ui
              />
            );
          })()}
          {/* Inspected element outline */}
          {mode === 'inspect' && inspectedElement?.boundingBox && (
            <div
              className="agentator-outline inspect-mode"
              style={{
                left: inspectedElement.boundingBox.x,
                top: inspectedElement.boundingBox.y - (canvasRef.current?.scrollTop || 0),
                width: inspectedElement.boundingBox.width,
                height: inspectedElement.boundingBox.height,
                borderColor: '#FF9500',
                borderWidth: '3px',
                backgroundColor: 'rgba(255, 149, 0, 0.1)'
              }}
              data-annotation-ui
            />
          )}
        </div>
      )}

      {/* Annotation popup - FIXED POSITIONING - only in annotate mode */}
      {pendingAnnotation && canvasRef.current && mode === 'annotate' && (
        <AnnotationPopup
          element={pendingAnnotation.element}
          selectedText={pendingAnnotation.selectedText}
          placeholder={
            pendingAnnotation.selectedText
              ? "Fix this typo or content..."
              : pendingAnnotation.isMultiSelect
              ? "Feedback for this group..."
              : "What should change?"
          }
          onSubmit={addAnnotation}
          onCancel={cancelAnnotation}
          accentColor={
            pendingAnnotation.isMultiSelect 
              ? '#34C759' 
              : pendingAnnotation.selectedText 
              ? '#FF9500'
              : annotationColor
          }
          position={{
            x: pendingAnnotation.x,
            y: pendingAnnotation.clientY,
            canvasWidth: canvasRef.current.clientWidth
          }}
        />
      )}

      {/* Edit popup - FIXED POSITIONING */}
      {editingAnnotation && canvasRef.current && (
        <AnnotationPopup
          element={editingAnnotation.element}
          selectedText={editingAnnotation.selectedText}
          placeholder="Edit feedback..."
          initialValue={editingAnnotation.comment}
          submitLabel="Save"
          onSubmit={updateAnnotation}
          onCancel={cancelEdit}
          accentColor={editingAnnotation.isMultiSelect ? '#34C759' : annotationColor}
          position={{
            x: editingAnnotation.x,
            y: (editingAnnotation.y - (canvasRef.current?.scrollTop || 0)),
            canvasWidth: canvasRef.current.clientWidth
          }}
        />
      )}
    </div>
  );
};
