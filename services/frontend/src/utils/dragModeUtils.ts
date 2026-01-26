/**
 * Drag Mode Types and Utilities
 * Handles element dragging and reordering
 */

export interface DragState {
  isDragging: boolean
  draggedElement: {
    path: string
    index: number
    rect: DOMRect
    element: HTMLElement
  } | null
  dropTarget: {
    path: string
    index: number
    insertBefore: boolean // true = before, false = after
  } | null
  mousePosition: { x: number; y: number } | null
}

export interface ElementReorderMutation {
  type: 'reorder'
  screenId: string
  elementPath: string
  parentPath: string
  oldIndex: number
  newIndex: number
  timestamp: number
}

/**
 * Check if an element is draggable (in a list context)
 */
export function isDraggable(element: HTMLElement): boolean {
  const parent = element.parentElement
  if (!parent) return false

  // Get all children (excluding text nodes)
  const children = Array.from(parent.children) as HTMLElement[]
  if (children.length <= 1) return false

  // Check if parent is a list container
  const parentTag = parent.tagName.toLowerCase()
  const parentStyles = window.getComputedStyle(parent)

  const isList =
    parentTag === 'ul' ||
    parentTag === 'ol' ||
    parentStyles.display === 'flex' ||
    parentStyles.display === 'grid' ||
    parent.classList.contains('flex') ||
    parent.classList.contains('grid')

  return isList
}

/**
 * Get the parent container for an element
 */
export function getDraggableParent(element: HTMLElement): HTMLElement | null {
  return element.parentElement
}

/**
 * Get all draggable siblings of an element
 */
export function getDraggableSiblings(element: HTMLElement): HTMLElement[] {
  const parent = element.parentElement
  if (!parent) return []

  return Array.from(parent.children).filter(
    child => child !== element && child instanceof HTMLElement,
  ) as HTMLElement[]
}

/**
 * Get the index of an element among its siblings
 */
export function getElementIndex(element: HTMLElement): number {
  const parent = element.parentElement
  if (!parent) return -1

  return Array.from(parent.children).indexOf(element)
}

/**
 * Calculate drop position based on mouse position
 */
export function calculateDropPosition(
  mouseY: number,
  siblings: HTMLElement[],
  // @ts-expect-error - Parameter kept for API compatibility with call sites
  containerRect: DOMRect, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
): { index: number; insertBefore: boolean } | null {
  if (siblings.length === 0) {
    return { index: 0, insertBefore: true }
  }

  // Find the closest sibling
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i]
    const rect = sibling.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2

    if (mouseY < midpoint) {
      return { index: i, insertBefore: true }
    }
  }

  // If past all siblings, insert at end
  return { index: siblings.length - 1, insertBefore: false }
}

/**
 * Reorder DOM elements temporarily (for preview)
 */
export function reorderElements(
  parent: HTMLElement,
  draggedElement: HTMLElement,
  newIndex: number,
  insertBefore: boolean,
): void {
  const children = Array.from(parent.children)
  const currentIndex = children.indexOf(draggedElement)

  if (currentIndex === -1) return

  // Remove from current position
  draggedElement.remove()

  // Calculate actual insertion index
  let insertIndex = newIndex
  if (!insertBefore) {
    insertIndex += 1
  }

  // Adjust if we removed from before insertion point
  if (currentIndex < insertIndex) {
    insertIndex -= 1
  }

  // Insert at new position
  if (insertIndex >= children.length - 1) {
    parent.appendChild(draggedElement)
  } else {
    parent.insertBefore(draggedElement, children[insertIndex])
  }
}

/**
 * Create a drag preview element (ghost)
 */
export function createDragPreview(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement

  // Style the preview
  clone.style.position = 'fixed'
  clone.style.pointerEvents = 'none'
  clone.style.zIndex = '10000'
  clone.style.opacity = '0.8'
  clone.style.transform = 'rotate(-2deg)'
  clone.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.3)'
  clone.style.width = `${element.offsetWidth}px`
  clone.setAttribute('data-drag-preview', 'true')

  return clone
}

/**
 * Position drag preview at mouse cursor
 */
export function positionDragPreview(
  preview: HTMLElement,
  mouseX: number,
  mouseY: number,
): void {
  preview.style.left = `${mouseX - preview.offsetWidth / 2}px`
  preview.style.top = `${mouseY - preview.offsetHeight / 2}px`
}

/**
 * Get element path for a draggable element's parent
 */
export function getParentPath(element: HTMLElement): string {
  const parent = element.parentElement
  if (!parent) return ''

  const parts: string[] = []
  let current: HTMLElement | null = parent
  let depth = 0
  const maxDepth = 4

  while (current && depth < maxDepth && current.tagName !== 'BODY') {
    const tag = current.tagName.toLowerCase()

    if (current.id) {
      parts.unshift(`#${current.id}`)
      break
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
        parts.unshift(`.${meaningfulClass.split('_')[0]}`)
      } else {
        parts.unshift(tag)
      }
    } else {
      parts.unshift(tag)
    }

    current = current.parentElement
    depth++
  }

  return parts.join(' > ')
}
