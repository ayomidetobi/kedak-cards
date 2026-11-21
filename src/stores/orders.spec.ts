import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Order, OrderStatus } from '../types/order'
import {
  cancellationEligibility,
  REFUND_WINDOW_DAYS,
  refundEligibility,
} from '../utils/orderPolicy'
import { PREVIEW_ORDER_EMAIL, useOrdersStore } from './orders'

const DAY_MS = 24 * 60 * 60 * 1000

function orderWith(status: OrderStatus, deliveredDaysAgo?: number): Order {
  return {
    id: 'KD-0001',
    email: 'guest@example.com',
    customerName: 'Guest',
    placedAt: new Date().toISOString(),
    deliveredAt:
      deliveredDaysAgo === undefined
        ? undefined
        : new Date(Date.now() - deliveredDaysAgo * DAY_MS).toISOString(),
    status,
    lines: [],
    subtotal: 149,
    delivery: 8,
    total: 157,
    payment: 'not-collected',
  }
}

describe('order policy', () => {
  it.each([
    ['awaiting-card', true],
    ['card-received', true],
    ['assessed', true],
    ['in-production', false],
    ['dispatched', false],
    ['delivered', false],
    ['cancelled', false],
  ] as const)('cancelling a %s order allowed: %s', (status, allowed) => {
    expect(cancellationEligibility(orderWith(status)).allowed).toBe(allowed)
  })

  it('only allows refunds after delivery and within 3 weeks (21 days)', () => {
    expect(REFUND_WINDOW_DAYS).toBe(21)
    expect(refundEligibility(orderWith('delivered', 5)).allowed).toBe(true)
    expect(refundEligibility(orderWith('delivered', 20)).allowed).toBe(true)
    expect(refundEligibility(orderWith('delivered', 22)).message).toMatch(/refund window ended/)
    expect(refundEligibility(orderWith('awaiting-card')).message).toMatch(/cancel it/)
    expect(refundEligibility(orderWith('in-production')).message).toMatch(/once your card/)
  })
})

describe('orders store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lets a guest find an order only with the matching reference and email', () => {
    const orders = useOrdersStore()
    expect(orders.findOrder(' kd-2051 ', PREVIEW_ORDER_EMAIL.toUpperCase())?.id).toBe('KD-2051')
    expect(orders.findOrder('KD-2051', 'someone@else.com')).toBeNull()

    const order = orders.getOrder('KD-2051')!
    expect(orders.canAccess(order, null)).toBe(false)
    expect(orders.canAccess(order, PREVIEW_ORDER_EMAIL)).toBe(true)
    orders.grantAccess(order.id)
    expect(orders.canAccess(order, null)).toBe(true)
  })

  it('places an order that its guest can manage straight away', () => {
    const orders = useOrdersStore()
    const order = orders.placeOrder({
      email: 'New@Example.com ',
      customerName: 'Sam Lee',
      delivery: 8,
      lines: [
        {
          finish: 'Gold',
          quantity: 2,
          unitPrice: 179,
          holderName: 'SAM',
          designName: 'Lion Head',
          customization: null,
        },
      ],
    })
    expect(order).toMatchObject({ email: 'new@example.com', subtotal: 358, total: 366 })
    expect(order.id).toMatch(/^KD-\d{4}$/)
    expect(orders.canAccess(order, null)).toBe(true)
    expect(orders.ordersForEmail('new@example.com')).toHaveLength(1)
  })

  it('cancels before conversion with a full refund and returns a card we already hold', () => {
    const orders = useOrdersStore()
    const order = orders.getOrder('KD-2051')!
    order.status = 'card-received'

    orders.cancelOrder(order.id, { reason: 'I changed my mind', details: '' })

    expect(order.status).toBe('cancelled')
    expect(order.cancellation).toMatchObject({
      reason: 'I changed my mind',
      returnOriginalCard: true,
    })
    expect(order.refund).toMatchObject({ amount: 187, state: 'pending' })
  })

  it('refuses to cancel once conversion has started', () => {
    const orders = useOrdersStore()
    expect(() =>
      orders.cancelOrder('KD-2048', { reason: 'I changed my mind', details: '' }),
    ).toThrow(/can’t be cancelled/)
    expect(orders.getOrder('KD-2048')!.status).toBe('in-production')
  })

  it('records a refund request after delivery and requires details for "Something else"', () => {
    const orders = useOrdersStore()
    expect(() =>
      orders.requestRefund('KD-1987', { reason: 'Something else', details: '' }),
    ).toThrow(/Tell us a little more/)

    orders.requestRefund('KD-1987', { reason: 'The card arrived damaged', details: 'Bent corner' })
    const order = orders.getOrder('KD-1987')!
    expect(order.status).toBe('refund-requested')
    expect(order.refund).toMatchObject({ state: 'requested', details: 'Bent corner', amount: 137 })
  })
})
