import { Amplify } from 'aws-amplify'
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { config } from './config/env'
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

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
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
        alert('Only @osyle.com accounts are allowed')
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

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
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <LoginScreen />}
        />
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
