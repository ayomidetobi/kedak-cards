import type { Order, OrderStatus } from '../types/order'

/**
 * Cancellation & refund policy — ONE place to change the business rules.
 *
 * - Cancel: allowed until conversion starts. Full refund; if we already hold the customer's
 *   original card, it is returned to them.
 * - Refund: can be requested after confirmed delivery, within REFUND_WINDOW_DAYS (3 weeks).
 *   The customer-facing wording lives in src/data/policies.ts. The amount is up to the
 *   order total and is confirmed after the returned card is inspected.
 */
/** Refunds can't be requested more than 3 weeks after confirmed delivery. */
export const REFUND_WINDOW_DAYS = 21

export const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  'awaiting-card',
  'card-received',
  'assessed',
]

/** Statuses where we physically hold the customer's original card. */
const HOLDING_CARD: readonly OrderStatus[] = ['card-received', 'assessed']

export const CANCEL_REASONS = [
  'I changed my mind',
  'I ordered by mistake',
  'My card isn’t compatible',
  'It’s taking too long',
  'Something else',
] as const

export const REFUND_REASONS = [
  'The card doesn’t work for payments',
  'There’s a problem with the engraving',
  'The card arrived damaged',
  'It isn’t what I expected',
  'Something else',
] as const

/** "Something else" needs a short explanation so the team can help. */
export const REASON_NEEDING_DETAILS = 'Something else'

export interface Eligibility {
  allowed: boolean
  /** Customer-facing explanation when not allowed. */
  message: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export function refundDeadline(order: Order): Date | null {
  return order.deliveredAt
    ? new Date(new Date(order.deliveredAt).getTime() + REFUND_WINDOW_DAYS * DAY_MS)
    : null
}

export function holdsOriginalCard(order: Order) {
  return HOLDING_CARD.includes(order.status)
}

export function cancellationEligibility(order: Order): Eligibility {
  if (CANCELLABLE_STATUSES.includes(order.status)) return { allowed: true, message: '' }
  switch (order.status) {
    case 'cancelled':
      return { allowed: false, message: 'This order has already been cancelled.' }
    case 'refund-requested':
    case 'refunded':
      return { allowed: false, message: 'A refund is already in progress for this order.' }
    case 'delivered':
      return {
        allowed: false,
        message:
          'This order has been delivered, so it can’t be cancelled. You can request a refund instead.',
      }
    default:
      return {
        allowed: false,
        message:
          'Your card is already being converted, so this order can’t be cancelled. If something’s wrong once it arrives, you can request a refund.',
      }
  }
}

export function refundEligibility(order: Order, now = new Date()): Eligibility {
  switch (order.status) {
    case 'delivered': {
      const deadline = refundDeadline(order)
      if (deadline && now.getTime() > deadline.getTime()) {
        return {
          allowed: false,
          message: `The ${REFUND_WINDOW_DAYS}-day refund window ended on ${formatOrderDate(deadline)}.`,
        }
      }
      return { allowed: true, message: '' }
    }
    case 'refund-requested':
      return { allowed: false, message: 'You’ve already requested a refund for this order.' }
    case 'refunded':
      return { allowed: false, message: 'This order has already been refunded.' }
    case 'cancelled':
      return { allowed: false, message: 'This order was cancelled and refunded in full.' }
    default:
      return CANCELLABLE_STATUSES.includes(order.status)
        ? {
            allowed: false,
            message:
              'Your order hasn’t been delivered yet. You can cancel it for a full refund instead.',
          }
        : {
            allowed: false,
            message: 'You can request a refund once your card has been delivered.',
          }
  }
}

export function formatOrderDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
