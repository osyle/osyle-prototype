import { type ReactNode, useRef, useEffect, useState } from 'react'

interface PrototypeCanvasProps {
  children: ReactNode
  deviceWidth: number
  deviceHeight: number
}

export default function PrototypeCanvas({
  children,
  deviceWidth,
  deviceHeight,
}: PrototypeCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Auto-calculate zoom and center on mount and when device size changes
  useEffect(() => {
    if (!canvasRef.current) return

    const calculateFit = () => {
      const canvasRect = canvasRef.current!.getBoundingClientRect()

      // Target margins around device (in pixels at 100% zoom)
      const marginPercentage = 0.15 // 15% margins on each side
      const targetWidth = canvasRect.width * (1 - marginPercentage * 2)
      const targetHeight = canvasRect.height * (1 - marginPercentage * 2)

      // Calculate zoom to fit
      const zoomX = targetWidth / deviceWidth
      const zoomY = targetHeight / deviceHeight
      const fitZoom = Math.min(zoomX, zoomY)

      setZoom(fitZoom)

      // Center the device
      const scaledWidth = deviceWidth * fitZoom
      const scaledHeight = deviceHeight * fitZoom
      const centerX = (canvasRect.width - scaledWidth) / 2
      const centerY = (canvasRect.height - scaledHeight) / 2

      setPan({ x: centerX, y: centerY })
    }

    // Initial calculation
    calculateFit()

    // Recalculate on window resize
    const handleResize = () => calculateFit()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [deviceWidth, deviceHeight])

  return (
    <div
      ref={canvasRef}
      className="w-full h-full overflow-hidden relative"
      style={{
        backgroundColor: '#1F1F20',
        cursor: 'default',
      }}
    >
      {/* Content container with locked pan and zoom */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: 'transform 0.3s ease-out',
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  )
}
