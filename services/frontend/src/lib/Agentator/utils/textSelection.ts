// =============================================================================
// Text Selection Utilities
// =============================================================================

/**
 * Get the currently selected text and its context
 */
export function getSelectedTextInfo(): {
  text: string;
  range: Range | null;
  container: HTMLElement | null;
} | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const text = selection.toString().trim();
  if (!text) return null;

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  
  // Get the element (not text node)
  const element = container.nodeType === Node.TEXT_NODE 
    ? (container.parentElement as HTMLElement)
    : (container as HTMLElement);

  return {
    text,
    range,
    container: element
  };
}

/**
 * Check if text is currently selected
 */
export function hasTextSelection(): boolean {
  const selection = window.getSelection();
  return !!(selection && selection.toString().trim());
}

/**
 * Clear current text selection
 */
export function clearTextSelection(): void {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
}

/**
 * Get the bounding rectangle of selected text
 */
export function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  return range.getBoundingClientRect();
}
