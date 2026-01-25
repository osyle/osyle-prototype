import { History, RotateCcw, Eye, Check, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface VersionHistoryProps {
  currentVersion: number
  availableVersions: number[]
  // eslint-disable-next-line no-unused-vars
  onVersionSelect: (version: number) => void
  // eslint-disable-next-line no-unused-vars
  onRevert: (version: number) => void
  // eslint-disable-next-line no-unused-vars
  onDelete: (version: number) => void
  isReverting: boolean
  isDeleting: boolean
  viewingVersion: number | null
}

export default function VersionHistory({
  currentVersion,
  availableVersions,
  onVersionSelect,
  onRevert,
  onDelete,
  isReverting,
  isDeleting,
  viewingVersion,
}: VersionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105"
        style={{
          backgroundColor: '#F4F4F4',
          color: '#3B3B3B',
        }}
      >
        <History size={16} />
        <span className="text-sm font-medium">Version {currentVersion}</span>
      </button>
    )
  }

  // Sort versions in descending order (newest first)
  const versions = [...availableVersions].sort((a, b) => b - a)

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#E8E1DD',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History size={16} style={{ color: '#4A90E2' }} />
          <span className="text-sm font-medium" style={{ color: '#3B3B3B' }}>
            Version History
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-xs px-2 py-1 rounded transition-all hover:scale-105"
          style={{
            color: '#929397',
            backgroundColor: '#F4F4F4',
          }}
        >
          Hide
        </button>
      </div>

      {/* Versions List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {versions.map(version => {
          const isCurrent = version === currentVersion
          const isViewing = version === viewingVersion

          return (
            <div
              key={version}
              className="flex items-center justify-between p-2 rounded-lg border transition-all"
              style={{
                backgroundColor: isViewing ? '#FFF9E6' : '#FAFAFA',
                borderColor: isViewing ? '#F5C563' : '#E8E1DD',
              }}
            >
              <div className="flex items-center gap-2">
                {isCurrent && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#10B981' }}
                  />
                )}
                <span
                  className="text-sm font-medium"
                  style={{ color: '#3B3B3B' }}
                >
                  Version {version}
                </span>
                {isCurrent && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: '#D1FAE5',
                      color: '#065F46',
                    }}
                  >
                    Current
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* View button - always show unless already viewing */}
                {!isViewing && (
                  <button
                    onClick={() => onVersionSelect(version)}
                    className="p-1.5 rounded transition-all hover:scale-105"
                    style={{
                      backgroundColor: '#E0F2FE',
                      color: '#0369A1',
                    }}
                    title={
                      isCurrent
                        ? 'View current version'
                        : 'Preview this version'
                    }
                  >
                    <Eye size={14} />
                  </button>
                )}

                {/* Viewing indicator with close button */}
                {isViewing && (
                  <div className="flex items-center gap-1">
                    <div
                      className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                      style={{
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                      }}
                    >
                      <Check size={12} />
                      Viewing
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => onVersionSelect(currentVersion)}
                        className="p-1.5 rounded transition-all hover:scale-105"
                        style={{
                          backgroundColor: '#E0F2FE',
                          color: '#0369A1',
                        }}
                        title="Back to current version"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </div>
                )}

                {/* Revert button */}
                {!isCurrent && (
                  <button
                    onClick={() => onRevert(version)}
                    className="p-1.5 rounded transition-all hover:scale-105 disabled:opacity-50"
                    style={{
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                    }}
                    disabled={isReverting || isDeleting}
                    title="Revert to this version"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}

                {/* Delete button */}
                {!isCurrent && (
                  <button
                    onClick={() => onDelete(version)}
                    className="p-1.5 rounded transition-all hover:scale-105 disabled:opacity-50"
                    style={{
                      backgroundColor: '#FEE2E2',
                      color: '#991B1B',
                    }}
                    disabled={isReverting || isDeleting}
                    title="Delete this version"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info text */}
      <p className="text-xs mt-3" style={{ color: '#929397' }}>
        Click <Eye size={12} className="inline" /> to preview versions.
        Reverting creates a new version as a copy. Deleting removes the version
        permanently.
      </p>
    </div>
  )
}
