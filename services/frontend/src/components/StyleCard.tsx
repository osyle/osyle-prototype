import React, { useState } from 'react'
import { type ResourceDisplay } from '../types/home.types'
import { getInitials } from '../utils/helpers'

// ============================================================================
// TYPES
// ============================================================================

interface StyleCardProps {
  resource: ResourceDisplay
  isSelected: boolean
  onClick: () => void
}

// ============================================================================
// STYLE CARD COMPONENT (Resources)
// ============================================================================

const StyleCard: React.FC<StyleCardProps> = ({
  resource,
  isSelected,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative cursor-pointer transition-all duration-300 flex-none"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '240px',
        height: '340px',
      }}
    >
      {/* Main card container with background color */}
      <div
        className="rounded-3xl transition-all duration-300 relative h-full"
        style={{
          backgroundColor: '#E8EBED',
          boxShadow: isSelected
            ? '0 12px 32px rgba(74, 144, 226, 0.3)'
            : isHovered
              ? '0 8px 24px rgba(0,0,0,0.15)'
              : '0 4px 16px rgba(0,0,0,0.1)',
          transform:
            isHovered && !isSelected ? 'translateY(-4px)' : 'translateY(0)',
          outline: isSelected ? '3px solid #4A90E2' : 'none',
          outlineOffset: '-3px',
          overflow: 'hidden',
        }}
      >
        {/* 3D Card Stack Container */}
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '48%',
            transform: 'translate(-50%, -50%)',
            width: '180px',
            height: '240px',
          }}
        >
          {/* Back card (furthest) - smaller, positioned HIGHER so it peeks out on top */}
          <div
            className="absolute rounded-2xl"
            style={{
              width: '150px',
              height: '210px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              left: '50%',
              top: '40%', // Moved down (was 35%)
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
            }}
          />

          {/* Middle card - medium size, positioned between back and front, also peeks out on top */}
          <div
            className="absolute rounded-2xl"
            style={{
              width: '165px',
              height: '225px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
              left: '50%',
              top: '45%', // Moved down (was 42%)
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
          />

          {/* Front card with resource image - full size, positioned lowest */}
          <div
            className="absolute rounded-2xl overflow-hidden"
            style={{
              width: '180px',
              height: '240px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
              left: '50%',
              top: '50%', // Stays the same
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
            }}
          >
            {resource.imageUrl ? (
              <img
                src={resource.imageUrl}
                alt={resource.name}
                className="w-full h-full object-cover"
                onError={e => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none'
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    parent.style.display = 'flex'
                    parent.style.alignItems = 'center'
                    parent.style.justifyContent = 'center'
                    parent.style.backgroundColor = '#F4F4F4'
                    parent.innerHTML = `<span style="color: #929397; font-size: 48px; font-weight: bold;">${getInitials(resource.name)}</span>`
                  }
                }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: '#F4F4F4' }}
              >
                <span
                  className="text-5xl font-bold"
                  style={{ color: '#929397' }}
                >
                  {getInitials(resource.name)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom blur envelope with PROPER DEPRESSION/DIP in middle */}
        <div
          className="absolute left-0 right-0"
          style={{
            bottom: 0,
            height: '35%',
            zIndex: 5,
          }}
        >
          {/* Frosted glass with depression - the middle third dips DOWN creating envelope shape */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '100%',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              // Creates a depression with subtle depth: flat left → dip down → dip stays down → back up → flat right
              clipPath:
                'polygon(0 0, 32% 0, 37% 20%, 63% 20%, 68% 0, 100% 0, 100% 100%, 0 100%)',
              willChange: 'clip-path',
            }}
          />

          {/* Text content over the blur */}
          <div
            className="absolute left-0 right-0 bottom-0 px-5 pb-5 pt-7"
            style={{
              zIndex: 6,
            }}
          >
            <h3
              className="text-base font-semibold mb-1 truncate"
              style={{ color: '#1F1F20' }}
            >
              {resource.name}
            </h3>
            <p className="text-xs truncate" style={{ color: '#929397' }}>
              by Milkinside
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StyleCard
