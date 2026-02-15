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
      minWidth: computed.minWidth,
      maxWidth: computed.maxWidth,
      minHeight: computed.minHeight,
      maxHeight: computed.maxHeight,
      overflow: computed.overflow,
      overflowX: computed.overflowX,
      overflowY: computed.overflowY,
      zIndex: computed.zIndex,
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      alignContent: computed.alignContent,
      flexWrap: computed.flexWrap,
      flexGrow: computed.flexGrow,
      flexShrink: computed.flexShrink,
      flexBasis: computed.flexBasis,
      gap: computed.gap,
      rowGap: computed.rowGap,
      columnGap: computed.columnGap,
      gridTemplateColumns: computed.gridTemplateColumns,
      gridTemplateRows: computed.gridTemplateRows,
      gridColumn: computed.gridColumn,
      gridRow: computed.gridRow,
      gridAutoFlow: computed.gridAutoFlow,
      padding: computed.padding,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      margin: computed.margin,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      top: computed.top,
      right: computed.right,
      bottom: computed.bottom,
      left: computed.left,
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
      whiteSpace: computed.whiteSpace,
      wordBreak: computed.wordBreak,
    },
    background: {
      background: computed.background,
      backgroundColor: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      backgroundSize: computed.backgroundSize,
      backgroundPosition: computed.backgroundPosition,
      backgroundRepeat: computed.backgroundRepeat,
      backgroundAttachment: computed.backgroundAttachment,
    },
    border: {
      border: computed.border,
      borderWidth: computed.borderWidth,
      borderStyle: computed.borderStyle,
      borderColor: computed.borderColor,
      borderRadius: computed.borderRadius,
      borderTop: computed.borderTop,
      borderRight: computed.borderRight,
      borderBottom: computed.borderBottom,
      borderLeft: computed.borderLeft,
      borderTopWidth: computed.borderTopWidth,
      borderRightWidth: computed.borderRightWidth,
      borderBottomWidth: computed.borderBottomWidth,
      borderLeftWidth: computed.borderLeftWidth,
      borderTopLeftRadius: computed.borderTopLeftRadius,
      borderTopRightRadius: computed.borderTopRightRadius,
      borderBottomRightRadius: computed.borderBottomRightRadius,
      borderBottomLeftRadius: computed.borderBottomLeftRadius,
    },
    effects: {
      opacity: computed.opacity,
      boxShadow: computed.boxShadow,
      textShadow: computed.textShadow,
      filter: computed.filter,
      backdropFilter: computed.backdropFilter,
      transform: computed.transform,
      transformOrigin: computed.transformOrigin,
      rotate: computed.rotate,
      scale: computed.scale,
      translate: computed.translate,
      transition: computed.transition,
      transitionDuration: computed.transitionDuration,
      transitionTimingFunction: computed.transitionTimingFunction,
      transitionDelay: computed.transitionDelay,
      animation: computed.animation,
      cursor: computed.cursor,
      pointerEvents: computed.pointerEvents,
      userSelect: computed.userSelect,
      outline: computed.outline,
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
          options: [
            'block',
            'flex',
            'grid',
            'inline',
            'inline-block',
            'inline-flex',
            'none',
          ],
        },
        {
          name: 'Position',
          cssProperty: 'position',
          type: 'select',
          options: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
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
          name: 'Min Width',
          cssProperty: 'minWidth',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Max Width',
          cssProperty: 'maxWidth',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Min Height',
          cssProperty: 'minHeight',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Max Height',
          cssProperty: 'maxHeight',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Overflow',
          cssProperty: 'overflow',
          type: 'select',
          options: ['visible', 'hidden', 'scroll', 'auto'],
        },
        {
          name: 'Overflow X',
          cssProperty: 'overflowX',
          type: 'select',
          options: ['visible', 'hidden', 'scroll', 'auto'],
        },
        {
          name: 'Overflow Y',
          cssProperty: 'overflowY',
          type: 'select',
          options: ['visible', 'hidden', 'scroll', 'auto'],
        },
        {
          name: 'Z-Index',
          cssProperty: 'zIndex',
          type: 'text',
        },
      ],
    },
    {
      name: 'Flexbox',
      icon: '📦',
      properties: [
        {
          name: 'Flex Direction',
          cssProperty: 'flexDirection',
          type: 'select',
          options: ['row', 'row-reverse', 'column', 'column-reverse'],
        },
        {
          name: 'Justify Content',
          cssProperty: 'justifyContent',
          type: 'select',
          options: [
            'flex-start',
            'flex-end',
            'center',
            'space-between',
            'space-around',
            'space-evenly',
          ],
        },
        {
          name: 'Align Items',
          cssProperty: 'alignItems',
          type: 'select',
          options: ['flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
        },
        {
          name: 'Align Content',
          cssProperty: 'alignContent',
          type: 'select',
          options: [
            'flex-start',
            'flex-end',
            'center',
            'space-between',
            'space-around',
            'stretch',
          ],
        },
        {
          name: 'Flex Wrap',
          cssProperty: 'flexWrap',
          type: 'select',
          options: ['nowrap', 'wrap', 'wrap-reverse'],
        },
        {
          name: 'Flex Grow',
          cssProperty: 'flexGrow',
          type: 'text',
        },
        {
          name: 'Flex Shrink',
          cssProperty: 'flexShrink',
          type: 'text',
        },
        {
          name: 'Flex Basis',
          cssProperty: 'flexBasis',
          type: 'text',
        },
        {
          name: 'Gap',
          cssProperty: 'gap',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Row Gap',
          cssProperty: 'rowGap',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Column Gap',
          cssProperty: 'columnGap',
          type: 'text',
          unit: 'px',
        },
      ],
    },
    {
      name: 'Grid',
      icon: '🎯',
      properties: [
        {
          name: 'Grid Template Columns',
          cssProperty: 'gridTemplateColumns',
          type: 'text',
        },
        {
          name: 'Grid Template Rows',
          cssProperty: 'gridTemplateRows',
          type: 'text',
        },
        {
          name: 'Grid Column',
          cssProperty: 'gridColumn',
          type: 'text',
        },
        {
          name: 'Grid Row',
          cssProperty: 'gridRow',
          type: 'text',
        },
        {
          name: 'Grid Auto Flow',
          cssProperty: 'gridAutoFlow',
          type: 'select',
          options: ['row', 'column', 'row dense', 'column dense'],
        },
      ],
    },
    {
      name: 'Spacing',
      icon: '↔️',
      properties: [
        {
          name: 'Padding',
          cssProperty: 'padding',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Padding Top',
          cssProperty: 'paddingTop',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Padding Right',
          cssProperty: 'paddingRight',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Padding Bottom',
          cssProperty: 'paddingBottom',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Padding Left',
          cssProperty: 'paddingLeft',
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
          name: 'Margin Top',
          cssProperty: 'marginTop',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Margin Right',
          cssProperty: 'marginRight',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Margin Bottom',
          cssProperty: 'marginBottom',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Margin Left',
          cssProperty: 'marginLeft',
          type: 'text',
          unit: 'px',
        },
      ],
    },
    {
      name: 'Position',
      icon: '🎪',
      properties: [
        {
          name: 'Top',
          cssProperty: 'top',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Right',
          cssProperty: 'right',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Bottom',
          cssProperty: 'bottom',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Left',
          cssProperty: 'left',
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
            'normal',
            'bold',
            'lighter',
            'bolder',
          ],
        },
        {
          name: 'Font Family',
          cssProperty: 'fontFamily',
          type: 'text',
        },
        {
          name: 'Line Height',
          cssProperty: 'lineHeight',
          type: 'text',
        },
        {
          name: 'Letter Spacing',
          cssProperty: 'letterSpacing',
          type: 'text',
        },
        {
          name: 'Text Align',
          cssProperty: 'textAlign',
          type: 'select',
          options: ['left', 'center', 'right', 'justify'],
        },
        {
          name: 'Text Transform',
          cssProperty: 'textTransform',
          type: 'select',
          options: ['none', 'uppercase', 'lowercase', 'capitalize'],
        },
        {
          name: 'Text Decoration',
          cssProperty: 'textDecoration',
          type: 'select',
          options: ['none', 'underline', 'overline', 'line-through'],
        },
        {
          name: 'White Space',
          cssProperty: 'whiteSpace',
          type: 'select',
          options: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'],
        },
        {
          name: 'Word Break',
          cssProperty: 'wordBreak',
          type: 'select',
          options: ['normal', 'break-all', 'keep-all', 'break-word'],
        },
        {
          name: 'Color',
          cssProperty: 'color',
          type: 'color',
        },
      ],
    },
    {
      name: 'Background',
      icon: '🎨',
      properties: [
        {
          name: 'Background',
          cssProperty: 'background',
          type: 'text',
        },
        {
          name: 'Background Color',
          cssProperty: 'backgroundColor',
          type: 'color',
        },
        {
          name: 'Background Image',
          cssProperty: 'backgroundImage',
          type: 'text',
        },
        {
          name: 'Background Size',
          cssProperty: 'backgroundSize',
          type: 'select',
          options: ['auto', 'cover', 'contain'],
        },
        {
          name: 'Background Position',
          cssProperty: 'backgroundPosition',
          type: 'text',
        },
        {
          name: 'Background Repeat',
          cssProperty: 'backgroundRepeat',
          type: 'select',
          options: ['repeat', 'repeat-x', 'repeat-y', 'no-repeat'],
        },
        {
          name: 'Background Attachment',
          cssProperty: 'backgroundAttachment',
          type: 'select',
          options: ['scroll', 'fixed', 'local'],
        },
      ],
    },
    {
      name: 'Border',
      icon: '⬜',
      properties: [
        {
          name: 'Border',
          cssProperty: 'border',
          type: 'text',
        },
        {
          name: 'Border Width',
          cssProperty: 'borderWidth',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Border Style',
          cssProperty: 'borderStyle',
          type: 'select',
          options: [
            'none',
            'solid',
            'dashed',
            'dotted',
            'double',
            'groove',
            'ridge',
            'inset',
            'outset',
          ],
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
        {
          name: 'Border Top',
          cssProperty: 'borderTop',
          type: 'text',
        },
        {
          name: 'Border Right',
          cssProperty: 'borderRight',
          type: 'text',
        },
        {
          name: 'Border Bottom',
          cssProperty: 'borderBottom',
          type: 'text',
        },
        {
          name: 'Border Left',
          cssProperty: 'borderLeft',
          type: 'text',
        },
        {
          name: 'Border Top Left Radius',
          cssProperty: 'borderTopLeftRadius',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Border Top Right Radius',
          cssProperty: 'borderTopRightRadius',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Border Bottom Right Radius',
          cssProperty: 'borderBottomRightRadius',
          type: 'text',
          unit: 'px',
        },
        {
          name: 'Border Bottom Left Radius',
          cssProperty: 'borderBottomLeftRadius',
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
        {
          name: 'Text Shadow',
          cssProperty: 'textShadow',
          type: 'text',
        },
        {
          name: 'Filter',
          cssProperty: 'filter',
          type: 'text',
        },
        {
          name: 'Backdrop Filter',
          cssProperty: 'backdropFilter',
          type: 'text',
        },
      ],
    },
    {
      name: 'Transform',
      icon: '🔄',
      properties: [
        {
          name: 'Transform',
          cssProperty: 'transform',
          type: 'text',
        },
        {
          name: 'Transform Origin',
          cssProperty: 'transformOrigin',
          type: 'text',
        },
        {
          name: 'Rotate',
          cssProperty: 'rotate',
          type: 'text',
          unit: 'deg',
        },
        {
          name: 'Scale',
          cssProperty: 'scale',
          type: 'text',
        },
        {
          name: 'Translate',
          cssProperty: 'translate',
          type: 'text',
        },
      ],
    },
    {
      name: 'Animation',
      icon: '🎬',
      properties: [
        {
          name: 'Transition',
          cssProperty: 'transition',
          type: 'text',
        },
        {
          name: 'Transition Duration',
          cssProperty: 'transitionDuration',
          type: 'text',
        },
        {
          name: 'Transition Timing',
          cssProperty: 'transitionTimingFunction',
          type: 'select',
          options: ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'],
        },
        {
          name: 'Transition Delay',
          cssProperty: 'transitionDelay',
          type: 'text',
        },
        {
          name: 'Animation',
          cssProperty: 'animation',
          type: 'text',
        },
      ],
    },
    {
      name: 'Interaction',
      icon: '👆',
      properties: [
        {
          name: 'Cursor',
          cssProperty: 'cursor',
          type: 'select',
          options: [
            'auto',
            'default',
            'pointer',
            'move',
            'text',
            'wait',
            'not-allowed',
            'grab',
            'grabbing',
          ],
        },
        {
          name: 'Pointer Events',
          cssProperty: 'pointerEvents',
          type: 'select',
          options: ['auto', 'none'],
        },
        {
          name: 'User Select',
          cssProperty: 'userSelect',
          type: 'select',
          options: ['auto', 'none', 'text', 'all'],
        },
        {
          name: 'Outline',
          cssProperty: 'outline',
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
