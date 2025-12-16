import { type ResourceDisplay } from '../types/home.types'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get initials from a name (first letter capitalized)
 */
export function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

/**
 * Select up to 3 resources for display, prioritizing those with images
 */
export function selectDisplayResources(
  resources: ResourceDisplay[],
): ResourceDisplay[] {
  // Separate resources with and without images
  const withImages = resources.filter(r => r.has_image && r.imageUrl)
  const withoutImages = resources.filter(r => !r.has_image || !r.imageUrl)

  // Prioritize resources with images
  const selected: ResourceDisplay[] = []

  // First add up to 3 with images
  selected.push(...withImages.slice(0, 3))

  // If we have less than 3, fill with resources without images
  if (selected.length < 3) {
    selected.push(...withoutImages.slice(0, 3 - selected.length))
  }

  return selected
}
