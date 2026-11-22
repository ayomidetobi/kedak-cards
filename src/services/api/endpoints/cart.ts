import { api } from '../client'
import type { CardCartItem } from '../../../types/card'
import type {
  CardCustomizationInput,
  CartItemInput,
  CartValidationResult,
} from '../../../types/api'

/** Maps a client cart item to the contract's CartItemInput (the server sets every price). */
export function toCartItemInput(item: CardCartItem): CartItemInput {
  const saved = item.customization
  if (!saved) return { finish: item.finish, quantity: item.quantity, customization: null }
  const customization: CardCustomizationInput = {
    customizationMode: saved.customizationMode,
    engravingStyle: saved.engravingStyle,
    holderName: saved.holderName,
    artworkAssignment: saved.artworkAssignment,
    uploadOrientation: saved.uploadOrientation,
    uploadDisplay: saved.uploadDisplay,
  }
  if (saved.customizationMode === 'preset') {
    customization.category = saved.category
    customization.designId = saved.designId
  } else {
    customization.uploadedArtworkIds = saved.uploadedArtworks.map((artwork) => artwork.id)
  }
  return { finish: item.finish, quantity: item.quantity, customization }
}

export async function validateCart(
  items: CartItemInput[],
  signal?: AbortSignal,
): Promise<CartValidationResult> {
  const { data } = await api.post<CartValidationResult>('/cart/validate', { items }, { signal })
  return data
}
