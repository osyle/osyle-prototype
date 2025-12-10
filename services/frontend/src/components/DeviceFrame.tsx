import { type ReactNode } from 'react'
import { useDeviceContext } from '../hooks/useDeviceContext'

interface DeviceFrameProps {
  children: ReactNode
}

export default function DeviceFrame({ children }: DeviceFrameProps) {
  const { device_info } = useDeviceContext()
  const { platform, screen } = device_info

  // Frame-specific styles
  const getFrameStyles = () => {
    if (platform === 'web') {
      return {
        frameClass:
          'rounded-lg overflow-hidden bg-white shadow-2xl border border-gray-300',
        topBarClass:
          'h-8 bg-gray-200 flex items-center px-3 border-b border-gray-300',
        contentClass: 'overflow-auto scrollbar-hide',
      }
    } else {
      // Phone frame
      return {
        frameClass:
          'rounded-[32px] overflow-hidden bg-black shadow-2xl border-8 border-black relative',
        topBarClass: 'h-6 bg-black relative',
        contentClass: 'overflow-auto scrollbar-hide',
      }
    }
  }

  const { frameClass, topBarClass, contentClass } = getFrameStyles()

  return (
    <div
      className="flex items-center justify-center w-full h-full"
      style={{ backgroundColor: '#EDEBE9' }}
    >
      {/* Add global styles for hiding scrollbars */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Chrome, Safari, Opera */
        }
      `}</style>

      <div
        className={frameClass}
        style={{
          width: `${screen.width}px`,
          height:
            platform === 'web'
              ? `${screen.height}px`
              : `${screen.height + 32}px`, // Add space for top bar
        }}
      >
        {/* Browser/Phone Top Bar */}
        <div className={topBarClass}>
          {platform === 'web' ? (
            // Browser controls
            <div className="flex items-center gap-1.5 w-full">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>

              {/* URL bar */}
              <div className="ml-4 flex-1 max-w-lg">
                <div className="bg-gray-100 rounded-md h-5 px-3 text-xs flex items-center text-gray-600 truncate">
                  osyle.generative.design
                </div>
              </div>
            </div>
          ) : (
            // Phone notch
            <>
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1/4 h-6 bg-black rounded-b-xl"></div>
              <div className="absolute left-[25%] top-1 w-2 h-2 rounded-full bg-gray-700"></div>
              <div className="absolute right-[25%] top-1 w-2 h-2 rounded-full bg-gray-700"></div>
            </>
          )}
        </div>

        {/* Content Area - Scrollable */}
        <div
          className={contentClass}
          style={{
            height:
              platform === 'web'
                ? `${screen.height - 32}px`
                : `${screen.height}px`,
            width: '100%',
            backgroundColor: 'white',
            position: 'relative',
          }}
        >
          {children}
        </div>

        {/* Phone Home Indicator (only for phone) */}
        {platform === 'phone' && (
          <div className="h-1 absolute bottom-3 left-1/2 -translate-x-1/2 w-1/3 bg-gray-500 rounded-full"></div>
        )}
      </div>
    </div>
  )
}
