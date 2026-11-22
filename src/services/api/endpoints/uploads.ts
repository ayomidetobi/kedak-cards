import { api } from '../client'
import { resolveApiUrl, UPLOAD_TIMEOUT_MS } from '../../../config/env'
import type { UploadedArtwork } from '../../../types/card'
import type { ApiUploadedArtwork } from '../../../types/api'

export interface UploadOptions {
  signal?: AbortSignal
  /** Fraction uploaded, 0–1. */
  onProgress?: (fraction: number) => void
}

/**
 * POST /uploads/artwork (multipart). The browser sets the multipart Content-Type with its
 * boundary, so no Content-Type header is set here. Django re-encodes the image and stores it
 * privately (Cloudinary authenticated delivery); the returned URL is signed and short-lived.
 */
export async function uploadArtwork(
  file: File,
  options: UploadOptions = {},
): Promise<UploadedArtwork> {
  const form = new FormData()
  form.append('file', file, file.name)
  const { data } = await api.post<ApiUploadedArtwork>('/uploads/artwork', form, {
    signal: options.signal,
    timeout: UPLOAD_TIMEOUT_MS,
    onUploadProgress: (event) => {
      if (options.onProgress && event.total) options.onProgress(event.loaded / event.total)
    },
  })
  return { ...data, url: resolveApiUrl(data.url) }
}
