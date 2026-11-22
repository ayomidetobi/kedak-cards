import { api } from '../client'
import { resolveApiUrl } from '../../../config/env'
import type { CardCategory, CardDesign } from '../../../types/card'
import type { ApiCardDesign, ArtworkCategorySummary } from '../../../types/api'

function toDesign(design: ApiCardDesign): CardDesign {
  return { ...design, artworkUrl: resolveApiUrl(design.artworkUrl) }
}

export async function listArtworkCategories(
  signal?: AbortSignal,
): Promise<ArtworkCategorySummary[]> {
  const { data } = await api.get<{ data: ArtworkCategorySummary[] }>('/artwork/categories', {
    signal,
  })
  return data.data
}

export async function listArtwork(
  category?: CardCategory,
  signal?: AbortSignal,
): Promise<CardDesign[]> {
  const { data } = await api.get<{ data: ApiCardDesign[] }>('/artwork', {
    params: category ? { category } : undefined,
    signal,
  })
  return data.data.map(toDesign)
}

export async function getArtwork(designId: string, signal?: AbortSignal): Promise<CardDesign> {
  const { data } = await api.get<ApiCardDesign>(`/artwork/${encodeURIComponent(designId)}`, {
    signal,
  })
  return toDesign(data)
}
