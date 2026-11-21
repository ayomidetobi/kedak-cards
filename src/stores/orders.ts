import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Order, OrderLine, OrderRequestInput } from '../types/order'
import {
  cancellationEligibility,
  holdsOriginalCard,
  REASON_NEEDING_DETAILS,
  refundEligibility,
} from '../utils/orderPolicy'

/**
 * Orders — PREVIEW STORAGE. There is no backend yet, so orders live in this browser
 * (localStorage) and sample orders are seeded for trying the flows. Replace the persistence and
 * the actions with API calls when the order service exists; the views only use this store.
 */
const ORDERS_KEY = 'kedak-orders'
const VERIFIED_KEY = 'kedak-verified-orders'

/** Email that owns the sample orders (sign in with it, or use it on "Find your order"). */
export const PREVIEW_ORDER_EMAIL = 'alex.morgan@example.com'

const DAY_MS = 24 * 60 * 60 * 1000

function sampleLine(finish: OrderLine['finish'], unitPrice: number, designName: string): OrderLine {
  return {
    finish,
    quantity: 1,
    unitPrice,
    holderName: 'ALEX MORGAN',
    designName,
    customization: null,
  }
}

function seedOrders(now = Date.now()): Order[] {
  const iso = (daysAgo: number) => new Date(now - daysAgo * DAY_MS).toISOString()
  const base = { email: PREVIEW_ORDER_EMAIL, customerName: 'Alex Morgan', delivery: 8 } as const
  return [
    {
      ...base,
      id: 'KD-2051',
      placedAt: iso(2),
      status: 'awaiting-card',
      lines: [sampleLine('Gold', 179, 'Championship Trophy')],
      subtotal: 179,
      total: 187,
      payment: 'not-collected',
    },
    {
      ...base,
      id: 'KD-2048',
      placedAt: iso(12),
      status: 'in-production',
      lines: [sampleLine('Black', 149, 'Striped Club Shield')],
      subtotal: 149,
      total: 157,
      payment: 'not-collected',
    },
    {
      ...base,
      id: 'KD-1987',
      placedAt: iso(26),
      deliveredAt: iso(5),
      status: 'delivered',
      lines: [sampleLine('Silver', 129, 'Howling Wolf')],
      subtotal: 129,
      total: 137,
      payment: 'not-collected',
    },
  ]
}

// Storage can be unavailable (private browsing, blocked site data); the app still works.
function readJson<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value))
  } catch {
    // Not persisted; the in-memory state is still correct for this visit.
  }
}

const local = () => localStorage
const session = () => sessionStorage

export function normaliseOrderId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function normaliseEmail(value: string) {
  return value.trim().toLowerCase()
}

function validateRequest(input: OrderRequestInput): OrderRequestInput {
  const reason = input.reason.trim()
  const details = input.details.trim().slice(0, 500)
  if (!reason) throw new Error('Choose a reason.')
  if (reason === REASON_NEEDING_DETAILS && details.length < 3) {
    throw new Error('Tell us a little more so we can help.')
  }
  return { reason, details }
}

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>(readJson<Order[]>(local, ORDERS_KEY) ?? seedOrders())
  // Orders a guest has unlocked this session (by reference + email, or by placing them).
  const verifiedOrderIds = ref<string[]>(readJson<string[]>(session, VERIFIED_KEY) ?? [])
  const lastPlacedOrderId = ref<string | null>(null)

  watch(orders, (value) => writeJson(local, ORDERS_KEY, value), { deep: true })
  watch(verifiedOrderIds, (value) => writeJson(session, VERIFIED_KEY, value), { deep: true })

  const lastPlacedOrder = computed(() => getOrder(lastPlacedOrderId.value ?? ''))

  function getOrder(id: string) {
    const target = normaliseOrderId(id)
    return orders.value.find((order) => order.id === target) ?? null
  }

  function ordersForEmail(email: string) {
    const target = normaliseEmail(email)
    return orders.value
      .filter((order) => order.email === target)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
  }

  /** Guest lookup: both the reference and the email on the order must match. */
  function findOrder(reference: string, email: string) {
    const order = getOrder(reference)
    return order && order.email === normaliseEmail(email) ? order : null
  }

  function grantAccess(id: string) {
    if (!verifiedOrderIds.value.includes(id)) verifiedOrderIds.value.push(id)
  }

  /** Signed-in customers see orders placed with their email; guests need to verify first. */
  function canAccess(order: Order, signedInEmail?: string | null) {
    return (
      (Boolean(signedInEmail) && order.email === normaliseEmail(signedInEmail ?? '')) ||
      verifiedOrderIds.value.includes(order.id)
    )
  }

  function nextOrderId() {
    let id: string
    do {
      id = `KD-${Math.floor(3000 + Math.random() * 6000)}`
    } while (orders.value.some((order) => order.id === id))
    return id
  }

  function placeOrder(input: {
    email: string
    customerName: string
    lines: OrderLine[]
    delivery: number
  }) {
    if (!input.lines.length) throw new Error('There is nothing to order.')
    const subtotal = input.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
    const order: Order = {
      id: nextOrderId(),
      email: normaliseEmail(input.email),
      customerName: input.customerName.trim(),
      placedAt: new Date().toISOString(),
      status: 'awaiting-card',
      lines: input.lines,
      subtotal,
      delivery: input.delivery,
      total: subtotal + input.delivery,
      payment: 'not-collected',
    }
    orders.value.push(order)
    lastPlacedOrderId.value = order.id
    grantAccess(order.id)
    return order
  }

  function requireOrder(id: string) {
    const order = getOrder(id)
    if (!order) throw new Error('We couldn’t find that order.')
    return order
  }

  function cancelOrder(id: string, input: OrderRequestInput) {
    const order = requireOrder(id)
    const eligibility = cancellationEligibility(order)
    if (!eligibility.allowed) throw new Error(eligibility.message)
    const { reason, details } = validateRequest(input)
    const now = new Date().toISOString()
    order.cancellation = {
      reason,
      details,
      cancelledAt: now,
      returnOriginalCard: holdsOriginalCard(order),
    }
    order.refund = { amount: order.total, state: 'pending', reason, details, requestedAt: now }
    order.status = 'cancelled'
    return order
  }

  function requestRefund(id: string, input: OrderRequestInput) {
    const order = requireOrder(id)
    const eligibility = refundEligibility(order)
    if (!eligibility.allowed) throw new Error(eligibility.message)
    const { reason, details } = validateRequest(input)
    order.refund = {
      amount: order.total,
      state: 'requested',
      reason,
      details,
      requestedAt: new Date().toISOString(),
    }
    order.status = 'refund-requested'
    return order
  }

  return {
    orders,
    verifiedOrderIds,
    lastPlacedOrder,
    getOrder,
    ordersForEmail,
    findOrder,
    grantAccess,
    canAccess,
    placeOrder,
    cancelOrder,
    requestRefund,
  }
})
