import type { CardCategory, CardFinish } from '../types/card'
import type { CartItemInput, OrderStatus, Policy } from '../types/api'
import type { OpsOrderFilters } from '../services/api/endpoints/ops'
import type { StaffUserFilters } from '../services/api/endpoints/users'
import type { StaffArtworkFilters } from '../services/api/endpoints/products'

/**
 * Query-key factory: every server-state key is built here so invalidation stays consistent.
 * Keys under `userScoped` hold data tied to whoever is signed in and are dropped on login/logout.
 */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  catalog: {
    finishes: () => ['catalog', 'finishes'] as const,
    finish: (finish: CardFinish) => ['catalog', 'finishes', finish] as const,
  },
  artwork: {
    all: () => ['artwork'] as const,
    categories: () => ['artwork', 'categories'] as const,
    designs: (category: CardCategory) => ['artwork', 'designs', category] as const,
    design: (designId: string) => ['artwork', 'design', designId] as const,
  },
  policies: {
    all: () => ['policies'] as const,
    detail: (slug: Policy['slug']) => ['policies', slug] as const,
  },
  cart: {
    validation: (items: CartItemInput[]) => ['cart', 'validation', items] as const,
  },
  payments: {
    providers: (amountPence: number | null) => ['payments', 'providers', amountPence] as const,
  },
  orders: {
    all: () => ['orders'] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
    eligibility: (orderId: string) => ['orders', 'eligibility', orderId] as const,
  },
  account: {
    all: () => ['account'] as const,
    orders: (status?: OrderStatus) => ['account', 'orders', status ?? 'all'] as const,
  },
  ops: {
    all: () => ['ops'] as const,
    orders: (filters: Omit<OpsOrderFilters, 'cursor'>) => ['ops', 'orders', filters] as const,
    order: (orderId: string) => ['ops', 'order', orderId] as const,
    company: () => ['ops', 'company'] as const,
    policies: () => ['ops', 'policies'] as const,
    policy: (slug: string) => ['ops', 'policies', slug] as const,
    usersRoot: () => ['ops', 'users'] as const,
    usersSummary: () => ['ops', 'users', 'summary'] as const,
    users: (filters: Omit<StaffUserFilters, 'cursor'>) =>
      ['ops', 'users', 'list', filters] as const,
    user: (id: string) => ['ops', 'users', 'detail', id] as const,
    finishes: () => ['ops', 'catalog', 'finishes'] as const,
    artworkRoot: () => ['ops', 'catalog', 'artwork'] as const,
    artworkCategories: () => ['ops', 'catalog', 'artwork', 'categories'] as const,
    artwork: (filters: Omit<StaffArtworkFilters, 'cursor'>) =>
      ['ops', 'catalog', 'artwork', 'list', filters] as const,
  },
}

/** Roots of every query that belongs to the current user or guest. */
export const userScopedRoots = [
  queryKeys.orders.all(),
  queryKeys.account.all(),
  queryKeys.ops.all(),
] as const
