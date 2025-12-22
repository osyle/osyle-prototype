import { type ReactNode } from 'react'
import { useDeviceContext } from '../hooks/useDeviceContext'

interface DeviceFrameProps {
  children: ReactNode
  scaledDimensions?: { width: number; height: number; scale: number }
}

export default function DeviceFrame({
  children,
  scaledDimensions,
}: DeviceFrameProps) {
  const { device_info } = useDeviceContext()
  const { platform, screen } = device_info

  // Use scaled dimensions if provided, otherwise use original
  const displayWidth = scaledDimensions?.width ?? screen.width
  const displayHeight = scaledDimensions?.height ?? screen.height

  // Frame-specific styles
  const getFrameStyles = () => {
    if (platform === 'web') {
      return {
        frameClass: 'rounded-xl overflow-hidden bg-white relative',
        topBarClass:
          'h-10 bg-gradient-to-b from-gray-50 to-gray-100 flex items-center px-4 border-b border-gray-200',
        contentClass: 'overflow-auto',
        outerShadow:
          '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 0.5px rgba(255, 255, 255, 0.1)',
      }
    } else {
      // Phone frame
      return {
        frameClass: 'rounded-[42px] overflow-hidden relative',
        topBarClass: 'h-0',
        contentClass: 'overflow-auto',
        outerShadow:
          '0 25px 70px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      }
    }
  }

  const { frameClass, topBarClass, contentClass, outerShadow } =
    getFrameStyles()

  return (
    <div
      className="flex items-center justify-center w-full h-full"
      style={{ backgroundColor: 'transparent' }}
    >
      {/* Outer device shell for phone */}
      {platform === 'phone' ? (
        <div
          className="rounded-[48px] p-3 relative"
          style={{
            background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
            boxShadow: outerShadow,
            width: `${displayWidth + 24}px`,
            height: `${displayHeight + 48}px`,
          }}
        >
          {/* Power button */}
          <div
            className="absolute right-0 top-24 w-1 h-16 rounded-l-sm"
            style={{ backgroundColor: '#0a0a0a' }}
          />

          {/* Volume buttons */}
          <div
            className="absolute left-0 top-20 w-1 h-8 rounded-r-sm"
            style={{ backgroundColor: '#0a0a0a' }}
          />
          <div
            className="absolute left-0 top-32 w-1 h-12 rounded-r-sm"
            style={{ backgroundColor: '#0a0a0a' }}
          />

          {/* Screen */}
          <div
            className={frameClass}
            style={{
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              background: '#000',
            }}
          >
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-black rounded-b-3xl z-50 flex items-center justify-center gap-3">
              <div className="w-14 h-1 bg-gray-900 rounded-full" />
            </div>

            {/* Content Area */}
            <div
              className={contentClass}
              style={{
                height: `${displayHeight}px`,
                width: '100%',
                backgroundColor: 'white',
              }}
            >
              {children}
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full z-50" />
          </div>
        </div>
      ) : (
        /* Web device frame */
        <div
          className={frameClass}
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            boxShadow: outerShadow,
          }}
        >
          {/* Browser Top Bar */}
          <div className={topBarClass}>
            <div className="flex items-center gap-2 w-full">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />

              {/* URL bar */}
              <div className="ml-6 flex-1 max-w-xl">
                <div className="bg-white rounded-md h-6 px-4 text-xs flex items-center text-gray-500 border border-gray-200">
                  osyle.generative.design
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div
            className={contentClass}
            style={{
              height: `${displayHeight - 40}px`,
              width: '100%',
              backgroundColor: 'white',
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
