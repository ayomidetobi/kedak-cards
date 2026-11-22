import { api } from '../client'
import { orderAccessToken } from '../orderAccess'
import type { Money, Order } from '../../../types/api'

/**
 * Hosted-checkout payments (documented API additions, not yet in the published contract, so
 * the types are declared here). The API converts the GBP total to the provider's currency
 * (Stripe: USD, Paystack: NGN) at a locked rate; payment is confirmed only by the provider.
 */
export interface ChargedMoney {
  /** Minor units of `currency` (cents, kobo). */
  amount: number
  currency: string
}

export interface AvailablePaymentProvider {
  id: string
  name: string
  currency: string
  estimate: ChargedMoney | null
}

export interface CheckoutStart {
  provider: string
  checkoutUrl: string
  expiresAt: string | null
  charged: ChargedMoney
  exchangeRate: string
  total: Money
}

function accessHeaders(orderId: string): Record<string, string> {
  const token = orderAccessToken(orderId)
  return token ? { 'X-Order-Access-Token': token } : {}
}

export async function listPaymentProviders(amountPence?: number, signal?: AbortSignal) {
  const { data } = await api.get<{ data: AvailablePaymentProvider[] }>('/payments/providers', {
    params: amountPence ? { amount: amountPence } : undefined,
    signal,
  })
  return data.data
}

export async function startPayment(orderId: string, provider: string) {
  const { data } = await api.post<CheckoutStart>(
    `/orders/${encodeURIComponent(orderId)}/payments`,
    { provider },
    { headers: accessHeaders(orderId) },
  )
  return data
}

/** Server-to-server check with the provider after the customer returns from its page. */
export async function confirmPayment(orderId: string) {
  const { data } = await api.post<Order>(
    `/orders/${encodeURIComponent(orderId)}/payments/confirm`,
    undefined,
    { headers: accessHeaders(orderId) },
  )
  return data
}
