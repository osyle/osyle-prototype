import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface App {
  id: string
  name: string
  category: string
  logo_url: string
  tagline: string
  platform: string
  preview_urls: string[]
}

interface Screen {
  id: string
  number: number
  url: string
  elements: string[] | null
  patterns: string[] | null
}

interface Flow {
  id: string
  name: string
  screen_count: number
}

interface MobbinStatus {
  configured: boolean
  authenticated: boolean
  email: string | null
}

export default function MobbinExplorer() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<MobbinStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Apps state
  const [apps, setApps] = useState<App[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingApps, setLoadingApps] = useState(false)

  // Selected app state
  const [selectedApp, setSelectedApp] = useState<App | null>(null)
  const [screens, setScreens] = useState<Screen[]>([])
  const [flows, setFlows] = useState<Flow[]>([])
  const [viewMode, setViewMode] = useState<'apps' | 'screens' | 'flows'>('apps')

  // Auth token from localStorage
  const token = localStorage.getItem('token')

  // Check Mobbin service status on load
  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/mobbin/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      setStatus(data)

      if (data.authenticated) {
        loadApps(1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status')
    } finally {
      setLoading(false)
    }
  }

  const loadApps = async (page: number) => {
    setLoadingApps(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/mobbin/apps/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          page,
          page_size: 24,
          platform: 'ios',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to load apps')
      }

      const data = await response.json()
      setApps(data.apps)
      setHasMore(data.has_more)
      setCurrentPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoadingApps(false)
    }
  }

  const loadScreens = async (app: App) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mobbin/apps/${app.id}/screens`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to load screens')
      }

      const data = await response.json()
      setScreens(data.screens)
      setSelectedApp(app)
      setViewMode('screens')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadFlows = async (app: App) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mobbin/apps/${app.id}/flows`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to load flows')
      }

      const data = await response.json()
      setFlows(data.flows)
      setSelectedApp(app)
      setViewMode('flows')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Home
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Mobbin Explorer
            </h1>
          </div>
          {status && (
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                {status.authenticated ? (
                  <span className="text-green-600 flex items-center">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2" />
                    Connected as {status.email}
                  </span>
                ) : status.configured ? (
                  <span className="text-yellow-600 flex items-center">
                    <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2" />
                    Authentication failed
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center">
                    <span className="w-2 h-2 bg-red-600 rounded-full mr-2" />
                    Not configured
                  </span>
                )}
              </div>
              <button
                onClick={checkStatus}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Not Configured Message */}
        {status && !status.configured && (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold mb-4">
              Mobbin Not Configured
            </h2>
            <p className="text-gray-600 mb-4">
              To use Mobbin integration, please set the following environment
              variables in your backend:
            </p>
            <div className="bg-gray-100 p-4 rounded font-mono text-sm">
              MOBBIN_EMAIL=your@email.com
              <br />
              MOBBIN_PASSWORD=your_password
            </div>
            <p className="text-gray-600 mt-4">
              Then restart your backend server.
            </p>
          </div>
        )}

        {/* Not Authenticated Message */}
        {status && status.configured && !status.authenticated && (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold mb-4">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">
              Failed to authenticate with Mobbin using the configured
              credentials. Please check your environment variables and ensure
              the credentials are correct.
            </p>
            <button
              onClick={checkStatus}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry Authentication
            </button>
          </div>
        )}

        {/* Authenticated Content */}
        {status && status.authenticated && (
          <>
            {/* View Mode Tabs */}
            {viewMode !== 'apps' && (
              <div className="mb-6">
                <button
                  onClick={() => {
                    setViewMode('apps')
                    setSelectedApp(null)
                    setScreens([])
                    setFlows([])
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  ← Back to Apps
                </button>
                {selectedApp && (
                  <div className="mt-4 flex items-center space-x-4">
                    <img
                      src={selectedApp.logo_url}
                      alt={selectedApp.name}
                      className="w-16 h-16 rounded-lg"
                    />
                    <div>
                      <h2 className="text-xl font-semibold">
                        {selectedApp.name}
                      </h2>
                      <p className="text-gray-600">{selectedApp.category}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Apps Grid */}
            {viewMode === 'apps' && (
              <>
                <div className="mb-6 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">iOS Apps</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadApps(currentPage - 1)}
                      disabled={currentPage === 1 || loadingApps}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 bg-gray-100 rounded-md">
                      Page {currentPage}
                    </span>
                    <button
                      onClick={() => loadApps(currentPage + 1)}
                      disabled={!hasMore || loadingApps}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {loadingApps ? (
                  <div className="flex justify-center py-12">
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {apps.map(app => (
                      <div
                        key={app.id}
                        className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4"
                      >
                        <img
                          src={app.logo_url}
                          alt={app.name}
                          className="w-full h-32 object-contain mb-4"
                        />
                        <h3 className="font-semibold text-lg mb-2">
                          {app.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {app.category}
                        </p>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                          {app.tagline}
                        </p>

                        {/* Preview Images */}
                        {app.preview_urls.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            {app.preview_urls.slice(0, 3).map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Preview ${idx + 1}`}
                                className="w-full h-20 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}

                        <div className="flex space-x-2">
                          <button
                            onClick={() => loadScreens(app)}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                          >
                            View Screens
                          </button>
                          <button
                            onClick={() => loadFlows(app)}
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                          >
                            View Flows
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Screens View */}
            {viewMode === 'screens' && (
              <>
                <h2 className="text-xl font-semibold mb-6">
                  Screens ({screens.length})
                </h2>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {screens.map(screen => (
                      <div
                        key={screen.id}
                        className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                      >
                        <img
                          src={screen.url}
                          alt={`Screen ${screen.number}`}
                          className="w-full h-auto"
                        />
                        <div className="p-3">
                          <p className="text-sm font-semibold">
                            Screen {screen.number}
                          </p>
                          {screen.patterns && screen.patterns.length > 0 && (
                            <p className="text-xs text-gray-600 mt-1">
                              {screen.patterns.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Flows View */}
            {viewMode === 'flows' && (
              <>
                <h2 className="text-xl font-semibold mb-6">
                  Flows ({flows.length})
                </h2>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {flows.map(flow => (
                      <div
                        key={flow.id}
                        className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                      >
                        <h3 className="text-lg font-semibold mb-2">
                          {flow.name}
                        </h3>
                        <p className="text-gray-600">
                          {flow.screen_count} screen
                          {flow.screen_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
