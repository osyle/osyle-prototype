// types/mobbin.ts
// Shared type definitions for Mobbin Flow Tree components

export interface FlowTreeNode {
  id: string
  title: string
  screen_count: number
  depth: number
  has_children: boolean
  is_selected: boolean
  order: number
}

export interface FlowTreeData {
  app_id: string
  version_id: string
  nodes: FlowTreeNode[]
  total: number
}

export interface NodeScreen {
  id: string
  screen_number: number
  image_url: string
  thumbnail_url: string
  label?: string
  dimensions?: {
    width: number
    height: number
  }
}

export interface NodeScreensResponse {
  app_id: string
  version_id: string
  node_id: string
  screens: NodeScreen[]
  total: number
}

// Component Props
export interface FlowTreeViewProps {
  appId: string
  versionId: string
}

export interface FlowTreeProps {
  nodes: FlowTreeNode[]
  selectedId: string | null
  // eslint-disable-next-line no-unused-vars
  onSelect: (id: string) => void
}

export interface TreeNodeProps {
  node: FlowTreeNode
  isSelected: boolean
  onSelect: () => void
}

export interface FlowScreenGridProps {
  screens: NodeScreen[]
}

export interface ScreenCardProps {
  screen: NodeScreen
  onClick: () => void
}

export interface ScreenLightboxProps {
  screen: NodeScreen
  onClose: () => void
}
