import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import type { VariationSpace, ParameterValues } from '../types/parametric.types'

interface ParametricControlsProps {
  variationSpace: VariationSpace
  initialValues?: ParameterValues
  onChange: (values: ParameterValues) => void
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

  const getValueLabel = (
    dimension: (typeof variationSpace.dimensions)[0],
    value: number,
  ) => {
    if (value < 33) return dimension.min_label
    if (value > 66) return dimension.max_label
    return 'Balanced'
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-medium text-gray-600 mb-1">
          Parametric Controls
        </div>
        <div className="text-xs text-gray-400">
          {variationSpace.metadata.ui_type}
        </div>
      </div>

      {variationSpace.dimensions.map(dimension => (
        <div key={dimension.id}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: '#3B3B3B' }}
              >
                {dimension.label}
              </span>
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
            <span className="text-sm font-medium" style={{ color: '#3B3B3B' }}>
              {getValueLabel(dimension, sliderValues[dimension.id])}
            </span>
          </div>

          <div
            className="relative h-2 rounded-full"
            style={{ backgroundColor: '#F4F4F4' }}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
              style={{
                backgroundColor: '#3B3B3B',
                width: `${sliderValues[dimension.id]}%`,
              }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValues[dimension.id]}
              onChange={e =>
                handleSliderChange(dimension.id, Number(e.target.value))
              }
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: '#929397' }}>
              {dimension.min_label}
            </span>
            <span className="text-xs" style={{ color: '#929397' }}>
              {dimension.max_label}
            </span>
          </div>
        </div>
      ))}

      {variationSpace.dimensions.length === 0 && (
        <div className="text-xs text-gray-400 text-center py-4">
          No parametric controls available for this UI
        </div>
      )}
    </div>
  )
}
