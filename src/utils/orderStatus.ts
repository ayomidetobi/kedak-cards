import type { Order, OrderStatus } from '../types/api'
import { formatMoney } from './money'
import { formatOrderDate } from './orderPolicy'

export type StatusTone = 'progress' | 'done' | 'attention' | 'cancelled'

export const orderStatusMeta: Record<
  OrderStatus,
  { label: string; tone: StatusTone; icon: string; headline: string; description: string }
> = {
  'awaiting-card': {
    label: 'Awaiting your card',
    tone: 'progress',
    icon: 'pi pi-inbox',
    headline: 'Waiting for your card.',
    description: 'Follow your send-in guide to post your original card to us with tracking.',
  },
  'card-received': {
    label: 'Card received',
    tone: 'progress',
    icon: 'pi pi-check-square',
    headline: 'Your card has arrived.',
    description: 'Your original card has been logged securely and is waiting for assessment.',
  },
  assessed: {
    label: 'Assessment complete',
    tone: 'progress',
    icon: 'pi pi-search',
    headline: 'Ready for conversion.',
    description: 'Your card is suitable for the agreed conversion and is queued for production.',
  },
  'in-production': {
    label: 'In production',
    tone: 'progress',
    icon: 'pi pi-cog',
    headline: 'In good hands.',
    description: 'Your personalised metal card is being engraved, converted and quality checked.',
  },
  dispatched: {
    label: 'Dispatched',
    tone: 'progress',
    icon: 'pi pi-truck',
    headline: 'On its way back.',
    description: 'Your card is on its way to you with tracked delivery.',
  },
  delivered: {
    label: 'Delivered',
    tone: 'done',
    icon: 'pi pi-check-circle',
    headline: 'Delivered.',
    description: 'Your metal card has been delivered. Enjoy carrying something personal.',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'cancelled',
    icon: 'pi pi-times-circle',
    headline: 'Order cancelled.',
    description: 'This order has been cancelled and a full refund has been started.',
  },
  'refund-requested': {
    label: 'Refund requested',
    tone: 'attention',
    icon: 'pi pi-replay',
    headline: 'Refund requested.',
    description: 'We’ve received your refund request and will email return instructions.',
  },
  refunded: {
    label: 'Refunded',
    tone: 'done',
    icon: 'pi pi-wallet',
    headline: 'Refunded.',
    description: 'Your refund has been issued to your original payment method.',
  },
}

export interface TimelineStep {
  title: string
  detail: string
  state: 'done' | 'current' | 'upcoming'
}

const FULFILMENT: Array<{ status: OrderStatus; title: string; detail: string }> = [
  { status: 'awaiting-card', title: 'Order confirmed', detail: 'Waiting for your original card' },
  { status: 'card-received', title: 'Original card received', detail: 'Logged securely' },
  { status: 'assessed', title: 'Assessment complete', detail: 'Suitable for conversion' },
  { status: 'in-production', title: 'Conversion & quality check', detail: 'Engraving and testing' },
  { status: 'dispatched', title: 'Tracked return', detail: 'On its way to you' },
  { status: 'delivered', title: 'Delivered', detail: 'Enjoy your card' },
]

function stepState(index: number, current: number): TimelineStep['state'] {
  if (index < current) return 'done'
  return index === current ? 'current' : 'upcoming'
}

/** Timeline for the order page: fulfilment steps, or the cancellation / refund journey. */
export function orderTimeline(order: Order): TimelineStep[] {
  const money = formatMoney(order.refund?.amount ?? order.total)
  const noPayment = order.payment.status === 'not-collected'

  if (order.status === 'cancelled') {
    const steps: TimelineStep[] = [
      {
        title: 'Order cancelled',
        detail: order.cancellation ? formatOrderDate(order.cancellation.cancelledAt) : '',
        state: 'done',
      },
    ]
    if (order.cancellation?.returnOriginalCard) {
      steps.push({
        title: 'Original card returned',
        detail: 'We’ll send your card back with tracked delivery',
        state: 'current',
      })
    }
    steps.push({
      title: 'Refund issued',
      detail: noPayment
        ? 'No payment was taken for this order, so there’s nothing to refund'
        : `${money} to your original payment method`,
      state: order.refund?.state === 'completed' ? 'done' : 'current',
    })
    return steps
  }

  if (order.status === 'refund-requested' || order.status === 'refunded') {
    const refunded = order.status === 'refunded'
    return [
      {
        title: 'Delivered',
        detail: order.deliveredAt ? formatOrderDate(order.deliveredAt) : '',
        state: 'done',
      },
      {
        title: 'Refund requested',
        detail: order.refund ? formatOrderDate(order.refund.requestedAt) : '',
        state: 'done',
      },
      {
        title: 'Return your card',
        detail: 'We’ll email return instructions and a prepaid label',
        state: refunded ? 'done' : 'current',
      },
      {
        title: 'Inspection',
        detail: 'We check the returned card',
        state: refunded ? 'done' : 'upcoming',
      },
      {
        title: 'Refund issued',
        detail: `Up to ${money} to your original payment method`,
        state: refunded ? 'done' : 'upcoming',
      },
    ]
  }

  const current = FULFILMENT.findIndex((step) => step.status === order.status)
  return FULFILMENT.map((step, index) => ({
    title: step.title,
    detail: step.detail,
    // Delivered is the final state, so it shows as done rather than "in progress".
    state: order.status === 'delivered' ? 'done' : stepState(index, current),
  }))
}
