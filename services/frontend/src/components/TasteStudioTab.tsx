/**
 * TasteStudioTab
 *
 * The "Taste Studio" home tab. Lets the user focus on one taste at a time
 * and inspect it across multiple angles: synthesised profile, per-resource
 * DTR, component library, and training options.
 */
import {
  Sparkles,
  Layers,
  BookOpen,
  Dumbbell,
  Plus,
  ChevronRight,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import React, { useState, useEffect, useCallback } from 'react'

import api from '../services/api'
import { type TasteDisplay } from '../types/home.types'
import DtmTrainingModal, { type DtmTrainingState } from './DtmTrainingModal'
import TasteStudioDTRView from './TasteStudioDTRView'
import TasteStudioProfileView from './TasteStudioProfileView'

// ============================================================================
// TYPES
// ============================================================================

type SubTab = 'profile' | 'resources' | 'components' | 'training'

interface Props {
  tastes: TasteDisplay[]
  loading?: boolean
  onCreateTaste: () => void
  // eslint-disable-next-line no-unused-vars
  onDeleteTaste: (taste: TasteDisplay, e: React.MouseEvent) => void
}

interface DTMData {
  taste_id: string
  resource_ids: string[]
  created_at: string
  mode?: string
  [key: string]: unknown
}

// ============================================================================
// TASTE SELECTOR CHIP
// ============================================================================

const TasteChip: React.FC<{
  taste: TasteDisplay
  isSelected: boolean
  onClick: () => void
  // eslint-disable-next-line no-unused-vars
  onDelete: (taste: TasteDisplay, e: React.MouseEvent) => void
}> = ({ taste, isSelected, onClick, onDelete }) => {
  const [hovered, setHovered] = useState(false)

  // Choose a preview color from taste metadata if available, otherwise cycle
  const previewImages = taste.resources.filter(r => r.imageUrl).slice(0, 3)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all flex-shrink-0 group"
      style={{
        overflow: 'visible',
        backgroundColor: isSelected
          ? '#1F1F20'
          : hovered
            ? '#FFFFFF'
            : '#F7F5F3',
        boxShadow: isSelected
          ? '0 6px 20px rgba(0,0,0,0.2)'
          : hovered
            ? '0 4px 14px rgba(0,0,0,0.08)'
            : 'none',
        transform: hovered && !isSelected ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* Resource image stack */}
      <div
        className="relative flex items-center"
        style={{ width: 32, height: 28 }}
      >
        {previewImages.length > 0 ? (
          previewImages.map((r, i) => (
            <div
              key={r.resource_id}
              className="absolute rounded-lg overflow-hidden border-2"
              style={{
                width: 22,
                height: 22,
                left: i * 8,
                zIndex: previewImages.length - i,
                borderColor: isSelected ? '#2E2E2F' : '#F7F5F3',
                backgroundColor: '#E8E1DD',
              }}
            >
              <img
                src={r.imageUrl!}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))
        ) : (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: isSelected ? '#2E2E2F' : '#E8E1DD' }}
          >
            <Layers
              size={12}
              style={{ color: isSelected ? '#929397' : '#C0B8B0' }}
            />
          </div>
        )}
      </div>

      {/* Name + count */}
      <div className="text-left min-w-0">
        <p
          className="text-sm font-semibold truncate max-w-28"
          style={{ color: isSelected ? '#FFFFFF' : '#1F1F20' }}
        >
          {taste.name}
        </p>
        <p
          className="text-xs"
          style={{ color: isSelected ? '#929397' : '#C0B8B0' }}
        >
          {taste.resources.length} resource
          {taste.resources.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Delete button */}
      {hovered && (
        <div
          onClick={e => {
            e.stopPropagation()
            onDelete(taste, e)
          }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ backgroundColor: '#EF4444', zIndex: 10 }}
        >
          <Trash2 size={10} style={{ color: '#FFFFFF' }} />
        </div>
      )}
    </button>
  )
}

// ============================================================================
// SUB-TAB CONFIG
// ============================================================================

