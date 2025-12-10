import { useContext } from 'react'
import { DeviceContext } from '../contexts/DeviceContext'

export function useDeviceContext() {
  const context = useContext(DeviceContext)
  if (context === undefined) {
    throw new Error('useDeviceContext must be used within a DeviceContextProvider')
  }
  return context
}
