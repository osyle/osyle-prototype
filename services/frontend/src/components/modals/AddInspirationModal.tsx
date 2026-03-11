import { X, Image as ImageIcon } from 'lucide-react'
import React, { useState, useEffect, useCallback } from 'react'

interface AddInspirationModalProps {
  isOpen: boolean
  onClose: () => void
  // eslint-disable-next-line no-unused-vars
  onConfirm: (files: File[]) => void
  isLoading: boolean
  maxImages?: number
  currentCount?: number
}

export default function AddInspirationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  maxImages = 5,
  currentCount = 0,
}: AddInspirationModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedFiles([])
      setError(null)
    }
  }, [isOpen])

  const remainingSlots = maxImages - currentCount
  const isValid =
    selectedFiles.length > 0 && selectedFiles.length <= remainingSlots

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) {
      onConfirm(selectedFiles)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }, [])

  const validateAndAddFiles = (files: File[]) => {
    const imageFiles = files.filter(
      f =>
        f.type === 'image/png' ||
        f.type === 'image/jpeg' ||
        f.type === 'image/jpg',
    )

    if (imageFiles.length === 0) {
      setError('Please select valid image files (.png, .jpg, .jpeg)')
      return
    }

    const totalAfterAdd = selectedFiles.length + imageFiles.length
    if (totalAfterAdd > remainingSlots) {
      setError(
        `Can only add ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''}. Already have ${currentCount} in project.`,
      )
      return
    }

    setSelectedFiles(prev => [...prev, ...imageFiles])
    setError(null)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)

      const files = Array.from(e.dataTransfer.files)
      validateAndAddFiles(files)
    },
    [selectedFiles, remainingSlots],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      validateAndAddFiles(Array.from(files))
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setError(null)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium" style={{ color: '#3B3B3B' }}>
              Add Inspiration Images
            </h3>
            <p className="text-sm mt-1" style={{ color: '#929397' }}>
              {currentCount} of {maxImages} images used • {remainingSlots} slots
              remaining
            </p>
          </div>
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
          {/* Drop Zone */}
          <div className="mb-6">
            <div
              className="relative rounded-xl border-2 border-dashed transition-all cursor-pointer"
              style={{
                borderColor: isDragActive ? '#F5C563' : '#E8E1DD',
                backgroundColor: isDragActive ? '#FFF9E6' : '#FAFAFA',
                minHeight: '200px',
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() =>
                document.getElementById('inspiration-input')?.click()
              }
            >
              <input
                id="inspiration-input"
                type="file"
                accept=".png,.jpg,.jpeg"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={isLoading}
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <ImageIcon
                  size={48}
                  style={{ color: '#929397', marginBottom: '16px' }}
                />
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: '#3B3B3B' }}
                >
                  Drop images here or click to browse
                </p>
                <p className="text-xs text-center" style={{ color: '#929397' }}>
                  Supports .png, .jpg, .jpeg
                  <br />
                  Select multiple files at once
                </p>
              </div>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <p
                className="text-sm font-medium mb-3"
                style={{ color: '#3B3B3B' }}
              >
                Selected Images ({selectedFiles.length})
              </p>
              <div className="grid grid-cols-2 gap-3">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg p-3 border"
                    style={{
                      borderColor: '#E8E1DD',
                      backgroundColor: '#FAFAFA',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <ImageIcon size={24} style={{ color: '#4A90E2' }} />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: '#3B3B3B' }}
                        >
                          {file.name}
                        </p>
                        <p className="text-xs" style={{ color: '#929397' }}>
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                        className="p-1 rounded-full transition-all hover:scale-105"
                        style={{
                          backgroundColor: '#FEE2E2',
                        }}
                        disabled={isLoading}
                      >
                        <X size={14} style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
            >
              {error}
            </div>
          )}

          {/* Action Buttons */}
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
              className="flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isValid ? '#F5C563' : '#E8E1DD',
                color: isValid ? '#1F1F20' : '#929397',
                boxShadow: isValid
                  ? '0 2px 12px rgba(245, 197, 99, 0.3)'
                  : 'none',
              }}
              disabled={isLoading || !isValid}
            >
              {isLoading
                ? 'Adding...'
                : `Add ${selectedFiles.length} Image${selectedFiles.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
