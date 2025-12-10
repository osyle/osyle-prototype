import {
  Settings,
  Monitor,
  Smartphone,
  Code,
  Palette,
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
  const { device_info, setDeviceInfo, rendering_mode, setRenderingMode } =
    useDeviceContext()

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

  const handlePlatformChange = (platform: 'web' | 'phone') => {
    const defaultScreen =
      platform === 'web'
        ? SCREEN_PRESETS.web.desktop
        : SCREEN_PRESETS.phone.iphone14pro
    setDeviceInfo({ platform, screen: defaultScreen })
  }

  const handlePresetChange = (preset: { width: number; height: number }) => {
    setDeviceInfo({ ...device_info, screen: preset })
  }

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
          className="absolute right-0 mt-2 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: '#1F1F20',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 1000,
            width: '580px',
          }}
        >
          {/* Header */}
          <div
            className="flex justify-between items-center p-4 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <h3 className="font-medium text-white">Configuration</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XCircle size={18} />
            </button>
          </div>

          {/* Two-column layout */}
          <div className="flex gap-4 p-4">
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
                  {device_info.platform === 'web' ? (
                    <Monitor className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Smartphone className="h-4 w-4 text-blue-400" />
                  )}
                  <div className="text-xs">
                    <div className="text-white font-medium">
                      {device_info.platform === 'web'
                        ? 'Web Platform'
                        : 'Phone Platform'}
                    </div>
                    <div className="text-gray-400">
                      {device_info.screen.width}×{device_info.screen.height} px
                    </div>
                  </div>
                </div>

                {/* Visual Device Preview */}
                <div className="flex justify-center pt-2">
                  {device_info.platform === 'web' ? (
                    // Web Device Preview
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
                  ) : (
                    // Phone Device Preview
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
                        {/* Notch */}
                        <div
                          className="absolute top-0 left-1/2 -translate-x-1/2 h-1.5 rounded-b"
                          style={{
                            width: '10px',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                          }}
                        ></div>
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
                    <Palette className="h-4 w-4 text-purple-400" />
                  )}
                  <div className="text-xs">
                    <div className="text-white font-medium">
                      {rendering_mode === 'react' ? 'React Code' : 'Design ML'}
                    </div>
                    <div className="text-gray-400">
                      {rendering_mode === 'react'
                        ? 'Component generation'
                        : 'Visual design'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Controls */}
            <div className="w-[65%] space-y-2">
              {/* Device Settings Section */}
              <div
                className="rounded-lg overflow-hidden"
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <button
                  onClick={() => toggleSection('device')}
                  className="w-full flex justify-between items-center p-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white">
                    <Smartphone size={16} />
                    <span className="text-sm font-medium">Device Settings</span>
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
                    {/* Platform Toggle */}
                    <div className="mt-3">
                      <div className="text-xs text-gray-400 mb-2">Platform</div>
                      <div
                        className="rounded-full p-1 flex gap-1"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      >
                        <div
                          className={getOptionStyle(
                            device_info.platform === 'web',
                          )}
                          onClick={() => handlePlatformChange('web')}
                        >
                          <Monitor size={14} />
                          <span className="text-sm">Web</span>
                        </div>
                        <div
                          className={getOptionStyle(
                            device_info.platform === 'phone',
                          )}
                          onClick={() => handlePlatformChange('phone')}
                        >
                          <Smartphone size={14} />
                          <span className="text-sm">Phone</span>
                        </div>
                      </div>
                    </div>

                    {/* Screen Size Presets */}
                    <div>
                      <div className="text-xs text-gray-400 mb-2">
                        Screen Size
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {device_info.platform === 'web' ? (
                          <>
                            <button
                              onClick={() =>
                                handlePresetChange(SCREEN_PRESETS.web.desktop)
                              }
                              className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                              style={{
                                backgroundColor:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.web.desktop.width
                                    ? 'rgba(59, 130, 246, 0.2)'
                                    : 'rgba(255,255,255,0.05)',
                                border:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.web.desktop.width
                                    ? '1px solid rgba(59, 130, 246, 0.5)'
                                    : '1px solid transparent',
                                color: 'white',
                              }}
                            >
                              <Monitor size={16} />
                              <span className="font-medium">Desktop</span>
                              <span className="text-gray-400">1440×900</span>
                            </button>
                            <button
                              onClick={() =>
                                handlePresetChange(SCREEN_PRESETS.web.laptop)
                              }
                              className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                              style={{
                                backgroundColor:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.web.laptop.width
                                    ? 'rgba(59, 130, 246, 0.2)'
                                    : 'rgba(255,255,255,0.05)',
                                border:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.web.laptop.width
                                    ? '1px solid rgba(59, 130, 246, 0.5)'
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
                                handlePresetChange(SCREEN_PRESETS.web.tablet)
                              }
                              className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                              style={{
                                backgroundColor:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.web.tablet.width
                                    ? 'rgba(59, 130, 246, 0.2)'
                                    : 'rgba(255,255,255,0.05)',
                                border:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.web.tablet.width
                                    ? '1px solid rgba(59, 130, 246, 0.5)'
                                    : '1px solid transparent',
                                color: 'white',
                              }}
                            >
                              <Maximize2 size={16} />
                              <span className="font-medium">Tablet</span>
                              <span className="text-gray-400">1024×768</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                handlePresetChange(
                                  SCREEN_PRESETS.phone.iphone14,
                                )
                              }
                              className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                              style={{
                                backgroundColor:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.phone.iphone14.width
                                    ? 'rgba(59, 130, 246, 0.2)'
                                    : 'rgba(255,255,255,0.05)',
                                border:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.phone.iphone14.width
                                    ? '1px solid rgba(59, 130, 246, 0.5)'
                                    : '1px solid transparent',
                                color: 'white',
                              }}
                            >
                              <Smartphone size={16} />
                              <span className="font-medium">iPhone 14</span>
                              <span className="text-gray-400">390×844</span>
                            </button>
                            <button
                              onClick={() =>
                                handlePresetChange(
                                  SCREEN_PRESETS.phone.iphone14pro,
                                )
                              }
                              className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                              style={{
                                backgroundColor:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.phone.iphone14pro.width
                                    ? 'rgba(59, 130, 246, 0.2)'
                                    : 'rgba(255,255,255,0.05)',
                                border:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.phone.iphone14pro.width
                                    ? '1px solid rgba(59, 130, 246, 0.5)'
                                    : '1px solid transparent',
                                color: 'white',
                              }}
                            >
                              <Smartphone size={16} />
                              <span className="font-medium">iPhone 14 Pro</span>
                              <span className="text-gray-400">393×852</span>
                            </button>
                            <button
                              onClick={() =>
                                handlePresetChange(SCREEN_PRESETS.phone.pixel7)
                              }
                              className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                              style={{
                                backgroundColor:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.phone.pixel7.width
                                    ? 'rgba(59, 130, 246, 0.2)'
                                    : 'rgba(255,255,255,0.05)',
                                border:
                                  device_info.screen.width ===
                                  SCREEN_PRESETS.phone.pixel7.width
                                    ? '1px solid rgba(59, 130, 246, 0.5)'
                                    : '1px solid transparent',
                                color: 'white',
                              }}
                            >
                              <Smartphone size={16} />
                              <span className="font-medium">Pixel 7</span>
                              <span className="text-gray-400">412×915</span>
                            </button>
                          </>
                        )}
                        <button
                          className="rounded p-2 text-xs flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors col-span-2"
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
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <button
                  onClick={() => toggleSection('rendering')}
                  className="w-full flex justify-between items-center p-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white">
                    <Code size={16} />
                    <span className="text-sm font-medium">UI Rendering</span>
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
                            rendering_mode === 'design-ml',
                          )}
                          onClick={() => setRenderingMode('design-ml')}
                        >
                          <Palette size={14} />
                          <span className="text-sm">Design ML</span>
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
