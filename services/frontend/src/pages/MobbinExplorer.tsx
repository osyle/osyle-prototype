import { Search, Loader2, Image, Layers, GitBranch } from 'lucide-react'
import { useState } from 'react'
import api, {
  type MobbinFlowTreeHierarchy,
  type MobbinNodeScreen,
} from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface AppSearchResult {
  id: string
  name: string
  logo_url: string | null
  platform: string
  version_id: string | null
  url: string
  base_url: string
}

interface Screen {
  id: string
  screen_number: number
  image_url: string
  thumbnail_url: string
  title: string | null
  tags: string[] | null
}

interface UIElement {
  id: string
  element_number: number
  image_url: string
  thumbnail_url: string
  title: string | null
  category: string | null
  tags: string[] | null
}

interface Flow {
  id: string
  flow_number: number | null
  title: string
  thumbnail_url: string | null
  url: string | null
  metadata: string | null
  tags: string[] | null
}

interface FlowTreeNode {
  id: string
  type?: string
  position?: { x: number; y: number }
  data?: Record<string, unknown>
}

interface FlowTreeEdge {
  id: string
  source: string
  target: string
  type?: string
}

interface FlowTree {
  nodes?: FlowTreeNode[]
  edges?: FlowTreeEdge[]
  [key: string]: unknown
}

interface FlowDetails {
  title: string | null
  description: string | null
  screens: Array<{
    screen_number: number
    image_url: string
    label: string | null
  }>
  flow_tree: FlowTree | null
  metadata: Record<string, unknown>
}

