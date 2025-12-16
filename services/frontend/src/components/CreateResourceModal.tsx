import { X, FileJson, Image as ImageIcon } from 'lucide-react'
import React, { useState, useEffect, useCallback } from 'react'

interface CreateResourceModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (
    // eslint-disable-next-line no-unused-vars
    resourceName: string,
    // eslint-disable-next-line no-unused-vars
    figmaFile: File | null,
    // eslint-disable-next-line no-unused-vars
    imageFile: File | null,
  ) => void
  isLoading: boolean
}

export default function CreateResourceModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: CreateResourceModalProps) {
  const [resourceName, setResourceName] = useState('')
  const [figmaFile, setFigmaFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [figmaDragActive, setFigmaDragActive] = useState(false)
  const [imageDragActive, setImageDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setResourceName('')
      setFigmaFile(null)
      setImageFile(null)
      setError(null)
    }
  }, [isOpen])

  const isValid = resourceName.trim() && (figmaFile || imageFile)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) {
      onConfirm(resourceName.trim(), figmaFile, imageFile)
    }
  }

  // Figma file handlers
  const handleFigmaDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setFigmaDragActive(true)
    } else if (e.type === 'dragleave') {
      setFigmaDragActive(false)
    }
  }, [])

  const handleFigmaDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFigmaDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    const jsonFile = files.find(f => f.name.endsWith('.json'))

    if (jsonFile) {
      setFigmaFile(jsonFile)
      setError(null)
    } else {
      setError('Please drop a .json file')
    }
  }, [])

  const handleFigmaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0] && files[0].name.endsWith('.json')) {
      setFigmaFile(files[0])
      setError(null)
    } else {
      setError('Please select a .json file')
    }
  }

  // Image file handlers
  const handleImageDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setImageDragActive(true)
    } else if (e.type === 'dragleave') {
      setImageDragActive(false)
    }
  }, [])

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setImageDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    const imgFile = files.find(
      f =>
        f.type === 'image/png' ||
        f.type === 'image/jpeg' ||
        f.type === 'image/jpg',
    )

    if (imgFile) {
      setImageFile(imgFile)
      setError(null)
    } else {
      setError('Please drop a .png or .jpg file')
    }
  }, [])

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      const file = files[0]
      if (
        file.type === 'image/png' ||
        file.type === 'image/jpeg' ||
        file.type === 'image/jpg'
      ) {
        setImageFile(file)
        setError(null)
      } else {
        setError('Please select a .png or .jpg file')
      }
    }
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
        className="rounded-2xl p-6 w-full max-w-2xl"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium" style={{ color: '#3B3B3B' }}>
            Add Design Resource
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
          {/* Resource Name */}
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

          {/* Upload Files Section */}
          <div className="mb-6">
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: '#3B3B3B' }}
            >
              Upload Files (at least one required)
            </label>

            <div className="grid grid-cols-2 gap-4">
              {/* Figma JSON Drop Zone */}
              <div>
                <div
                  className="relative rounded-xl border-2 border-dashed transition-all cursor-pointer"
                  style={{
                    borderColor: figmaDragActive ? '#F5C563' : '#E8E1DD',
                    backgroundColor: figmaDragActive ? '#FFF9E6' : '#FAFAFA',
                    minHeight: '200px',
                  }}
                  onDragEnter={handleFigmaDrag}
                  onDragLeave={handleFigmaDrag}
                  onDragOver={handleFigmaDrag}
                  onDrop={handleFigmaDrop}
                  onClick={() =>
                    document.getElementById('figma-input')?.click()
                  }
                >
                  <input
                    id="figma-input"
                    type="file"
                    accept=".json"
                    onChange={handleFigmaFileSelect}
                    className="hidden"
                    disabled={isLoading}
                  />

                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    {figmaFile ? (
                      <>
                        <FileJson
                          size={40}
                          style={{ color: '#4A90E2', marginBottom: '12px' }}
                        />
                        <div className="text-center">
                          <p
                            className="text-sm font-medium mb-1"
                            style={{ color: '#3B3B3B' }}
                          >
                            {figmaFile.name}
                          </p>
                          <p className="text-xs" style={{ color: '#929397' }}>
                            {formatFileSize(figmaFile.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            setFigmaFile(null)
                          }}
                          className="mt-3 px-3 py-1 rounded-lg text-xs transition-all hover:scale-105"
                          style={{
                            backgroundColor: '#FEE2E2',
                            color: '#DC2626',
                          }}
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <FileJson
                          size={40}
                          style={{ color: '#929397', marginBottom: '12px' }}
                        />
                        <p
                          className="text-sm font-medium mb-1"
                          style={{ color: '#3B3B3B' }}
                        >
                          Figma JSON
                        </p>
                        <p
                          className="text-xs text-center"
                          style={{ color: '#929397' }}
                        >
                          Drop .json file here
                          <br />
                          or click to browse
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Screenshot Drop Zone */}
              <div>
                <div
                  className="relative rounded-xl border-2 border-dashed transition-all cursor-pointer"
                  style={{
                    borderColor: imageDragActive ? '#F5C563' : '#E8E1DD',
                    backgroundColor: imageDragActive ? '#FFF9E6' : '#FAFAFA',
                    minHeight: '200px',
                  }}
                  onDragEnter={handleImageDrag}
                  onDragLeave={handleImageDrag}
                  onDragOver={handleImageDrag}
                  onDrop={handleImageDrop}
                  onClick={() =>
                    document.getElementById('image-input')?.click()
                  }
                >
                  <input
                    id="image-input"
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    onChange={handleImageFileSelect}
                    className="hidden"
                    disabled={isLoading}
                  />

                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    {imageFile ? (
                      <>
                        <ImageIcon
                          size={40}
                          style={{ color: '#4A90E2', marginBottom: '12px' }}
                        />
                        <div className="text-center">
                          <p
                            className="text-sm font-medium mb-1"
                            style={{ color: '#3B3B3B' }}
                          >
                            {imageFile.name}
                          </p>
                          <p className="text-xs" style={{ color: '#929397' }}>
                            {formatFileSize(imageFile.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            setImageFile(null)
                          }}
                          className="mt-3 px-3 py-1 rounded-lg text-xs transition-all hover:scale-105"
                          style={{
                            backgroundColor: '#FEE2E2',
                            color: '#DC2626',
                          }}
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <ImageIcon
                          size={40}
                          style={{ color: '#929397', marginBottom: '12px' }}
                        />
                        <p
                          className="text-sm font-medium mb-1"
                          style={{ color: '#3B3B3B' }}
                        >
                          Screenshot
                        </p>
                        <p
                          className="text-xs text-center"
                          style={{ color: '#929397' }}
                        >
                          Drop .png or .jpg here
                          <br />
                          or click to browse
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs mt-2" style={{ color: '#929397' }}>
              💡 Tip: Both files provide the best results!
            </p>
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
              {isLoading ? 'Creating...' : 'Create Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
