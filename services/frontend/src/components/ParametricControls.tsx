import { Info } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import type {
  VariationSpace,
  ParameterValues,
  VariationDimension,
} from '../types/parametric.types'

interface ParametricControlsProps {
  variationSpace: VariationSpace
  initialValues?: ParameterValues
  // eslint-disable-next-line no-unused-vars
  onChange: (values: ParameterValues) => void
}

// Simple tooltip component with fixed positioning to avoid clipping
interface SimpleTooltipProps {
  content: string
  children: React.ReactNode
}

function SimpleTooltip({ content, children }: SimpleTooltipProps) {
  const [show, setShow] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setTooltipStyle({
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        zIndex: 9999,
      })
      setShow(true)
    }
  }

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div
          className="animate-in fade-in duration-150"
          style={{
            ...tooltipStyle,
            maxWidth: '220px',
            pointerEvents: 'none',
          }}
        >
          <div
            className="px-3 py-2 rounded-lg text-xs"
            style={{
              backgroundColor: '#1F1F20',
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {content}
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced tooltip component for philosophical extremes
interface PhilosophicalTooltipProps {
  extreme: {
    name: string
    intent: string
    characteristics?: string[]
  }
  position: 'left' | 'right'
}

function PhilosophicalTooltip({
  extreme,
  position,
}: PhilosophicalTooltipProps) {
  const [show, setShow] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const tooltipWidth = 220

      // Calculate position based on which side the tooltip should appear
      let left = rect.left
      if (position === 'right') {
        // Align right edge of tooltip with right edge of trigger
        left = rect.right - tooltipWidth
      }
      // For 'left', just use rect.left as is

      setTooltipStyle({
        position: 'fixed',
        top: `${rect.top - 10}px`,
        left: `${left}px`,
        transform: 'translateY(-100%)',
        zIndex: 9999,
      })
      setShow(true)
    }
  }

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
      >
        <Info
          size={12}
          style={{ color: '#929397' }}
          className="cursor-help hover:opacity-70 transition-opacity"
        />
      </div>
      {show && (
        <div
          className="animate-in fade-in duration-150"
          style={{
            ...tooltipStyle,
            width: '220px',
            pointerEvents: 'none',
          }}
        >
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: '#1F1F20',
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div
              className="font-semibold text-sm mb-1"
              style={{ color: '#FFFFFF' }}
            >
              {extreme.name}
            </div>
            <div className="text-xs mb-2" style={{ color: '#D1D5DB' }}>
              {extreme.intent}
            </div>
            {extreme.characteristics && extreme.characteristics.length > 0 && (
              <ul className="space-y-1">
                {extreme.characteristics.map((characteristic, i) => (
                  <li key={i} className="text-xs" style={{ color: '#9CA3AF' }}>
                    • {characteristic}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Arrow */}
          <div
            className="absolute top-full"
            style={{
              [position]: '8px',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1F1F20',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default function ParametricControls({
  variationSpace,
  initialValues,
  onChange,
}: ParametricControlsProps) {
  // Initialize slider values from defaults or initial values
  const [sliderValues, setSliderValues] = useState<ParameterValues>(() => {
    const defaults: ParameterValues = {}
    variationSpace.dimensions.forEach(dim => {
      defaults[dim.id] = initialValues?.[dim.id] ?? dim.default_value
    })
    return defaults
  })

  // Update parent when values change
  useEffect(() => {
    onChange(sliderValues)
  }, [sliderValues, onChange])

  const handleSliderChange = (dimensionId: string, value: number) => {
    setSliderValues(prev => ({
      ...prev,
      [dimensionId]: value,
    }))
  }

  // Enhanced value label that respects dimension type
  const getValueLabel = (dimension: VariationDimension, value: number) => {
    // For categorical dimensions, show mode names
    if (dimension.type === 'categorical') {
      if (value < 33) {
        // Try to use philosophical extreme name, fall back to min_label
        return (
          dimension.philosophical_extremes?.[0]?.name || dimension.min_label
        )
      }
      if (value > 66) {
        // Try to use philosophical extreme name, fall back to max_label
        return (
          dimension.philosophical_extremes?.[100]?.name || dimension.max_label
        )
      }
      return 'Balanced'
    }

    // For continuous dimensions, show value with context
    if (value < 33) return dimension.min_label
    if (value > 66) return dimension.max_label
    return 'Balanced'
  }

  // Get pattern badge info
  const getPatternBadge = (dimension: VariationDimension) => {
    if (!dimension.type && !dimension.pattern) return null

    if (
      dimension.type === 'categorical' ||
      dimension.pattern?.includes('mode') ||
      dimension.pattern?.includes('preset')
    ) {
      return {
        label: 'Categorical',
        color: '#3B82F6',
        bgColor: '#EFF6FF',
      }
    }

    if (dimension.type === 'continuous') {
      return {
        label: 'Numerical',
        color: '#8B5CF6',
        bgColor: '#F5F3FF',
      }
    }

    return null
  }

  return (
    <div className="space-y-3">
      {/* Dimension Controls */}
      {variationSpace.dimensions.map(dimension => {
        const currentValue = sliderValues[dimension.id]
        const badge = getPatternBadge(dimension)

        return (
          <div
            key={dimension.id}
            className="rounded-xl p-4 transition-all hover:shadow-md"
            style={{
              backgroundColor: '#FAFAFA',
              border: '1px solid #E8E1DD',
            }}
          >
            {/* Dimension Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: '#1F1F20' }}
                  >
                    {dimension.label}
                  </span>

                  {/* Pattern Type Badge */}
                  {badge && (
                    <span
                      className="px-2 py-0.5 text-xs rounded-md font-medium"
                      style={{
                        backgroundColor: badge.bgColor,
                        color: badge.color,
                        border: `1px solid ${badge.color}20`,
                      }}
                    >
                      {badge.label}
                    </span>
                  )}

                  {/* Description Tooltip */}
                  <SimpleTooltip content={dimension.description}>
                    <Info
                      size={14}
                      style={{ color: '#929397' }}
                      className="cursor-help hover:opacity-70 transition-opacity"
                    />
                  </SimpleTooltip>
                </div>

                {/* Current Value Display */}
                <div
                  className="text-xs font-medium px-2 py-1 rounded-md inline-block"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#3B3B3B',
                    border: '1px solid #E8E1DD',
                  }}
                >
                  {getValueLabel(dimension, currentValue)}
                </div>
              </div>
            </div>

            {/* Slider with Extreme Labels */}
            <div className="space-y-2">
              {/* Slider Track */}
              <div
                className="relative h-2 rounded-full"
                style={{ backgroundColor: '#E8E1DD' }}
              >
                {/* Fill */}
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all"
                  style={{
                    backgroundColor: '#3B3B3B',
                    width: `${currentValue}%`,
                  }}
                />
                {/* Slider Input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentValue}
                  onChange={e =>
                    handleSliderChange(dimension.id, Number(e.target.value))
                  }
                  className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ margin: 0 }}
                />
              </div>

              {/* Extreme Labels */}
              <div className="flex items-center justify-between">
                {/* Min Extreme */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: '#6B7280' }}>
                    {dimension.min_label}
                  </span>
                  {dimension.philosophical_extremes?.[0] && (
                    <PhilosophicalTooltip
                      extreme={dimension.philosophical_extremes[0]}
                      position="left"
                    />
                  )}
                </div>

                {/* Max Extreme */}
                <div className="flex items-center gap-1.5">
                  {dimension.philosophical_extremes?.[100] && (
                    <PhilosophicalTooltip
                      extreme={dimension.philosophical_extremes[100]}
                      position="right"
                    />
                  )}
                  <span className="text-xs" style={{ color: '#6B7280' }}>
                    {dimension.max_label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