export default function MobbinExplorer() {
  const [searchQuery, setSearchQuery] = useState('')
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Search results
  const [searchResults, setSearchResults] = useState<AppSearchResult[]>([])

  // Selected app and content
  const [selectedApp, setSelectedApp] = useState<AppSearchResult | null>(null)
  const [contentType, setContentType] = useState<
    'screens' | 'ui-elements' | 'flows'
  >('screens')

  // Content data
  const [screens, setScreens] = useState<Screen[]>([])
  const [uiElements, setUIElements] = useState<UIElement[]>([])
  const [flows, setFlows] = useState<Flow[]>([])
  const [selectedFlow, setSelectedFlow] = useState<FlowDetails | null>(null)

  // Flow tree data
  const [flowTree, setFlowTree] = useState<MobbinFlowTreeHierarchy | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeScreens, setNodeScreens] = useState<MobbinNodeScreen[]>([])

  // Loading states
  const [loadingContent, setLoadingContent] = useState(false)

  // Auth token from localStorage
  const token = localStorage.getItem('token')

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError('')
    setSearchResults([])
    setSelectedApp(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/mobbin/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          platform: platform,
          content_type: 'apps', // Always search for apps, not screens
        }),
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      setSearchResults(data.apps || [])

      if (data.apps && data.apps.length === 0) {
        setError('No results found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadScreens = async (app: AppSearchResult) => {
    setLoadingContent(true)
    setError('')

    try {
      const url = new URL(`${API_BASE_URL}/api/mobbin/apps/${app.id}/screens`)
      if (app.version_id) {
        url.searchParams.append('version_id', app.version_id)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load screens: ${response.statusText}`)
      }

      const data = await response.json()
      setScreens(data.screens || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load screens')
      console.error('Load screens error:', err)
    } finally {
      setLoadingContent(false)
    }
  }

  const loadUIElements = async (app: AppSearchResult) => {
    setLoadingContent(true)
    setError('')

    try {
      const url = new URL(
        `${API_BASE_URL}/api/mobbin/apps/${app.id}/ui-elements`,
      )
      if (app.version_id) {
        url.searchParams.append('version_id', app.version_id)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load UI elements: ${response.statusText}`)
      }

      const data = await response.json()
      setUIElements(data.ui_elements || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load UI elements',
      )
      console.error('Load UI elements error:', err)
    } finally {
      setLoadingContent(false)
    }
  }

  const loadFlows = async (app: AppSearchResult) => {
    setLoadingContent(true)
    setError('')

    try {
      // Load both flow list and flow tree
      const url = new URL(`${API_BASE_URL}/api/mobbin/apps/${app.id}/flows`)
      if (app.version_id) {
        url.searchParams.append('version_id', app.version_id)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load flows: ${response.statusText}`)
      }

      const data = await response.json()
      setFlows(data.flows || [])

      // Also load flow tree
      if (app.version_id) {
        loadFlowTree(app)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flows')
      console.error('Load flows error:', err)
    } finally {
      setLoadingContent(false)
    }
  }

  const loadFlowTree = async (app: AppSearchResult) => {
    if (!app.version_id) return

    try {
      const tree = await api.mobbin.getFlowTree(app.id, app.version_id)
      setFlowTree(tree)

      // Auto-select first node
      if (tree.nodes.length > 0) {
        const firstNode = tree.nodes[0]
        setSelectedNodeId(firstNode.id)
        loadNodeScreens(app, firstNode.id)
      }
    } catch (err) {
      console.error('Load flow tree error:', err)
    }
  }

  const loadNodeScreens = async (app: AppSearchResult, nodeId: string) => {
    if (!app.version_id) return

    setLoadingContent(true)
    try {
      const data = await api.mobbin.getFlowNodeScreens(
        app.id,
        nodeId,
        app.version_id,
      )
      setNodeScreens(data.screens || [])
    } catch (err) {
      console.error('Load node screens error:', err)
      setNodeScreens([])
    } finally {
      setLoadingContent(false)
    }
  }

  const handleNodeSelect = (app: AppSearchResult, nodeId: string) => {
    setSelectedNodeId(nodeId)
    loadNodeScreens(app, nodeId)
  }

  const loadFlowDetails = async (app: AppSearchResult, flowId: string) => {
    if (!app.version_id) {
      setError('Version ID required for flow details')
      return
    }

    setLoadingContent(true)
    setError('')

    try {
      const url = new URL(
        `${API_BASE_URL}/api/mobbin/apps/${app.id}/flows/${flowId}`,
      )
      url.searchParams.append('version_id', app.version_id)
      url.searchParams.append('flow_id', flowId)

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load flow details: ${response.statusText}`)
      }

      const data = await response.json()
      setSelectedFlow(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load flow details',
      )
      console.error('Load flow details error:', err)
    } finally {
      setLoadingContent(false)
    }
  }

  const handleAppSelect = (app: AppSearchResult) => {
    setSelectedApp(app)
    setScreens([])
    setUIElements([])
    setFlows([])
    setSelectedFlow(null)
    setError('')

    // Load the selected content type
    if (contentType === 'screens') {
      loadScreens(app)
    } else if (contentType === 'ui-elements') {
      loadUIElements(app)
    } else if (contentType === 'flows') {
      loadFlows(app)
    }
  }

  const handleContentTypeChange = (
    type: 'screens' | 'ui-elements' | 'flows',
  ) => {
    setContentType(type)
    setSelectedFlow(null)

    if (!selectedApp) return

    // Load the new content type
    if (type === 'screens') {
      if (screens.length === 0) loadScreens(selectedApp)
    } else if (type === 'ui-elements') {
      if (uiElements.length === 0) loadUIElements(selectedApp)
    } else if (type === 'flows') {
      if (flows.length === 0) loadFlows(selectedApp)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Mobbin Explorer
          </h1>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search for apps (e.g., Instagram, Uber)..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={platform}
                onChange={e => setPlatform(e.target.value as 'ios' | 'android')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ios">iOS</option>
                <option value="android">Android</option>
              </select>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && !selectedApp && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Search Results ({searchResults.length})
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {searchResults.map(app => (
                <button
                  key={app.id}
                  onClick={() => handleAppSelect(app)}
                  className="flex flex-col items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  {app.logo_url ? (
                    <img
                      src={app.logo_url}
                      alt={app.name}
                      className="w-16 h-16 rounded-xl mb-2 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl mb-2 bg-gray-200 flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  <span className="text-sm font-medium text-gray-900 text-center line-clamp-2">
                    {app.name}
                  </span>

                  <span className="text-xs text-gray-500 mt-1">
                    {app.platform.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* App Content View */}
        {selectedApp && (
          <div>
            {/* App Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => {
                  setSelectedApp(null)
                  setScreens([])
                  setUIElements([])
                  setFlows([])
                  setSelectedFlow(null)
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                ← Back to results
              </button>

              <div className="flex items-center gap-3 flex-1">
                {selectedApp.logo_url && (
                  <img
                    src={selectedApp.logo_url}
                    alt={selectedApp.name}
                    className="w-12 h-12 rounded-lg"
                  />
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedApp.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedApp.platform.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Type Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => handleContentTypeChange('screens')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  contentType === 'screens'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Image className="w-4 h-4" />
                Screens
                {screens.length > 0 && (
                  <span className="text-xs">({screens.length})</span>
                )}
              </button>

              <button
                onClick={() => handleContentTypeChange('ui-elements')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  contentType === 'ui-elements'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                UI Elements
                {uiElements.length > 0 && (
                  <span className="text-xs">({uiElements.length})</span>
                )}
              </button>

              <button
                onClick={() => handleContentTypeChange('flows')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  contentType === 'flows'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Flows
                {flows.length > 0 && (
                  <span className="text-xs">({flows.length})</span>
                )}
              </button>
            </div>

            {/* Loading Indicator */}
            {loadingContent && (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Screens Grid */}
            {!loadingContent &&
              contentType === 'screens' &&
              screens.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {screens.map(screen => (
                    <div
                      key={screen.id}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <img
                        src={screen.image_url}
                        alt={screen.title || `Screen ${screen.screen_number}`}
                        className="w-full h-auto object-cover"
                      />
                      {screen.title && (
                        <div className="p-2">
                          <p className="text-xs text-gray-600 truncate">
                            {screen.title}
                          </p>
                        </div>
                      )}
                      {screen.tags && screen.tags.length > 0 && (
                        <div className="px-2 pb-2 flex flex-wrap gap-1">
                          {screen.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {/* UI Elements Grid */}
            {!loadingContent &&
              contentType === 'ui-elements' &&
              uiElements.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {uiElements.map(element => (
                    <div
                      key={element.id}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <img
                        src={element.image_url}
                        alt={
                          element.title || `Element ${element.element_number}`
                        }
                        className="w-full h-auto object-cover"
                      />
                      <div className="p-2">
                        {element.title && (
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {element.title}
                          </p>
                        )}
                        {element.category && (
                          <p className="text-xs text-gray-500">
                            {element.category}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* Flows - Tree View */}
            {!loadingContent && contentType === 'flows' && flowTree && (
              <div className="flex h-[calc(100vh-300px)]">
                {/* Left: Flow Tree */}
                <div className="w-80 border-r border-gray-200 overflow-y-auto flex-shrink-0">
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 font-semibold text-gray-700">
                    Flow Tree
                  </div>
                  <ul className="flex flex-col">
                    {flowTree.nodes.map(node => (
                      <li
                        key={node.id}
                        onClick={() => handleNodeSelect(selectedApp!, node.id)}
                        className={`
                          flex h-9 items-center gap-2 px-3 cursor-pointer transition-colors
                          hover:bg-gray-100
                          ${
                            selectedNodeId === node.id
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-gray-700'
                          }
                        `}
                        role="button"
                        tabIndex={0}
                      >
                        {/* Branch lines for hierarchy */}
                        <div className="flex items-stretch gap-0 self-stretch">
                          {Array.from({ length: node.depth }, (_, i) => (
                            <div
                              key={i}
                              className="flex h-full w-3 items-center border-l border-gray-300"
                            >
                              {i === node.depth - 1 && (
                                <div className="w-full border-b border-gray-300"></div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Title */}
                        <span className="flex-1 truncate text-sm">
                          {node.title}
                        </span>

                        {/* Screen count */}
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            selectedNodeId === node.id
                              ? 'text-blue-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {node.screen_count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right: Node Screens */}
                <div className="flex-1 overflow-y-auto p-6">
                  {nodeScreens.length > 0 ? (
                    <>
                      <div className="mb-4 text-sm text-gray-600">
                        {nodeScreens.length}{' '}
                        {nodeScreens.length === 1 ? 'screen' : 'screens'}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {nodeScreens.map(screen => (
                          <div
                            key={screen.id}
                            className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                          >
                            <img
                              src={screen.thumbnail_url || screen.image_url}
                              alt={
                                screen.label || `Screen ${screen.screen_number}`
                              }
                              className="w-full h-auto object-cover"
                            />
                            {screen.label && (
                              <div className="p-2">
                                <p className="text-xs text-gray-600 truncate">
                                  {screen.label}
                                </p>
                              </div>
                            )}
                            <div className="px-2 pb-2 text-xs text-gray-500">
                              Screen {screen.screen_number}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-96">
                      <p className="text-gray-500">
                        Select a flow to see screens
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Flows - Old Grid View (kept as fallback) */}
            {!loadingContent &&
              contentType === 'flows' &&
              !flowTree &&
              flows.length > 0 &&
              !selectedFlow && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {flows.map(flow => (
                    <button
                      key={flow.id}
                      onClick={() => loadFlowDetails(selectedApp, flow.id)}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow text-left"
                    >
                      {flow.thumbnail_url && (
                        <img
                          src={flow.thumbnail_url}
                          alt={flow.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {flow.title}
                        </h3>
                        {flow.metadata && (
                          <p className="text-sm text-gray-500">
                            {flow.metadata}
                          </p>
                        )}
                        {flow.tags && flow.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {flow.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

            {/* Flow Details */}
            {!loadingContent && selectedFlow && (
              <div>
                <button
                  onClick={() => setSelectedFlow(null)}
                  className="mb-4 text-blue-600 hover:text-blue-700"
                >
                  ← Back to flows
                </button>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  {selectedFlow.title && (
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedFlow.title}
                    </h3>
                  )}

                  {selectedFlow.description && (
                    <p className="text-gray-600 mb-4">
                      {selectedFlow.description}
                    </p>
                  )}

                  {selectedFlow.flow_tree && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Flow Tree
                      </h4>
                      <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
                        {JSON.stringify(selectedFlow.flow_tree, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedFlow.screens && selectedFlow.screens.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Flow Screens ({selectedFlow.screens.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {selectedFlow.screens.map(screen => (
                          <div
                            key={screen.screen_number}
                            className="bg-gray-50 rounded-lg overflow-hidden"
                          >
                            <img
                              src={screen.image_url}
                              alt={
                                screen.label || `Screen ${screen.screen_number}`
                              }
                              className="w-full h-auto object-cover"
                            />
                            {screen.label && (
                              <div className="p-2">
                                <p className="text-xs text-gray-600 truncate">
                                  {screen.label}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty States */}
            {!loadingContent &&
              contentType === 'screens' &&
              screens.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No screens found
                </div>
              )}
            {!loadingContent &&
              contentType === 'ui-elements' &&
              uiElements.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No UI elements found
                </div>
              )}
            {!loadingContent &&
              contentType === 'flows' &&
              flows.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No flows found
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}
