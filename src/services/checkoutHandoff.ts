import type { CardCartItem } from '../types/card'

/**
 * Keeps the customer's cart across the trip to Stripe/Paystack (a full page navigation, which
 * wipes in-memory state). Saved in sessionStorage (this tab only, gone when it closes) just
 * before the redirect:
 *
 * - payment cancelled → the cart and checkout details are restored, and the saved order is
 *   reused if they check out again unchanged (no duplicate order);
 * - payment completed → the saved copy is discarded.
 *
 * Never holds secrets: cart items (designs, upload ids), the contact/delivery details the
 * customer typed, and the order reference.
 */
export interface CheckoutDetails {
  email: string
  fullName: string
  address: string
  city: string
  postcode: string
  country: string
  phoneCountry: string
  phone: string
}

export interface PendingCheckout {
  /** The order already created for this cart (unpaid). */
  orderId: string
  /** JSON of the order request: an unchanged checkout reuses `orderId`. */
  signature: string
  items: CardCartItem[]
  details: CheckoutDetails
}

const KEY = 'kedak-checkout-handoff'

/** Local object URLs only work in the tab that created them; drop them before saving. */
function storable(items: CardCartItem[]): CardCartItem[] {
  return items.map((item) => {
    if (!item.customization) return item
    const strip = <T extends { previewUrl?: string }>(artwork: T): T => {
      const copy = { ...artwork }
      delete copy.previewUrl
      return copy
    }
    return {
      ...item,
      customization: {
        ...item.customization,
        uploadedArtwork: item.customization.uploadedArtwork
          ? strip(item.customization.uploadedArtwork)
          : null,
        uploadedArtworks: item.customization.uploadedArtworks.map(strip),
      },
    }
  })
}

export function saveCheckoutHandoff(pending: PendingCheckout) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...pending, items: storable(pending.items) }))
  } catch {
    // Storage blocked: the order is still saved; the cart just can't be restored.
  }
}

/** Reads and removes the saved checkout (one use). */
export function takeCheckoutHandoff(orderId: string): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    sessionStorage.removeItem(KEY)
    const saved = JSON.parse(raw) as PendingCheckout
    return saved.orderId === orderId && Array.isArray(saved.items) ? saved : null
  } catch {
    return null
  }
}

export function clearCheckoutHandoff() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
