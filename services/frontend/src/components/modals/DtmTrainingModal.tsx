import { Cog, CheckCircle2, AlertCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export type DtmTrainingState = 'training' | 'success' | 'error'

export interface DtmTrainingModalProps {
  isOpen: boolean
  state: DtmTrainingState
  resourceCount: number
  errorMessage?: string
  onRetry?: () => void
  onClose?: () => void
}

// ============================================================================
// DTM TRAINING MODAL COMPONENT
// ============================================================================

const DtmTrainingModal: React.FC<DtmTrainingModalProps> = ({
  isOpen,
  state,
  resourceCount,
  errorMessage,
  onRetry,
  onClose,
}) => {
  const [progress, setProgress] = useState(0)
  const [dots, setDots] = useState('')

  // Animate progress bar when training
  useEffect(() => {
    if (state === 'training') {
      setProgress(0)
      const interval = setInterval(() => {
        setProgress(prev => {
          // Asymptotic approach to 90%
          const increment = (90 - prev) * 0.12
          return Math.min(prev + increment, 90)
        })
      }, 180)

      return () => clearInterval(interval)
    } else if (state === 'success') {
      setProgress(100)
    }
  }, [state])

  // Animate loading dots
  useEffect(() => {
    if (state === 'training') {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? '' : prev + '.'))
      }, 400)

      return () => clearInterval(interval)
    }
  }, [state])

  // Auto-close after success
  useEffect(() => {
    if (state === 'success' && onClose) {
      const timeout = setTimeout(() => {
        onClose()
      }, 2000)

      return () => clearTimeout(timeout)
    }
  }, [state, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={state === 'success' ? onClose : undefined}
    >
      <div
        className="rounded-2xl p-8 w-full max-w-md"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Training State */}
        {state === 'training' && (
          <>
            {/* Animated Cog Icon */}
            <div className="flex justify-center mb-6">
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#FEF3C7',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              >
                <Cog
                  size={40}
                  style={{ color: '#F59E0B' }}
                  className="animate-spin"
                />
                {/* Rotating ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '3px solid transparent',
                    borderTopColor: '#F59E0B',
                    animation: 'spin 2s linear infinite',
                  }}
                />
              </div>
            </div>

            {/* Title */}
            <h3
              className="text-xl font-semibold text-center mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Training Design Model{dots}
            </h3>

            {/* Description */}
            <p
              className="text-center text-sm mb-6"
              style={{ color: '#929397' }}
            >
              Synthesizing patterns from{' '}
              <span style={{ color: '#3B3B3B', fontWeight: 600 }}>
                {resourceCount} design resource{resourceCount !== 1 ? 's' : ''}
              </span>
            </p>

            {/* Progress Bar */}
            <div
              className="relative w-full h-2 rounded-full overflow-hidden mb-4"
              style={{ backgroundColor: '#F4F4F4' }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: '#F59E0B',
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
                }}
              />
            </div>

            {/* Progress Percentage */}
            <p className="text-center text-xs" style={{ color: '#929397' }}>
              {Math.round(progress)}% complete
            </p>
          </>
        )}

        {/* Success State */}
        {state === 'success' && (
          <>
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#DCFCE7',
                  animation: 'scaleIn 0.3s ease-out',
                }}
              >
                <CheckCircle2 size={40} style={{ color: '#16A34A' }} />
              </div>
            </div>

            {/* Title */}
            <h3
              className="text-xl font-semibold text-center mb-2"
              style={{ color: '#3B3B3B' }}
            >
              Training Complete!
            </h3>

            {/* Description */}
            <p
              className="text-center text-sm mb-6"
              style={{ color: '#929397' }}
            >
              Design model ready with{' '}
              <span style={{ color: '#3B3B3B', fontWeight: 600 }}>
                {resourceCount} design{resourceCount !== 1 ? 's' : ''}
              </span>
            </p>

            {/* Success Progress Bar */}
            <div
              className="relative w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: '#F4F4F4' }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  width: '100%',
                  backgroundColor: '#16A34A',
                }}
              />
            </div>
          </>
        )}

        {/* Error State */}
        {state === 'error' && (
          <>
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FEE2E2' }}
              >
                <AlertCircle size={40} style={{ color: '#DC2626' }} />
              </div>
            </div>

            {/* Title */}
            <h3
              className="text-xl font-semibold text-center mb-2"
              style={{ color: '#DC2626' }}
            >
              Training Failed
            </h3>

            {/* Description */}
            <p
              className="text-center text-sm mb-6"
              style={{ color: '#929397' }}
            >
              {errorMessage ||
                'Failed to train design model. Please try again.'}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#F4F4F4',
                    color: '#3B3B3B',
                  }}
                >
                  Close
                </button>
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#F59E0B',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 12px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  Try Again
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-spin {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default DtmTrainingModal
