import type { UploadDisplay, UploadOrientation } from '../types/card'

/**
 * Placement of an uploaded image on the (landscape) card, from the customer's two choices:
 *
 *   display  'cover'   → fills the whole card       'default' → sits in the artwork spot
 *   orientation 'portrait' → the image is turned sideways (so a tall photo lies across the card)
 */
export type UploadPlacement = 'cover' | 'cover-rotated' | 'slot' | 'slot-rotated'

export function uploadPlacement(
  orientation: UploadOrientation,
  display: UploadDisplay,
): UploadPlacement {
  const base = display === 'cover' ? 'cover' : 'slot'
  return orientation === 'portrait' ? `${base}-rotated` : base
}
