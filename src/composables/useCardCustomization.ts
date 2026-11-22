import { computed, onScopeDispose, ref } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { uploadArtwork } from '../services/api/endpoints/uploads'
import { errorMessage } from '../services/api/errors'
import { useCardCustomizationStore } from '../stores/cardCustomization'
import type { ArtworkAssignment, CardCategory, CardFinish, UploadedArtwork } from '../types/card'

export type UploadValidationResult = { valid: true } | { valid: false; message: string }

/** Mirrors the API's limits (apps/uploads/validators.py); the server re-checks every file. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ALLOWED_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export function validateUpload(file: File): UploadValidationResult {
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
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

function createPreviewUrl(file: File) {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : undefined
}

export function useCardCustomization() {
  const store = useCardCustomizationStore()
  const uploadProgress = ref(0)
  let uploadController: AbortController | null = null

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]): Promise<UploadedArtwork[]> => {
      uploadController?.abort()
      const controller = new AbortController()
      uploadController = controller
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0) || 1
      let doneBytes = 0
      uploadProgress.value = 0
      const uploaded: UploadedArtwork[] = []
      for (const file of files) {
        const artwork = await uploadArtwork(file, {
          signal: controller.signal,
          onProgress: (fraction) => {
            uploadProgress.value = (doneBytes + fraction * file.size) / totalBytes
          },
        })
        doneBytes += file.size
        uploaded.push({ ...artwork, previewUrl: createPreviewUrl(file) })
      }
      uploadProgress.value = 1
      return uploaded
    },
  })

  onScopeDispose(() => uploadController?.abort())

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

  /**
   * Validates the files locally (type, size, count), uploads them to the API and only then
   * replaces the current artwork. Server rejections (415/413/422) come back as messages.
   */
  async function handleUploads(
    files: File[],
    assignment: ArtworkAssignment,
    quantity: number,
  ): Promise<UploadValidationResult> {
    const result = validateUploads(files, assignment, quantity)
    if (!result.valid) return result

    try {
      const uploaded = await uploadMutation.mutateAsync(files)
      removeUploads()
      store.setUploadedArtworks(uploaded)
      return { valid: true }
    } catch (error) {
      return { valid: false, message: errorMessage(error, 'Your artwork couldn’t be uploaded.') }
    }
  }

  function cancelUpload() {
    uploadController?.abort()
    uploadMutation.reset()
  }

  function removeUploads() {
    const previousArtworks = store.uploadedArtworks
    store.setUploadedArtworks([])
    revokeUnusedArtworks(previousArtworks)
  }

  /** Frees local preview URLs that no draft or cart item still uses. */
  function revokeUnusedArtworks(artworks: UploadedArtwork[]) {
    const retained = new Set(
      [
        ...store.uploadedArtworks,
        ...store.cartItems.flatMap((item) => item.customization?.uploadedArtworks ?? []),
      ].map((artwork) => artwork.previewUrl),
    )
    artworks.forEach((artwork) => {
      if (artwork.previewUrl && !retained.has(artwork.previewUrl)) {
        URL.revokeObjectURL(artwork.previewUrl)
      }
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
    isUploading: computed(() => uploadMutation.isPending.value),
    uploadProgress: computed(() => Math.round(uploadProgress.value * 100)),
    selectCategory,
    selectDesign,
    updateHolderName,
    handleUploads,
    cancelUpload,
    removeUploads,
    startNewCustomization,
    beginEditingCartItem,
    addToCart,
    removeCartItem,
  }
}
