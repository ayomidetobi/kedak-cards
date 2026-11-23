import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getAddOns, getPolicy, listFinishes } from '../services/api/endpoints/catalog'
import type { CardFinish } from '../types/card'
import type { Finish, Money, Policy } from '../types/api'
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
 *
 * Prices: contactless is part of the card by default, so the price shoppers see everywhere is
 * `price()` = finish price + contactless (the server prices cart lines the same way). Only the
 * customiser uses `basePrice()`, to take contactless off when the customer unticks it.
 */
export function useFinishCatalog() {
  const query = useFinishesQuery()
  const addOns = useAddOnsQuery()
  const contactless = computed(() => addOns.data.value?.contactless.price ?? null)
  const finishes = computed(() => query.data.value ?? [])
  const byName = computed(
    () => new Map<CardFinish, Finish>(finishes.value.map((finish) => [finish.name, finish])),
  )

  function finish(name: CardFinish) {
    return byName.value.get(name) ?? null
  }

  /** Card price; null until both the finish and (when included) the contactless price load. */
  function cardPrice(item: Finish | null, withContactless: boolean): Money | null {
    if (!item) return null
    if (!withContactless) return item.price
    if (!contactless.value) return null
    return { ...item.price, amount: item.price.amount + contactless.value.amount }
  }

  return {
    query,
    finishes,
    isLoading: computed(() => query.isPending.value),
    isError: computed(() => query.isError.value),
    error: computed(() => query.error.value),
    finish,
    isInStock: (name: CardFinish) => finish(name)?.inStock ?? false,
    price: (name: CardFinish, withContactless = true) => cardPrice(finish(name), withContactless),
    basePrice: (name: CardFinish) => finish(name)?.price ?? null,
    contactlessPrice: contactless,
    inStockFinishes: computed(() => finishes.value.filter((item) => item.inStock)),
    lowestPrice: computed(() => {
      const prices = finishes.value
        .map((item) => cardPrice(item, true))
        .filter((price): price is Money => price !== null)
      return prices.length
        ? prices.reduce((low, price) => (price.amount < low.amount ? price : low))
        : null
    }),
    refetch: () => query.refetch(),
  }
}

/** Per-card price of contactless (included in shop prices; deducted when unticked). */
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
