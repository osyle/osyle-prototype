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
  containerRef: React.RefObject<HTMLElement>
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
  Object.entries(styles).forEach(([property, value]) => {
    // Convert camelCase to kebab-case
    const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase()
    element.style.setProperty(cssProp, value, 'important')
  })
  element.setAttribute('data-style-override', 'true')
}

/**
 * Remove style overrides from an element
 */
function removeOverride(element: HTMLElement) {
  element.removeAttribute('data-style-override')
  // Note: Can't easily remove inline styles, would need to re-render
}

export function StyleOverlayApplicator({
  children,
  overrides,
  containerRef,
}: StyleOverlayApplicatorProps) {
  const appliedOverridesRef = useRef<Set<HTMLElement>>(new Set())

  // Apply overrides whenever they change or DOM updates
  useEffect(() => {
    if (!containerRef.current || overrides.length === 0) {
      // Clear all previous overrides
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
