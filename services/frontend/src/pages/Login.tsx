import { signInWithRedirect } from 'aws-amplify/auth'
import { Mail, ArrowRight } from 'lucide-react'
import { useState } from 'react'

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await signInWithRedirect({ provider: 'Google' })
    } catch {
      setError('Failed to sign in. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#EDEBE9' }}
    >
      {/* Floating orbs for visual interest */}
      <div
        className="absolute top-20 left-20 w-64 h-64 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #F5C563 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #3B3B3B 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-8">
        {/* Logo/Brand */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 transition-all hover:scale-105"
            style={{
              backgroundColor: '#3B3B3B',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            <span className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
              O
            </span>
          </div>
          <h1 className="text-4xl font-light mb-2" style={{ color: '#3B3B3B' }}>
            Welcome to Osyle
          </h1>
          <p className="text-sm" style={{ color: '#929397' }}>
            Sign in with your Osyle account
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-3xl p-8 transition-all"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          {/* Email Input */}
          <div className="mb-6">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Email address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@osyle.com"
                className="w-full px-4 py-3 pl-11 rounded-xl focus:outline-none transition-all"
                style={{
                  backgroundColor: '#F7F5F3',
                  color: '#3B3B3B',
                  border: '2px solid transparent',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#F5C563'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'transparent'
                }}
              />
              <Mail
                size={18}
                className="absolute left-4 top-1/2 transform -translate-y-1/2"
                style={{ color: '#929397' }}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: '#E8E1DD' }}
            />
            <span className="text-xs" style={{ color: '#929397' }}>
              OR
            </span>
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: '#E8E1DD' }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
            >
              {error}
            </div>
          )}

          {/* Google SSO Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isLoading ? '#F4F4F4' : '#3B3B3B',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.438 15.983 5.482 18 9.003 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </>
            )}
          </button>

          {/* Info Text */}
          <p className="text-xs text-center mt-6" style={{ color: '#929397' }}>
            Only{' '}
            <span style={{ color: '#3B3B3B', fontWeight: 500 }}>
              @osyle.com
            </span>{' '}
            accounts can access this workspace
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs" style={{ color: '#929397' }}>
            Protected by AWS Cognito ·{' '}
            <a href="#" className="underline hover:no-underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
