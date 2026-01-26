/**
 * StyleEditorPanel - Live style editing interface
 * Displays in the Refine tab when an element is inspected
 */

import React, { useState, useEffect } from 'react'
import type { InspectedElement } from '../lib/Agentator/types'
import type { ExtractedStyles, StyleOverride } from '../types/styleEditor.types'
import {
  getStyleCategories,
  parseCSSValue,
  rgbToHex,
} from '../utils/styleEditorUtils'

interface StyleEditorPanelProps {
  inspectedElement: InspectedElement | null
  screenId: string
  onStyleChange: (
    // eslint-disable-next-line no-unused-vars
    elementPath: string,
    // eslint-disable-next-line no-unused-vars
    elementIndex: number | undefined,
    // eslint-disable-next-line no-unused-vars
    property: string,
    // eslint-disable-next-line no-unused-vars
    value: string,
  ) => void
  onReset: () => void
  onSave: () => void
  hasUnsavedChanges: boolean
  currentOverrides: StyleOverride | null
}

export const StyleEditorPanel: React.FC<StyleEditorPanelProps> = ({
  inspectedElement,
  // @ts-expect-error - Parameter kept for API compatibility with call sites
  screenId, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  onStyleChange,
  onReset,
  onSave,
  hasUnsavedChanges,
  currentOverrides,
}) => {
  // @ts-expect-error - State setter is used, but value is kept for future use
  const [extractedStyles, setExtractedStyles] = // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
    useState<ExtractedStyles | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    Layout: true,
    Typography: true,
    Background: false,
    Border: false,
    Effects: false,
  })

  // Extract styles when element changes
  useEffect(() => {
    if (inspectedElement && inspectedElement.boundingBox) {
      // Find the actual DOM element to extract styles
      // This is a placeholder - in real implementation, we'd need to pass the actual element
      // For now, we'll show the computed styles from InspectedElement if available
      setExtractedStyles({
        layout: {},
        typography: {},
        background: {},
        border: {},
        effects: {},
      })
    } else {
      setExtractedStyles(null)
    }
  }, [inspectedElement])

  if (!inspectedElement) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: '#6B7280',
          fontSize: '14px',
        }}
      >
        Select an element to edit its styles
      </div>
    )
  }

  const categories = getStyleCategories()

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }))
  }

  const handlePropertyChange = (cssProperty: string, value: string) => {
    onStyleChange(
      inspectedElement.elementPath,
      inspectedElement.elementIndex,
      cssProperty,
      value,
    )
  }

  const getCurrentValue = (cssProperty: string): string => {
    // Check if there's an override first
    if (currentOverrides?.styles[cssProperty]) {
      return currentOverrides.styles[cssProperty]
    }

    // Otherwise get from computed styles (if available)
    if (inspectedElement.computedStyles?.[cssProperty]) {
      return inspectedElement.computedStyles[cssProperty]
    }

    return ''
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '4px',
          }}
        >
          ✏️ Edit Styles
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#6B7280',
          }}
        >
          {inspectedElement.element}
        </div>
      </div>

      {/* Style Categories */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {categories.map(category => (
          <div
            key={category.name}
            style={{
              marginBottom: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
            }}
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.name)}
              style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
              }}
            >
              <span>
                {category.icon} {category.name}
              </span>
              <span
                style={{
                  transform: expandedCategories[category.name]
                    ? 'rotate(180deg)'
                    : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                ▼
              </span>
            </button>

            {/* Category Properties */}
            {expandedCategories[category.name] && (
              <div
                style={{
                  padding: '8px 16px 16px',
                  borderTop: '1px solid #F3F4F6',
                }}
              >
                {category.properties.map(property => {
                  const currentValue = getCurrentValue(property.cssProperty)
                  const isOverridden =
                    currentOverrides?.styles[property.cssProperty] !== undefined

                  return (
                    <div
                      key={property.cssProperty}
                      style={{
                        marginBottom: '12px',
                      }}
                    >
                      {/* Property Label */}
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#4B5563',
                          marginBottom: '6px',
                        }}
                      >
                        <span>{property.name}</span>
                        {isOverridden && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: '#3B82F6',
                              fontWeight: 600,
                            }}
                          >
                            EDITED
                          </span>
                        )}
                      </label>

                      {/* Property Input */}
                      {property.type === 'text' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            value={parseCSSValue(currentValue).number}
                            onChange={e => {
                              const unit = property.unit || ''
                              handlePropertyChange(
                                property.cssProperty,
                                e.target.value + unit,
                              )
                            }}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              fontSize: '12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              outline: 'none',
                            }}
                            placeholder="auto"
                          />
                          {property.unit && (
                            <div
                              style={{
                                padding: '6px 10px',
                                fontSize: '12px',
                                color: '#6B7280',
                                border: '1px solid #D1D5DB',
                                borderRadius: '6px',
                                backgroundColor: '#F9FAFB',
                              }}
                            >
                              {property.unit}
                            </div>
                          )}
                        </div>
                      )}

                      {property.type === 'color' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="color"
                            value={
                              currentValue.startsWith('rgb')
                                ? rgbToHex(currentValue)
                                : currentValue
                            }
                            onChange={e =>
                              handlePropertyChange(
                                property.cssProperty,
                                e.target.value,
                              )
                            }
                            style={{
                              width: '40px',
                              height: '32px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          />
                          <input
                            type="text"
                            value={currentValue}
                            onChange={e =>
                              handlePropertyChange(
                                property.cssProperty,
                                e.target.value,
                              )
                            }
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              fontSize: '12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              outline: 'none',
                            }}
                          />
                        </div>
                      )}

                      {property.type === 'select' && (
                        <select
                          value={currentValue}
                          onChange={e =>
                            handlePropertyChange(
                              property.cssProperty,
                              e.target.value,
                            )
                          }
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            fontSize: '12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          {property.options?.map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}

                      {property.type === 'slider' && (
                        <div>
                          <input
                            type="range"
                            min={property.min}
                            max={property.max}
                            step={property.step}
                            value={parseFloat(currentValue) || 1}
                            onChange={e =>
                              handlePropertyChange(
                                property.cssProperty,
                                e.target.value,
                              )
                            }
                            style={{
                              width: '100%',
                              cursor: 'pointer',
                            }}
                          />
                          <div
                            style={{
                              marginTop: '4px',
                              fontSize: '11px',
                              color: '#6B7280',
                              textAlign: 'center',
                            }}
                          >
                            {currentValue}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      {hasUnsavedChanges && (
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            onClick={onReset}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#6B7280',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Reset
          </button>
          <button
            onClick={onSave}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: '#3B82F6',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
}
