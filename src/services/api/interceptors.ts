import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { toApiError } from './errors'
import { hasSessionHint, notifySessionExpired } from './session'

const SAFE_METHODS = new Set(['get', 'head', 'options', 'trace'])

/** Credential-exchange endpoints: a 401 here is a real answer, never a reason to refresh. */
const NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/google',
  '/auth/token/refresh',
  '/auth/csrf',
  '/auth/logout',
]

/** 401 codes that are about something other than the customer's session. */
const NON_SESSION_401_CODES = new Set(['order_access_token_invalid', 'invalid_credentials'])

interface RetryableConfig extends InternalAxiosRequestConfig {
  _csrfRetried?: boolean
  _sessionRetried?: boolean
}

function pathOf(config: InternalAxiosRequestConfig) {
  return (config.url ?? '').split('?')[0]!
}

/**
 * Installs the shared interceptors on an Axios instance:
 *
 * 1. CSRF: cookie-authenticated unsafe requests need `X-CSRFToken`. The SPA can't read
 *    Django's HTTP-only csrftoken cookie cross-origin, so it fetches the token once from
 *    GET /auth/csrf and re-fetches it after a `csrf_failed` 403.
 * 2. Session refresh: access tokens last 15 minutes. On a 401 from a signed-in browser the
 *    client refreshes once via the HTTP-only refresh cookie (single flight) and retries.
 *    If that fails, listeners are told the session expired.
 * 3. Errors: every failure is rethrown as an ApiError with the server's problem details.
 */
export function installInterceptors(instance: AxiosInstance) {
  let csrfToken: string | null = null
  let csrfRequest: Promise<string> | null = null
  let refreshRequest: Promise<boolean> | null = null

  function fetchCsrfToken(): Promise<string> {
    csrfRequest ??= instance
      .get<{ csrfToken: string }>('/auth/csrf')
      .then((response) => {
        csrfToken = response.data.csrfToken
        return csrfToken
      })
      .finally(() => {
        csrfRequest = null
      })
    return csrfRequest
  }

  function refreshSession(): Promise<boolean> {
    refreshRequest ??= instance
      .post('/auth/token/refresh', {}, { _sessionRetried: true } as RetryableConfig)
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshRequest = null
      })
    return refreshRequest
  }

  instance.interceptors.request.use(async (config) => {
    const method = (config.method ?? 'get').toLowerCase()
    if (!SAFE_METHODS.has(method) && pathOf(config) !== '/auth/csrf') {
      const token = csrfToken ?? (await fetchCsrfToken())
      config.headers.set('X-CSRFToken', token)
    }
    return config
  })

  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined
    const apiError = toApiError(error)
    if (!config) throw apiError
    const path = pathOf(config)

    if (apiError.status === 403 && apiError.code === 'csrf_failed' && !config._csrfRetried) {
      config._csrfRetried = true
      csrfToken = null
      const token = await fetchCsrfToken()
      config.headers.set('X-CSRFToken', token)
      return instance.request(config)
    }

    if (
      apiError.status === 401 &&
      !config._sessionRetried &&
      !NON_SESSION_401_CODES.has(apiError.code) &&
      !NO_REFRESH_PATHS.includes(path) &&
      hasSessionHint()
    ) {
      config._sessionRetried = true
      if (await refreshSession()) {
        csrfToken = null // Django rotates the CSRF secret on login; fetch a fresh one.
        return instance.request(config)
      }
      notifySessionExpired()
    }

    throw apiError
  })

  return {
    /** For tests and logout: forget the cached CSRF token. */
    resetCsrf() {
      csrfToken = null
    },
  }
}
