import { signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'
import {
  ChevronDown,
  Plus,
  Link,
  Palette,
  Settings,
  Smartphone,
  Maximize2,
  X,
} from 'lucide-react'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { api } from '../services/api'

// Types for our data structure
interface TasteResource {
  id: string
  name: string
  imageUrl: string // URL to image.png
  figmaJson: string // Path to figma.json
}

interface Taste {
  id: string
  title: string
  resources: TasteResource[]
}

// Mock current user
const currentUser = {
  id: 'user-1',
  name: 'Niko Anderson',
  email: 'niko@example.com',
}

// Mock data - 5 fake tastes with resources
const mockUserTastes: Taste[] = [
  {
    id: 'taste-1',
    title: 'Minimalist Nordic',
    resources: [
      {
        id: 'res-1',
        name: 'Clean Layout',
        imageUrl: 'https://placehold.co/200x200/E8EBED/1F1F20?text=1',
        figmaJson: '/figma/nordic-1.json',
      },
      {
        id: 'res-2',
        name: 'Typography Study',
        imageUrl: 'https://placehold.co/200x200/FF7262/FFFFFF?text=2',
        figmaJson: '/figma/nordic-2.json',
      },
      {
        id: 'res-3',
        name: 'Color Palette',
        imageUrl: 'https://placehold.co/200x200/A8B5C8/1F1F20?text=3',
        figmaJson: '/figma/nordic-3.json',
      },
    ],
  },
  {
    id: 'taste-2',
    title: 'Bold & Vibrant',
    resources: [
      {
        id: 'res-4',
        name: 'Hero Section',
        imageUrl: 'https://placehold.co/200x200/F5C563/1F1F20?text=4',
        figmaJson: '/figma/bold-1.json',
      },
      {
        id: 'res-5',
        name: 'Card Design',
        imageUrl: 'https://placehold.co/200x200/9ABAAA/FFFFFF?text=5',
        figmaJson: '/figma/bold-2.json',
      },
    ],
  },
  {
    id: 'taste-3',
    title: 'Dark Mode Pro',
    resources: [
      {
        id: 'res-6',
        name: 'Dashboard',
        imageUrl: 'https://placehold.co/200x200/1F1F20/FFFFFF?text=6',
        figmaJson: '/figma/dark-1.json',
      },
      {
        id: 'res-7',
        name: 'Components',
        imageUrl: 'https://placehold.co/200x200/3B3B3B/FFFFFF?text=7',
        figmaJson: '/figma/dark-2.json',
      },
      {
        id: 'res-8',
        name: 'Icons',
        imageUrl: 'https://placehold.co/200x200/4F515A/FFFFFF?text=8',
        figmaJson: '/figma/dark-3.json',
      },
      {
        id: 'res-9',
        name: 'Animations',
        imageUrl: 'https://placehold.co/200x200/929397/FFFFFF?text=9',
        figmaJson: '/figma/dark-4.json',
      },
    ],
  },
  {
    id: 'taste-4',
    title: 'Playful Illustrations',
    resources: [
      {
        id: 'res-10',
        name: 'Characters',
        imageUrl: 'https://placehold.co/200x200/C8B5A5/1F1F20?text=10',
        figmaJson: '/figma/playful-1.json',
      },
    ],
  },
  {
    id: 'taste-5',
    title: 'Corporate Clean',
    resources: [
      {
        id: 'res-11',
        name: 'Header',
        imageUrl: 'https://placehold.co/200x200/B8C5D8/1F1F20?text=11',
        figmaJson: '/figma/corp-1.json',
      },
      {
        id: 'res-12',
        name: 'Footer',
        imageUrl: 'https://placehold.co/200x200/B5B8C8/1F1F20?text=12',
        figmaJson: '/figma/corp-2.json',
      },
    ],
  },
]

// TasteCard component
const TasteCard: React.FC<{
  taste: Taste
  isSelected: boolean
  onClick: () => void
}> = ({ taste, isSelected, onClick }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative h-full cursor-pointer transition-all duration-300"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* Blue border when selected */}
      {isSelected && (
        <div
          className="absolute inset-0 rounded-xl transition-all duration-300"
          style={{
            border: '3px solid #4A90E2',
            margin: '-8px',
          }}
        />
      )}
      <div
        className="h-full rounded-xl p-4 flex flex-col justify-between transition-all duration-300"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: isSelected
            ? '0 8px 24px rgba(74, 144, 226, 0.2)'
            : '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <div
            className="text-sm font-medium mb-3"
            style={{ color: '#3B3B3B' }}
          >
            {taste.title}
          </div>
          <div className="flex items-center">
            {taste.resources.slice(0, 3).map((resource, index) => (
              <div
                key={resource.id}
                className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-white"
                style={{
                  marginLeft: index === 0 ? 0 : -16,
                  backgroundImage: `url(${resource.imageUrl})`,
                  zIndex: taste.resources.length - index,
                }}
              />
            ))}
            {taste.resources.length > 3 && (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white"
                style={{
                  marginLeft: -16,
                  backgroundColor: '#F4F4F4',
                  color: '#4F515A',
                  zIndex: 0,
                }}
              >
                +{taste.resources.length - 3}
              </div>
            )}
            {taste.resources.length === 0 && (
              <div className="text-xs italic" style={{ color: '#929397' }}>
                No resources
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// CreateNewCard component
const CreateNewCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <div
      className="h-full rounded-xl p-4 flex flex-col justify-between transition-all duration-300 hover:scale-105 cursor-pointer"
      onClick={onClick}
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <div>
        <div className="text-sm font-medium mb-3" style={{ color: '#3B3B3B' }}>
          Create new
        </div>
        <button
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ backgroundColor: '#F4F4F4' }}
        >
          <Plus size={24} style={{ color: '#929397' }} />
        </button>
      </div>
    </div>
  )
}

