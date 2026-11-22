import { shallowReactive } from 'vue'

/**
 * Guest order access tokens (`X-Order-Access-Token`), held in memory only.
 *
 * They are never written to localStorage/sessionStorage, logged or put in URLs, so a token
 * disappears when the tab closes or the page reloads; guests then verify again with their
 * order reference and email. Tokens are cleared on sign-out (shared devices).
 */
interface Grant {
  token: string
  expiresAt: number | null
}

const grants = shallowReactive(new Map<string, Grant>())

function key(orderId: string) {
  return orderId.trim().toUpperCase().replace(/\s+/g, '')
}

export function rememberOrderAccess(orderId: string, token: string, expiresAt?: string | null) {
  grants.set(key(orderId), { token, expiresAt: expiresAt ? Date.parse(expiresAt) : null })
}

export function orderAccessToken(orderId: string): string | null {
  const grant = grants.get(key(orderId))
  if (!grant) return null
  if (grant.expiresAt !== null && grant.expiresAt <= Date.now()) {
    grants.delete(key(orderId))
    return null
  }
  return grant.token
}

export function hasOrderAccess(orderId: string) {
  return orderAccessToken(orderId) !== null
}

export function forgetOrderAccess(orderId: string) {
  grants.delete(key(orderId))
}

export function clearOrderAccess() {
  grants.clear()
}
