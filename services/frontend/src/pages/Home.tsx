import { signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'
import { ChevronDown, Plus, Link, Palette, X, Sparkles } from 'lucide-react'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import ConfigurationMenu from '../components/ConfigurationMenu'

// ============================================================================
// TYPES
// ============================================================================

interface UserInfo {
  name: string
  email: string
  initials: string
  picture?: string
}

interface ResourceDisplay {
  resource_id: string
  name: string
  imageUrl: string | null
  has_image: boolean
  has_figma: boolean
}

interface TasteDisplay {
  taste_id: string
  name: string
  resources: ResourceDisplay[]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get initials from a name (first letter capitalized)
 */
function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

/**
 * Select up to 3 resources for display, prioritizing those with images
 */
function selectDisplayResources(
  resources: ResourceDisplay[],
): ResourceDisplay[] {
  // Separate resources with and without images
  const withImages = resources.filter(r => r.has_image && r.imageUrl)
  const withoutImages = resources.filter(r => !r.has_image || !r.imageUrl)

  // Prioritize resources with images
  const selected: ResourceDisplay[] = []

  // First add up to 3 with images
  selected.push(...withImages.slice(0, 3))

  // If we have less than 3, fill with resources without images
  if (selected.length < 3) {
    selected.push(...withoutImages.slice(0, 3 - selected.length))
  }

  return selected
}

// ============================================================================
// TASTE CARD COMPONENT
// ============================================================================

interface TasteCardProps {
  taste: TasteDisplay
  isSelected: boolean
  onClick: () => void
}

const TasteCard: React.FC<TasteCardProps> = ({
  taste,
  isSelected,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const displayResources = selectDisplayResources(taste.resources)

  return (
    <div
      className="relative h-full cursor-pointer transition-all duration-300"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        // Add padding to contain the selection ring
        padding: '8px',
      }}
    >
      <div
        className="h-full rounded-xl p-4 flex flex-col justify-between transition-all duration-300 relative"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: isSelected
            ? '0 8px 24px rgba(74, 144, 226, 0.2)'
            : isHovered
              ? '0 4px 16px rgba(0,0,0,0.12)'
              : '0 2px 12px rgba(0,0,0,0.08)',
          transform:
            isHovered && !isSelected ? 'translateY(-2px)' : 'translateY(0)',
          // Selection ring as box-shadow (stays within bounds)
          outline: isSelected ? '3px solid #4A90E2' : 'none',
          outlineOffset: '-3px',
        }}
      >
        <div>
          <div
            className="text-sm font-medium mb-3"
            style={{ color: '#3B3B3B' }}
          >
            {taste.name}
          </div>
          <div className="flex items-center">
            {displayResources.map((resource, index) => (
              <div
                key={resource.resource_id}
                className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center overflow-hidden"
                style={{
                  marginLeft: index === 0 ? 0 : -16,
                  zIndex: displayResources.length - index,
                  backgroundColor: resource.has_image
                    ? 'transparent'
                    : '#F4F4F4',
                }}
              >
                {resource.has_image && resource.imageUrl ? (
                  <img
                    src={resource.imageUrl}
                    alt={resource.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className="text-sm font-medium"
                    style={{ color: '#4F515A' }}
                  >
                    {getInitials(resource.name)}
                  </span>
                )}
              </div>
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

// ============================================================================
// CREATE NEW CARD COMPONENT
// ============================================================================

interface CreateNewCardProps {
  onClick: () => void
}

const CreateNewCard: React.FC<CreateNewCardProps> = ({ onClick }) => {
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

// ============================================================================
// CREATE RESOURCE MODAL COMPONENT
// ============================================================================

interface CreateResourceModalProps {
  isOpen: boolean
  onClose: () => void
  // eslint-disable-next-line no-unused-vars
  onConfirm: (resourceName: string) => void
  isLoading: boolean
  fileCount: number
}

const CreateResourceModal: React.FC<CreateResourceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  fileCount,
}) => {
  const [resourceName, setResourceName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setResourceName('')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (resourceName.trim()) {
      onConfirm(resourceName.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium" style={{ color: '#3B3B3B' }}>
            Name Your Resource
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ backgroundColor: '#F4F4F4' }}
            disabled={isLoading}
          >
            <X size={18} style={{ color: '#929397' }} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: '#929397' }}>
          {fileCount} file{fileCount !== 1 ? 's' : ''} will be uploaded to this
          resource
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Resource Name
            </label>
            <input
              type="text"
              value={resourceName}
              onChange={e => setResourceName(e.target.value)}
              placeholder="e.g., Hero Design v1"
              className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all"
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
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105"
              style={{
                backgroundColor: '#F4F4F4',
                color: '#3B3B3B',
              }}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105 disabled:opacity-50"
              style={{
                backgroundColor: '#F5C563',
                color: '#1F1F20',
                boxShadow: '0 2px 12px rgba(245, 197, 99, 0.3)',
              }}
              disabled={isLoading || !resourceName.trim()}
            >
              {isLoading ? 'Creating...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// CREATE PROJECT MODAL COMPONENT
// ============================================================================

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  // eslint-disable-next-line no-unused-vars
  onConfirm: (projectName: string) => void
  isLoading: boolean
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setProjectName('')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (projectName.trim()) {
      onConfirm(projectName.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium" style={{ color: '#3B3B3B' }}>
            Name Your Project
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ backgroundColor: '#F4F4F4' }}
            disabled={isLoading}
          >
            <X size={18} style={{ color: '#929397' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="e.g., Q1 Landing Page"
              className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all"
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
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105"
              style={{
                backgroundColor: '#F4F4F4',
                color: '#3B3B3B',
              }}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105 disabled:opacity-50"
              style={{
                backgroundColor: '#F5C563',
                color: '#1F1F20',
                boxShadow: '0 2px 12px rgba(245, 197, 99, 0.3)',
              }}
              disabled={isLoading || !projectName.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CreateTasteModalProps {
  isOpen: boolean
  onClose: () => void
  // eslint-disable-next-line no-unused-vars
  onConfirm: (tasteName: string) => void
  isLoading: boolean
}

const CreateTasteModal: React.FC<CreateTasteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [tasteName, setTasteName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTasteName('')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tasteName.trim()) {
      onConfirm(tasteName.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium" style={{ color: '#3B3B3B' }}>
            Create New Taste
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ backgroundColor: '#F4F4F4' }}
            disabled={isLoading}
          >
            <X size={18} style={{ color: '#929397' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Taste Name
            </label>
            <input
              type="text"
              value={tasteName}
              onChange={e => setTasteName(e.target.value)}
              placeholder="e.g., Minimalist Nordic"
              className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all"
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
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105"
              style={{
                backgroundColor: '#F4F4F4',
                color: '#3B3B3B',
              }}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105 disabled:opacity-50"
              style={{
                backgroundColor: '#F5C563',
                color: '#1F1F20',
                boxShadow: '0 2px 12px rgba(245, 197, 99, 0.3)',
              }}
              disabled={isLoading || !tasteName.trim()}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// STYLE CARD COMPONENT (Resources)
// ============================================================================

interface StyleCardProps {
  resource: ResourceDisplay
  isSelected: boolean
  onClick: () => void
}

const StyleCard: React.FC<StyleCardProps> = ({
  resource,
  isSelected,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative cursor-pointer transition-all duration-300 flex-none"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '240px',
        height: '340px',
      }}
    >
      {/* Main card container with background color */}
      <div
        className="rounded-3xl transition-all duration-300 relative h-full"
        style={{
          backgroundColor: '#E8EBED',
          boxShadow: isSelected
            ? '0 12px 32px rgba(74, 144, 226, 0.3)'
            : isHovered
              ? '0 8px 24px rgba(0,0,0,0.15)'
              : '0 4px 16px rgba(0,0,0,0.1)',
          transform:
            isHovered && !isSelected ? 'translateY(-4px)' : 'translateY(0)',
          outline: isSelected ? '3px solid #4A90E2' : 'none',
          outlineOffset: '-3px',
          overflow: 'hidden',
        }}
      >
        {/* 3D Card Stack Container */}
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '48%',
            transform: 'translate(-50%, -50%)',
            width: '180px',
            height: '240px',
          }}
        >
          {/* Back card (furthest) - smaller, positioned HIGHER so it peeks out on top */}
          <div
            className="absolute rounded-2xl"
            style={{
              width: '150px',
              height: '210px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              left: '50%',
              top: '40%', // Moved down (was 35%)
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
            }}
          />

          {/* Middle card - medium size, positioned between back and front, also peeks out on top */}
          <div
            className="absolute rounded-2xl"
            style={{
              width: '165px',
              height: '225px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
              left: '50%',
              top: '45%', // Moved down (was 42%)
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
          />

          {/* Front card with resource image - full size, positioned lowest */}
          <div
            className="absolute rounded-2xl overflow-hidden"
            style={{
              width: '180px',
              height: '240px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
              left: '50%',
              top: '50%', // Stays the same
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
            }}
          >
            {resource.imageUrl ? (
              <img
                src={resource.imageUrl}
                alt={resource.name}
                className="w-full h-full object-cover"
                onError={e => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none'
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    parent.style.display = 'flex'
                    parent.style.alignItems = 'center'
                    parent.style.justifyContent = 'center'
                    parent.style.backgroundColor = '#F4F4F4'
                    parent.innerHTML = `<span style="color: #929397; font-size: 48px; font-weight: bold;">${getInitials(resource.name)}</span>`
                  }
                }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: '#F4F4F4' }}
              >
                <span
                  className="text-5xl font-bold"
                  style={{ color: '#929397' }}
                >
                  {getInitials(resource.name)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom blur envelope with PROPER DEPRESSION/DIP in middle */}
        <div
          className="absolute left-0 right-0"
          style={{
            bottom: 0,
            height: '35%',
            zIndex: 5,
          }}
        >
          {/* Frosted glass with depression - the middle third dips DOWN creating envelope shape */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '100%',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              // Creates a depression with subtle depth: flat left → dip down → dip stays down → back up → flat right
              clipPath:
                'polygon(0 0, 32% 0, 37% 20%, 63% 20%, 68% 0, 100% 0, 100% 100%, 0 100%)',
              willChange: 'clip-path',
            }}
          />

          {/* Text content over the blur */}
          <div
            className="absolute left-0 right-0 bottom-0 px-5 pb-5 pt-7"
            style={{
              zIndex: 6,
            }}
          >
            <h3
              className="text-base font-semibold mb-1 truncate"
              style={{ color: '#1F1F20' }}
            >
              {resource.name}
            </h3>
            <p className="text-xs truncate" style={{ color: '#929397' }}>
              by Milkinside
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN HOME COMPONENT
// ============================================================================

export default function Home() {
  // ============================================================================
  // HOOKS
  // ============================================================================

  const navigate = useNavigate()

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // User state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // UI state
  // const [toggleOn, setToggleOn] = useState(false)
  const [activeTab, setActiveTab] = useState<'left' | 'middle' | 'right'>(
    'left',
  )

  // Data state
  const [tastes, setTastes] = useState<TasteDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Accordion state
  const [expandedStage, setExpandedStage] = useState<number | null>(1)
  const [selectedTasteId, setSelectedTasteId] = useState<string | null>(null)
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null,
  )

  // Modal state
  const [isCreateTasteModalOpen, setIsCreateTasteModalOpen] = useState(false)
  const [isCreatingTaste, setIsCreatingTaste] = useState(false)

  const [isCreateResourceModalOpen, setIsCreateResourceModalOpen] =
    useState(false)
  const [isCreatingResource, setIsCreatingResource] = useState(false)

  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)

  // Stage 3 state
  const [ideaText, setIdeaText] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Continue project state
  const [hasActiveProject, setHasActiveProject] = useState(false)
  const [activeProjectName, setActiveProjectName] = useState<string | null>(
    null,
  )

  // Random UI availability state
  const [hasDesignMLUIs, setHasDesignMLUIs] = useState(false)
  const [hasReactUIs, setHasReactUIs] = useState(false)
  const [checkingUIs, setCheckingUIs] = useState(true)

  // Refs
  const menuRef = useRef<HTMLDivElement>(null)

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const selectedTaste = useMemo(
    () => tastes.find(t => t.taste_id === selectedTasteId),
    [tastes, selectedTasteId],
  )

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load user info
  useEffect(() => {
    async function loadUserInfo() {
      try {
        await getCurrentUser() // Verify user is authenticated
        const session = await fetchAuthSession()
        const email = session.tokens?.idToken?.payload['email'] as
          | string
          | undefined
        const name = session.tokens?.idToken?.payload['name'] as
          | string
          | undefined
        const picture = session.tokens?.idToken?.payload['picture'] as
          | string
          | undefined

        if (email) {
          const nameParts = (name || email.split('@')[0]).split(' ')
          const initials =
            nameParts.length > 1
              ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
              : nameParts[0].slice(0, 2).toUpperCase()

          setUserInfo({
            name: name || email.split('@')[0],
            email,
            initials,
            picture,
          })
        }
      } catch (err) {
        console.error('Failed to load user info:', err)
      }
    }

    loadUserInfo()
  }, [])

  // Load tastes from database
  useEffect(() => {
    async function loadTastes() {
      try {
        setLoading(true)
        setError(null)

        const apiTastes = await api.tastes.list()

        // Transform API tastes to display format with resources
        const displayTastes: TasteDisplay[] = await Promise.all(
          apiTastes.map(async taste => {
            try {
              // Fetch resources for this taste
              const resources = await api.resources.list(taste.taste_id)

              // Transform resources to display format with download URLs
              const displayResources: ResourceDisplay[] = await Promise.all(
                resources.map(async resource => {
                  let imageUrl: string | null = null

                  // If resource has an image, get the download URL
                  if (resource.has_image) {
                    try {
                      const resourceWithUrls = await api.resources.get(
                        taste.taste_id,
                        resource.resource_id,
                        true, // include download URLs
                      )
                      imageUrl =
                        resourceWithUrls.download_urls?.image_get_url || null
                    } catch (err) {
                      console.error(
                        `Failed to get image URL for resource ${resource.resource_id}:`,
                        err,
                      )
                    }
                  }

                  return {
                    resource_id: resource.resource_id,
                    name: resource.name,
                    imageUrl,
                    has_image: resource.has_image,
                    has_figma: resource.has_figma,
                  }
                }),
              )

              return {
                taste_id: taste.taste_id,
                name: taste.name,
                resources: displayResources,
              }
            } catch (err) {
              console.error(
                `Failed to load resources for taste ${taste.taste_id}:`,
                err,
              )
              return {
                taste_id: taste.taste_id,
                name: taste.name,
                resources: [],
              }
            }
          }),
        )

        setTastes(displayTastes)
      } catch (err) {
        console.error('Failed to load tastes:', err)
        setError('Failed to load tastes. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    loadTastes()
  }, [])

  // Check for available UIs by rendering mode
  useEffect(() => {
    async function checkAvailableUIs() {
      setCheckingUIs(true)
      try {
        // Check for design-ml UIs
        const hasDesignML = await api.llm.hasUIsByMode('design-ml')
        setHasDesignMLUIs(hasDesignML)

        // Check for react UIs
        const hasReact = await api.llm.hasUIsByMode('react')
        setHasReactUIs(hasReact)
      } catch (err) {
        console.error('Failed to check available UIs:', err)
      } finally {
        setCheckingUIs(false)
      }
    }

    checkAvailableUIs()
  }, [])

  // Save state to sessionStorage to preserve during navigation
  useEffect(() => {
    const stateToSave = {
      selectedTasteId,
      selectedResourceId,
      ideaText,
      uploadedFiles: uploadedFiles.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
      })),
      expandedStage,
    }
    sessionStorage.setItem('home_state', JSON.stringify(stateToSave))
  }, [
    selectedTasteId,
    selectedResourceId,
    ideaText,
    uploadedFiles,
    expandedStage,
  ])

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('home_state')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed.selectedTasteId) setSelectedTasteId(parsed.selectedTasteId)
        if (parsed.selectedResourceId)
          setSelectedResourceId(parsed.selectedResourceId)
        if (parsed.ideaText) setIdeaText(parsed.ideaText)
        if (parsed.expandedStage) setExpandedStage(parsed.expandedStage)
        // Note: Files cannot be restored from sessionStorage
        // User will need to re-upload if they navigate back
      } catch (err) {
        console.error('Failed to restore home state:', err)
      }
    }

    // Check for active project (user came back from Editor)
    const currentProject = localStorage.getItem('current_project')
    const cameFromEditor = sessionStorage.getItem('came_from_editor')
    if (currentProject && cameFromEditor === 'true') {
      try {
        const project = JSON.parse(currentProject)
        setHasActiveProject(true)
        setActiveProjectName(project.project_name)
      } catch (err) {
        console.error('Failed to load active project:', err)
      }
    }

    // Clear the came_from_editor flag after checking
    sessionStorage.removeItem('came_from_editor')
  }, [])

  // Close profile menu when clicking outside
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

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSignOut = async () => {
    try {
      await signOut()
      // Dispatch custom event to notify App.tsx
      window.dispatchEvent(new Event('auth-signout'))
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleCreateTaste = async (name: string) => {
    try {
      setIsCreatingTaste(true)

      // Create taste in database
      const newTaste = await api.tastes.create(name, {})

      // Add to local state
      const displayTaste: TasteDisplay = {
        taste_id: newTaste.taste_id,
        name: newTaste.name,
        resources: [],
      }

      setTastes([...tastes, displayTaste])

      // Select the new taste
      setSelectedTasteId(newTaste.taste_id)
      setSelectedResourceId(null)

      // Since it has no resources, expand stage 3 directly
      setExpandedStage(3)

      // Close modal
      setIsCreateTasteModalOpen(false)

      // Scroll to the new taste
      setTimeout(() => {
        const scrollContainer = document.querySelector(
          '[data-taste-scroll]',
        ) as HTMLElement
        if (scrollContainer) {
          scrollContainer.scrollLeft = scrollContainer.scrollWidth
        }
      }, 100)
    } catch (err) {
      console.error('Failed to create taste:', err)
      alert('Failed to create taste. Please try again.')
    } finally {
      setIsCreatingTaste(false)
    }
  }

  const handleCreateResource = async (resourceName: string) => {
    if (!selectedTasteId) return

    try {
      setIsCreatingResource(true)

      // Create resource and get upload URLs
      const { resource, upload_urls } = await api.resources.create(
        selectedTasteId,
        resourceName,
        {},
      )

      // Separate files by type
      const imageFile = uploadedFiles.find(
        f =>
          f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.png'),
      )
      const figmaFile = uploadedFiles.find(
        f =>
          f.type === 'application/json' ||
          f.name.toLowerCase().endsWith('.json'),
      )

      // Upload files if they exist
      let hasFigma = false
      let hasImage = false

      if (figmaFile && upload_urls.figma_put_url) {
        try {
          const figmaText = await figmaFile.text()
          const figmaJson = JSON.parse(figmaText)
          await api.resources.uploadFiles(
            { figma_put_url: upload_urls.figma_put_url },
            figmaJson,
            undefined,
          )
          hasFigma = true
          console.log('Figma file uploaded successfully')
        } catch (err) {
          console.error('Failed to upload figma file:', err)
        }
      }

      if (imageFile && upload_urls.image_put_url) {
        try {
          await api.resources.uploadFiles(
            { image_put_url: upload_urls.image_put_url },
            undefined,
            imageFile as File,
          )
          hasImage = true
          console.log('Image file uploaded successfully')
        } catch (err) {
          console.error('Failed to upload image file:', err)
        }
      }

      // CRITICAL: Mark files as uploaded BEFORE proceeding
      if (hasFigma || hasImage) {
        await api.resources.markUploaded(
          selectedTasteId,
          resource.resource_id,
          hasFigma,
          hasImage,
        )
        console.log('Resource marked as uploaded:', {
          resource_id: resource.resource_id,
          hasFigma,
          hasImage,
        })
      } else {
        console.warn('No files were successfully uploaded')
      }

      // Update local taste with new resource
      const imageUrl =
        hasImage && upload_urls.image_put_url
          ? await api.resources
              .get(selectedTasteId, resource.resource_id, true)
              .then(r => r.download_urls?.image_get_url || null)
              .catch(() => null)
          : null

      const displayResource: ResourceDisplay = {
        resource_id: resource.resource_id,
        name: resource.name,
        imageUrl,
        has_image: hasImage,
        has_figma: hasFigma,
      }

      setTastes(
        tastes.map(t =>
          t.taste_id === selectedTasteId
            ? { ...t, resources: [...t.resources, displayResource] }
            : t,
        ),
      )

      // Set this as selected resource
      setSelectedResourceId(resource.resource_id)

      // Close resource modal and stop loading
      setIsCreatingResource(false)
      setIsCreateResourceModalOpen(false)

      // ONLY open project modal after everything is complete
      setIsCreateProjectModalOpen(true)

      return resource.resource_id
    } catch (err) {
      console.error('Failed to create resource:', err)
      alert('Failed to create resource. Please try again.')
      setIsCreatingResource(false)
      setIsCreateResourceModalOpen(false)
      throw err
    }
  }

  const handleCreateProject = async (projectName: string) => {
    if (!selectedTasteId) return

    try {
      setIsCreatingProject(true)

      // Create project
      const project = await api.projects.create({
        name: projectName,
        task_description: ideaText,
        selected_taste_id: selectedTasteId,
        selected_resource_id: selectedResourceId || undefined,
        metadata: {},
      })

      // Save project info to localStorage for Editor
      localStorage.setItem(
        'current_project',
        JSON.stringify({
          project_id: project.project_id,
          project_name: project.name,
          task_description: project.task_description,
          selected_taste_id: project.selected_taste_id,
          selected_resource_id: project.selected_resource_id,
        }),
      )

      // Close modal
      setIsCreateProjectModalOpen(false)

      // Reset form and clear active project flag
      setIdeaText('')
      setUploadedFiles([])
      setSelectedResourceId(null)
      setHasActiveProject(false)
      setActiveProjectName(null)

      // Smooth transition to Editor with a slight delay for UX
      setTimeout(() => {
        navigate('/editor', { replace: true })
      }, 300)
    } catch (err) {
      console.error('Failed to create project:', err)
      alert('Failed to create project. Please try again.')
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleContinueProject = () => {
    // User wants to continue working on existing project
    navigate('/editor', { replace: true })
  }

  const handleSubmitIdea = async () => {
    if (!ideaText.trim()) return
    if (!selectedTasteId) return

    // If there are files, create resource first
    if (uploadedFiles.length > 0) {
      setIsCreateResourceModalOpen(true)
    } else {
      // No files, skip resource creation and go straight to project
      setIsCreateProjectModalOpen(true)
    }
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(files => files.filter((_, i) => i !== index))
  }

  const handleViewRandomUI = async (renderingMode: 'design-ml' | 'react') => {
    try {
      // Fetch random UI
      const randomUI = await api.llm.getRandomUIByMode(renderingMode)

      // Store project info with view-only flag
      const projectInfo = {
        project_id: randomUI.project_id,
        project_name: randomUI.project_name,
        view_only: true, // Flag to indicate this is view-only mode
        ui_data: randomUI.ui,
        ui_type: randomUI.type,
        ui_version: randomUI.version,
      }

      localStorage.setItem('current_project', JSON.stringify(projectInfo))

      // Navigate to editor in view-only mode
      navigate('/editor')
    } catch (err) {
      console.error('Failed to load random UI:', err)
      alert('No UIs available for this mode')
    }
  }

  // ============================================================================
  // ACCORDION CONTENT
  // ============================================================================

  const startWithTasteContent = useMemo(() => {
    if (loading) {
      return (
        <div className="p-6 flex justify-center items-center min-h-[120px]">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-6 flex justify-center items-center min-h-[120px]">
          <div className="text-center" style={{ color: '#FF7262' }}>
            {error}
          </div>
        </div>
      )
    }

    if (tastes.length === 0) {
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
                key={taste.taste_id}
                style={{ width: '220px' }}
                className="flex-none"
              >
                <TasteCard
                  taste={taste}
                  isSelected={selectedTasteId === taste.taste_id}
                  onClick={() => {
                    setSelectedTasteId(taste.taste_id)
                    setSelectedResourceId(null)

                    // If taste has resources, expand stage 2; otherwise expand stage 3
                    if (taste.resources.length > 0) {
                      setExpandedStage(2)
                    } else {
                      setExpandedStage(3)
                    }
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
  }, [tastes, selectedTasteId, loading, error])

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
          className="overflow-x-auto overflow-y-visible style-scroll-container"
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
                key={resource.resource_id}
                resource={resource}
                isSelected={selectedResourceId === resource.resource_id}
                onClick={() => {
                  setSelectedResourceId(resource.resource_id)
                  setExpandedStage(3)
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }, [selectedTaste, selectedResourceId])

  // ============================================================================
  // STAGE LOGIC
  // ============================================================================

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
      hasNewButton: false, // NOTE: Set to true later when implementing resource creation from Stage 2
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
              {/* Text area with Enter hint */}
              <div className="relative mb-4">
                <textarea
                  placeholder="Describe your idea..."
                  value={ideaText}
                  onChange={e => setIdeaText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && ideaText.trim()) {
                      e.preventDefault()
                      handleSubmitIdea()
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg resize-none focus:outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#3B3B3B',
                    fontSize: '14px',
                    minHeight: '80px',
                  }}
                  rows={3}
                />
                {ideaText.length > 0 && (
                  <div
                    className="absolute bottom-3 right-4 px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: '#F4F4F4', color: '#929397' }}
                  >
                    ⏎ Enter
                  </div>
                )}
              </div>

              {/* File upload area */}
              <div
                className="mb-4 rounded-xl p-4 transition-all border-2 border-dashed"
                style={{
                  borderColor: uploadedFiles.length > 0 ? '#F5C563' : '#E8E1DD',
                  backgroundColor:
                    uploadedFiles.length > 0
                      ? 'rgba(245, 197, 99, 0.05)'
                      : '#F7F5F3',
                }}
              >
                <div className="text-center mb-3">
                  <div className="text-xs mb-1" style={{ color: '#929397' }}>
                    Drag & drop files here (up to 200)
                  </div>
                  <div className="text-xs" style={{ color: '#929397' }}>
                    Supported: JSON, PNG, JPG, PDF, DOC
                  </div>
                </div>

                {/* Uploaded files display */}
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, index) => {
                      const extension = (file.name.split('.').pop() ?? '')
                        .toUpperCase()
                        .slice(0, 3)
                      const isImage = file.type.startsWith('image/')

                      return (
                        <div
                          key={index}
                          className="group relative rounded-lg overflow-hidden transition-all hover:scale-105"
                          style={{
                            width: '80px',
                            height: '80px',
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          }}
                        >
                          {isImage ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span
                                className="text-xs font-bold"
                                style={{ color: '#4F515A' }}
                              >
                                {extension}
                              </span>
                            </div>
                          )}

                          {/* Remove button on hover */}
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.7)',
                            }}
                          >
                            <X size={24} style={{ color: '#FFFFFF' }} />
                          </button>

                          {/* Filename tooltip */}
                          <div
                            className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              color: '#FFFFFF',
                              fontSize: '9px',
                            }}
                            title={file.name}
                          >
                            {file.name}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Bottom row with file count and Create button */}
              <div className="flex items-center justify-between gap-3">
                {/* File count */}
                {uploadedFiles.length > 0 && (
                  <div className="text-sm" style={{ color: '#929397' }}>
                    {uploadedFiles.length} file
                    {uploadedFiles.length !== 1 ? 's' : ''} ready
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Create button */}
                <button
                  onClick={handleSubmitIdea}
                  disabled={!ideaText.trim()}
                  className="px-6 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: ideaText.trim() ? '#F5C563' : '#E8E1DD',
                    color: ideaText.trim() ? '#1F1F20' : '#929397',
                    boxShadow: ideaText.trim()
                      ? '0 2px 12px rgba(245, 197, 99, 0.3)'
                      : 'none',
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
                border: '2px dashed #F5C563',
                minHeight: '240px',
                backgroundColor: 'rgba(245, 197, 99, 0.1)',
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
                  style={{ backgroundColor: '#FFFFFF', color: '#4F515A' }}
                >
                  JSON
                </div>
                <div
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: '#FFFFFF', color: '#4F515A' }}
                >
                  PNG
                </div>
                <div
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: '#FFFFFF', color: '#4F515A' }}
                >
                  PDF
                </div>
                <div
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: '#FFFFFF', color: '#4F515A' }}
                >
                  DOC
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
    { id: 'left' as const, icon: '🏆' },
    { id: 'middle' as const, icon: '08' },
    { id: 'right' as const, icon: '👁' },
  ]

  const galleryItems = [
    { id: 1, title: 'Milkinside', bgColor: '#A8B5C8', height: 320 },
    { id: 2, title: 'Futuristic', bgColor: '#B8C5D8', height: 240 },
    { id: 3, title: 'Layouts', bgColor: '#9ABAAA', height: 280 },
    { id: 4, title: 'Ambient', bgColor: '#B5B8C8', height: 360 },
    { id: 5, title: 'RonDesign', bgColor: '#C8B5A5', height: 420 },
  ]

  // ============================================================================
  // RENDER TAB CONTENT
  // ============================================================================

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

          {/* Random UI Buttons - Only show if there are UIs available */}
          {!checkingUIs && (hasDesignMLUIs || hasReactUIs) && (
            <div className="w-full max-w-2xl mt-8 flex justify-center gap-4">
              {hasDesignMLUIs && (
                <button
                  onClick={() => handleViewRandomUI('design-ml')}
                  className="px-6 py-3 rounded-xl font-medium text-sm transition-all hover:scale-105 flex items-center gap-2"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#3B3B3B',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  }}
                >
                  <Sparkles size={18} style={{ color: '#4A90E2' }} />
                  <span>View Random Design ML</span>
                </button>
              )}
              {hasReactUIs && (
                <button
                  onClick={() => handleViewRandomUI('react')}
                  className="px-6 py-3 rounded-xl font-medium text-sm transition-all hover:scale-105 flex items-center gap-2"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#3B3B3B',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  }}
                >
                  <Sparkles size={18} style={{ color: '#F5C563' }} />
                  <span>View Random React</span>
                </button>
              )}
            </div>
          )}
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
                className="cursor-pointer transition-all hover:scale-105"
                style={{
                  height: `${item.height}px`,
                  position: 'relative',
                }}
              >
                {/* Container for the entire card */}
                <div
                  className="rounded-3xl overflow-hidden relative"
                  style={{
                    height: '100%',
                    backgroundColor: item.bgColor,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}
                >
                  {/* 3D Card Stack Container */}
                  <div
                    className="absolute"
                    style={{
                      left: '50%',
                      top: '48%',
                      transform: 'translate(-50%, -50%)',
                      width: '180px',
                      height: '240px',
                    }}
                  >
                    {/* Back card (furthest) - smaller, positioned HIGHER to peek out on top */}
                    <div
                      className="absolute rounded-2xl"
                      style={{
                        width: '150px',
                        height: '210px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        left: '50%',
                        top: '40%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1,
                      }}
                    />

                    {/* Middle card - positioned between, also peeks out on top */}
                    <div
                      className="absolute rounded-2xl"
                      style={{
                        width: '165px',
                        height: '225px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                        left: '50%',
                        top: '45%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2,
                      }}
                    />

                    {/* Front card with image - full size, positioned lowest */}
                    <div
                      className="absolute rounded-2xl overflow-hidden"
                      style={{
                        width: '180px',
                        height: '240px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 3,
                        backgroundImage: `linear-gradient(135deg, ${item.bgColor}40 0%, ${item.bgColor}20 100%)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      {/* Placeholder for resource image - will be replaced with actual image.png */}
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#929397',
                          fontSize: '14px',
                        }}
                      >
                        {/* Image will go here */}
                      </div>
                    </div>
                  </div>

                  {/* Bottom blur envelope with PROPER DEPRESSION */}
                  <div
                    className="absolute left-0 right-0"
                    style={{
                      bottom: 0,
                      height: '35%',
                      zIndex: 5,
                    }}
                  >
                    {/* Frosted glass with depression - middle third dips down */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: '100%',
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        clipPath:
                          'polygon(0 0, 33% 0, 38% 18%, 62% 18%, 67% 0, 100% 0, 100% 100%, 0 100%)',
                      }}
                    />

                    {/* Content over the blur */}
                    <div
                      className="absolute left-0 right-0 bottom-0 px-6 pb-6 pt-8"
                      style={{
                        zIndex: 6,
                      }}
                    >
                      <h3
                        className="text-xl font-semibold mb-1"
                        style={{ color: '#1F1F20' }}
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm" style={{ color: '#929397' }}>
                        by Milkinside
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right area - Main content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">08</div>
              <div className="text-lg" style={{ color: '#929397' }}>
                Gallery Tab
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

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

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
        isLoading={isCreatingTaste}
      />

      {/* Create Resource Modal */}
      <CreateResourceModal
        isOpen={isCreateResourceModalOpen}
        onClose={() => setIsCreateResourceModalOpen(false)}
        onConfirm={handleCreateResource}
        isLoading={isCreatingResource}
        fileCount={uploadedFiles.length}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onConfirm={handleCreateProject}
        isLoading={isCreatingProject}
      />

      {/* Continue Project Button - Only shows when coming back from Editor */}
      {hasActiveProject && activeProjectName && (
        <button
          onClick={handleContinueProject}
          className="fixed bottom-8 right-8 px-6 py-4 rounded-full font-medium text-sm flex items-center gap-3 transition-all hover:scale-105 animate-fade-in"
          style={{
            backgroundColor: '#4A90E2',
            color: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(74, 144, 226, 0.3)',
            zIndex: 100,
          }}
        >
          <span className="text-base">Continue Project</span>
          <div
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          >
            {activeProjectName}
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      )}

      {/* Top Navigation - Fixed */}
      <div className="relative px-8 py-4" style={{ pointerEvents: 'none' }}>
        {/* Left - Toggle (Commented out for now, will implement dark mode later) */}
        {/* <div 
          className="absolute flex items-center gap-3"
          style={{
            left: '32px',
            top: '16px',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
        >
          <button
            onClick={() => setToggleOn(!toggleOn)}
            className="relative transition-all duration-300"
            style={{
              width: '42px',
              height: '42px',
              backgroundColor: toggleOn ? '#3B3B3B' : '#FFFFFF',
              borderRadius: '8px',
              boxShadow: '0 1.6px 6.4px rgba(0,0,0,0.08)',
            }}
          >
            <div
              className="absolute transition-all duration-300"
              style={{
                width: '14px',
                height: '28px',
                backgroundColor: toggleOn ? '#FFFFFF' : '#3B3B3B',
                borderRadius: '6px',
                top: '7px',
                left: toggleOn ? '21px' : '6px',
              }}
            />
          </button>
        </div> */}

        {/* Center - Tabs */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1 p-1"
          style={{
            top: '16px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderRadius: '16px',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-6 py-2 transition-all duration-300 text-sm"
              style={{
                backgroundColor:
                  activeTab === tab.id ? '#F4F4F4' : 'transparent',
                color: activeTab === tab.id ? '#3B3B3B' : '#929397',
                borderRadius: '12px',
              }}
            >
              {tab.icon}
            </button>
          ))}
        </div>

        {/* Right - Config Menu & Profile */}
        <div
          className="absolute flex items-center gap-3"
          style={{
            right: '32px',
            top: '16px',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
        >
          <ConfigurationMenu />

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
