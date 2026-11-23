import { api } from '../client'
import type { Money } from '../../../types/api'

/**
 * Shipping (documented backend additions, so types live here). The active provider (Shippo
 * today) prices return delivery at checkout; ops buy the label and tracking updates arrive by
 * webhook. Without live rates the API answers with the flat delivery fee.
 */
export interface ShippingQuoteAddress {
  address: string
  city: string
  postcode: string
  country: string
  /** ISO 3166-1 alpha-2; live rates need it. */
  countryCode: string
}

export interface ShippingQuote {
  delivery: Money
  source: 'live' | 'flat'
  carrier: string | null
  service: string | null
  estimatedDays: number | null
  /** Send as `shippingQuote` when placing the order (valid for an hour). */
  quoteToken: string | null
}

export async function quoteShipping(deliveryAddress: ShippingQuoteAddress, signal?: AbortSignal) {
  const { data } = await api.post<ShippingQuote>('/shipping/quote', { deliveryAddress }, { signal })
  return data
}

export type TrackingStatus =
  'UNKNOWN' | 'PRE_TRANSIT' | 'TRANSIT' | 'DELIVERED' | 'RETURNED' | 'FAILURE'

/** An order's carrier service, label and tracking (ops only; null with the flat fee). */
export interface OpsShipping {
  provider: string
  carrier: string
  service: string
  estimatedDays: number | null
  rate: Money
  hasLabel: boolean
  /** Shipment created but the label isn't issued yet (Packlink: pay for it in Packlink PRO). */
  labelPending: boolean
  labelUrl: string | null
  labelCost: Money | null
  labelPurchasedAt: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  trackingStatus: TrackingStatus
  trackingDetail: string
  canBuyLabel: boolean
  testMode: boolean
}

export async function buyShippingLabel(orderId: string) {
  const { data } = await api.post<{ shipping: OpsShipping }>(
    `/ops/orders/${encodeURIComponent(orderId)}/shipping-label`,
  )
  return data.shipping
}

/** Pulls the latest label and tracking from the provider now. */
export async function refreshShipping(orderId: string) {
  const { data } = await api.post<{ shipping: OpsShipping }>(
    `/ops/orders/${encodeURIComponent(orderId)}/shipping-refresh`,
  )
  return data.shipping
}

export interface ShippingSettingsInput {
  /** Active provider id (admins choose; must be one of `providers`). */
  provider: string
  fromName: string
  fromCompany: string
  fromStreet1: string
  fromStreet2: string
  fromCity: string
  fromState: string
  fromPostcode: string
  /** ISO 3166-1 alpha-2. */
  fromCountry: string
  fromPhone: string
  fromEmail: string
  parcelLengthCm: string
  parcelWidthCm: string
  parcelHeightCm: string
  parcelWeightG: number
  customsDescription: string
  customsTariffNumber: string
}

export interface ShippingProviderInfo {
  id: string
  name: string
  /** Its API key is set on the server; without it the shop uses the flat fee. */
  configured: boolean
  testMode: boolean
  /** Why it can't be used yet, when relevant. */
  note: string
}

export interface ShippingSettings extends ShippingSettingsInput {
  providers: ShippingProviderInfo[]
  /** Provider configured and ship-from address complete: checkout uses live rates. */
  liveRates: boolean
  canEdit: boolean
  updatedAt: string | null
}

export async function getShippingSettings(signal?: AbortSignal) {
  const { data } = await api.get<ShippingSettings>('/ops/shipping/settings', { signal })
  return data
}

export async function updateShippingSettings(payload: ShippingSettingsInput) {
  const { data } = await api.put<ShippingSettings>('/ops/shipping/settings', payload)
  return data
}
