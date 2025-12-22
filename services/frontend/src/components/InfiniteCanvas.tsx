import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react'
import React, {
  type ReactNode,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react'

interface InfiniteCanvasProps {
  children: ReactNode
  width: number // True width of the design
  height: number // True height of the design
  isLoading?: boolean
  loadingStage?: string
}

export default function InfiniteCanvas({
  children,
  width,
  height,
  isLoading = false,
  loadingStage,
}: InfiniteCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Pan and zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Center the canvas on mount and when dimensions change
  useEffect(() => {
    // Small delay to ensure canvas is properly sized
    const timer = setTimeout(() => {
      centerContent()
    }, 100)

    return () => clearTimeout(timer)
  }, [width, height])

  // Re-center when zoom changes significantly
  useEffect(() => {
    if (zoom === 1) {
      // Only auto-center when zoom is reset to 1
      const timer = setTimeout(centerContent, 50)
      return () => clearTimeout(timer)
    }
  }, [zoom])

  const centerContent = () => {
    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect()

      // Calculate the scaled dimensions
      const scaledWidth = width * zoom
      const scaledHeight = height * zoom

      // Calculate pan to center the content
      const initialX = (canvasRect.width - scaledWidth) / 2
      const initialY = (canvasRect.height - scaledHeight) / 2

      setPan({ x: initialX, y: initialY })
    }
  }

  // Handle mouse wheel for zooming
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()

      const delta = e.deltaY
      const zoomFactor = 1.1
      const newZoom = delta > 0 ? zoom / zoomFactor : zoom * zoomFactor

      // Clamp zoom between 0.1x and 10x
      const clampedZoom = Math.max(0.1, Math.min(10, newZoom))

      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // Zoom towards mouse position
        const dx = mouseX - pan.x
        const dy = mouseY - pan.y

        const newPanX = mouseX - dx * (clampedZoom / zoom)
        const newPanY = mouseY - dy * (clampedZoom / zoom)

        setPan({ x: newPanX, y: newPanY })
      }

      setZoom(clampedZoom)
    },
    [zoom, pan.x, pan.y],
  )

  useEffect(() => {
    const element = canvasRef.current
    if (!element) return

    // Use native addEventListener with passive: false to allow preventDefault
    element.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Handle mouse down for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  // Handle mouse move for panning
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }

  // Handle mouse up
  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Zoom controls
  const zoomIn = () => {
    const newZoom = Math.min(10, zoom * 1.2)
    setZoom(newZoom)
  }

  const zoomOut = () => {
    const newZoom = Math.max(0.1, zoom / 1.2)
    setZoom(newZoom)
  }

  const zoomToFit = () => {
    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const padding = 80 // Padding around the content

      const scaleX = (canvasRect.width - padding * 2) / width
      const scaleY = (canvasRect.height - padding * 2) / height
      const fitZoom = Math.min(scaleX, scaleY, 1) // Don't zoom in beyond 100%

      setZoom(fitZoom)

      // Center the content after zoom
      setTimeout(centerContent, 0)
    }
  }

  const resetView = () => {
    setZoom(1)
    // centerContent will be called by the useEffect when zoom becomes 1
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Canvas with subtle dot grid background */}
      <div
        ref={canvasRef}
        className="w-full h-full overflow-hidden"
        style={{
          backgroundColor: '#F8F9FA',
          backgroundImage: `radial-gradient(circle, rgba(0, 0, 0, 0.08) 0.5px, transparent 0.5px)`,
          backgroundSize: '16px 16px',
          backgroundPosition: `${pan.x % 16}px ${pan.y % 16}px`,
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Content container with pan and zoom transforms */}
        <div
          ref={contentRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {/* Card container - like Figma's frame */}
          <div
            style={{
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor: 'white',
              boxShadow:
                '0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.06)',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {isLoading ? (
              /* Loading placeholder with animated dashed border */
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
                }}
              >
                {/* Animated dashed border */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '16px',
                    border: '2px dashed #D1D5DB',
                    borderRadius: '8px',
                    animation: 'dashOffset 20s linear infinite',
                  }}
                />

                {/* Pulsing background */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '16px',
                    borderRadius: '8px',
                    background: 'white',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />

                {/* Loading content */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 10,
                    textAlign: 'center',
                    padding: '32px',
                  }}
                >
                  {/* Spinner */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      margin: '0 auto 20px',
                      border: '3px solid #E5E7EB',
                      borderTop: '3px solid #6366F1',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />

                  {loadingStage && (
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 500,
                        color: '#1F2937',
                        marginBottom: '8px',
                      }}
                    >
                      {loadingStage}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '13px',
                      color: '#6B7280',
                    }}
                  >
                    Preparing your design...
                  </div>
                </div>

                {/* Add keyframe animations */}
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                  @keyframes pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.8; }
                  }
                  @keyframes dashOffset {
                    to { stroke-dashoffset: -100; }
                  }
                `}</style>
              </div>
            ) : (
              children
            )}
          </div>

          {/* Design dimensions label */}
          {!isLoading && (
            <div
              style={{
                position: 'absolute',
                top: `${height + 12}px`,
                left: 0,
                fontSize: '11px',
                color: '#6B7280',
                fontFamily: 'system-ui, sans-serif',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {width} × {height}
            </div>
          )}
        </div>
      </div>

      {/* Zoom Controls */}
      <div
        className="absolute bottom-6 right-6 flex flex-col gap-2"
        style={{ zIndex: 1000 }}
      >
        {/* Zoom percentage display */}
        <div
          className="px-3 py-2 rounded-lg text-xs font-medium text-center"
          style={{
            backgroundColor: 'white',
            color: '#3B3B3B',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            minWidth: '64px',
          }}
        >
          {Math.round(zoom * 100)}%
        </div>

        {/* Zoom buttons */}
        <div
          className="flex flex-col gap-1 rounded-lg p-1"
          style={{
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          }}
        >
          <button
            onClick={zoomIn}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            title="Zoom in"
            style={{ color: '#3B3B3B' }}
          >
            <ZoomIn size={18} />
          </button>

          <div
            style={{
              height: '1px',
              backgroundColor: '#E5E7EB',
              margin: '0 4px',
            }}
          />

          <button
            onClick={zoomOut}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            title="Zoom out"
            style={{ color: '#3B3B3B' }}
          >
            <ZoomOut size={18} />
          </button>

          <div
            style={{
              height: '1px',
              backgroundColor: '#E5E7EB',
              margin: '0 4px',
            }}
          />

          <button
            onClick={zoomToFit}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            title="Zoom to fit"
            style={{ color: '#3B3B3B' }}
          >
            <Maximize2 size={18} />
          </button>

          <div
            style={{
              height: '1px',
              backgroundColor: '#E5E7EB',
              margin: '0 4px',
            }}
          />

          <button
            onClick={resetView}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            title="Reset view (100%)"
            style={{ color: '#3B3B3B' }}
          >
            <Move size={18} />
          </button>
        </div>
      </div>

      {/* Pan indicator - shows when panning */}
      {isPanning && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <Move size={16} className="inline mr-2" />
          Panning
        </div>
      )}

      {/* Controls hint - bottom left */}
      <div
        className="absolute bottom-6 left-6 px-3 py-2 rounded-lg text-xs"
        style={{
          backgroundColor: 'white',
          color: '#6B7280',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          userSelect: 'none',
          zIndex: 1000,
        }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <kbd
              className="px-2 py-0.5 rounded text-xs font-mono"
              style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}
            >
              Drag
            </kbd>
            <span>Pan canvas</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd
              className="px-2 py-0.5 rounded text-xs font-mono"
              style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}
            >
              Scroll
            </kbd>
            <span>Zoom in/out</span>
          </div>
        </div>
      </div>
    </div>
  )
}
