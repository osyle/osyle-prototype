import { useDeviceContext } from '../hooks/useDeviceContext'
import DesignMLRenderer, { type UINode as DMLUINode } from './DesignMLRenderer'
import DynamicReactRenderer from './DynamicReactRenderer'
import ReactRenderer, { type UINode as ReactUINode } from './ReactRenderer'

// Union type for both renderer trees
export type UINode = DMLUINode | ReactUINode | string

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
        <DesignMLRenderer
          uiTree={uiTree as DMLUINode}
          deviceInfo={device_info}
        />
      ) : typeof uiTree === 'string' ? (
        // ✅ NEW: Handle JSX code strings from backend
        <DynamicReactRenderer jsxCode={uiTree} />
      ) : (
        // ✅ EXISTING: Handle UINode tree objects
        <ReactRenderer uiTree={uiTree as ReactUINode} />
      )}
    </div>
  )
}
