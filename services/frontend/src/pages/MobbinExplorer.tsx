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

export default function MobbinExplorer() {
  const navigate = useNavigate()
  const [mobbinEmail, setMobbinEmail] = useState('')
  const [mobbinPassword, setMobbinPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authStep, setAuthStep] = useState<
    'email' | 'password' | 'code' | 'authenticated'
  >('email')
  const [loading, setLoading] = useState(false)
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

  // Check auth status on load
  useEffect(() => {
    const savedEmail = localStorage.getItem('mobbin_email')
    if (savedEmail) {
      checkAuthStatus(savedEmail)
    }
  }, [])

  const checkAuthStatus = async (email: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mobbin/auth/status?email=${encodeURIComponent(email)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      const data = await response.json()
      if (data.authenticated && !data.token_expired) {
        setMobbinEmail(email)
        setIsAuthenticated(true)
        setAuthStep('authenticated')
        loadApps(email, 1)
      }
    } catch (err) {
      console.error('Failed to check auth status:', err)
    }
  }

  const checkAuthMethod = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mobbin/auth/check-method`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: mobbinEmail }),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to check authentication method')
      }

      const data = await response.json()

      if (data.requires_password) {
        setAuthStep('password')
      } else {
        // Send magic link code
        await handleSendCode()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mobbin/auth/send-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: mobbinEmail }),
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to send code')
      }

      setAuthStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/mobbin/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: mobbinEmail,
          code: verificationCode,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Verification failed')
      }

      localStorage.setItem('mobbin_email', mobbinEmail)
      setIsAuthenticated(true)
      setAuthStep('authenticated')
      loadApps(mobbinEmail, 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mobbin/auth/login-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: mobbinEmail,
            password: mobbinPassword,
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Login failed')
      }

      localStorage.setItem('mobbin_email', mobbinEmail)
      setIsAuthenticated(true)
      setAuthStep('authenticated')
      setMobbinPassword('') // Clear password
      loadApps(mobbinEmail, 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadApps = async (email: string, page: number) => {
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
          email,
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
        `${API_BASE_URL}/api/mobbin/apps/${app.id}/screens?email=${encodeURIComponent(mobbinEmail)}`,
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
        `${API_BASE_URL}/api/mobbin/apps/${app.id}/flows?email=${encodeURIComponent(mobbinEmail)}`,
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

  const handleLogout = () => {
    localStorage.removeItem('mobbin_email')
    setIsAuthenticated(false)
    setAuthStep('email')
    setMobbinEmail('')
    setMobbinPassword('')
    setVerificationCode('')
    setApps([])
    setScreens([])
    setFlows([])
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
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Logout from Mobbin
            </button>
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

        {/* Authentication Flow */}
        {!isAuthenticated && (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold mb-6">
              Authenticate with Mobbin
            </h2>

            {authStep === 'email' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobbin Email
                  </label>
                  <input
                    type="email"
                    value={mobbinEmail}
                    onChange={e => setMobbinEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={checkAuthMethod}
                  disabled={loading || !mobbinEmail}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Checking...' : 'Continue'}
                </button>
              </div>
            )}

            {authStep === 'password' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  This account requires password authentication
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={mobbinEmail}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={mobbinPassword}
                    onChange={e => setMobbinPassword(e.target.value)}
                    placeholder="Enter your Mobbin password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={e => {
                      if (e.key === 'Enter' && mobbinPassword) {
                        handlePasswordLogin()
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handlePasswordLogin}
                  disabled={loading || !mobbinPassword}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
                <button
                  onClick={() => {
                    setAuthStep('email')
                    setMobbinPassword('')
                  }}
                  className="w-full px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Use Different Email
                </button>
              </div>
            )}

            {authStep === 'code' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  A verification code has been sent to {mobbinEmail}
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || !verificationCode}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  onClick={() => setAuthStep('email')}
                  className="w-full px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Use Different Email
                </button>
              </div>
            )}
          </div>
        )}

        {/* Authenticated Content */}
        {isAuthenticated && (
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
                      onClick={() => loadApps(mobbinEmail, currentPage - 1)}
                      disabled={currentPage === 1 || loadingApps}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 bg-gray-100 rounded-md">
                      Page {currentPage}
                    </span>
                    <button
                      onClick={() => loadApps(mobbinEmail, currentPage + 1)}
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
