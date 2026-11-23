import { computed, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { OpsOrderDetail } from '../services/api/endpoints/ops'
import {
  buyShippingLabel,
  refreshShipping,
  getShippingSettings,
  quoteShipping,
  updateShippingSettings,
  type ShippingQuoteAddress,
  type ShippingSettingsInput,
} from '../services/api/endpoints/shipping'
import { queryKeys } from './query-keys'

const QUOTE_DEBOUNCE_MS = 500

/**
 * Return-delivery fee for the address being typed at checkout. Waits until the address looks
 * complete and the customer pauses, then asks the API (live carrier rate or the flat fee).
 */
export function useShippingQuote(address: MaybeRefOrGetter<ShippingQuoteAddress | null>) {
  const settled = ref<ShippingQuoteAddress | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(
    () => JSON.stringify(toValue(address)),
    () => {
      clearTimeout(timer)
      const next = toValue(address)
      timer = setTimeout(() => (settled.value = next ? { ...next } : null), QUOTE_DEBOUNCE_MS)
    },
    { immediate: true },
  )
  onBeforeUnmount(() => clearTimeout(timer))

  return useQuery({
    queryKey: computed(() => queryKeys.shipping.quote(settled.value!)),
    queryFn: ({ signal }) => quoteShipping(settled.value!, signal),
    enabled: computed(() => settled.value !== null),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60_000, // the server honours a quote token for an hour
    retry: 1,
  })
}

/** Buys the label; the job page updates from the response without a refetch. */
export function useBuyShippingLabel() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => buyShippingLabel(orderId),
    onSuccess: (shipping, orderId) => {
      client.setQueryData<OpsOrderDetail>(queryKeys.ops.order(orderId), (detail) =>
        detail ? { ...detail, shipping } : detail,
      )
    },
  })
}

export function useRefreshShipping() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => refreshShipping(orderId),
    onSuccess: (shipping, orderId) => {
      client.setQueryData<OpsOrderDetail>(queryKeys.ops.order(orderId), (detail) =>
        detail ? { ...detail, shipping } : detail,
      )
    },
  })
}

export function useShippingSettings() {
  return useQuery({
    queryKey: queryKeys.ops.shippingSettings(),
    queryFn: ({ signal }) => getShippingSettings(signal),
    staleTime: 30_000,
  })
}

export function useUpdateShippingSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: ShippingSettingsInput) => updateShippingSettings(payload),
    onSuccess: (data) => {
      client.setQueryData(queryKeys.ops.shippingSettings(), data)
      void client.invalidateQueries({ queryKey: ['shipping'] })
    },
  })
}
