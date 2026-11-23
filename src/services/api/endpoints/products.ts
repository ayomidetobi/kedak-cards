import { api } from '../client'
import { resolveApiUrl } from '../../../config/env'
import type { Money } from '../../../types/api'
import type { CardCategory, CardFinish } from '../../../types/card'

/**
 * Product data management (/ops/catalog/*, documented backend additions, so types live here).
 * Ops and administrators can edit finishes and artwork; the API enforces it and audits changes.
 */
export interface StaffFinish {
  name: CardFinish
  description: string
  price: Money
  /** Minor units (cents). */
  priceAmount: number
  inStock: boolean
  displayOrder: number
  updatedAt: string | null
  orderCount: number
  canDelete: boolean
}

export interface StaffFinishList {
  data: StaffFinish[]
  /** Supported finish types not currently in the store. */
  available: CardFinish[]
  currency: string
}

export interface StaffFinishInput {
  description?: string
  priceAmount?: number
  inStock?: boolean
  displayOrder?: number
}

export interface StaffArtworkCategory {
  name: CardCategory
  published: number
  hidden: number
}

export type StaffArtworkSort = 'category' | 'newest' | 'name'

export interface StaffArtwork {
  id: string
  name: string
  category: CardCategory
  number: string
  artworkUrl: string | null
  isPublished: boolean
  updatedAt: string | null
}

export interface StaffArtworkFilters {
  q?: string
  category?: CardCategory
  status?: 'published' | 'hidden'
  sort?: StaffArtworkSort
  cursor?: string | null
  limit?: number
}

export interface StaffArtworkPage {
  data: StaffArtwork[]
  nextCursor: string | null
}

const finishPath = (name: string) => `/ops/catalog/finishes/${encodeURIComponent(name)}`
const artworkPath = (id: string) => `/ops/catalog/artwork/${encodeURIComponent(id)}`
const withUrl = (design: StaffArtwork): StaffArtwork => ({
  ...design,
  artworkUrl: design.artworkUrl ? resolveApiUrl(design.artworkUrl) : null,
})

export async function listStaffFinishes(signal?: AbortSignal) {
  const { data } = await api.get<StaffFinishList>('/ops/catalog/finishes', { signal })
  return data
}

export async function createStaffFinish(payload: StaffFinishInput & { name: CardFinish }) {
  const { data } = await api.post<StaffFinishList>('/ops/catalog/finishes', payload)
  return data
}

export async function updateStaffFinish(name: CardFinish, payload: StaffFinishInput) {
  const { data } = await api.patch<StaffFinishList>(finishPath(name), payload)
  return data
}

export async function deleteStaffFinish(name: CardFinish) {
  const { data } = await api.delete<StaffFinishList>(finishPath(name))
  return data
}

export async function listStaffArtworkCategories(signal?: AbortSignal) {
  const { data } = await api.get<{ data: StaffArtworkCategory[] }>('/ops/catalog/categories', {
    signal,
  })
  return data.data
}

export async function listStaffArtwork(filters: StaffArtworkFilters = {}, signal?: AbortSignal) {
  const { data } = await api.get<StaffArtworkPage>('/ops/catalog/artwork', {
    params: {
      limit: filters.limit ?? 20,
      cursor: filters.cursor ?? undefined,
      q: filters.q || undefined,
      category: filters.category,
      status: filters.status,
      sort: filters.sort && filters.sort !== 'category' ? filters.sort : undefined,
    },
    signal,
  })
  return { ...data, data: data.data.map(withUrl) }
}

export async function createStaffArtwork(input: {
  name: string
  category: CardCategory
  isPublished: boolean
  file: File
}) {
  const form = new FormData()
  form.append('name', input.name)
  form.append('category', input.category)
  form.append('isPublished', String(input.isPublished))
  form.append('file', input.file)
  const { data } = await api.post<StaffArtwork>('/ops/catalog/artwork', form)
  return withUrl(data)
}

export async function updateStaffArtwork(
  id: string,
  input: { name?: string; isPublished?: boolean; file?: File | null },
) {
  const form = new FormData()
  if (input.name !== undefined) form.append('name', input.name)
  if (input.isPublished !== undefined) form.append('isPublished', String(input.isPublished))
  if (input.file) form.append('file', input.file)
  const { data } = await api.patch<StaffArtwork>(artworkPath(id), form)
  return withUrl(data)
}

export async function deleteStaffArtwork(id: string) {
  await api.delete(artworkPath(id))
}
