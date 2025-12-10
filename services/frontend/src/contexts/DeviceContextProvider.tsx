import { useState, type ReactNode } from 'react'
import { type DeviceInfo, DeviceContext } from './DeviceContext'

interface DeviceContextProviderProps {
  children: ReactNode
}

// Helper function to safely parse JSON from localStorage
const getStoredValue = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = window.localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error)
    return defaultValue
  }
}

// Preset screen sizes
export const SCREEN_PRESETS = {
  web: {
    desktop: { width: 1440, height: 900 },
    laptop: { width: 1280, height: 800 },
    tablet: { width: 1024, height: 768 },
  },
  phone: {
    iphone14: { width: 390, height: 844 },
    iphone14pro: { width: 393, height: 852 },
    pixel7: { width: 412, height: 915 },
  },
}

export default function DeviceContextProvider({
  children,
}: DeviceContextProviderProps) {
  // Initialize states with values from localStorage if available
  const [device_info, setDeviceInfoState] = useState<DeviceInfo>(() =>
    getStoredValue('device_info', {
      platform: 'web',
      screen: SCREEN_PRESETS.web.desktop,
    }),
  )

  const [rendering_mode, setRenderingModeState] = useState<
    'react' | 'design-ml'
  >(() => getStoredValue('rendering_mode', 'react'))

  // Wrapper setters that update both state and localStorage
  const setDeviceInfo = (info: DeviceInfo) => {
    setDeviceInfoState(info)
    localStorage.setItem('device_info', JSON.stringify(info))
  }

  const setRenderingMode = (mode: 'react' | 'design-ml') => {
    setRenderingModeState(mode)
    localStorage.setItem('rendering_mode', JSON.stringify(mode))
  }

  return (
    <DeviceContext.Provider
      value={{
        device_info,
        setDeviceInfo,
        rendering_mode,
        setRenderingMode,
      }}
    >
      {children}
    </DeviceContext.Provider>
  )
}
