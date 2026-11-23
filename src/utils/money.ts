import { shallowRef } from 'vue'
import type { Money } from '../types/api'

/**
 * The store currency is whatever the API says (it is configurable on the server), so nothing
 * here hard-codes a currency: Money values carry their own, and bare amounts use the currency
 * the catalogue last reported (see finishesQueryOptions).
 */
export const storeCurrency = shallowRef('USD')

export function setStoreCurrency(currency: string | undefined) {
  if (currency && currency !== storeCurrency.value) storeCurrency.value = currency.toUpperCase()
}

const LOCALE = 'en-US'
const formatters = new Map<string, Intl.NumberFormat>()

function formatter(currency: string, whole: boolean): Intl.NumberFormat | null {
  const key = `${currency}:${whole}`
  let cached = formatters.get(key)
  if (!cached) {
    try {
      cached = new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency,
        ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
      })
    } catch {
      return null
    }
    formatters.set(key, cached)
  }
  return cached
}

/** Formats integer minor units, e.g. "$149" or "$149.50" (no trailing .00). */
function format(minor: number, currency: string): string {
  const fmt = formatter(currency, minor % 100 === 0)
  return fmt ? fmt.format(minor / 100) : `${(minor / 100).toFixed(2)} ${currency}`
}

/** Formats API money (or bare minor units in the store currency). */
export function formatMoney(value: Money | number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return typeof value === 'number'
    ? format(value, storeCurrency.value)
    : format(value.amount, value.currency)
}

export function money(amount: number): Money {
  return { amount, currency: storeCurrency.value }
}

/** Formats a provider charge in its own currency, e.g. '$196.25' or '₦314,078.50'. */
export function formatCharged(value: { amount: number; currency: string } | null | undefined) {
  if (!value) return '—'
  const fmt = formatter(value.currency, false)
  return fmt ? fmt.format(value.amount / 100) : `${(value.amount / 100).toFixed(2)} ${value.currency}`
}
