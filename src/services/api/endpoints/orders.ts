import { api } from '../client'
import { orderAccessToken, rememberOrderAccess } from '../orderAccess'
import type {
  CancelOrderRequest,
  Order,
  OrderEligibility,
  OrderStatus,
  OrderSummaryPage,
  PlacedOrder,
  PlaceOrderRequest,
  RefundRequest,
} from '../../../types/api'

/** Adds the guest token for this order, when this tab holds one. Signed-in owners use cookies. */
function accessHeaders(orderId: string): Record<string, string> {
  const token = orderAccessToken(orderId)
  return token ? { 'X-Order-Access-Token': token } : {}
}

function orderPath(orderId: string, suffix = '') {
  return `/orders/${encodeURIComponent(orderId)}${suffix}`
}

/**
 * POST /orders. `idempotencyKey` must stay the same when the customer retries the same
 * submission, so a lost response can't create a second order.
 */
export async function placeOrder(payload: PlaceOrderRequest, idempotencyKey: string) {
  const { data } = await api.post<PlacedOrder>('/orders', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  rememberOrderAccess(data.order.id, data.orderAccessToken)
  return data.order
}

export async function lookupOrder(reference: string, email: string) {
  const { data } = await api.post<{ order: Order; orderAccessToken: string; expiresAt: string }>(
    '/orders/lookup',
    { reference, email },
  )
  rememberOrderAccess(data.order.id, data.orderAccessToken, data.expiresAt)
  return data.order
}

export async function getOrder(orderId: string, signal?: AbortSignal) {
  const { data } = await api.get<Order>(orderPath(orderId), {
    headers: accessHeaders(orderId),
    signal,
  })
  return data
}

export async function getOrderEligibility(orderId: string, signal?: AbortSignal) {
  const { data } = await api.get<OrderEligibility>(orderPath(orderId, '/eligibility'), {
    headers: accessHeaders(orderId),
    signal,
  })
  return data
}

export async function cancelOrder(
  orderId: string,
  payload: CancelOrderRequest,
  idempotencyKey: string,
) {
  const { data } = await api.post<Order>(orderPath(orderId, '/cancellation'), payload, {
    headers: { ...accessHeaders(orderId), 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export async function requestRefund(
  orderId: string,
  payload: RefundRequest,
  idempotencyKey: string,
) {
  const { data } = await api.post<Order>(orderPath(orderId, '/refund-requests'), payload, {
    headers: { ...accessHeaders(orderId), 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export interface OrderPageParams {
  cursor?: string | null
  limit?: number
  status?: OrderStatus
}

export async function listMyOrders(params: OrderPageParams = {}, signal?: AbortSignal) {
  const { data } = await api.get<OrderSummaryPage>('/account/orders', {
    params: {
      limit: params.limit ?? 20,
      cursor: params.cursor ?? undefined,
      status: params.status,
    },
    signal,
  })
  return data
}
