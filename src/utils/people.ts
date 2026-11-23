import type { UserRole } from '../types/api'

/** Labels, icons and descriptions for account roles (People pages and settings). */
export const roleMeta: Record<UserRole, { label: string; icon: string; description: string }> = {
  customer: {
    label: 'Customer',
    icon: 'pi pi-user',
    description: 'Shops and tracks their own orders. No staff access.',
  },
  production: {
    label: 'Production',
    icon: 'pi pi-cog',
    description: 'Sees orders and moves them through production.',
  },
  ops: {
    label: 'Operations',
    icon: 'pi pi-briefcase',
    description: 'Production, plus refunds and managing customer accounts.',
  },
  admin: {
    label: 'Administrator',
    icon: 'pi pi-shield',
    description: 'Full access: roles, staff accounts, deletion, company and store settings.',
  },
}

export function initialsOf(person: { name: string; email: string }) {
  const source = person.name.trim() || person.email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[1]?.[0] ?? '') : '')).toUpperCase()
}

const relative = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' })

/** "3 days ago" for the last month; older dates as "12 Mar 2026". */
export function formatRelativeDate(value: string, fallback: (value: string) => string) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return relative.format(days, 'day')
  return fallback(value)
}
