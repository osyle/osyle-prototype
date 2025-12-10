import { Amplify } from 'aws-amplify'
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'
import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom'

import { config } from './config/env'

import Editor from './pages/Editor'
import Home from './pages/Home'
import LoginScreen from './pages/Login'

// AWS Amplify configuration using centralized config
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.aws.userPoolId,
      userPoolClientId: config.aws.userPoolClientId,
      loginWith: {
        oauth: {
          domain: config.aws.oauthDomain,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [config.aws.redirectSignIn],
          redirectSignOut: [config.aws.redirectSignOut],
          responseType: 'code',
        },
      },
    },
  },
})

interface User {
  username: string
  email?: string
}

// Create an auth context to share across the app
export const AuthContext = {
  checkAuth: async (): Promise<User | null> => {
    try {
      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()

      const idToken = session.tokens?.idToken?.toString()
      const email = session.tokens?.idToken?.payload['email'] as
        | string
        | undefined

      if (email && email.endsWith('@osyle.com')) {
        if (idToken) {
          localStorage.setItem('token', idToken)
          console.log('✅ Auth token saved to localStorage')
        } else {
          console.warn('⚠️ No ID token found in session')
        }

        return {
          username: currentUser.username,
          email,
        }
      } else {
        return null
      }
    } catch {
      return null
    }
  },
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const checkAuth = async () => {
    setLoading(true)
    try {
      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()
      const email = session.tokens?.idToken?.payload['email'] as
        | string
        | undefined

      if (email && email.endsWith('@osyle.com')) {
        setUser({
          username: currentUser.username,
          email,
        })
      } else {
        if (email) {
          alert('Only @osyle.com accounts are allowed')
        }
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()

    // Listen for storage events (sign out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('amplify') || e.key?.includes('cognito')) {
        checkAuth()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Listen for custom sign-out event
    const handleSignOut = () => {
      setUser(null)
      navigate('/login')
    }

    window.addEventListener('auth-signout', handleSignOut)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-signout', handleSignOut)
    }
  }, [navigate])

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#EDEBE9' }}
      >
        <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginScreen />}
      />
      <Route
        path="/"
        element={user ? <Home /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/editor"
        element={user ? <Editor /> : <Navigate to="/login" replace />}
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
