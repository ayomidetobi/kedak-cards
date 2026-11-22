import { api } from '../client'
import type { CardFinish } from '../../../types/card'
import type { Finish, Policy } from '../../../types/api'

export async function listFinishes(signal?: AbortSignal): Promise<Finish[]> {
  const { data } = await api.get<{ data: Finish[] }>('/finishes', { signal })
  return data.data
}

export async function getFinish(finish: CardFinish, signal?: AbortSignal): Promise<Finish> {
  const { data } = await api.get<Finish>(`/finishes/${encodeURIComponent(finish)}`, { signal })
  return data
}

export async function getPolicy(slug: Policy['slug'], signal?: AbortSignal): Promise<Policy> {
  const { data } = await api.get<Policy>(`/policies/${slug}`, { signal })
  return data
}
