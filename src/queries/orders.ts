import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import * as ordersApi from '../services/api/endpoints/orders'
import { ApiError } from '../services/api/errors'
import { forgetOrderAccess, hasOrderAccess } from '../services/api/orderAccess'
import { useAuthStore } from '../stores/auth'
import type {
  CancelReason,
  Order,
  OrderStatus,
  PlaceOrderRequest,
  RefundReason,
} from '../types/api'
import { queryKeys } from './query-keys'

export function normaliseOrderId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function newIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  // RFC 4122 v4 fallback for very old browsers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
}

/**
 * Order detail for the owner (cookie session) or a guest holding this order's access token.
 * Disabled when neither applies, so the page shows the lookup form instead of a 401.
 */
export function useOrderQuery(orderId: MaybeRefOrGetter<string>) {
  const auth = useAuthStore()
  const id = computed(() => normaliseOrderId(toValue(orderId)))
  const canRequest = computed(() => Boolean(id.value) && (auth.isSignedIn || hasOrderAccess(id.value)))
  const query = useQuery({
    queryKey: computed(() => queryKeys.orders.detail(id.value)),
    queryFn: async ({ signal }) => {
      try {
        return await ordersApi.getOrder(id.value, signal)
      } catch (error) {
        if (error instanceof ApiError && error.code === 'order_access_token_invalid') {
          forgetOrderAccess(id.value)
        }
        throw error
      }
    },
    enabled: canRequest,
    staleTime: 15_000,
  })
  return { ...query, canRequest }
}

export function useOrderEligibilityQuery(
  orderId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const id = computed(() => normaliseOrderId(toValue(orderId)))
  return useQuery({
    queryKey: computed(() => queryKeys.orders.eligibility(id.value)),
    queryFn: ({ signal }) => ordersApi.getOrderEligibility(id.value, signal),
    enabled: computed(() => Boolean(id.value) && toValue(enabled)),
    staleTime: 15_000,
  })
}

function useStoreOrder() {
  const client = useQueryClient()
  return (order: Order) => {
    client.setQueryData(queryKeys.orders.detail(order.id), order)
    void client.invalidateQueries({ queryKey: queryKeys.orders.eligibility(order.id) })
    void client.invalidateQueries({ queryKey: queryKeys.account.all() })
  }
}

/** POST /orders. The caller supplies one idempotency key per submission attempt. */
export function usePlaceOrder() {
  const storeOrder = useStoreOrder()
  return useMutation({
    mutationFn: (input: { payload: PlaceOrderRequest; idempotencyKey: string }) =>
      ordersApi.placeOrder(input.payload, input.idempotencyKey),
    onSuccess: storeOrder,
  })
}

export function useLookupOrder() {
  const storeOrder = useStoreOrder()
  return useMutation({
    mutationFn: (input: { reference: string; email: string }) =>
      ordersApi.lookupOrder(input.reference.trim(), input.email.trim()),
    onSuccess: storeOrder,
  })
}

export function useCancelOrder(orderId: MaybeRefOrGetter<string>) {
  const storeOrder = useStoreOrder()
  return useMutation({
    mutationFn: (input: { reason: CancelReason; details: string; idempotencyKey: string }) =>
      ordersApi.cancelOrder(
        normaliseOrderId(toValue(orderId)),
        { reason: input.reason, details: input.details },
        input.idempotencyKey,
      ),
    onSuccess: storeOrder,
  })
}

export function useRequestRefund(orderId: MaybeRefOrGetter<string>) {
  const storeOrder = useStoreOrder()
  return useMutation({
    mutationFn: (input: { reason: RefundReason; details: string; idempotencyKey: string }) =>
      ordersApi.requestRefund(
        normaliseOrderId(toValue(orderId)),
        { reason: input.reason, details: input.details },
        input.idempotencyKey,
      ),
    onSuccess: storeOrder,
  })
}

/** GET /account/orders with cursor pagination ("Load more"). */
export function useAccountOrders(status?: MaybeRefOrGetter<OrderStatus | undefined>) {
  const auth = useAuthStore()
  return useInfiniteQuery({
    queryKey: computed(() => queryKeys.account.orders(toValue(status))),
    queryFn: ({ pageParam, signal }) =>
      ordersApi.listMyOrders({ cursor: pageParam, status: toValue(status) }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: computed(() => auth.isSignedIn),
    staleTime: 30_000,
  })
}
