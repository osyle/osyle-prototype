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
  mode: 'react' | 'design-ml'
}

export interface DeviceProperties {
  device_info: DeviceInfo
  // eslint-disable-next-line no-unused-vars
  setDeviceInfo: (device_info: DeviceInfo) => void

  rendering_mode: 'react' | 'design-ml'
  // eslint-disable-next-line no-unused-vars
  setRenderingMode: (mode: 'react' | 'design-ml') => void
}

export const DeviceContext = createContext<DeviceProperties | undefined>(
  undefined,
)
