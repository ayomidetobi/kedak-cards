import type { CancelReason, Order, OrderStatus, RefundReason } from '../types/api'

/**
 * Order policy — DISPLAY HELPERS ONLY.
 *
 * Whether an order can be cancelled or refunded is decided by the API
 * (GET /orders/{id}/eligibility, enforced again on POST). This file only holds the shared
 * wording: reason lists (the contract's CancelReason / RefundReason enums) and the refund
 * window used in explanatory copy.
 */
/** Refunds can be requested for 3 weeks after confirmed delivery (copy only; the API enforces it). */
export const REFUND_WINDOW_DAYS = 21

export const CANCEL_REASONS: readonly CancelReason[] = [
  'I changed my mind',
  'I ordered by mistake',
  'My card isn’t compatible',
  'It’s taking too long',
  'Something else',
]

export const REFUND_REASONS: readonly RefundReason[] = [
  'The card doesn’t work for payments',
  'There’s a problem with the engraving',
  'The card arrived damaged',
  'It isn’t what I expected',
  'Something else',
]

/** "Something else" needs a short explanation (min 3 characters) so the team can help. */
export const REASON_NEEDING_DETAILS = 'Something else'

/** Statuses where we physically hold the customer's original card (for explanatory copy). */
const HOLDING_CARD: readonly OrderStatus[] = ['card-received', 'assessed']

export function holdsOriginalCard(order: Pick<Order, 'status'>) {
  return HOLDING_CARD.includes(order.status)
}

export function formatOrderDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
