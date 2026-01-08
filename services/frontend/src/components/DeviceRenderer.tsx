import { useDeviceContext } from '../hooks/useDeviceContext'
import DynamicReactRenderer from './DynamicReactRenderer'

// UI data is a string of JSX code or a React node tree
export type UINode = string | Record<string, unknown>

interface DeviceRendererProps {
  uiTree: UINode
}

export default function DeviceRenderer({ uiTree }: DeviceRendererProps) {
  const context = useDeviceContext()

  if (!context) return null
  const { device_info } = context

  return (
    <div
      style={{
        width: device_info.screen.width,
        height: device_info.screen.height,
      }}
    >
      {typeof uiTree === 'string' ? (
        // Handle JSX code strings from backend
        <DynamicReactRenderer jsxCode={uiTree} />
      ) : (
        // Handle React component trees
        <DynamicReactRenderer jsxCode={JSON.stringify(uiTree)} />
      )}
    </div>
  )
}
