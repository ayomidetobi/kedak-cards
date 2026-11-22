import { api } from '../client'
import type {
  AdvanceStatusRequest,
  Order,
  OrderStatus,
  OrderSummaryPage,
  RefundDecisionRequest,
  RefundState,
} from '../../../types/api'

/**
 * Staff endpoints. Access is enforced by Django (`production` / `ops` roles); the frontend only
 * reflects the 401/403 it gets back.
 */
export interface OpsOrderFilters {
  status?: OrderStatus
  refundState?: RefundState
  cursor?: string | null
  limit?: number
}

export interface ProductionEvent {
  fromStatus: OrderStatus
  toStatus: OrderStatus
  note: string
  trackingNumber: string
  actor: string | null
  createdAt: string
}

/**
 * GET /ops/orders/{orderId}: a documented backend addition (not yet in the published contract,
 * so the type is declared here rather than generated).
 */
export interface OpsOrderDetail {
  order: Order
  productionHistory: ProductionEvent[]
}

export async function listOpsOrders(filters: OpsOrderFilters = {}, signal?: AbortSignal) {
  const { data } = await api.get<OrderSummaryPage>('/ops/orders', {
    params: {
      limit: filters.limit ?? 20,
      cursor: filters.cursor ?? undefined,
      status: filters.status,
      refundState: filters.refundState,
    },
    signal,
  })
  return data
}

export async function getOpsOrder(orderId: string, signal?: AbortSignal) {
  const { data } = await api.get<OpsOrderDetail>(`/ops/orders/${encodeURIComponent(orderId)}`, {
    signal,
  })
  return data
}

export async function advanceOrderStatus(orderId: string, payload: AdvanceStatusRequest) {
  const { data } = await api.post<Order>(
    `/ops/orders/${encodeURIComponent(orderId)}/status`,
    payload,
  )
  return data
}

export async function decideRefund(orderId: string, payload: RefundDecisionRequest) {
  const { data } = await api.post<Order>(
    `/ops/orders/${encodeURIComponent(orderId)}/refund`,
    payload,
  )
  return data
}
