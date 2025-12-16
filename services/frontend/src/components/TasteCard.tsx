import React, { useState } from 'react'
import { type TasteDisplay } from '../types/home.types'
import { getInitials, selectDisplayResources } from '../utils/helpers'

// ============================================================================
// TYPES
// ============================================================================

interface TasteCardProps {
  taste: TasteDisplay
  isSelected: boolean
  onClick: () => void
}

// ============================================================================
// TASTE CARD COMPONENT
// ============================================================================

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
                    style={{ color: '#929397' }}
                  >
                    {getInitials(resource.name)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs" style={{ color: '#929397' }}>
          {taste.resources.length}{' '}
          {taste.resources.length === 1 ? 'resource' : 'resources'}
        </div>
      </div>
    </div>
  )
}

export default TasteCard
