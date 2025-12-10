import { useDeviceContext } from '../hooks/useDeviceContext'
import DesignMLRenderer, { type UINode as DMLUINode } from './DesignMLRenderer'
import ReactRenderer, { type UINode as ReactUINode } from './ReactRenderer'

// Union type for both renderer trees
export type UINode = DMLUINode | ReactUINode

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
      ) : (
        <ReactRenderer uiTree={uiTree as ReactUINode} />
      )}
    </div>
  )
}
