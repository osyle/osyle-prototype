import { useState, useEffect } from 'react'
import type {
  FlowTreeData,
  NodeScreensResponse,
  NodeScreen,
  FlowTreeViewProps,
} from '../types/mobbin'
import FlowScreenGrid from './FlowScreenGrid'
import FlowTree from './FlowTree'

export default function FlowTreeView({ appId, versionId }: FlowTreeViewProps) {
  const [tree, setTree] = useState<FlowTreeData | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [screens, setScreens] = useState<NodeScreen[]>([])
  const [loadingTree, setLoadingTree] = useState(true)
  const [loadingScreens, setLoadingScreens] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch tree on mount
  useEffect(() => {
    fetchTree()
  }, [appId, versionId])

  // Fetch screens when node selected
  useEffect(() => {
    if (selectedNodeId) {
      fetchNodeScreens(selectedNodeId)
    }
  }, [selectedNodeId])

  const fetchTree = async () => {
    setLoadingTree(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/mobbin/apps/${appId}/flows/tree?version_id=${versionId}`,
      )

      if (!response.ok) {
        throw new Error('Failed to fetch flow tree')
      }

      const data: FlowTreeData = await response.json()
      setTree(data)

      // Auto-select first node
      if (data.nodes.length > 0) {
        setSelectedNodeId(data.nodes[0].id)
      }
    } catch (err) {
      console.error('Error fetching flow tree:', err)
      setError(err instanceof Error ? err.message : 'Failed to load flow tree')
    } finally {
      setLoadingTree(false)
    }
  }

  const fetchNodeScreens = async (nodeId: string) => {
    setLoadingScreens(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/mobbin/apps/${appId}/flows/tree/${nodeId}/screens?version_id=${versionId}`,
      )

      if (!response.ok) {
        throw new Error('Failed to fetch node screens')
      }

      const data: NodeScreensResponse = await response.json()
      setScreens(data.screens)
    } catch (err) {
      console.error('Error fetching node screens:', err)
      setError(err instanceof Error ? err.message : 'Failed to load screens')
      setScreens([])
    } finally {
      setLoadingScreens(false)
    }
  }

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId)
  }

  if (loadingTree) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading flow tree...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchTree}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!tree || tree.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">No flow tree available</p>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-white">
      {/* Left: Flow Tree */}
      <div className="w-80 border-r border-gray-200 flex-shrink-0 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 font-semibold text-gray-700">
          Flow Tree
        </div>
        <FlowTree
          nodes={tree.nodes}
          selectedId={selectedNodeId}
          onSelect={handleNodeSelect}
        />
      </div>

      {/* Right: Screens */}
      <div className="flex-1 overflow-y-auto">
        {loadingScreens ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading screens...</p>
            </div>
          </div>
        ) : (
          <FlowScreenGrid screens={screens} />
        )}
      </div>
    </div>
  )
}
