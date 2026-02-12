import { createContext } from 'react'

export interface DeviceScreen {
  width: number
  height: number
}

export interface DeviceInfo {
  platform: 'web' | 'phone'
  screen: DeviceScreen
}

export interface RenderingMode {
  mode: 'react' | 'parametric'
}

export interface DeviceProperties {
  device_info: DeviceInfo
  // eslint-disable-next-line no-unused-vars
  setDeviceInfo: (device_info: DeviceInfo) => void

  rendering_mode: 'react' | 'parametric'
  // eslint-disable-next-line no-unused-vars
  setRenderingMode: (mode: 'react' | 'parametric') => void

  responsive_mode: boolean
  // eslint-disable-next-line no-unused-vars
  setResponsiveMode: (enabled: boolean) => void
}

export const DeviceContext = createContext<DeviceProperties | undefined>(
  undefined,
)
