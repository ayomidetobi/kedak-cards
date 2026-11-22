import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import * as opsApi from '../services/api/endpoints/ops'
import type { OpsOrderFilters } from '../services/api/endpoints/ops'
import type { AdvanceStatusRequest, Order, RefundDecisionRequest } from '../types/api'
import { queryKeys } from './query-keys'

export function useOpsOrders(filters: MaybeRefOrGetter<Omit<OpsOrderFilters, 'cursor'>>) {
  return useInfiniteQuery({
    queryKey: computed(() => queryKeys.ops.orders(toValue(filters))),
    queryFn: ({ pageParam, signal }) =>
      opsApi.listOpsOrders({ ...toValue(filters), cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
}

export function useOpsOrder(orderId: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.ops.order(toValue(orderId) ?? '')),
    queryFn: ({ signal }) => opsApi.getOpsOrder(toValue(orderId)!, signal),
    enabled: computed(() => Boolean(toValue(orderId))),
    staleTime: 10_000,
  })
}

function useRefreshAfterStaffAction() {
  const client = useQueryClient()
  return (order: Order) => {
    void client.invalidateQueries({ queryKey: queryKeys.ops.all() })
    // A customer view of this order (same browser, rare) must not stay stale either.
    void client.invalidateQueries({ queryKey: queryKeys.orders.detail(order.id) })
  }
}

export function useAdvanceOrderStatus() {
  const refresh = useRefreshAfterStaffAction()
  return useMutation({
    mutationFn: (input: { orderId: string; payload: AdvanceStatusRequest }) =>
      opsApi.advanceOrderStatus(input.orderId, input.payload),
    onSuccess: refresh,
  })
}

export function useDecideRefund() {
  const refresh = useRefreshAfterStaffAction()
  return useMutation({
    mutationFn: (input: { orderId: string; payload: RefundDecisionRequest }) =>
      opsApi.decideRefund(input.orderId, input.payload),
    onSuccess: refresh,
  })
}
