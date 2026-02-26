// =============================================================================
// Element Identification Utilities (inspired by Agentation)
// Original implementation by Benji Taylor - agentation.dev
// =============================================================================

/**
 * Gets a readable path for an element (e.g., "article > section > p")
 */
export function getElementPath(target: HTMLElement, maxDepth = 4): string {
  const parts: string[] = []
  let current: HTMLElement | null = target
  let depth = 0

  while (current && depth < maxDepth) {
    const tag = current.tagName.toLowerCase()

    // Skip generic wrappers
    if (tag === 'html' || tag === 'body') break

    // Get identifier
    let identifier = tag
    if (current.id) {
      identifier = `#${current.id}`
    } else if (current.className && typeof current.className === 'string') {
      const meaningfulClass = current.className
        .split(/\s+/)
        .find(
          c =>
            c.length > 2 &&
            !c.match(/^[a-z]{1,2}$/) &&
            !c.match(/[A-Z0-9]{5,}/),
        )
      if (meaningfulClass) {
        identifier = `.${meaningfulClass.split('_')[0]}`
      }
    }

    parts.unshift(identifier)
    current = current.parentElement
    depth++
  }

  return parts.join(' > ')
}

/**
 * Identifies an element and returns a human-readable name + path + type
 * elementType 'leaf' = single content element (img, text, button, input, icon)
 * elementType 'container' = wraps multiple children, appropriate for layout redesign
 */
export function identifyElement(target: HTMLElement): {
  name: string
  path: string
  elementType: 'leaf' | 'container'
} {
  const path = getElementPath(target)
  const L = 'leaf' as const
  const C = 'container' as const

  if (target.dataset['element']) {
    return { name: target.dataset['element'], path, elementType: C }
  }

  const tag = target.tagName.toLowerCase()

  // SVG elements — leaf
  if (['path', 'circle', 'rect', 'line', 'g'].includes(tag)) {
    const svg = target.closest('svg')
    if (svg) {
      const parent = svg.parentElement
      if (parent) {
        const parentName = identifyElement(parent).name
        return { name: `graphic in ${parentName}`, path, elementType: L }
      }
    }
    return { name: 'graphic element', path, elementType: L }
  }
  if (tag === 'svg') {
    const parent = target.parentElement
    if (parent?.tagName.toLowerCase() === 'button') {
      const btnText = parent.textContent?.trim()
      return {
        name: btnText ? `icon in "${btnText}" button` : 'button icon',
        path,
        elementType: L,
      }
    }
    return { name: 'icon', path, elementType: L }
  }

  // Interactive elements — leaf (atomic actions)
  if (tag === 'button') {
    const text = target.textContent?.trim()
    const ariaLabel = target.getAttribute('aria-label')
    if (ariaLabel) return { name: `${ariaLabel} Button`, path, elementType: L }
    return {
      name: text ? `"${text.slice(0, 25)}" Button` : 'Button',
      path,
      elementType: L,
    }
  }
  if (tag === 'a') {
    const text = target.textContent?.trim()
    const href = target.getAttribute('href')
    if (text)
      return { name: `"${text.slice(0, 25)}" Link`, path, elementType: L }
    if (href)
      return { name: `Link to ${href.slice(0, 30)}`, path, elementType: L }
    return { name: 'Link', path, elementType: L }
  }
  if (tag === 'input') {
    const type = target.getAttribute('type') || 'text'
    const placeholder = target.getAttribute('placeholder')
    const name = target.getAttribute('name')
    if (placeholder)
      return { name: `"${placeholder}" Input`, path, elementType: L }
    if (name) return { name: `${name} Input`, path, elementType: L }
    return { name: `${type} Input`, path, elementType: L }
  }

  // Headings — leaf
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
    const text = target.textContent?.trim()
    return {
      name: text
        ? `${tag.toUpperCase()} "${text.slice(0, 35)}"`
        : tag.toUpperCase(),
      path,
      elementType: L,
    }
  }

  // Text elements — leaf
  if (tag === 'p') {
    const text = target.textContent?.trim()
    if (text)
      return {
        name: `Paragraph: "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`,
        path,
        elementType: L,
      }
    return { name: 'Paragraph', path, elementType: L }
  }
  if (tag === 'span' || tag === 'label') {
    const text = target.textContent?.trim()
    if (text && text.length < 40)
      return { name: `"${text}"`, path, elementType: L }
    return { name: tag, path, elementType: L }
  }
  if (tag === 'li') {
    const text = target.textContent?.trim()
    if (text && text.length < 40)
      return { name: `List item: "${text.slice(0, 35)}"`, path, elementType: L }
    return { name: 'List item', path, elementType: L }
  }

  // Media — leaf
  if (tag === 'img') {
    const alt = target.getAttribute('alt')
    return {
      name: alt ? `Image "${alt.slice(0, 30)}"` : 'Image',
      path,
      elementType: L,
    }
  }
  if (tag === 'video') return { name: 'Video', path, elementType: L }

  // Containers — check child count to distinguish meaningful sections from thin wrappers
  if (
    [
      'div',
      'section',
      'article',
      'nav',
      'header',
      'footer',
      'aside',
      'main',
    ].includes(tag)
  ) {
    const className = target.className
    const role = target.getAttribute('role')
    const ariaLabel = target.getAttribute('aria-label')

    // A container with 2+ distinct children is a real section worth redesigning
    const childCount = target.children.length
    const effectiveType = childCount >= 2 ? C : L

    if (ariaLabel)
      return { name: `${tag} [${ariaLabel}]`, path, elementType: effectiveType }
    if (role) return { name: `${role}`, path, elementType: effectiveType }

    // Derive name from the first heading inside — far more reliable than class parsing
    const innerHeading = target.querySelector('h1,h2,h3,h4,h5,h6')
    if (innerHeading) {
      const headingText = innerHeading.textContent?.trim()
      if (headingText && headingText.length < 60) {
        return {
          name: `${headingText} Section`,
          path,
          elementType: effectiveType,
        }
      }
    }

    if (typeof className === 'string' && className) {
      const words = className
        .split(/[\s_-]+/)
        .map(c => c.replace(/[A-Z0-9]{5,}.*$/, ''))
        .filter(c => c.length > 2 && !/^[a-z]{1,2}$/.test(c))
        .slice(0, 2)
      if (words.length > 0)
        return { name: words.join(' '), path, elementType: effectiveType }
    }

    return {
      name: tag === 'div' ? 'Container' : tag,
      path,
      elementType: effectiveType,
    }
  }

  return { name: tag, path, elementType: L }
}

