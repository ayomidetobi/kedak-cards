import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  confirmPayment,
  listPaymentProviders,
  startPayment,
} from '../services/api/endpoints/payments'
import { stashForPaymentRedirect } from '../services/api/paymentHandoff'
import { queryKeys } from './query-keys'

/** Enabled providers (GET /payments/providers), with an estimate for `amountPence`. */
export function usePaymentProviders(amountPence: MaybeRefOrGetter<number | null | undefined>) {
  return useQuery({
    queryKey: computed(() => queryKeys.payments.providers(toValue(amountPence) ?? null)),
    queryFn: ({ signal }) => listPaymentProviders(toValue(amountPence) ?? undefined, signal),
    staleTime: 5 * 60_000,
  })
}

/**
 * Opens the provider's hosted checkout and navigates there. Not retried automatically; the
 * API reuses an open session, so trying again never creates a second charge.
 */
export function useStartPayment() {
  return useMutation({
    mutationFn: async (input: { orderId: string; provider: string }) => {
      const checkout = await startPayment(input.orderId, input.provider)
      stashForPaymentRedirect(input.orderId)
      window.location.assign(checkout.checkoutUrl)
      return checkout
    },
  })
}

export function useConfirmPayment() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => confirmPayment(orderId),
    onSuccess: (order) => {
      client.setQueryData(queryKeys.orders.detail(order.id), order)
      void client.invalidateQueries({ queryKey: queryKeys.orders.eligibility(order.id) })
      void client.invalidateQueries({ queryKey: queryKeys.account.all() })
    },
  })
}
