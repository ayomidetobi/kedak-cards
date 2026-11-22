import axios, { type AxiosInstance } from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from '../../config/env'
import { installInterceptors } from './interceptors'

/**
 * The single HTTP client for the Django API.
 *
 * - `withCredentials` sends the HTTP-only JWT cookies cross-origin (CORS allows credentials).
 * - No default Content-Type: Axios sets JSON for objects, and the browser sets the multipart
 *   boundary for FormData uploads.
 * - Interceptors add CSRF tokens, refresh expired sessions once, and normalise errors to
 *   ApiError (see interceptors.ts).
 */
export function createApiClient(baseURL = API_BASE_URL): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: API_TIMEOUT_MS,
    withCredentials: true,
    headers: { Accept: 'application/json, application/problem+json' },
  })
  installInterceptors(instance)
  return instance
}

export const api = createApiClient()