/**
 * Gets CSS classes from an element
 */
export function getElementClasses(element: HTMLElement): string {
  if (!element.className || typeof element.className !== 'string') return ''
  return element.className.trim().split(/\s+/).join(' ')
}

/**
 * Gets nearby text for context
 */
export function getNearbyText(element: HTMLElement): string {
  const texts: string[] = []

  const ownText = element.textContent?.trim()
  if (ownText && ownText.length < 100) {
    texts.push(ownText)
  }

  const prev = element.previousElementSibling
  if (prev) {
    const prevText = prev.textContent?.trim()
    if (prevText && prevText.length < 50) {
      texts.unshift(`[before: "${prevText.slice(0, 40)}"]`)
    }
  }

  const next = element.nextElementSibling
  if (next) {
    const nextText = next.textContent?.trim()
    if (nextText && nextText.length < 50) {
      texts.push(`[after: "${nextText.slice(0, 40)}"]`)
    }
  }

  return texts.join(' ')
}

/**
 * Check if element has fixed/sticky positioning
 */
export function isElementFixed(element: HTMLElement): boolean {
  let current: HTMLElement | null = element
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    const position = style.position
    if (position === 'fixed' || position === 'sticky') {
      return true
    }
    current = current.parentElement
  }
  return false
}

/**
 * Get relative position of element within a container
 */
export function getRelativePosition(
  element: HTMLElement,
  container: HTMLElement,
): { x: number; y: number } {
  const elemRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  return {
    x: elemRect.left - containerRect.left,
    y: elemRect.top - containerRect.top,
  }
}

/**
 * Get the cumulative transform (scale/translate) applied to an element by its parents
 */
function getElementTransform(element: HTMLElement): {
  scale: number
  translateX: number
  translateY: number
} {
  let current: HTMLElement | null = element
  let scale = 1
  let translateX = 0
  let translateY = 0

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    const transform = style.transform

    if (transform && transform !== 'none') {
      // Parse transform matrix
      const match = transform.match(/matrix\(([^)]+)\)/)
      if (match) {
        const values = match[1].split(',').map(v => parseFloat(v.trim()))
        // matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)
        if (values.length === 6) {
          scale *= values[0] // scaleX (assuming uniform scale)
          translateX += values[4]
          translateY += values[5]
        }
      }
    }

    current = current.parentElement
  }

  return { scale, translateX, translateY }
}

/**
 * Get bounding box relative to container (accounting for transforms)
 */
export function getRelativeBoundingBox(
  element: HTMLElement,
  container: HTMLElement,
): { x: number; y: number; width: number; height: number } {
  const elemRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  // Account for parent transforms (InfiniteCanvas scale/translate)
  const transform = getElementTransform(container)

  return {
    x: (elemRect.left - containerRect.left) / transform.scale,
    y: (elemRect.top - containerRect.top) / transform.scale,
    width: elemRect.width / transform.scale,
    height: elemRect.height / transform.scale,
  }
}

/**
 * Get text content of element (trimmed, max 200 chars for LLM context)
 */
export function getElementTextContent(element: HTMLElement): string {
  const text = element.textContent?.trim() || ''
  return text.length > 200 ? text.slice(0, 200) + '...' : text
}

/**
 * Get the index of this element among siblings with the same tag/class structure
 * Useful for identifying "3rd button" or "2nd card" etc.
 */
export function getElementIndex(element: HTMLElement): number | undefined {
  const parent = element.parentElement
  if (!parent) return undefined

  // Find all siblings with same tag/class structure
  const siblings = Array.from(parent.children).filter(child => {
    if (child === element) return true
    if (child.tagName !== element.tagName) return false

    // Check if classes match (simplified)
    const childClasses = (child.className || '').toString().trim()
    const elemClasses = (element.className || '').toString().trim()

    return childClasses === elemClasses
  })

  // Only return index if there are multiple similar elements
  if (siblings.length <= 1) return undefined

  const index = siblings.indexOf(element)
  return index >= 0 ? index : undefined
}
