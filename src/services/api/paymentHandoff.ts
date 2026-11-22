import { orderAccessToken, rememberOrderAccess } from './orderAccess'

/**
 * Carries a guest's order access token across the redirect to Stripe/Paystack and back.
 *
 * Guest tokens normally live only in memory, but the hosted payment page is a full-page
 * navigation. Just before redirecting, the token is put in sessionStorage (this tab only,
 * never in the URL); it is read back and deleted as soon as the customer returns.
 */
const KEY = 'kedak-payment-handoff'

export function stashForPaymentRedirect(orderId: string) {
  const token = orderAccessToken(orderId)
  if (!token) return // signed-in owners use their session cookie
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ orderId, token }))
  } catch {
    // Storage blocked: the guest verifies with reference + email after paying.
  }
}

export function restoreAfterPaymentRedirect(orderId: string) {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return
    sessionStorage.removeItem(KEY)
    const saved = JSON.parse(raw) as { orderId?: string; token?: string }
    if (saved.orderId === orderId && saved.token) rememberOrderAccess(orderId, saved.token)
  } catch {
    // Nothing to restore.
  }
}
