import React, { useState, useRef, useEffect } from 'react'
import { type UserInfo } from '../types/home.types'

// ============================================================================
// TYPES
// ============================================================================

interface ProfileDropdownProps {
  userInfo: UserInfo | null
  onSignOut: () => void
}

// ============================================================================
// PROFILE DROPDOWN COMPONENT
// ============================================================================

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  userInfo,
  onSignOut,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowProfileMenu(!showProfileMenu)}
        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all hover:scale-105"
        style={{ backgroundColor: '#3B3B3B', color: '#FFFFFF' }}
        title={userInfo ? `${userInfo.name || userInfo.email}` : 'Profile'}
      >
        {userInfo?.picture ? (
          <img
            src={userInfo.picture}
            alt={userInfo.name || userInfo.email}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%',
            }}
          />
        ) : (
          userInfo?.initials || 'NI'
        )}
      </button>

      {/* Dropdown Menu */}
      {showProfileMenu && userInfo && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000,
          }}
        >
          {/* User Info Header */}
          <div className="p-4" style={{ borderBottom: '1px solid #E8E1DD' }}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-semibold"
                style={{ backgroundColor: '#3B3B3B', color: '#FFFFFF' }}
              >
                {userInfo.picture ? (
                  <img
                    src={userInfo.picture}
                    alt={userInfo.name || userInfo.email}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                    }}
                  />
                ) : (
                  userInfo.initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium mb-0.5 truncate"
                  style={{ color: '#3B3B3B' }}
                >
                  {userInfo.name || 'User'}
                </div>
                <div className="text-xs truncate" style={{ color: '#929397' }}>
                  {userInfo.email}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setShowProfileMenu(false)
                console.log('Navigate to settings')
              }}
              className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors"
              style={{ color: '#3B3B3B' }}
              onMouseEnter={e =>
                (e.currentTarget.style.backgroundColor = '#F7F5F3')
              }
              onMouseLeave={e =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
            >
              <span style={{ fontSize: '16px' }}>⚙️</span>
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                setShowProfileMenu(false)
                console.log('Navigate to help')
              }}
              className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors"
              style={{ color: '#3B3B3B' }}
              onMouseEnter={e =>
                (e.currentTarget.style.backgroundColor = '#F7F5F3')
              }
              onMouseLeave={e =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
            >
              <span style={{ fontSize: '16px' }}>❓</span>
              <span>Help & Support</span>
            </button>

            <div
              style={{
                height: '1px',
                backgroundColor: '#E8E1DD',
                margin: '8px 0',
              }}
            ></div>

            <button
              onClick={onSignOut}
              className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors"
              style={{ color: '#3B3B3B' }}
              onMouseEnter={e =>
                (e.currentTarget.style.backgroundColor = '#FEE2E2')
              }
              onMouseLeave={e =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
            >
              <span style={{ fontSize: '16px' }}>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileDropdown
