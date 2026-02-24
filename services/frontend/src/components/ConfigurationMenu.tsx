import {
  Settings,
  Monitor,
  Smartphone,
  Tablet,
  Code,
  Sliders,
  ChevronDown,
  ChevronUp,
  XCircle,
  Grid3X3,
  Maximize2,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import { SCREEN_PRESETS } from '../contexts/DeviceContextProvider'
import { useDeviceContext } from '../hooks/useDeviceContext'

export default function ConfigurationMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>('device')
  const menuRef = useRef<HTMLDivElement>(null)
  const {
    device_info,
    setDeviceInfo,
    rendering_mode,
    //setRenderingMode,
    responsive_mode,
    setResponsiveMode,
  } = useDeviceContext()

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section)
  }

  const handlePresetChange = (preset: { width: number; height: number }) => {
    setDeviceInfo({ screen: preset })
  }

  // Derive display info from screen width — no hardcoded platform type
  const w = device_info.screen.width
  const isMobile = w <= 480
  const isTablet = w > 480 && w <= 900
  const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Monitor
  const deviceLabel = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'

  // Style helper for toggle options
  const getOptionStyle = (isActive: boolean) =>
    `relative flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 cursor-pointer ${
      isActive
        ? 'bg-blue-500/90 text-white shadow-lg before:absolute before:inset-0 before:rounded-full before:bg-blue-400/20'
        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
    }`

  return (
    <div className="relative" ref={menuRef}>
      {/* Config Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
        style={{
          backgroundColor: '#1F1F20',
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
      >
        <Settings
          size={16}
          className="transition-transform duration-300"
          style={{
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
        <span className="text-sm font-medium">Config</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl shadow-2xl z-50"
          style={{
            width: '500px',
            backgroundColor: 'rgba(18, 18, 20, 0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow:
              '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-blue-400" />
              <span className="text-sm font-semibold text-white">
                Configuration
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <XCircle size={18} />
            </button>
          </div>

          {/* Two-column layout */}
          <div className="flex p-4 gap-4">
            {/* Left Column - Current Configuration Summary */}
            <div
              className="w-[35%] space-y-3"
              style={{
                borderRight: '1px solid rgba(255,255,255,0.1)',
                paddingRight: '16px',
              }}
            >
              <div className="text-xs font-medium text-white mb-3">
                Current Configuration
              </div>

              {/* Device Preview Card */}
              <div
                className="rounded-lg p-3 space-y-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-2">
                  <DeviceIcon className="h-4 w-4 text-blue-400" />
                  <div className="text-xs">
                    <div className="text-white font-medium">{deviceLabel}</div>
                    <div className="text-gray-400">
                      {device_info.screen.width}×{device_info.screen.height} px
                    </div>
                  </div>
                </div>

                {/* Visual Device Preview */}
                <div className="flex justify-center pt-2">
                  {isMobile ? (
                    // Mobile Device Preview
                    <div
                      className="relative"
                      style={{ width: '35px', height: '60px' }}
                    >
                      <div
                        className="w-full h-full rounded-lg border-2"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderColor: 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {/* Content */}
                        <div className="p-1 pt-2 space-y-0.5">
                          <div
                            className="h-1 w-full rounded"
                            style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                          ></div>
                          <div
                            className="h-1 w-2/3 rounded"
                            style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                          ></div>
                        </div>
                        {/* Home indicator */}
                        <div
                          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                          style={{
                            width: '8px',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                          }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    // Desktop/Tablet Device Preview
                    <div
                      className="relative"
                      style={{ width: '80px', height: '50px' }}
                    >
                      <div
                        className="w-full h-full rounded-md border"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderColor: 'rgba(255,255,255,0.2)',
                        }}
                      >
                        {/* Browser chrome */}
                        <div
                          className="h-2 flex items-center px-1 gap-0.5 border-b"
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            borderColor: 'rgba(0,0,0,0.1)',
                          }}
                        >
                          <div className="w-1 h-1 rounded-full bg-red-400"></div>
                          <div className="w-1 h-1 rounded-full bg-yellow-400"></div>
                          <div className="w-1 h-1 rounded-full bg-green-400"></div>
                        </div>
                        {/* Content area */}
                        <div className="p-1 space-y-0.5">
                          <div
                            className="h-1 w-full rounded"
                            style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                          ></div>
                          <div
                            className="h-1 w-3/4 rounded"
                            style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rendering Mode Card */}
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-2">
                  {rendering_mode === 'react' ? (
                    <Code className="h-4 w-4 text-indigo-400" />
                  ) : (
                    <Sliders className="h-4 w-4 text-purple-400" />
                  )}
                  <div className="text-xs">
                    <div className="text-white font-medium">
                      {rendering_mode === 'react'
                        ? 'React Mode'
                        : 'Parametric Mode'}
                    </div>
                    <div className="text-gray-400">
                      {rendering_mode === 'react'
                        ? 'Standard generation'
                        : 'Real-time adjustable'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Controls */}
            <div className="w-[65%] space-y-2">
              {/* Screen Size Section */}
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <button
                  onClick={() => toggleSection('device')}
                  className="w-full flex justify-between items-center p-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white">
                    <DeviceIcon size={16} />
                    <span className="text-sm font-medium">Screen Size</span>
                  </div>
                  {activeSection === 'device' ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>

                {activeSection === 'device' && (
                  <div
                    className="p-3 pt-0 space-y-4 border-t"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <div className="mt-3">
                      <div className="text-xs text-gray-400 mb-2">
                        Screen Size
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            handlePresetChange(SCREEN_PRESETS.mobile)
                          }
                          className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                          style={{
                            backgroundColor:
                              device_info.screen.width ===
                              SCREEN_PRESETS.mobile.width
                                ? 'rgba(59,130,246,0.2)'
                                : 'rgba(255,255,255,0.05)',
                            border:
                              device_info.screen.width ===
                              SCREEN_PRESETS.mobile.width
                                ? '1px solid rgba(59,130,246,0.5)'
                                : '1px solid transparent',
                            color: 'white',
                          }}
                        >
                          <Smartphone size={16} />
                          <span className="font-medium">Mobile</span>
                          <span className="text-gray-400">390×844</span>
                        </button>
                        <button
                          onClick={() =>
                            handlePresetChange(SCREEN_PRESETS.mobileLarge)
                          }
                          className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                          style={{
                            backgroundColor:
                              device_info.screen.width ===
                              SCREEN_PRESETS.mobileLarge.width
                                ? 'rgba(59,130,246,0.2)'
                                : 'rgba(255,255,255,0.05)',
                            border:
                              device_info.screen.width ===
                              SCREEN_PRESETS.mobileLarge.width
                                ? '1px solid rgba(59,130,246,0.5)'
                                : '1px solid transparent',
                            color: 'white',
                          }}
                        >
                          <Smartphone size={16} />
                          <span className="font-medium">Mobile L</span>
                          <span className="text-gray-400">430×932</span>
                        </button>
                        <button
                          onClick={() =>
                            handlePresetChange(SCREEN_PRESETS.tablet)
                          }
                          className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                          style={{
                            backgroundColor:
                              device_info.screen.width ===
                              SCREEN_PRESETS.tablet.width
                                ? 'rgba(59,130,246,0.2)'
                                : 'rgba(255,255,255,0.05)',
                            border:
                              device_info.screen.width ===
                              SCREEN_PRESETS.tablet.width
                                ? '1px solid rgba(59,130,246,0.5)'
                                : '1px solid transparent',
                            color: 'white',
                          }}
                        >
                          <Tablet size={16} />
                          <span className="font-medium">Tablet</span>
                          <span className="text-gray-400">768×1024</span>
                        </button>
                        <button
                          onClick={() =>
                            handlePresetChange(SCREEN_PRESETS.laptop)
                          }
                          className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                          style={{
                            backgroundColor:
                              device_info.screen.width ===
                              SCREEN_PRESETS.laptop.width
                                ? 'rgba(59,130,246,0.2)'
                                : 'rgba(255,255,255,0.05)',
                            border:
                              device_info.screen.width ===
                              SCREEN_PRESETS.laptop.width
                                ? '1px solid rgba(59,130,246,0.5)'
                                : '1px solid transparent',
                            color: 'white',
                          }}
                        >
                          <Monitor size={16} />
                          <span className="font-medium">Laptop</span>
                          <span className="text-gray-400">1280×800</span>
                        </button>
                        <button
                          onClick={() =>
                            handlePresetChange(SCREEN_PRESETS.desktop)
                          }
                          className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                          style={{
                            backgroundColor:
                              device_info.screen.width ===
                              SCREEN_PRESETS.desktop.width
                                ? 'rgba(59,130,246,0.2)'
                                : 'rgba(255,255,255,0.05)',
                            border:
                              device_info.screen.width ===
                              SCREEN_PRESETS.desktop.width
                                ? '1px solid rgba(59,130,246,0.5)'
                                : '1px solid transparent',
                            color: 'white',
                          }}
                        >
                          <Monitor size={16} />
                          <span className="font-medium">Desktop</span>
                          <span className="text-gray-400">1440×900</span>
                        </button>
                        <button
                          className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                          }}
                          onClick={() => {
                            const width = prompt(
                              'Width (px):',
                              device_info.screen.width.toString(),
                            )
                            const height = prompt(
                              'Height (px):',
                              device_info.screen.height.toString(),
                            )
                            if (width && height) {
                              handlePresetChange({
                                width: parseInt(width),
                                height: parseInt(height),
                              })
                            }
                          }}
                        >
                          <Grid3X3 size={16} />
                          <span className="font-medium">Custom Size</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rendering Mode Section */}
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <button
                  onClick={() => toggleSection('rendering')}
                  className="w-full flex justify-between items-center p-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white">
                    <Code size={16} />
                    <span className="text-sm font-medium">UI Generation</span>
                  </div>
                  {activeSection === 'rendering' ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>

                {activeSection === 'rendering' && (
                  <div
                    className="p-3 pt-0 space-y-4 border-t"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    {/* Temporarily Disable Rendering Mode */}
                    {/*
                    <div className="mt-3">
                      <div className="text-xs text-gray-400 mb-2">
                        Generation Mode
                      </div>
                      <div
                        className="rounded-full p-1 flex gap-1"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      >
                        <div
                          className={getOptionStyle(rendering_mode === 'react')}
                          onClick={() => setRenderingMode('react')}
                        >
                          <Code size={14} />
                          <span className="text-sm">React</span>
                        </div>
                        <div
                          className={getOptionStyle(
                            rendering_mode === 'parametric',
                          )}
                          onClick={() => setRenderingMode('parametric')}
                        >
                          <Sliders size={14} />
                          <span className="text-sm">Parametric</span>
                        </div>
                      </div>

                      /* Mode Description *
                      <div
                        className="mt-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      >
                        <div className="text-xs text-gray-300">
                          {rendering_mode === 'react' ? (
                            <>
                              <div className="font-medium mb-1">
                                Standard Component Generation
                              </div>
                              <div className="text-gray-400">
                                Generate production-ready React components with
                                your learned taste. Supports multi-screen flows
                                and all generation modes.
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium mb-1">
                                Real-time Adjustable Design
                              </div>
                              <div className="text-gray-400">
                                Generate UI with parametric controls for
                                real-time style adjustments. Single screen only,
                                with dynamic sliders for customization.
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    */}

                    {/* Responsive Mode Toggle */}
                    <div>
                      <div className="text-xs text-gray-400 mb-2">
                        Responsive Design
                      </div>
                      <div
                        className="rounded-full p-1 flex gap-1"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      >
                        <div
                          className={getOptionStyle(responsive_mode)}
                          onClick={() => setResponsiveMode(true)}
                        >
                          <Maximize2 size={14} />
                          <span className="text-sm">Fluid</span>
                        </div>
                        <div
                          className={getOptionStyle(!responsive_mode)}
                          onClick={() => setResponsiveMode(false)}
                        >
                          <Grid3X3 size={14} />
                          <span className="text-sm">Fixed</span>
                        </div>
                      </div>

                      {/* Responsive Description */}
                      <div
                        className="mt-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      >
                        <div className="text-xs text-gray-300">
                          {responsive_mode ? (
                            <>
                              <div className="font-medium mb-1">
                                Fluid Responsive Layout
                              </div>
                              <div className="text-gray-400">
                                UIs adapt to any viewport size. Screens can be
                                resized on canvas to test responsiveness at
                                different breakpoints.
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium mb-1">
                                Fixed Dimensions
                              </div>
                              <div className="text-gray-400">
                                UIs render at exact pixel dimensions. Useful for
                                pixel-perfect design recreation.
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