const SUB_TABS: Array<{
  id: SubTab
  label: string
  icon: React.ReactNode
  badge?: string
}> = [
  { id: 'profile', label: 'Taste Profile', icon: <Sparkles size={14} /> },
  { id: 'resources', label: 'Resources', icon: <BookOpen size={14} /> },
  {
    id: 'components',
    label: 'Component Library',
    icon: <Layers size={14} />,
    badge: 'Soon',
  },
  {
    id: 'training',
    label: 'Training',
    icon: <Dumbbell size={14} />,
    badge: 'Soon',
  },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TasteStudioTab: React.FC<Props> = ({
  tastes,
  loading = false,
  onCreateTaste,
  onDeleteTaste,
}) => {
  const [selectedTasteId, setSelectedTasteId] = useState<string | null>(() => {
    return localStorage.getItem('studio_taste_id') || null
  })
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('profile')

  // DTM state
  const [dtm, setDtm] = useState<DTMData | null>(null)
  const [dtmLoading, setDtmLoading] = useState(false)
  const [dtmError, setDtmError] = useState<string | null>(null)

  // DTM rebuild modal
  const [isRebuildModalOpen, setIsRebuildModalOpen] = useState(false)
  const [rebuildState, setRebuildState] = useState<DtmTrainingState>('training')
  const [rebuildError, setRebuildError] = useState<string | null>(null)

  const selectedTaste = tastes.find(t => t.taste_id === selectedTasteId) || null

  // Select first taste automatically
  useEffect(() => {
    if (!selectedTasteId && tastes.length > 0) {
      setSelectedTasteId(tastes[0].taste_id)
    }
  }, [tastes, selectedTasteId])

  // Persist taste selection
  useEffect(() => {
    if (selectedTasteId)
      localStorage.setItem('studio_taste_id', selectedTasteId)
  }, [selectedTasteId])

  // Load DTM when taste selected
  const loadDTM = useCallback(async (tasteId: string) => {
    setDtmLoading(true)
    setDtmError(null)
    setDtm(null)
    try {
      const data = await api.dtm.getData(tasteId)
      setDtm(data as DTMData)
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to load taste profile'
      // 404 means not built yet — that's fine, show empty state
      if (msg.includes('404') || msg.includes('not found')) {
        setDtmError(null)
        setDtm(null)
      } else {
        setDtmError(msg)
      }
    } finally {
      setDtmLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTasteId && activeSubTab === 'profile') {
      loadDTM(selectedTasteId)
    }
  }, [selectedTasteId, activeSubTab, loadDTM])

  // Rebuild DTM
  const handleRebuild = async () => {
    if (!selectedTasteId || !selectedTaste) return
    setIsRebuildModalOpen(true)
    setRebuildState('training')
    setRebuildError(null)

    try {
      await api.dtm.rebuild(selectedTasteId, {})
      setRebuildState('success')
      setTimeout(async () => {
        setIsRebuildModalOpen(false)
        await loadDTM(selectedTasteId)
      }, 1500)
    } catch (err) {
      setRebuildState('error')
      setRebuildError((err as Error)?.message || 'Rebuild failed')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ================================================================
            TOP BAR — taste selector + sub-tab pills
        ================================================================ */}
      <div
        className="flex-shrink-0 px-8 pt-6 pb-4"
        style={{
          backgroundColor: '#EDEBE9',
        }}
      >
        {/* Page title */}
        <div className="flex items-baseline gap-3 mb-5">
          <h2
            className="text-3xl font-light"
            style={{ color: '#1F1F20', letterSpacing: '-0.02em' }}
          >
            Taste Studio
          </h2>
          <span className="text-sm" style={{ color: '#929397' }}>
            Design intelligence explorer
          </span>
        </div>

        {/* Taste selector row */}
        <div
          className="flex items-center gap-3 overflow-x-auto pb-2 pt-3"
          style={{
            scrollbarWidth: 'none',
            overflowY: 'visible',
            overflow: 'visible',
            overflowX: 'auto',
          }}
        >
          <style>{`.taste-chips::-webkit-scrollbar { display: none; }`}</style>

          {loading ? (
            // Skeleton taste chips while loading
            [1, 2].map(i => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-shrink-0 animate-pulse"
                style={{ backgroundColor: '#E8E1DD', width: 140, height: 56 }}
              />
            ))
          ) : (
            <>
              {tastes.map(taste => (
                <TasteChip
                  key={taste.taste_id}
                  taste={taste}
                  isSelected={taste.taste_id === selectedTasteId}
                  onClick={() => {
                    setSelectedTasteId(taste.taste_id)
                    setDtm(null)
                  }}
                  onDelete={(_taste, e) => onDeleteTaste(taste, e)}
                />
              ))}

              {/* Add new taste */}
              <button
                onClick={onCreateTaste}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl transition-all flex-shrink-0 hover:scale-105"
                style={{
                  backgroundColor: '#F5C56320',
                  border: '2px dashed #F5C56360',
                  color: '#92690A',
                }}
              >
                <Plus size={16} />
                <span className="text-sm font-medium">New Taste</span>
              </button>
            </>
          )}
        </div>

        {/* Sub-tabs */}
        {selectedTaste && (
          <div className="flex items-center gap-1 mt-4">
            {SUB_TABS.map(tab => {
              const isActive = activeSubTab === tab.id
              const isSoon = !!tab.badge
              return (
                <button
                  key={tab.id}
                  onClick={() => !isSoon && setActiveSubTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? '#1F1F20' : 'transparent',
                    color: isActive
                      ? '#FFFFFF'
                      : isSoon
                        ? '#C0B8B0'
                        : '#3B3B3B',
                    cursor: isSoon ? 'not-allowed' : 'pointer',
                    opacity: isSoon ? 0.6 : 1,
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md"
                      style={{
                        backgroundColor: '#E8E1DD',
                        color: '#929397',
                        fontSize: 10,
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Rebuild button for Profile tab */}
            {activeSubTab === 'profile' &&
              selectedTaste.resources.length >= 2 && (
                <button
                  onClick={handleRebuild}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-105"
                  style={{ backgroundColor: '#F7F5F3', color: '#929397' }}
                >
                  <RefreshCw size={12} />
                  Rebuild Model
                </button>
              )}
          </div>
        )}
      </div>

      {/* ================================================================
            CONTENT AREA
        ================================================================ */}
      <div
        style={{
          flex: '1 1 0',
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Loading state */}
        {loading && !selectedTaste && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
            }}
          >
            <div
              className="w-10 h-10 rounded-full border-4 animate-spin"
              style={{
                borderColor: '#E8E1DD',
                borderTopColor: '#C0B8B0',
              }}
            />
            <p className="text-sm" style={{ color: '#C0B8B0' }}>
              Loading tastes…
            </p>
          </div>
        )}

        {/* No taste selected (only shown after loading is complete) */}
        {!loading && !selectedTaste && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
            }}
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #F7F5F3 0%, #E8E1DD 100%)',
              }}
            >
              <Sparkles size={36} style={{ color: '#C0B8B0' }} />
            </div>
            <div className="text-center">
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: '#1F1F20' }}
              >
                No Taste Selected
              </h3>
              <p className="text-sm" style={{ color: '#929397' }}>
                {tastes.length === 0
                  ? 'Create a taste to get started'
                  : 'Select a taste above to explore its profile'}
              </p>
            </div>
            {tastes.length === 0 && (
              <button
                onClick={onCreateTaste}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: '#F5C563',
                  color: '#1F1F20',
                  boxShadow: '0 4px 16px rgba(245,197,99,0.35)',
                }}
              >
                <Plus size={16} />
                Create First Taste
              </button>
            )}
          </div>
        )}

        {/* Profile tab */}
        {selectedTaste && activeSubTab === 'profile' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <TasteStudioProfileView
              tasteId={selectedTaste.taste_id}
              tasteName={selectedTaste.name}
              dtm={dtm}
              loading={dtmLoading}
              error={dtmError}
              onRebuild={
                selectedTaste.resources.length >= 2 ? handleRebuild : undefined
              }
              resourceCount={selectedTaste.resources.length}
            />
          </div>
        )}

        {/* Resources tab */}
        {selectedTaste && activeSubTab === 'resources' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            <TasteStudioDTRView taste={selectedTaste} />
          </div>
        )}

        {/* Component Library placeholder */}
        {selectedTaste && activeSubTab === 'components' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <PlaceholderView
              icon={<Layers size={40} style={{ color: '#C0B8B0' }} />}
              title="Component Library"
              description="Automatically extracted UI components based on this taste profile. Coming soon — this will let you browse, preview, and copy components learned from your design references."
              tag="Coming Soon"
            />
          </div>
        )}

        {/* Training placeholder */}
        {selectedTaste && activeSubTab === 'training' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <PlaceholderView
              icon={<Dumbbell size={40} style={{ color: '#C0B8B0' }} />}
              title="Training Centre"
              description="Fine-tune and retrain your taste model. Train individual resources, adjust weights, annotate corrections, and rebuild the unified taste model with advanced controls."
              tag="Coming Soon"
            />
          </div>
        )}
      </div>

      {/* Rebuild DTM modal */}
      <DtmTrainingModal
        isOpen={isRebuildModalOpen}
        state={rebuildState}
        resourceCount={selectedTaste?.resources.length || 0}
        errorMessage={rebuildError || undefined}
        onRetry={handleRebuild}
        onClose={() => {
          setIsRebuildModalOpen(false)
          setRebuildError(null)
        }}
      />
    </div>
  )
}

// ── Placeholder view for coming-soon tabs ────────────────────────────────────
const PlaceholderView: React.FC<{
  icon: React.ReactNode
  title: string
  description: string
  tag: string
}> = ({ icon, title, description, tag }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 32px',
      gap: '24px',
    }}
  >
    <div
      className="w-20 h-20 rounded-3xl flex items-center justify-center"
      style={{ backgroundColor: '#F7F5F3' }}
    >
      {icon}
    </div>
    <div className="text-center max-w-sm">
      <div className="flex items-center justify-center gap-2 mb-2">
        <h3 className="text-xl font-semibold" style={{ color: '#1F1F20' }}>
          {title}
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#F5C56330', color: '#92690A' }}
        >
          {tag}
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: '#929397' }}>
        {description}
      </p>
    </div>
    <div
      className="flex items-center gap-2 text-xs"
      style={{ color: '#C0B8B0' }}
    >
      <ChevronRight size={14} />
      <span>Available in a future release</span>
    </div>
  </div>
)

export default TasteStudioTab
