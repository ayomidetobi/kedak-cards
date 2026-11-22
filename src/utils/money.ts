import type { Money } from '../types/api'

const whole = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const exact = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

/** Formats API money (integer pence) as "£149" or "£149.50". */
export function formatMoney(value: Money | number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const pence = typeof value === 'number' ? value : value.amount
  return pence % 100 === 0 ? whole.format(pence / 100) : exact.format(pence / 100)
}

export function money(amount: number): Money {
  return { amount, currency: 'GBP' }
}

/** Formats a provider charge in its own currency, e.g. '$196.25' or '₦314,078.50'. */
export function formatCharged(value: { amount: number; currency: string } | null | undefined) {
  if (!value) return '—'
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: value.currency }).format(
      value.amount / 100,
    )
  } catch {
    return `${(value.amount / 100).toFixed(2)} ${value.currency}`
  }
}
