/**
 * Browser-side session bookkeeping. The JWTs themselves live in HTTP-only cookies set by
 * Django (`kedak_access`, `kedak_refresh`), so JavaScript never sees or stores them.
 *
 * The only thing kept in localStorage is a non-secret hint ("this browser had a session"),
 * which lets anonymous visitors skip the /auth/me round trip (and its 401) on every page load.
 */
const SESSION_HINT_KEY = 'kedak-session-hint'

export function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return true // storage blocked: ask the server instead of assuming signed out
  }
}

export function setSessionHint(active: boolean) {
  try {
    if (active) localStorage.setItem(SESSION_HINT_KEY, '1')
    else localStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    // Not persisted; the server stays the source of truth.
  }
}

type Listener = () => void
const expiredListeners = new Set<Listener>()

/** Called when the session can't be refreshed (expired, revoked or logged out elsewhere). */
export function onSessionExpired(listener: Listener) {
  expiredListeners.add(listener)
  return () => expiredListeners.delete(listener)
}

export function notifySessionExpired() {
  setSessionHint(false)
  expiredListeners.forEach((listener) => listener())
}