// StyleCard component for resources
const StyleCard: React.FC<{
  resource: TasteResource
  isSelected: boolean
  onClick: () => void
}> = ({ resource, isSelected, onClick }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative cursor-pointer transition-all duration-300 flex-none"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        width: '200px',
      }}
    >
      {/* Blue border when selected */}
      {isSelected && (
        <div
          className="absolute inset-0 rounded-2xl transition-all duration-300"
          style={{
            border: '3px solid #4A90E2',
            margin: '-8px',
            zIndex: 1,
          }}
        />
      )}
      <div
        className="rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: '#E8EBED',
          boxShadow: isSelected
            ? '0 8px 24px rgba(74, 144, 226, 0.2)'
            : '0 2px 12px rgba(0,0,0,0.08)',
          height: '280px',
        }}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Icon at top */}
          <div className="flex justify-center mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#1F1F20' }}
            >
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>

          {/* Preview area with image */}
          <div
            className="flex-1 rounded-xl mb-4 bg-cover bg-center"
            style={{
              backgroundColor: 'rgba(255,255,255,0.6)',
              backgroundImage: `url(${resource.imageUrl})`,
            }}
          ></div>

          {/* Text at bottom */}
          <div className="text-center">
            <div
              className="text-sm font-medium mb-1"
              style={{ color: '#3B3B3B' }}
            >
              {resource.name}
            </div>
            <div className="text-xs" style={{ color: '#929397' }}>
              By {currentUser.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// CreateTasteModal component
const CreateTasteModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  // eslint-disable-next-line no-unused-vars
  onConfirm: (title: string) => void
}> = ({ isOpen, onClose, onConfirm }) => {
  const [title, setTitle] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (title.trim()) {
      onConfirm(title.trim())
      setTitle('')
    }
  }

  const handleCancel = () => {
    setTitle('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleCancel}
    >
      <div
        className="rounded-2xl p-6 relative"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          width: '400px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ backgroundColor: '#F4F4F4' }}
        >
          <X size={16} style={{ color: '#4F515A' }} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-medium mb-6" style={{ color: '#3B3B3B' }}>
          Create New Taste
        </h2>

        {/* Input */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: '#4F515A' }}
          >
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleConfirm()
              }
            }}
            placeholder="Enter taste title..."
            className="w-full px-4 py-3 rounded-lg focus:outline-none"
            style={{
              backgroundColor: '#F7F5F3',
              border: 'none',
              color: '#3B3B3B',
              fontSize: '14px',
            }}
            autoFocus
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105"
            style={{
              backgroundColor: '#F4F4F4',
              color: '#4F515A',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!title.trim()}
            className="px-5 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105"
            style={{
              backgroundColor: title.trim() ? '#F5C563' : '#E8E8E8',
              color: title.trim() ? '#1F1F20' : '#929397',
              boxShadow: title.trim()
                ? '0 2px 12px rgba(245, 197, 99, 0.3)'
                : 'none',
              cursor: title.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('left')
  const [expandedStage, setExpandedStage] = useState<number | null>(1)
  const [toggleOn, setToggleOn] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [ideaText, setIdeaText] = useState('')
  const [selectedTasteId, setSelectedTasteId] = useState<string | null>(null)
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null,
  )
  const [isCreateTasteModalOpen, setIsCreateTasteModalOpen] = useState(false)
  const [tastes, setTastes] = useState<Taste[]>(mockUserTastes)

  const [userInfo, setUserInfo] = useState<{
    username: string
    email: string
    name?: string
    givenName?: string
    familyName?: string
    picture?: string
    initials: string
  } | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // ===== NEW: API Testing State =====
  const [apiStatus, setApiStatus] = useState<
    'checking' | 'connected' | 'error'
  >('checking')

  useEffect(() => {
    loadUserInfo()
    testApiConnection() // NEW: Test API on mount
  }, [])

  // ===== NEW: Test API Connection =====
  const testApiConnection = async () => {
    try {
      await api.healthCheck()
      setApiStatus('connected')
      console.log('API connection successful')
    } catch (error) {
      console.error('API connection failed:', error)
      setApiStatus('error')
    }
  }

  // ===== NEW: Test Protected Endpoint =====
  const testProtectedEndpoint = async () => {
    try {
      const data = await api.getProtectedData()
      alert('API Success:\n' + JSON.stringify(data, null, 2))
    } catch (error) {
      alert(
        'API Error: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      )
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu])

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      const parts = name
        .trim()
        .split(' ')
        .filter(part => part.length > 0)
      if (parts.length >= 2) {
        // First and last name initials
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      if (parts.length === 1 && parts[0].length > 0) {
        // Only one name, take first letter twice or first two letters
        return (
          parts[0][0].toUpperCase() +
          (parts[0][1]?.toUpperCase() || parts[0][0].toUpperCase())
        )
      }
    }

    if (email) {
      const emailParts = email.split('@')[0]
      const nameParts = emailParts
        .split(/[._-]/)
        .filter(part => part.length > 0)
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      }
      return emailParts.substring(0, 2).toUpperCase()
    }

    return '??'
  }

  const loadUserInfo = async () => {
    try {
      const user = await getCurrentUser()
      const session = await fetchAuthSession()
      const payload = session.tokens?.idToken?.payload

      const email = payload?.['email'] as string
      const name = payload?.['name'] as string | undefined
      const givenName = payload?.['given_name'] as string | undefined
      const familyName = payload?.['family_name'] as string | undefined
      const picture = payload?.['picture'] as string | undefined

      const initials = getInitials(name, email)

      setUserInfo({
        username: user.username,
        email,
        ...(name !== undefined && { name }),
        ...(givenName !== undefined && { givenName }),
        ...(familyName !== undefined && { familyName }),
        ...(picture !== undefined && { picture }),
        initials,
      })

      console.log('User info loaded:', {
        email,
        name,
        initials,
        picture,
        fullPayload: payload,
      })
    } catch (error) {
      console.error('Error loading user info:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Get selected taste
  const selectedTaste = useMemo(() => {
    return tastes.find(t => t.id === selectedTasteId)
  }, [selectedTasteId, tastes])

  // Auto-expand stages based on selections
  useEffect(() => {
    if (selectedTasteId) {
      const taste = tastes.find(t => t.id === selectedTasteId)
      if (taste) {
        if (taste.resources.length === 0) {
          // Skip stage 2, go to stage 3
          setExpandedStage(3)
        } else {
          // Go to stage 2
          setExpandedStage(2)
        }
      }
    }
  }, [selectedTasteId, tastes])

  useEffect(() => {
    if (selectedResourceId) {
      setExpandedStage(3)
    }
  }, [selectedResourceId])

  // Handle create new taste
  const handleCreateTaste = (title: string) => {
    const newTaste: Taste = {
      id: `taste-${Date.now()}`,
      title,
      resources: [],
    }
    setTastes(prev => [...prev, newTaste])
    setIsCreateTasteModalOpen(false)
    setSelectedTasteId(newTaste.id)
    setSelectedResourceId(null)

    // Scroll to the new taste (in a real app, you'd use a ref)
    setTimeout(() => {
      const scrollContainer = document.querySelector(
        '[data-taste-scroll]',
      ) as HTMLElement
      if (scrollContainer) {
        scrollContainer.scrollLeft = scrollContainer.scrollWidth
      }
    }, 100)
  }

  // Build dynamic content for stage 1 based on userTastes
  const startWithTasteContent = useMemo(() => {
    if (!tastes || tastes.length === 0) {
      return (
        <div className="p-6 flex justify-center items-center min-h-[120px]">
          <div style={{ width: '220px' }}>
            <CreateNewCard onClick={() => setIsCreateTasteModalOpen(true)} />
          </div>
        </div>
      )
    }

    return (
      <div className="p-6 flex gap-6 items-stretch">
        {/* Left area: scrollable tastes */}
        <div
          data-taste-scroll
          className="flex-1 overflow-x-auto overflow-y-visible taste-scroll-container"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>{`
            .taste-scroll-container::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div
            className="flex gap-6 h-full"
            style={{ minWidth: 'min-content' }}
          >
            {tastes.map(taste => (
              <div
                key={taste.id}
                style={{ width: '220px' }}
                className="flex-none"
              >
                <TasteCard
                  taste={taste}
                  isSelected={selectedTasteId === taste.id}
                  onClick={() => {
                    setSelectedTasteId(taste.id)
                    setSelectedResourceId(null)
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        {/* Right area: fixed-size create card */}
        <div style={{ width: '220px' }} className="flex-none">
          <CreateNewCard onClick={() => setIsCreateTasteModalOpen(true)} />
        </div>
      </div>
    )
  }, [tastes, selectedTasteId])

  // Build dynamic content for stage 2 based on selected taste
  const chooseStyleContent = useMemo(() => {
    if (!selectedTaste) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <div className="text-center" style={{ color: '#929397' }}>
            Please select a taste first
          </div>
        </div>
      )
    }

    if (selectedTaste.resources.length === 0) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <div className="text-center" style={{ color: '#929397' }}>
            No resources available for this taste
          </div>
        </div>
      )
    }

    return (
      <div className="p-6">
        <div
          className="overflow-x-auto overflow-y-hidden style-scroll-container"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>{`
            .style-scroll-container::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
            {selectedTaste.resources.map(resource => (
              <StyleCard
                key={resource.id}
                resource={resource}
                isSelected={selectedResourceId === resource.id}
                onClick={() => setSelectedResourceId(resource.id)}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }, [selectedTaste, selectedResourceId])

  // Determine if stages can be opened
  const canOpenStage2 =
    selectedTasteId !== null &&
    selectedTaste !== undefined &&
    selectedTaste.resources.length > 0
  const canOpenStage3 =
    selectedTasteId !== null &&
    (selectedResourceId !== null ||
      (selectedTaste !== undefined && selectedTaste.resources.length === 0))

  const stages = [
    {
      id: 1,
      title: 'Start with taste',
      icon: ChevronDown,
      hasNewButton: false,
      content: startWithTasteContent,
      canOpen: true,
    },
    {
      id: 2,
      title: 'Choose a style',
      icon: Palette,
      hasNewButton: true,
      content: chooseStyleContent,
      canOpen: canOpenStage2,
    },
    {
      id: 3,
      title: 'Link your idea',
      icon: Link,
      hasNewButton: false,
      content: (
        <div
          className="p-6"
          onDragEnter={e => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={e => {
            e.preventDefault()
            if (e.currentTarget === e.target) {
              setIsDragging(false)
            }
          }}
          onDragOver={e => {
            e.preventDefault()
          }}
          onDrop={e => {
            e.preventDefault()
            setIsDragging(false)
            const files = Array.from(e.dataTransfer.files)
            setUploadedFiles(prev => [
              ...prev,
              ...files.slice(0, 200 - prev.length),
            ])
          }}
        >
          {!isDragging ? (
            <>
              {/* Button row */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded"
                    style={{ backgroundColor: '#FF7262' }}
                  ></div>
                  <span className="text-sm" style={{ color: '#3B3B3B' }}>
                    Main scenario.fig
                  </span>
                </button>

                <button
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <Settings size={18} style={{ color: '#4F515A' }} />
                </button>

                <button
                  className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <Smartphone size={18} style={{ color: '#4F515A' }} />
                  <span className="text-sm" style={{ color: '#3B3B3B' }}>
                    iOS
                  </span>
                </button>

                <button
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <Maximize2 size={18} style={{ color: '#4F515A' }} />
                </button>
              </div>

              {/* Text area with Enter hint */}
              <div className="relative mb-4">
                <textarea
                  placeholder="Describe your idea"
                  value={ideaText}
                  onChange={e => setIdeaText(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg resize-none focus:outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#3B3B3B',
                    fontSize: '14px',
                  }}
                  rows={2}
                />
                {ideaText.length > 0 && (
                  <div
                    className="absolute bottom-3 right-4 px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: '#F4F4F4', color: '#929397' }}
                  >
                    Enter
                  </div>
                )}
              </div>

              {/* Bottom row with file previews and Create button */}
              <div className="flex items-center justify-end gap-3">
                {/* File previews - overlapping */}
                {uploadedFiles.length > 0 && (
                  <div
                    className="flex items-center"
                    style={{ marginRight: 'auto' }}
                  >
                    {uploadedFiles.slice(0, 3).map((file, index) => {
                      const extension = (file.name.split('.').pop() ?? '')
                        .toUpperCase()
                        .slice(0, 3)
                      return (
                        <div
                          key={index}
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-xs font-medium"
                          style={{
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            marginLeft: index > 0 ? '-8px' : '0',
                            zIndex: uploadedFiles.length - index,
                            color: '#4F515A',
                          }}
                        >
                          {extension}
                        </div>
                      )
                    })}
                    {uploadedFiles.length > 3 && (
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-xs font-medium"
                        style={{
                          backgroundColor: '#F4F4F4',
                          marginLeft: '-8px',
                          color: '#4F515A',
                        }}
                      >
                        +{uploadedFiles.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Create button */}
                <button
                  className="px-6 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#F5C563',
                    color: '#1F1F20',
                    boxShadow: '0 2px 12px rgba(245, 197, 99, 0.3)',
                  }}
                >
                  Create
                </button>
              </div>
            </>
          ) : (
            <div
              className="rounded-2xl flex flex-col items-center justify-center"
              style={{
                border: '2px dashed #929397',
                minHeight: '240px',
                backgroundColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <div className="text-xs mb-4" style={{ color: '#929397' }}>
                Up to 200 files
              </div>
              <div
                className="text-lg font-medium mb-6"
                style={{ color: '#3B3B3B' }}
              >
                Drop here
              </div>
              <div className="flex gap-3">
                <div
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: '#F4F4F4', color: '#4F515A' }}
                >
                  PDF
                </div>
                <div
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: '#F4F4F4', color: '#4F515A' }}
                >
                  DOC
                </div>
                <div
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: '#F4F4F4', color: '#4F515A' }}
                >
                  IMG
                </div>
              </div>
            </div>
          )}
        </div>
      ),
      canOpen: canOpenStage3,
    },
  ]

  const tabs = [
    { id: 'left', icon: '🏆' },
    { id: 'middle', icon: '08' },
    { id: 'right', icon: '👁' },
  ]

  const galleryItems = [
    { id: 1, title: 'Milkinside', bgColor: '#A8B5C8', height: 320 },
    { id: 2, title: 'Futuristic', bgColor: '#B8C5D8', height: 240 },
    { id: 3, title: 'Layouts', bgColor: '#9ABAAA', height: 280 },
    { id: 4, title: 'Ambient', bgColor: '#B5B8C8', height: 360 },
    { id: 5, title: 'RonDesign', bgColor: '#C8B5A5', height: 420 },
  ]

  const renderTabContent = () => {
    if (activeTab === 'left') {
      return (
        <div className="flex-1 flex flex-col items-center justify-start pt-16 px-8">
          <h1
            className="text-5xl font-light mb-12"
            style={{ color: '#3B3B3B' }}
          >
            New project
          </h1>

          {/* Accordion */}
          <div className="w-full max-w-2xl">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className="mb-3 rounded-2xl overflow-hidden transition-all duration-500"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  opacity: stage.canOpen ? 1 : 0.5,
                }}
              >
                {/* Stage Header */}
                <button
                  onClick={() => {
                    if (stage.canOpen) {
                      setExpandedStage(
                        expandedStage === stage.id ? null : stage.id,
                      )
                    }
                  }}
                  className="w-full flex items-center justify-between px-6 py-5 transition-all hover:bg-opacity-95"
                  disabled={!stage.canOpen}
                  style={{
                    cursor: stage.canOpen ? 'pointer' : 'not-allowed',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-lg font-medium"
                      style={{ color: '#929397' }}
                    >
                      {index + 1}.
                    </span>
                    <span
                      className="text-lg font-normal"
                      style={{ color: '#3B3B3B' }}
                    >
                      {stage.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {stage.hasNewButton && expandedStage === stage.id && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                        }}
                        className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:scale-105"
                        style={{ backgroundColor: '#F4F4F4' }}
                      >
                        <span className="text-sm" style={{ color: '#3B3B3B' }}>
                          New
                        </span>
                        <Plus size={16} style={{ color: '#3B3B3B' }} />
                      </button>
                    )}
                    <div
                      className="transition-transform duration-300"
                      style={{
                        transform:
                          expandedStage === stage.id
                            ? 'rotate(180deg)'
                            : 'rotate(0deg)',
                      }}
                    >
                      {expandedStage === stage.id ? (
                        <ChevronDown size={20} style={{ color: '#3B3B3B' }} />
                      ) : (
                        React.createElement(stage.icon, {
                          size: 20,
                          style: { color: '#929397' },
                        })
                      )}
                    </div>
                  </div>
                </button>
                {/* Stage Content */}
                <div
                  className="overflow-hidden transition-all duration-500 ease-in-out"
                  style={{
                    maxHeight: expandedStage === stage.id ? '800px' : '0px',
                    opacity: expandedStage === stage.id ? 1 : 0,
                  }}
                >
                  <div style={{ backgroundColor: '#F7F5F3' }}>
                    {stage.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    } else if (activeTab === 'middle') {
      return (
        <div className="flex-1 flex px-8 pt-8 gap-6">
          {/* Left column - Gallery items */}
          <div className="flex flex-col gap-4" style={{ width: '280px' }}>
            {galleryItems.map(item => (
              <div
                key={item.id}
                className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-105"
                style={{
                  backgroundColor: item.bgColor,
                  height: `${item.height}px`,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  backgroundImage: `linear-gradient(135deg, ${item.bgColor} 0%, ${item.bgColor}dd 100%)`,
                  position: 'relative',
                }}
              >
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3
                    className="text-xl font-medium"
                    style={{ color: '#1F1F20' }}
                  >
                    {item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          {/* Right area - placeholder for content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">08</div>
              <div className="text-lg" style={{ color: '#929397' }}>
                Gallery View
              </div>
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">👁</div>
            <div className="text-lg" style={{ color: '#929397' }}>
              Preview Tab
            </div>
          </div>
        </div>
      )
    }
  }

  return (
    <div
      className="min-h-screen min-w-screen flex flex-col"
      style={{ backgroundColor: '#EDEBE9' }}
    >
      {/* Create Taste Modal */}
      <CreateTasteModal
        isOpen={isCreateTasteModalOpen}
        onClose={() => setIsCreateTasteModalOpen(false)}
        onConfirm={handleCreateTaste}
      />

      {/* API Test Controls - Floating top right */}
      <div
        style={{
          position: 'fixed',
          top: 80,
          right: 20,
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* API Status */}
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor:
                apiStatus === 'connected'
                  ? '#10B981'
                  : apiStatus === 'error'
                    ? '#EF4444'
                    : '#F59E0B',
            }}
          />
          <span style={{ fontSize: '12px', color: '#3B3B3B' }}>
            {apiStatus === 'connected'
              ? 'API OK'
              : apiStatus === 'error'
                ? 'API Error'
                : 'Testing...'}
          </span>
        </div>

        {/* Test Button */}
        <button
          onClick={testProtectedEndpoint}
          style={{
            padding: '10px 16px',
            backgroundColor: '#F5C563',
            color: '#1F1F20',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap',
          }}
        >
          Test API
        </button>
      </div>

      {/* Top Navigation - Fixed */}
      <div className="flex items-center justify-between px-8 py-4">
        {/* Left - Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setToggleOn(!toggleOn)}
            className="relative rounded-full transition-all duration-300"
            style={{
              width: '52px',
              height: '32px',
              backgroundColor: toggleOn ? '#3B3B3B' : '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <div
              className="absolute top-1 rounded-full transition-all duration-300"
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: toggleOn ? '#FFFFFF' : '#3B3B3B',
                left: toggleOn ? '24px' : '4px',
              }}
            />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#3B3B3B',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            R
          </div>
        </div>

        {/* Center - Tabs */}
        <div
          className="flex items-center gap-1 rounded-full p-1"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-6 py-2 rounded-full transition-all duration-300 text-sm"
              style={{
                backgroundColor:
                  activeTab === tab.id ? '#F4F4F4' : 'transparent',
                color: activeTab === tab.id ? '#3B3B3B' : '#929397',
              }}
            >
              {tab.icon}
            </button>
          ))}
        </div>

        {/* Right - Status & Profile */}
        <div className="flex items-center gap-3">
          <div
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#3B3B3B',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            25%
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all hover:scale-105"
              style={{ backgroundColor: '#3B3B3B', color: '#FFFFFF' }}
              title={
                userInfo ? `${userInfo.name || userInfo.email}` : 'Profile'
              }
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
                <div
                  className="p-4"
                  style={{ borderBottom: '1px solid #E8E1DD' }}
                >
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
                      <div
                        className="text-xs truncate"
                        style={{ color: '#929397' }}
                      >
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
                    onClick={handleSignOut}
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
        </div>
      </div>

      {/* Main Content - Changes based on active tab */}
      <div className="flex-1 overflow-hidden">
        <div
          className="h-full transition-all duration-500 ease-in-out"
          style={{
            opacity: 1,
            transform: 'translateY(0)',
          }}
        >
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
