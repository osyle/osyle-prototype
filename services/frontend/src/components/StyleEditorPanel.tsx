/**
 * StyleEditorPanel - Live style editing interface
 * Displays in the Refine tab when an element is inspected
 */

import React, { useState, useEffect } from 'react'
import type { InspectedElement } from '../lib/Agentator/types'
import type {
  ExtractedStyles,
  StyleOverride,
  EditableStyleCategory,
} from '../types/styleEditor.types'
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

  // Local input state to prevent immediate resets while typing
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  // Extract styles when element changes
  useEffect(() => {
    if (inspectedElement && inspectedElement.computedStyles) {
      const styles = inspectedElement.computedStyles

      // Categorize the computed styles
      setExtractedStyles({
        layout: {
          display: styles['display'] || '',
          position: styles['position'] || '',
          width: styles['width'] || '',
          height: styles['height'] || '',
          margin: styles['margin'] || '',
          padding: styles['padding'] || '',
          flexDirection:
            styles['flexDirection'] || styles['flex-direction'] || '',
          justifyContent:
            styles['justifyContent'] || styles['justify-content'] || '',
          alignItems: styles['alignItems'] || styles['align-items'] || '',
          gap: styles['gap'] || '',
        },
        typography: {
          fontSize: styles['fontSize'] || styles['font-size'] || '',
          fontWeight: styles['fontWeight'] || styles['font-weight'] || '',
          fontFamily: styles['fontFamily'] || styles['font-family'] || '',
          lineHeight: styles['lineHeight'] || styles['line-height'] || '',
          letterSpacing:
            styles['letterSpacing'] || styles['letter-spacing'] || '',
          color: styles['color'] || '',
          textAlign: styles['textAlign'] || styles['text-align'] || '',
          textDecoration:
            styles['textDecoration'] || styles['text-decoration'] || '',
        },
        background: {
          backgroundColor:
            styles['backgroundColor'] || styles['background-color'] || '',
          backgroundImage:
            styles['backgroundImage'] || styles['background-image'] || '',
        },
        border: {
          borderWidth: styles['borderWidth'] || styles['border-width'] || '',
          borderStyle: styles['borderStyle'] || styles['border-style'] || '',
          borderColor: styles['borderColor'] || styles['border-color'] || '',
          borderRadius: styles['borderRadius'] || styles['border-radius'] || '',
        },
        effects: {
          opacity: styles['opacity'] || '',
          boxShadow: styles['boxShadow'] || styles['box-shadow'] || '',
          transform: styles['transform'] || '',
        },
      })

      // Clear local values when element changes
      setLocalValues({})
    } else {
      setExtractedStyles(null)
      setLocalValues({})
    }
  }, [inspectedElement])

  if (!inspectedElement) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '24px' }}>✏️</span>
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#3B3B3B',
            marginBottom: '4px',
          }}
        >
          No Element Selected
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#929397',
          }}
        >
          Use Inspect mode to select an element
        </div>
      </div>
    )
  }

  const categories = getStyleCategories()

  const handlePropertyChange = (cssProperty: string, value: string) => {
    // Update local state immediately for smooth typing
    setLocalValues(prev => ({ ...prev, [cssProperty]: value }))

    // Also update the actual override
    onStyleChange(
      inspectedElement.elementPath,
      inspectedElement.elementIndex,
      cssProperty,
      value,
    )
  }

  const getCurrentValue = (cssProperty: string): string => {
    // If user is currently typing, show their input
    if (localValues[cssProperty] !== undefined) {
      return localValues[cssProperty]
    }

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

  const hasModifiedProperties = (category: EditableStyleCategory): boolean => {
    if (!currentOverrides) return false
    return category.properties.some(
      prop => currentOverrides.styles[prop.cssProperty] !== undefined,
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header - Redesigned to match other sections */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            }}
          >
            <span style={{ fontSize: '16px' }}>✏️</span>
          </div>
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#3B3B3B',
              }}
            >
              Edit Styles
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#929397',
              }}
            >
              {inspectedElement.element}
            </div>
          </div>
        </div>
      </div>

      {/* Style Categories */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {categories.map(category => {
          const hasModifications = hasModifiedProperties(category)

          return (
            <div
              key={category.name}
              style={{
                marginBottom: '12px',
              }}
            >
              {/* Category Header - Static, not clickable */}
              <div
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#667EEA',
                  border: '1px solid #5A6FD8',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ fontSize: '14px' }}>{category.icon}</span>
                  <span>{category.name}</span>
                  {hasModifications && (
                    <span
                      style={{
                        fontSize: '9px',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      EDITED
                    </span>
                  )}
                </div>
              </div>

              {/* Category Properties - Always Visible */}
              <div
                style={{
                  marginTop: '8px',
                  padding: '16px',
                  backgroundColor: '#FAFAF9',
                  border: '1px solid #E8E1DD',
                  borderRadius: '12px',
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
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#929397',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        <span>{property.name}</span>
                        {isOverridden && (
                          <span
                            style={{
                              fontSize: '9px',
                              color: '#8B5CF6',
                              fontWeight: 700,
                              backgroundColor: 'rgba(139, 92, 246, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            EDITED
                          </span>
                        )}
                      </label>

                      {/* Property Input */}
                      {property.type === 'text' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
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
                              padding: '8px 12px',
                              fontSize: '13px',
                              border: '1px solid #E8E1DD',
                              borderRadius: '8px',
                              outline: 'none',
                              backgroundColor: '#FFFFFF',
                              color: '#3B3B3B',
                            }}
                            placeholder="auto"
                          />
                          {property.unit && (
                            <div
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                color: '#929397',
                                border: '1px solid #E8E1DD',
                                borderRadius: '8px',
                                backgroundColor: '#F7F5F3',
                                fontWeight: 500,
                              }}
                            >
                              {property.unit}
                            </div>
                          )}
                        </div>
                      )}

                      {property.type === 'color' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
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
                              width: '48px',
                              height: '40px',
                              border: '1px solid #E8E1DD',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              padding: '4px',
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
                              padding: '8px 12px',
                              fontSize: '13px',
                              border: '1px solid #E8E1DD',
                              borderRadius: '8px',
                              outline: 'none',
                              backgroundColor: '#FFFFFF',
                              color: '#3B3B3B',
                              fontFamily: 'monospace',
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
                            padding: '8px 12px',
                            fontSize: '13px',
                            border: '1px solid #E8E1DD',
                            borderRadius: '8px',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer',
                            color: '#3B3B3B',
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
                              height: '6px',
                              borderRadius: '3px',
                              outline: 'none',
                            }}
                          />
                          <div
                            style={{
                              marginTop: '6px',
                              fontSize: '12px',
                              color: '#929397',
                              textAlign: 'center',
                              fontWeight: 500,
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
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      {hasUnsavedChanges && (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#F7F5F3',
            border: '1px solid #E8E1DD',
            borderRadius: '12px',
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
              color: '#929397',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E8E1DD',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#F7F5F3'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#FFFFFF'
            }}
          >
            Discard
          </button>
          <button
            onClick={onSave}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            💾 Save Changes
          </button>
        </div>
      )}
    </div>
  )
}
