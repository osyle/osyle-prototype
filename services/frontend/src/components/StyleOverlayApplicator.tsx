/**
 * StyleOverlayApplicator
 * Phase 2: Apply style overrides in real-time to rendered elements
 * Uses MutationObserver to apply styles when DOM updates
 */

import React, { useEffect, useRef } from 'react'
import type { StyleOverride } from '../types/styleEditor.types'

interface StyleOverlayApplicatorProps {
  children: React.ReactNode
  overrides: StyleOverride[]
  containerRef: React.RefObject<HTMLElement | null>
}

/**
 * Find element by path in a container
 */
function findElementByPath(
  container: HTMLElement,
  path: string,
  index?: number,
): HTMLElement | null {
  try {
    // Simple querySelector approach
    const elements = container.querySelectorAll(path)
    if (index !== undefined) {
      return elements[index] as HTMLElement | null
    }
    return elements[0] as HTMLElement | null
  } catch {
    return null
  }
}

/**
 * Apply style override to an element
 */
function applyOverride(element: HTMLElement, styles: Record<string, string>) {
  // Check if we already have original styles stored (from a previous override)
  const existingOriginalStylesStr = element.getAttribute('data-original-styles')
  const existingOriginalStyles = existingOriginalStylesStr
    ? JSON.parse(existingOriginalStylesStr)
    : {}

  // Store original values before overriding (only if not already stored)
  const originalStyles: Record<string, string> = { ...existingOriginalStyles }

  Object.entries(styles).forEach(([property, value]) => {
    // Convert camelCase to kebab-case
    const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase()

    // Only store original value if we haven't stored one yet for this property
    if (!originalStyles[cssProp]) {
      const originalValue = element.style.getPropertyValue(cssProp)
      if (originalValue) {
        originalStyles[cssProp] = originalValue
      }
    }

    element.style.setProperty(cssProp, value, 'important')
  })

  element.setAttribute('data-style-override', 'true')
  // Store which properties we modified for cleanup
  element.setAttribute('data-override-props', Object.keys(styles).join(','))
  // Store original values
  if (Object.keys(originalStyles).length > 0) {
    element.setAttribute('data-original-styles', JSON.stringify(originalStyles))
  }
}

/**
 * Remove style overrides from an element
 */
function removeOverride(element: HTMLElement) {
  const overrideProps = element.getAttribute('data-override-props')
  const originalStylesStr = element.getAttribute('data-original-styles')

  if (overrideProps) {
    const props = overrideProps.split(',')
    const originalStyles = originalStylesStr
      ? JSON.parse(originalStylesStr)
      : {}

    props.forEach(property => {
      const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase()

      // Restore original value if it existed
      if (originalStyles[cssProp]) {
        element.style.setProperty(cssProp, originalStyles[cssProp])
      } else {
        // Remove the property entirely
        element.style.removeProperty(cssProp)
      }
    })
  }

  element.removeAttribute('data-style-override')
  element.removeAttribute('data-override-props')
  element.removeAttribute('data-original-styles')

  // Clean up empty style attribute
  if (element.style.cssText.trim() === '') {
    element.removeAttribute('style')
  }
}

export function StyleOverlayApplicator({
  children,
  overrides,
  containerRef,
}: StyleOverlayApplicatorProps) {
  const appliedOverridesRef = useRef<Set<HTMLElement>>(new Set())

  // Apply overrides whenever they change or DOM updates
  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    // When overrides are cleared (reset), remove all applied overrides
    if (overrides.length === 0) {
      appliedOverridesRef.current.forEach(el => removeOverride(el))
      appliedOverridesRef.current.clear()
      return
    }

    const container = containerRef.current

    // Apply each override
    const newAppliedElements = new Set<HTMLElement>()

    overrides.forEach(override => {
      const element = findElementByPath(
        container,
        override.elementPath,
        override.elementIndex,
      )

      if (element) {
        applyOverride(element, override.styles)
        newAppliedElements.add(element)
      }
    })

    // Remove overrides from elements no longer in list
    appliedOverridesRef.current.forEach(el => {
      if (!newAppliedElements.has(el)) {
        removeOverride(el)
      }
    })

    appliedOverridesRef.current = newAppliedElements

    // Watch for DOM changes and reapply
    const observer = new MutationObserver(() => {
      overrides.forEach(override => {
        const element = findElementByPath(
          container,
          override.elementPath,
          override.elementIndex,
        )

        if (element && !element.hasAttribute('data-style-override')) {
          applyOverride(element, override.styles)
          newAppliedElements.add(element)
        }
      })
    })

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: false,
    })

    return () => {
      observer.disconnect()
    }
  }, [overrides, containerRef])

  return <>{children}</>
}
