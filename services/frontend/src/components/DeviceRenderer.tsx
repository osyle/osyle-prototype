import { useDeviceContext } from '../hooks/useDeviceContext'
import DesignMLv2Renderer from './DesignMLRenderer'
import DynamicReactRenderer from './DynamicReactRenderer'

// UI data can be a Design ML document or a string of JSX code
export type UINode = DesignMLDocument | string | Record<string, unknown>

interface DesignMLDocument {
  version: string
  meta?: Record<string, unknown>
  root: Record<string, unknown>
}

interface DeviceRendererProps {
  uiTree: UINode
}

export default function DeviceRenderer({ uiTree }: DeviceRendererProps) {
  const context = useDeviceContext()

  if (!context) return null
  const { device_info, rendering_mode } = context

  return (
    <div
      style={{
        width: device_info.screen.width,
        height: device_info.screen.height,
      }}
    >
      {rendering_mode === 'design-ml' ? (
        <DesignMLv2Renderer document={uiTree} />
      ) : typeof uiTree === 'string' ? (
        // Handle JSX code strings from backend
        <DynamicReactRenderer jsxCode={uiTree} />
      ) : (
        // Handle React component trees
        <DynamicReactRenderer jsxCode={JSON.stringify(uiTree)} />
      )}
    </div>
  )
}
