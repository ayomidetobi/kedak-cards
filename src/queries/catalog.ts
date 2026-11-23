import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getAddOns, getPolicy, listFinishes } from '../services/api/endpoints/catalog'
import type { CardFinish } from '../types/card'
import type { Finish, Policy } from '../types/api'
import { setStoreCurrency } from '../utils/money'
import { queryKeys } from './query-keys'

/** Presentation-only swatch colours. Prices and stock always come from the API. */
export const finishSwatches: Record<CardFinish, { color: string; foreground: string }> = {
  Silver: { color: '#c2c4c9', foreground: '#222226' },
  Black: { color: '#242426', foreground: '#f2f2f5' },
  Gold: { color: '#a99570', foreground: '#f7f3e8' },
  Signature: { color: '#39343d', foreground: '#f2f2f5' },
}

export const CATALOG_STALE_TIME = 5 * 60_000

export function finishesQueryOptions() {
  return {
    queryKey: queryKeys.catalog.finishes(),
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const finishes = await listFinishes(signal)
      setStoreCurrency(finishes[0]?.price.currency) // the server's configured store currency
      return finishes
    },
    staleTime: CATALOG_STALE_TIME,
  }
}

export function useFinishesQuery() {
  return useQuery(finishesQueryOptions())
}

/**
 * The finish catalogue as the UI needs it: API price/stock plus swatch colours, and lookups.
 * While loading (or after an error) nothing is treated as in stock, so nothing can be added to
 * the cart on a guess.
 */
export function useFinishCatalog() {
  const query = useFinishesQuery()
  const finishes = computed(() => query.data.value ?? [])
  const byName = computed(
    () => new Map<CardFinish, Finish>(finishes.value.map((finish) => [finish.name, finish])),
  )

  function finish(name: CardFinish) {
    return byName.value.get(name) ?? null
  }

  return {
    query,
    finishes,
    isLoading: computed(() => query.isPending.value),
    isError: computed(() => query.isError.value),
    error: computed(() => query.error.value),
    finish,
    isInStock: (name: CardFinish) => finish(name)?.inStock ?? false,
    price: (name: CardFinish) => finish(name)?.price ?? null,
    inStockFinishes: computed(() => finishes.value.filter((item) => item.inStock)),
    lowestPrice: computed(() =>
      finishes.value.length
        ? finishes.value.reduce(
            (low, item) => (item.price.amount < low.amount ? item.price : low),
            finishes.value[0]!.price,
          )
        : null,
    ),
    refetch: () => query.refetch(),
  }
}

/** Per-card price of optional extras (contactless), shown in the customiser and cart. */
export function useAddOnsQuery() {
  return useQuery({
    queryKey: queryKeys.catalog.addOns(),
    queryFn: ({ signal }) => getAddOns(signal),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function usePolicyQuery(slug: MaybeRefOrGetter<Policy['slug']>) {
  return useQuery({
    queryKey: computed(() => queryKeys.policies.detail(toValue(slug))),
    queryFn: ({ signal }) => getPolicy(toValue(slug), signal),
    staleTime: 60 * 60_000,
  })
}
