import { X } from 'lucide-react'
import React, { useState, useEffect } from 'react'

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

export default CreateProjectModal
