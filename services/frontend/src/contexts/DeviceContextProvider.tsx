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

// Preset screen sizes (unified, no phone/web distinction)
export const SCREEN_PRESETS = {
  mobile: { width: 390, height: 844 },
  mobileLarge: { width: 430, height: 932 },
  tablet: { width: 768, height: 1024 },
  laptop: { width: 1280, height: 800 },
  desktop: { width: 1440, height: 900 },
}

export default function DeviceContextProvider({
  children,
}: DeviceContextProviderProps) {
  // Initialize states with values from localStorage if available
  const [device_info, setDeviceInfoState] = useState<DeviceInfo>(() =>
    getStoredValue('device_info', {
      screen: SCREEN_PRESETS.mobile,
    }),
  )

  const [rendering_mode, setRenderingModeState] = useState<
    'react' | 'parametric'
  >(() => getStoredValue('rendering_mode', 'react'))

  const [responsive_mode, setResponsiveModeState] = useState<boolean>(() =>
    getStoredValue('responsive_mode', true),
  )

  // Wrapper setters that update both state and localStorage
  const setDeviceInfo = (info: DeviceInfo) => {
    setDeviceInfoState(info)
    localStorage.setItem('device_info', JSON.stringify(info))
  }

  const setRenderingMode = (mode: 'react' | 'parametric') => {
    setRenderingModeState(mode)
    localStorage.setItem('rendering_mode', JSON.stringify(mode))
  }

  const setResponsiveMode = (enabled: boolean) => {
    setResponsiveModeState(enabled)
    localStorage.setItem('responsive_mode', JSON.stringify(enabled))
  }

  return (
    <DeviceContext.Provider
      value={{
        device_info,
        setDeviceInfo,
        rendering_mode,
        setRenderingMode,
        responsive_mode,
        setResponsiveMode,
      }}
    >
      {children}
    </DeviceContext.Provider>
  )
}
