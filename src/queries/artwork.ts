import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries, useQuery, useQueryClient, type QueryClient } from '@tanstack/vue-query'
import { getArtwork, listArtwork, listArtworkCategories } from '../services/api/endpoints/artwork'
import type { CardCategory, CardDesign } from '../types/card'
import { queryKeys } from './query-keys'

/** Staff can edit artwork (Products page); shoppers pick up changes within 10 minutes. */
export const ARTWORK_STALE_TIME = 10 * 60_000

export function useArtworkCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.artwork.categories(),
    queryFn: ({ signal }) => listArtworkCategories(signal),
    staleTime: ARTWORK_STALE_TIME,
  })
}

export function artworkDesignsQueryOptions(category: CardCategory) {
  return {
    queryKey: queryKeys.artwork.designs(category),
    queryFn: ({ signal }: { signal: AbortSignal }) => listArtwork(category, signal),
    staleTime: ARTWORK_STALE_TIME,
  }
}

export function useArtworkDesignsQuery(category: MaybeRefOrGetter<CardCategory | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.artwork.designs(toValue(category) ?? 'Sport')),
    queryFn: ({ signal }) => listArtwork(toValue(category)!, signal),
    enabled: computed(() => toValue(category) !== null),
    staleTime: ARTWORK_STALE_TIME,
  })
}

/** A design already loaded as part of any category list, so single lookups don't refetch. */
function cachedDesign(client: QueryClient, designId: string): CardDesign | undefined {
  for (const [, designs] of client.getQueriesData<CardDesign[]>({
    queryKey: ['artwork', 'designs'],
  })) {
    const found = designs?.find((design) => design.id === designId)
    if (found) return found
  }
  return undefined
}

function designQueryOptions(client: QueryClient, designId: string) {
  return {
    queryKey: queryKeys.artwork.design(designId),
    queryFn: ({ signal }: { signal: AbortSignal }) => getArtwork(designId, signal),
    initialData: () => cachedDesign(client, designId),
    staleTime: ARTWORK_STALE_TIME,
  }
}

export function useArtworkDesignQuery(designId: MaybeRefOrGetter<string | null | undefined>) {
  const client = useQueryClient()
  return useQuery(
    computed(() => ({
      ...designQueryOptions(client, toValue(designId) ?? ''),
      enabled: Boolean(toValue(designId)),
    })),
  )
}

/** Resolves several designs by id (cart items, order lines), sharing the same cache entries. */
export function useDesignLookup(designIds: MaybeRefOrGetter<string[]>) {
  const client = useQueryClient()
  const unique = computed(() => [...new Set(toValue(designIds).filter(Boolean))])
  const results = useQueries({
    queries: computed(() => unique.value.map((id) => designQueryOptions(client, id))),
  })
  return computed(() => {
    const map = new Map<string, CardDesign>()
    results.value.forEach((result, index) => {
      if (result.data) map.set(unique.value[index]!, result.data)
    })
    return map
  })
}
