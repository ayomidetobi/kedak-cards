import { useCardCustomizationStore } from '../stores/cardCustomization'
import type { ArtworkAssignment, CardCategory, CardFinish } from '../types/card'

export type UploadValidationResult = { valid: true } | { valid: false; message: string }

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function validateUpload(file: File): UploadValidationResult {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return { valid: false, message: 'Choose a PNG, JPEG or WebP image.' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { valid: false, message: 'The image must be 5 MB or smaller.' }
  }
  return { valid: true }
}

export function validateArtworkCount(
  count: number,
  assignment: ArtworkAssignment,
  quantity: number,
): UploadValidationResult {
  if (count === 0) return { valid: true }

  const expectedCount = assignment === 'shared' ? 1 : quantity
  if (count !== expectedCount) {
    return {
      valid: false,
      message:
        assignment === 'shared'
          ? 'Choose exactly one image to use across all cards.'
          : `Choose exactly ${quantity} images, one for each card.`,
    }
  }

  return { valid: true }
}

export function validateUploads(
  files: File[],
  assignment: ArtworkAssignment,
  quantity: number,
): UploadValidationResult {
  for (const [index, file] of files.entries()) {
    const result = validateUpload(file)
    if (!result.valid) {
      return { valid: false, message: `Image ${index + 1}: ${result.message}` }
    }
  }

  return validateArtworkCount(files.length, assignment, quantity)
}

export function useCardCustomization() {
  const store = useCardCustomizationStore()

  function selectCategory(category: CardCategory) {
    store.selectCategory(category)
  }

  function selectDesign(designId: string) {
    removeUploads()
    store.selectDesign(designId)
  }

  function updateHolderName(value: string) {
    store.setHolderName(value)
  }

  function handleUploads(
    files: File[],
    assignment: ArtworkAssignment,
    quantity: number,
  ): UploadValidationResult {
    const result = validateUploads(files, assignment, quantity)
    if (!result.valid) return result

    removeUploads()
    store.setUploadedArtworks(
      files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type as 'image/png' | 'image/jpeg' | 'image/webp',
        url: URL.createObjectURL(file),
      })),
    )
    return result
  }

  function removeUploads() {
    const previousArtworks = store.uploadedArtworks
    store.setUploadedArtworks([])
    revokeUnusedArtworks(previousArtworks)
  }

  function revokeUnusedArtworks(artworks: { url: string }[]) {
    const retainedUrls = new Set(
      [
        ...store.uploadedArtworks,
        ...store.cartItems.flatMap((item) => item.customization?.uploadedArtworks ?? []),
      ].map((artwork) => artwork.url),
    )
    artworks.forEach((artwork) => {
      if (!retainedUrls.has(artwork.url)) URL.revokeObjectURL(artwork.url)
    })
  }

  function startNewCustomization(finish: CardFinish) {
    const previousArtworks = store.uploadedArtworks
    store.startNewCustomization(finish)
    revokeUnusedArtworks(previousArtworks)
  }

  function beginEditingCartItem(id: string) {
    const previousArtworks = store.uploadedArtworks
    const found = store.beginEditingCartItem(id)
    if (found) revokeUnusedArtworks(previousArtworks)
    return found
  }

  function addToCart() {
    const previousItem = store.cartItems.find((item) => item.id === store.editingCartItemId)
    const previousArtworks = previousItem?.customization?.uploadedArtworks ?? []
    const id = store.addToCart()
    revokeUnusedArtworks(previousArtworks)
    return id
  }

  function removeCartItem(id: string) {
    const removed = store.removeCartItem(id)
    if (removed?.customization) {
      revokeUnusedArtworks(removed.customization.uploadedArtworks)
    }
    return removed
  }

  return {
    store,
    selectCategory,
    selectDesign,
    updateHolderName,
    handleUploads,
    removeUploads,
    startNewCustomization,
    beginEditingCartItem,
    addToCart,
    removeCartItem,
  }
}
