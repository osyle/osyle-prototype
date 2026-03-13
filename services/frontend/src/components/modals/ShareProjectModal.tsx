/**
 * ShareProjectModal
 *
 * Lets a user share a project with a team-mate.  Features:
 *   - Searchable recipient dropdown (all users except self)
 *   - Mini markdown-aware description textarea (supports **bold**, *italic*, - lists)
 *   - Up to 5 screenshot uploads with inline thumbnail preview
 *   - Smooth animated states: idle → sending → success / error
 */

import {
  X,
  Upload,
  Trash2,
  Search,
  Send,
  CheckCircle,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import api, { type UserSummary } from '../../services/api'
import type { ProjectDisplay } from '../../types/home.types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  isOpen: boolean
  project: ProjectDisplay | null
  onClose: () => void
}

type SendState = 'idle' | 'sending' | 'success' | 'error'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Avatar({ user, size = 32 }: { user: UserSummary; size?: number }) {
  const initials = user.name
    ? user.name
        .split(' ')
        .map(p => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase()

  if (user.picture) {
    return (
      <img
        src={user.picture}
        alt={user.name || user.email}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }

  const hue =
    (user.email.charCodeAt(0) * 37 + user.email.charCodeAt(1) * 13) % 360
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: `hsl(${hue},55%,60%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 600,
        fontSize: size * 0.35,
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShareProjectModal({ isOpen, project, onClose }: Props) {
  // Recipient picker
  const [users, setUsers] = useState<UserSummary[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [recipientId, setRecipientId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Description
  const [description, setDescription] = useState('')

  // Screenshots
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Send state
  const [sendState, setSendState] = useState<SendState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Load users when modal opens
  useEffect(() => {
    if (!isOpen) return
    setUsersLoading(true)
    api.users
      .list()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setUsersLoading(false))
  }, [isOpen])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setRecipientId(null)
      setSearch('')
      setDescription('')
      setScreenshots([])
      setPreviewUrls([])
      setSendState('idle')
      setErrorMsg('')
      setDropdownOpen(false)
    }
  }, [isOpen])

  // Revoke object URLs on cleanup
  useEffect(() => {
    return () => {
      previewUrls.forEach(u => URL.revokeObjectURL(u))
    }
  }, [previewUrls])

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const selectedUser = users.find(u => u.user_id === recipientId)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const remaining = 5 - screenshots.length
      const toAdd = files.slice(0, remaining)
      setScreenshots(prev => [...prev, ...toAdd])
      setPreviewUrls(prev => [
        ...prev,
        ...toAdd.map(f => URL.createObjectURL(f)),
      ])
      e.target.value = ''
    },
    [screenshots],
  )

  const removeScreenshot = useCallback(
    (idx: number) => {
      URL.revokeObjectURL(previewUrls[idx])
      setScreenshots(prev => prev.filter((_, i) => i !== idx))
      setPreviewUrls(prev => prev.filter((_, i) => i !== idx))
    },
    [previewUrls],
  )

  const handleDescriptionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget
      const { selectionStart, selectionEnd, value } = textarea

      // --- Auto-convert "- " or "* " at start of line into a list item ---
      if (e.key === ' ') {
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
        const lineContent = value.slice(lineStart, selectionStart)

        if (lineContent === '-' || lineContent === '*') {
          e.preventDefault()
          // Replace the bare "-" or "*" with "• " (visual bullet)
          const newValue =
            value.slice(0, lineStart) + '• ' + value.slice(selectionEnd)
          setDescription(newValue)
          // Move cursor after "• "
          requestAnimationFrame(() => {
            textarea.selectionStart = lineStart + 2
            textarea.selectionEnd = lineStart + 2
          })
        }
      }

      // --- Press Enter on a bullet line → start next bullet ---
      if (e.key === 'Enter') {
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
        const lineContent = value.slice(lineStart, selectionStart)

        if (lineContent.startsWith('• ')) {
          // If line is just "• " (empty bullet), break out of list
          if (lineContent === '• ') {
            e.preventDefault()
            const newValue =
              value.slice(0, lineStart) + '\n' + value.slice(selectionEnd)
            setDescription(newValue)
            requestAnimationFrame(() => {
              textarea.selectionStart = lineStart + 1
              textarea.selectionEnd = lineStart + 1
            })
          } else {
            // Continue the list on next line
            e.preventDefault()
            const newValue =
              value.slice(0, selectionStart) +
              '\n• ' +
              value.slice(selectionEnd)
            setDescription(newValue)
            requestAnimationFrame(() => {
              textarea.selectionStart = selectionStart + 3
              textarea.selectionEnd = selectionStart + 3
            })
          }
        }
      }
    },
    [],
  )

  const handleSend = async () => {
    if (!project || !recipientId) return
    setSendState('sending')
    setErrorMsg('')
    try {
      await api.shares.create({
        project_id: project.project_id,
        recipient_id: recipientId,
        description,
        screenshots,
      })
      setSendState('success')
      setTimeout(() => {
        onClose()
      }, 2200)
    } catch (err) {
      setSendState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (!isOpen) return null

  const canSend = !!recipientId && sendState === 'idle'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: 540,
          maxHeight: '88vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ---------------------------------------------------------------- */}
        <div
          className="flex items-start justify-between px-7 pt-6 pb-5"
          style={{ borderBottom: '1px solid #F0EDEB', flexShrink: 0 }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: '#F5C563',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Send size={14} color="#1F1F20" />
              </div>
              <span
                className="font-semibold text-base"
                style={{ color: '#1F1F20' }}
              >
                Share Project
              </span>
            </div>
            <p className="text-sm" style={{ color: '#929397' }}>
              {project?.name ?? '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: '#F4F4F4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={16} color="#929397" />
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Scrollable body                                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">
          {/* Recipient picker */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Send to
            </label>
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: dropdownOpen
                    ? '2px solid #F5C563'
                    : '2px solid #EEEBE8',
                  backgroundColor: '#FAFAF9',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
              >
                {selectedUser ? (
                  <>
                    <Avatar user={selectedUser} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: '#1F1F20' }}
                      >
                        {selectedUser.name || selectedUser.email}
                      </div>
                      {selectedUser.name && (
                        <div
                          className="text-xs truncate"
                          style={{ color: '#929397' }}
                        >
                          {selectedUser.email}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <span
                    className="text-sm"
                    style={{ color: '#AAAA9F', flex: 1 }}
                  >
                    {usersLoading
                      ? 'Loading team members…'
                      : 'Choose a team member…'}
                  </span>
                )}
                <ChevronDown
                  size={16}
                  color="#AAAA9F"
                  style={{
                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #EEEBE8',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    zIndex: 9999,
                    overflow: 'hidden',
                  }}
                >
                  {/* Search */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      borderBottom: '1px solid #F4F0ED',
                    }}
                  >
                    <Search size={14} color="#AAAA9F" />
                    <input
                      autoFocus
                      placeholder="Search by name or email…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: 13,
                        color: '#3B3B3B',
                        backgroundColor: 'transparent',
                      }}
                    />
                  </div>

                  {/* User list */}
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {filteredUsers.length === 0 ? (
                      <div
                        className="text-sm text-center py-6"
                        style={{ color: '#AAAA9F' }}
                      >
                        No team members found
                      </div>
                    ) : (
                      filteredUsers.map(u => (
                        <button
                          key={u.user_id}
                          onClick={() => {
                            setRecipientId(u.user_id)
                            setDropdownOpen(false)
                            setSearch('')
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            border: 'none',
                            backgroundColor:
                              recipientId === u.user_id
                                ? '#FEF9EE'
                                : 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background-color 0.1s',
                          }}
                          onMouseEnter={e => {
                            if (recipientId !== u.user_id) {
                              ;(
                                e.currentTarget as HTMLElement
                              ).style.backgroundColor = '#FAFAF9'
                            }
                          }}
                          onMouseLeave={e => {
                            if (recipientId !== u.user_id) {
                              ;(
                                e.currentTarget as HTMLElement
                              ).style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          <Avatar user={u} size={30} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              className="text-sm font-medium truncate"
                              style={{ color: '#1F1F20' }}
                            >
                              {u.name || u.email}
                            </div>
                            {u.name && (
                              <div
                                className="text-xs truncate"
                                style={{ color: '#929397' }}
                              >
                                {u.email}
                              </div>
                            )}
                          </div>
                          {recipientId === u.user_id && (
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: '#F5C563',
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-sm font-medium"
                style={{ color: '#3B3B3B' }}
              >
                Description
                <span className="ml-1 font-normal" style={{ color: '#AAAA9F' }}>
                  (optional)
                </span>
              </label>
              <span className="text-xs" style={{ color: '#AAAA9F' }}>
                markdown supported
              </span>
            </div>
            <textarea
              placeholder={`Describe the issue or context…\n\n**Bug:** The button on the Home screen doesn't respond\n- Steps to reproduce\n- Expected vs actual behaviour`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={handleDescriptionKeyDown}
              rows={6}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '2px solid #EEEBE8',
                backgroundColor: '#FAFAF9',
                resize: 'vertical',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#3B3B3B',
                outline: 'none',
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#F5C563'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#EEEBE8'
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: '#AAAA9F' }}>
              Tip: Type{' '}
              <code
                style={{
                  background: '#F0EDEB',
                  padding: '1px 4px',
                  borderRadius: 3,
                }}
              >
                -
              </code>{' '}
              then space to start a bullet · <strong>**bold**</strong> ·{' '}
              <em>*italic*</em> ·{' '}
              <code
                style={{
                  background: '#F0EDEB',
                  padding: '1px 4px',
                  borderRadius: 3,
                }}
              >
                `code`
              </code>
            </p>
          </div>

          {/* Screenshots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-sm font-medium"
                style={{ color: '#3B3B3B' }}
              >
                Screenshots
                <span className="ml-1 font-normal" style={{ color: '#AAAA9F' }}>
                  (optional · up to 5)
                </span>
              </label>
            </div>

            {previewUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {previewUrls.map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '2px solid #EEEBE8',
                      backgroundColor: '#F7F5F3',
                    }}
                    className="group"
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
                    <button
                      onClick={() => removeScreenshot(idx)}
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={11} color="#fff" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {screenshots.length < 5 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 12,
                    border: '2px dashed #D8D4D0',
                    backgroundColor: '#FAFAF9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor =
                      '#F5C563'
                    ;(e.currentTarget as HTMLElement).style.backgroundColor =
                      '#FFFCF0'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor =
                      '#D8D4D0'
                    ;(e.currentTarget as HTMLElement).style.backgroundColor =
                      '#FAFAF9'
                  }}
                >
                  <Upload size={15} color="#929397" />
                  <span className="text-sm" style={{ color: '#929397' }}>
                    {screenshots.length === 0
                      ? 'Upload screenshots'
                      : `Add more (${5 - screenshots.length} left)`}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Footer                                                            */}
        {/* ---------------------------------------------------------------- */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #F0EDEB',
            flexShrink: 0,
            backgroundColor: '#FAFAF9',
          }}
        >
          {sendState === 'success' ? (
            <div
              className="flex items-center justify-center gap-2"
              style={{
                padding: '12px 0',
                borderRadius: 12,
                backgroundColor: '#ECFDF5',
                color: '#065F46',
              }}
            >
              <CheckCircle size={18} />
              <span className="text-sm font-medium">
                Project shared successfully!
              </span>
            </div>
          ) : sendState === 'error' ? (
            <div className="space-y-3">
              <div
                className="flex items-start gap-2 px-4 py-3 rounded-xl"
                style={{ backgroundColor: '#FEF2F2', color: '#991B1B' }}
              >
                <AlertCircle
                  size={16}
                  style={{ marginTop: 1, flexShrink: 0 }}
                />
                <span className="text-sm">{errorMsg}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSendState('idle')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 12,
                    border: '1.5px solid #EEEBE8',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#3B3B3B',
                    fontWeight: 500,
                  }}
                >
                  Edit and retry
                </button>
                <button
                  onClick={handleSend}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 12,
                    border: 'none',
                    backgroundColor: '#F5C563',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#1F1F20',
                    fontWeight: 600,
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: 12,
                  border: '1.5px solid #EEEBE8',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#3B3B3B',
                  fontWeight: 500,
                  transition: 'background-color 0.15s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!canSend}
                style={{
                  flex: 2,
                  padding: '11px',
                  borderRadius: 12,
                  border: 'none',
                  backgroundColor: canSend ? '#F5C563' : '#EDE9E5',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                  color: canSend ? '#1F1F20' : '#AAAA9F',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  boxShadow: canSend
                    ? '0 4px 14px rgba(245,197,99,0.35)'
                    : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {sendState === 'sending' ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="40 60"
                      />
                    </svg>
                    Sharing…
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Share Project
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
