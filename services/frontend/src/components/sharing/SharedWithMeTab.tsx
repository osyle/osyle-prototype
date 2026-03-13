/**
 * SharedWithMeTab
 *
 * Displays all projects shared with the current user.
 * Each card shows:
 *   - Sender avatar + name
 *   - Rendered markdown description
 *   - Screenshot thumbnails (lightbox on click)
 *   - "Open Project" CTA that loads it in the Editor
 */

import {
  Inbox,
  ExternalLink,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
} from 'lucide-react'

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import api, { type ShareInboxItem } from '../../services/api'

// ---------------------------------------------------------------------------
// Markdown renderer (lightweight — no external lib needed)
// ---------------------------------------------------------------------------

function renderMarkdown(md: string): string {
  return (
    md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // inline code
      .replace(
        /`([^`]+)`/g,
        '<code style="background:#F0EDEB;padding:1px 5px;border-radius:4px;font-size:0.88em">$1</code>',
      )
      // bullet items
      .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
      // wrap consecutive <li> in <ul>
      .replace(
        /(<li>.*<\/li>\n?)+/g,
        m => `<ul style="margin:6px 0 6px 18px;list-style:disc">${m}</ul>`,
      )
      // paragraphs (double newline)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(.+)$/, '<p>$1</p>')
      // single newline → <br>
      .replace(/\n/g, '<br>')
  )
}

// ---------------------------------------------------------------------------
// Helper: format relative time
// ---------------------------------------------------------------------------

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(isoStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function Lightbox({
  urls,
  startIdx,
  onClose,
}: {
  urls: string[]
  startIdx: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIdx)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIdx(i => Math.min(urls.length - 1, i + 1))
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [urls.length, onClose])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999 }}
      onClick={onClose}
    >
      <div
        style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <img
          src={urls[idx]}
          alt={`Screenshot ${idx + 1}`}
          style={{
            maxWidth: '88vw',
            maxHeight: '84vh',
            borderRadius: 12,
            objectFit: 'contain',
          }}
        />
        {urls.length > 1 && (
          <>
            {idx > 0 && (
              <button
                onClick={() => setIdx(i => i - 1)}
                style={{
                  position: 'absolute',
                  left: -48,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={20} color="#fff" />
              </button>
            )}
            {idx < urls.length - 1 && (
              <button
                onClick={() => setIdx(i => i + 1)}
                style={{
                  position: 'absolute',
                  right: -48,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronRight size={20} color="#fff" />
              </button>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: -32,
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 13,
              }}
            >
              {idx + 1} / {urls.length}
            </div>
          </>
        )}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: -14,
            right: -14,
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} color="#fff" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ShareCard
// ---------------------------------------------------------------------------

function ShareCard({
  share,
  onOpen,
  onDelete,
}: {
  share: ShareInboxItem
  // eslint-disable-next-line no-unused-vars
  onOpen: (share: ShareInboxItem) => void
  // eslint-disable-next-line no-unused-vars
  onDelete: (shareId: string) => void
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const hasDesc = share.description.trim().length > 0
  const longDesc = share.description.length > 280
  const displayDesc = !hasDesc
    ? ''
    : !longDesc || expanded
      ? share.description
      : share.description.slice(0, 280) + '…'

  const { sender } = share
  const initials = sender.name
    ? sender.name
        .split(' ')
        .map(p => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : sender.email.slice(0, 2).toUpperCase()

  const hue =
    ((sender.email.charCodeAt(0) ?? 65) * 37 +
      (sender.email.charCodeAt(1) ?? 65) * 13) %
    360

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox
          urls={share.screenshot_urls}
          startIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
          overflow: 'hidden',
          transition: 'box-shadow 0.2s',
          border: '1px solid #F0EDEB',
        }}
        onMouseEnter={e =>
          ((e.currentTarget as HTMLElement).style.boxShadow =
            '0 8px 32px rgba(0,0,0,0.11)')
        }
        onMouseLeave={e =>
          ((e.currentTarget as HTMLElement).style.boxShadow =
            '0 4px 20px rgba(0,0,0,0.07)')
        }
      >
        {/* Top bar: sender info + timestamp */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: '1px solid #F7F5F3' }}
        >
          <div className="flex items-center gap-3">
            {sender.picture ? (
              <img
                src={sender.picture}
                alt={sender.name}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: `hsl(${hue},55%,60%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            )}
            <div>
              <div
                className="text-sm font-semibold"
                style={{ color: '#1F1F20' }}
              >
                {sender.name || sender.email}
              </div>
              <div className="text-xs" style={{ color: '#929397' }}>
                shared a project with you
              </div>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5"
            style={{ color: '#AAAA9F' }}
          >
            <Clock size={12} />
            <span className="text-xs">{relativeTime(share.created_at)}</span>
          </div>
        </div>

        {/* Project name pill */}
        <div className="px-5 pt-4">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: '#F7F5F3', border: '1px solid #EEEBE8' }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#F5C563',
                flexShrink: 0,
              }}
            />
            <span className="text-xs font-medium" style={{ color: '#3B3B3B' }}>
              {share.project?.name ?? 'Shared Project'}
            </span>
          </div>
        </div>

        {/* Markdown description */}
        {hasDesc && (
          <div className="px-5 pt-3 pb-1">
            <div
              className="text-sm leading-relaxed"
              style={{ color: '#4B4B4B' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(displayDesc) }}
            />
            {longDesc && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-xs mt-1"
                style={{
                  color: '#F5C563',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Screenshots */}
        {share.screenshot_urls.length > 0 && (
          <div className="px-5 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ImageIcon size={12} color="#AAAA9F" />
              <span className="text-xs" style={{ color: '#AAAA9F' }}>
                {share.screenshot_urls.length} screenshot
                {share.screenshot_urls.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {share.screenshot_urls.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setLightboxIdx(idx)}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: '2px solid #EEEBE8',
                    cursor: 'pointer',
                    padding: 0,
                    background: 'none',
                    transition: 'border-color 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor =
                      '#F5C563'
                    ;(e.currentTarget as HTMLElement).style.transform =
                      'scale(1.05)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor =
                      '#EEEBE8'
                    ;(e.currentTarget as HTMLElement).style.transform =
                      'scale(1)'
                  }}
                >
                  <img
                    src={url}
                    alt={`Screenshot ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-4 mt-2">
          <button
            onClick={() => {
              if (
                confirm(
                  'Remove this share from your inbox? The project copy in your account will remain.',
                )
              ) {
                onDelete(share.share_id)
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 10,
              border: '1.5px solid #EEEBE8',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: '#929397',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.borderColor = '#FCA5A5'
              ;(e.currentTarget as HTMLElement).style.color = '#DC2626'
              ;(e.currentTarget as HTMLElement).style.backgroundColor =
                '#FEF2F2'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.borderColor = '#EEEBE8'
              ;(e.currentTarget as HTMLElement).style.color = '#929397'
              ;(e.currentTarget as HTMLElement).style.backgroundColor =
                'transparent'
            }}
          >
            <Trash2 size={13} />
            Dismiss
          </button>

          <button
            onClick={() => onOpen(share)}
            disabled={!share.project}
            title={share.project ? undefined : 'Project was deleted'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 18px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: share.project ? '#F5C563' : '#EDE9E5',
              cursor: share.project ? 'pointer' : 'not-allowed',
              color: share.project ? '#1F1F20' : '#AAAA9F',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: share.project
                ? '0 4px 12px rgba(245,197,99,0.35)'
                : 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (!share.project) return
              ;(e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'
              ;(e.currentTarget as HTMLElement).style.boxShadow =
                '0 6px 18px rgba(245,197,99,0.45)'
            }}
            onMouseLeave={e => {
              if (!share.project) return
              ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
              ;(e.currentTarget as HTMLElement).style.boxShadow =
                '0 4px 12px rgba(245,197,99,0.35)'
            }}
          >
            {share.project ? 'Open Project' : 'Project deleted'}
            {share.project && <ExternalLink size={13} />}
          </button>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main tab component
// ---------------------------------------------------------------------------

interface Props {
  deviceInfo: { screen: { width: number; height: number } }
  renderingMode: 'react' | 'parametric'
}

export default function SharedWithMeTab({ deviceInfo, renderingMode }: Props) {
  const navigate = useNavigate()
  const [shares, setShares] = useState<ShareInboxItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.shares
      .inbox()
      .then(setShares)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleOpen = useCallback(
    (share: ShareInboxItem) => {
      if (!share.project) return

      // Save current device settings
      localStorage.setItem(
        'home_device_settings',
        JSON.stringify({
          device_info: deviceInfo,
          rendering_mode: renderingMode,
        }),
      )

      // Write the shared project into current_project so Editor picks it up
      localStorage.setItem(
        'current_project',
        JSON.stringify({
          project_id: share.project_id,
          project_name: share.project.name,
          task_description: share.project.task_description,
          selected_taste_id: null,
          selected_resource_ids: [],
          device_info: deviceInfo,
          rendering_mode: share.project.rendering_mode ?? 'react',
          image_generation_mode: 'image_url',
          flow_mode: true,
          flow_graph: share.project.flow_graph ?? null,
        }),
      )

      navigate('/editor', { replace: true })
    },
    [navigate, deviceInfo, renderingMode],
  )

  const handleDelete = useCallback(async (shareId: string) => {
    try {
      await api.shares.delete(shareId)
      setShares(prev => prev.filter(s => s.share_id !== shareId))
    } catch (err) {
      console.error('Failed to delete share:', err)
      alert('Failed to remove share. Please try again.')
    }
  }, [])

  return (
    <div className="flex-1 overflow-y-auto px-8 pt-8 pb-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 mt-20">
          <h2
            className="text-2xl font-medium mb-1"
            style={{ color: '#3B3B3B' }}
          >
            Shared with me
          </h2>
          <p className="text-sm" style={{ color: '#929397' }}>
            Projects your team-mates have shared with you
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div
                className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-solid border-current border-r-transparent mb-4"
                style={{ color: '#F5C563' }}
              />
              <div className="text-sm" style={{ color: '#929397' }}>
                Loading shared projects…
              </div>
            </div>
          </div>
        ) : shares.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: '#F7F5F3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Inbox size={28} color="#AAAA9F" />
            </div>
            <div
              className="text-lg font-medium mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Nothing here yet
            </div>
            <div className="text-sm max-w-xs" style={{ color: '#929397' }}>
              When a team-mate shares a project with you, it&apos;ll show up
              here.
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {shares.map(share => (
              <ShareCard
                key={share.share_id}
                share={share}
                onOpen={handleOpen}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
