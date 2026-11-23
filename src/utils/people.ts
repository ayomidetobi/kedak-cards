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
