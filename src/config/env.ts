/**
 * Runtime configuration from Vite environment variables (see .env.example).
 *
 * VITE_API_BASE_URL is required: the app never falls back to a hardcoded API host, so a
 * misconfigured build fails loudly instead of silently talking to the wrong server.
 */
function readBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (!raw) {
    if (import.meta.env.MODE === 'test') return 'http://api.test/api/v1'
    throw new Error('VITE_API_BASE_URL is not set. Copy .env.example to .env.local and set it.')
  }
  return raw.replace(/\/+$/, '')
}

export const API_BASE_URL = readBaseUrl()

/** Origin the API is served from; relative media URLs returned by Django resolve against it. */
export const API_ORIGIN = new URL(API_BASE_URL, window.location.origin).origin

export const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? ''

export const API_TIMEOUT_MS = 20_000
export const UPLOAD_TIMEOUT_MS = 120_000

/** Turns a relative URL from the API (e.g. local `/media/...` storage) into an absolute one. */
export function resolveApiUrl(url: string): string {
  if (!url) return url
  try {
    return new URL(url, API_ORIGIN).toString()
  } catch {
    return url
  }
}
