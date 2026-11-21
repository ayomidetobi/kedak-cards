import type { CardFinish, CardCustomization } from './card'

/**
 * Order lifecycle. The happy path runs top to bottom; `cancelled`, `refund-requested` and
 * `refunded` are end states reached through the cancel / refund flows.
 */
export type OrderStatus =
  | 'awaiting-card' // order placed, waiting for the customer's original card
  | 'card-received'
  | 'assessed'
  | 'in-production' // conversion has started: the card is being physically modified
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'refund-requested'
  | 'refunded'

export interface OrderLine {
  finish: CardFinish
  quantity: number
  unitPrice: number
  holderName: string
  designName: string
  customization: CardCustomization | null
}

export type RefundState = 'pending' | 'requested' | 'approved' | 'completed'

export interface OrderRefund {
  /** For cancellations this is the full amount; for post-delivery requests the maximum. */
  amount: number
  state: RefundState
  reason: string
  details: string
  requestedAt: string
}

export interface OrderCancellation {
  reason: string
  details: string
  cancelledAt: string
  /** True when we already hold the customer's original card and must send it back. */
  returnOriginalCard: boolean
}

export interface Order {
  id: string
  email: string
  customerName: string
  placedAt: string
  deliveredAt?: string
  status: OrderStatus
  lines: OrderLine[]
  subtotal: number
  delivery: number
  total: number
  /** Stripe isn't connected yet, so preview orders carry no payment. */
  payment: 'not-collected' | 'paid'
  cancellation?: OrderCancellation
  refund?: OrderRefund
}

export interface OrderRequestInput {
  reason: string
  details: string
}
