import { Info } from 'lucide-react'
import { useState, useEffect } from 'react'
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

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
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
          className="absolute bottom-full mb-2 z-50 animate-in fade-in duration-150"
          style={{
            [position]: '0',
            width: '220px',
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
          dimension.philosophical_extremes?.['0']?.name || dimension.min_label
        )
      }
      if (value > 66) {
        // Try to use philosophical extreme name, fall back to max_label
        return (
          dimension.philosophical_extremes?.['100']?.name || dimension.max_label
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
        label: 'Modes',
        color: '#3B82F6',
        bgColor: '#EFF6FF',
      }
    }

    if (dimension.type === 'continuous') {
      return {
        label: 'Scale',
        color: '#8B5CF6',
        bgColor: '#F5F3FF',
      }
    }

    return null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="text-xs font-medium" style={{ color: '#6B7280' }}>
          Parametric Controls
        </div>
        <div className="text-xs" style={{ color: '#929397' }}>
          {variationSpace.metadata.ui_type}
        </div>
      </div>

      {/* Dimension Controls */}
      {variationSpace.dimensions.map(dimension => {
        const currentValue = sliderValues[dimension.id]
        const badge = getPatternBadge(dimension)

        return (
          <div key={dimension.id}>
            {/* Dimension Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: '#3B3B3B' }}
                >
                  {dimension.label}
                </span>

                {/* Pattern Type Badge */}
                {badge && (
                  <span
                    className="px-2 py-0.5 text-xs rounded-full font-medium"
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
                <div className="group relative">
                  <Info
                    size={12}
                    style={{ color: '#929397' }}
                    className="cursor-help"
                  />
                  <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50">
                    <div
                      className="px-3 py-2 rounded-lg text-xs w-48"
                      style={{
                        backgroundColor: '#1F1F20',
                        color: '#FFFFFF',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      }}
                    >
                      {dimension.description}
                    </div>
                  </div>
                </div>

                <span className="text-xs" style={{ color: '#929397' }}>
                  ||
                </span>
              </div>

              {/* Current Value Label */}
              <span
                className="text-sm font-medium"
                style={{ color: '#3B3B3B' }}
              >
                {getValueLabel(dimension, currentValue)}
              </span>
            </div>

            {/* Slider Track */}
            <div
              className="relative h-2 rounded-full"
              style={{ backgroundColor: '#F4F4F4' }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
                style={{
                  backgroundColor: '#3B3B3B',
                  width: `${currentValue}%`,
                }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={currentValue}
                onChange={e =>
                  handleSliderChange(dimension.id, Number(e.target.value))
                }
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Min/Max Labels with Philosophical Tooltips */}
            <div className="flex justify-between items-center mt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: '#929397' }}>
                  {dimension.min_label}
                </span>
                {dimension.philosophical_extremes?.['0'] && (
                  <PhilosophicalTooltip
                    extreme={dimension.philosophical_extremes['0']}
                    position="left"
                  />
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: '#929397' }}>
                  {dimension.max_label}
                </span>
                {dimension.philosophical_extremes?.['100'] && (
                  <PhilosophicalTooltip
                    extreme={dimension.philosophical_extremes['100']}
                    position="right"
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Empty State */}
      {variationSpace.dimensions.length === 0 && (
        <div className="text-xs text-center py-4" style={{ color: '#9CA3AF' }}>
          No parametric controls available for this UI
        </div>
      )}
    </div>
  )
}
