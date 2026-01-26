/**
 * Style Extraction Utilities
 * Extract and categorize editable styles from DOM elements
 */

import type {
  ExtractedStyles,
  EditableStyleCategory,
} from '../types/styleEditor.types'

/**
 * Extract computed styles from an element and categorize them
 */
export function extractEditableStyles(element: HTMLElement): ExtractedStyles {
  const computed = window.getComputedStyle(element)

  return {
    layout: {
      display: computed.display,
      position: computed.position,
      width: computed.width,
      height: computed.height,
      margin: computed.margin,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      padding: computed.padding,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,
    },
    typography: {
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontFamily: computed.fontFamily,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      color: computed.color,
      textAlign: computed.textAlign,
      textDecoration: computed.textDecoration,
      textTransform: computed.textTransform,
    },
    background: {
      backgroundColor: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      backgroundSize: computed.backgroundSize,
      backgroundPosition: computed.backgroundPosition,
      backgroundRepeat: computed.backgroundRepeat,
    },
    border: {
      borderWidth: computed.borderWidth,
      borderStyle: computed.borderStyle,
      borderColor: computed.borderColor,
      borderRadius: computed.borderRadius,
      borderTopWidth: computed.borderTopWidth,
      borderRightWidth: computed.borderRightWidth,
      borderBottomWidth: computed.borderBottomWidth,
      borderLeftWidth: computed.borderLeftWidth,
    },
    effects: {
      opacity: computed.opacity,
      boxShadow: computed.boxShadow,
      transform: computed.transform,
      filter: computed.filter,
    },
  }
}

/**
 * Get style categories with metadata for editing UI
 */
export function getStyleCategories(): EditableStyleCategory[] {
  return [
    {
      name: 'Layout',
      icon: '📐',
      properties: [
        {
          name: 'Display',
          cssProperty: 'display',
          type: 'select',
          options: ['block', 'flex', 'grid', 'inline', 'inline-block', 'none'],
        },
        {
          name: 'Width',
          cssProperty: 'width',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Height',
          cssProperty: 'height',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Padding',
          cssProperty: 'padding',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Margin',
          cssProperty: 'margin',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Gap',
          cssProperty: 'gap',
          type: 'text',
          unit: 'px',
        },
      ],
    },
    {
      name: 'Typography',
      icon: '🔤',
      properties: [
        {
          name: 'Font Size',
          cssProperty: 'fontSize',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Font Weight',
          cssProperty: 'fontWeight',
          type: 'select',
          options: [
            '100',
            '200',
            '300',
            '400',
            '500',
            '600',
            '700',
            '800',
            '900',
          ],
        },
        {
          name: 'Color',
          cssProperty: 'color',
          type: 'color',
        },
        {
          name: 'Line Height',
          cssProperty: 'lineHeight',
          type: 'text',
        },
        {
          name: 'Text Align',
          cssProperty: 'textAlign',
          type: 'select',
          options: ['left', 'center', 'right', 'justify'],
        },
      ],
    },
    {
      name: 'Background',
      icon: '🎨',
      properties: [
        {
          name: 'Background Color',
          cssProperty: 'backgroundColor',
          type: 'color',
        },
      ],
    },
    {
      name: 'Border',
      icon: '⬜',
      properties: [
        {
          name: 'Border Width',
          cssProperty: 'borderWidth',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Border Color',
          cssProperty: 'borderColor',
          type: 'color',
        },
        {
          name: 'Border Radius',
          cssProperty: 'borderRadius',
          type: 'text',
          unit: 'px',
        },
      ],
    },
    {
      name: 'Effects',
      icon: '✨',
      properties: [
        {
          name: 'Opacity',
          cssProperty: 'opacity',
          type: 'slider',
          min: 0,
          max: 1,
          step: 0.1,
        },
        {
          name: 'Box Shadow',
          cssProperty: 'boxShadow',
          type: 'text',
        },
      ],
    },
  ]
}

/**
 * Parse CSS value to separate number and unit
 */
export function parseCSSValue(value: string): { number: string; unit: string } {
  const match = value.match(/^([\d.]+)(.*)$/)
  if (match) {
    return { number: match[1], unit: match[2] }
  }
  return { number: value, unit: '' }
}

/**
 * Convert RGB color to hex
 */
export function rgbToHex(rgb: string): string {
  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return rgb

  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])

  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

/**
 * Apply style overrides to an element
 */
export function applyStyleOverride(
  element: HTMLElement,
  styles: Record<string, string>,
): void {
  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(property, value, 'important')
  })

  // Mark element as having overrides
  element.setAttribute('data-style-override', 'true')
}

/**
 * Remove style overrides from an element
 */
export function removeStyleOverride(element: HTMLElement): void {
  element.removeAttribute('data-style-override')
  // Note: We can't easily remove individual inline styles
  // so we'd need to re-render the component
}

/**
 * Find element by path and index
 */
export function findElementByPath(
  container: HTMLElement,
  elementPath: string,
  elementIndex?: number,
): HTMLElement | null {
  // Parse path (e.g., "div > section > .button")
  const parts = elementPath.split(' > ').map(p => p.trim())

  let current: HTMLElement | null = container
  for (const part of parts) {
    if (!current) return null

    if (part.startsWith('#')) {
      // ID selector
      const id = part.slice(1)
      current = current.querySelector(`#${id}`) as HTMLElement | null
    } else if (part.startsWith('.')) {
      // Class selector
      const className = part.slice(1)
      const elements = Array.from(
        current.querySelectorAll(`.${className}`),
      ) as HTMLElement[]
      current = elements[0] || null
    } else {
      // Tag selector
      const elements = Array.from(
        current.querySelectorAll(part),
      ) as HTMLElement[]
      current = elements[0] || null
    }
  }

  // If elementIndex is specified, get that specific instance
  if (elementIndex !== undefined && current) {
    const allMatching = Array.from(
      container.querySelectorAll(elementPath),
    ) as HTMLElement[]
    return allMatching[elementIndex] || null
  }

  return current
}
