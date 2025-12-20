import { useState } from 'react'
import type {
  FlowScreenGridProps,
  NodeScreen,
  ScreenCardProps,
  ScreenLightboxProps,
} from '../types/mobbin'

export default function FlowScreenGrid({ screens }: FlowScreenGridProps) {
  const [selectedScreen, setSelectedScreen] = useState<NodeScreen | null>(null)

  if (screens.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-2">📱</div>
          <p className="text-gray-600">No screens available for this flow</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6">
        <div className="mb-4 text-sm text-gray-600">
          {screens.length} {screens.length === 1 ? 'screen' : 'screens'}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {screens.map(screen => (
            <ScreenCard
              key={screen.id}
              screen={screen}
              onClick={() => setSelectedScreen(screen)}
            />
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedScreen && (
        <ScreenLightbox
          screen={selectedScreen}
          onClose={() => setSelectedScreen(null)}
        />
      )}
    </>
  )
}

function ScreenCard({ screen, onClick }: ScreenCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  return (
    <div className="flex flex-col cursor-pointer group" onClick={onClick}>
      {/* Image container with aspect ratio */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
        {/* Aspect ratio container */}
        <div className="relative" style={{ paddingBottom: '177.78%' }}>
          {' '}
          {/* 16:9 aspect ratio */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-2xl mb-1">⚠️</div>
                <div className="text-xs">Failed to load</div>
              </div>
            </div>
          ) : (
            <img
              src={screen.thumbnail_url || screen.image_url}
              alt={screen.label || `Screen ${screen.screen_number}`}
              className={`
                absolute inset-0 w-full h-full object-contain
                transition-opacity duration-300
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          )}
        </div>
      </div>

      {/* Label */}
      {screen.label && (
        <div className="mt-2 text-sm text-gray-700 line-clamp-2">
          {screen.label}
        </div>
      )}

      {/* Screen number */}
      <div className="mt-1 text-xs text-gray-500">
        Screen {screen.screen_number}
      </div>
    </div>
  )
}

function ScreenLightbox({ screen, onClose }: ScreenLightboxProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-3xl"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      {/* Image */}
      <div className="max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
        <img
          src={screen.image_url}
          alt={screen.label || `Screen ${screen.screen_number}`}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />

        {/* Info */}
        <div className="mt-4 text-center text-white">
          {screen.label && (
            <div className="text-lg font-semibold mb-1">{screen.label}</div>
          )}
          <div className="text-sm text-gray-300">
            Screen {screen.screen_number}
            {screen.dimensions && (
              <span className="ml-2">
                • {screen.dimensions.width}×{screen.dimensions.height}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
