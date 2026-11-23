import { api } from '../client'
import type { OrderSummary, UserRole } from '../../../types/api'

/**
 * Staff user management (/ops/users, a documented backend addition, so types live here).
 * Ops can view everyone, create and edit customers and send account emails; administrators
 * also edit staff, change roles and delete accounts. The API enforces all of it and reports
 * what the caller may do for each account in `permissions`.
 */
export type StaffUserSort = 'newest' | 'oldest' | 'name' | 'name-desc'
export type StaffUserRoleFilter = UserRole | 'staff'

export interface StaffUser {
  id: string
  name: string
  email: string
  provider: 'email' | 'google'
  role: UserRole
  isActive: boolean
  emailVerified: boolean
  orderCount: number
  dateJoined: string
  lastLogin: string | null
}

export interface StaffUserPermissions {
  canEdit: boolean
  canDeactivate: boolean
  canChangeRole: boolean
  canDelete: boolean
  canSendEmails: boolean
}

export interface StaffUserActivity {
  action: string
  label: string
  changes: Record<string, unknown>
  actor: string | null
  createdAt: string
}

export interface StaffUserDetail {
  user: StaffUser
  permissions: StaffUserPermissions
  recentOrders: OrderSummary[]
  activity: StaffUserActivity[]
}

export interface StaffUserFilters {
  q?: string
  role?: StaffUserRoleFilter
  status?: 'active' | 'inactive'
  verified?: boolean
  sort?: StaffUserSort
  cursor?: string | null
  limit?: number
}

export interface StaffUserPage {
  data: StaffUser[]
  nextCursor: string | null
}

export interface CreateStaffUserInput {
  name: string
  email: string
  role: UserRole
  sendInvite: boolean
}

export interface UpdateStaffUserInput {
  name?: string
  email?: string
  isActive?: boolean
}

const userPath = (id: string, suffix = '') => `/ops/users/${encodeURIComponent(id)}${suffix}`

export async function listStaffUsers(filters: StaffUserFilters = {}, signal?: AbortSignal) {
  const { data } = await api.get<StaffUserPage>('/ops/users', {
    params: {
      limit: filters.limit ?? 20,
      cursor: filters.cursor ?? undefined,
      q: filters.q || undefined,
      role: filters.role,
      status: filters.status,
      verified: filters.verified,
      sort: filters.sort && filters.sort !== 'newest' ? filters.sort : undefined,
    },
    signal,
  })
  return data
}

export async function getStaffUser(id: string, signal?: AbortSignal) {
  const { data } = await api.get<StaffUserDetail>(userPath(id), { signal })
  return data
}

export async function createStaffUser(payload: CreateStaffUserInput) {
  const { data } = await api.post<StaffUserDetail>('/ops/users', payload)
  return data
}

export async function updateStaffUser(id: string, payload: UpdateStaffUserInput) {
  const { data } = await api.patch<StaffUserDetail>(userPath(id), payload)
  return data
}

export async function changeStaffUserRole(id: string, role: UserRole) {
  const { data } = await api.put<StaffUserDetail>(userPath(id, '/role'), { role })
  return data
}

export async function deleteStaffUser(id: string) {
  await api.delete(userPath(id))
}

export async function sendStaffUserEmail(id: string, kind: 'verification' | 'password-reset') {
  const suffix = kind === 'verification' ? '/verification-email' : '/password-reset'
  const { data } = await api.post<{ sent: boolean; email: string }>(userPath(id, suffix))
  return data
}

export interface StaffUserSummary {
  total: number
  customers: number
  staff: number
  admins: number
  unverified: number
  inactive: number
  joinedLast30Days: number
}

export async function getStaffUserSummary(signal?: AbortSignal) {
  const { data } = await api.get<StaffUserSummary>('/ops/users/summary', { signal })
  return data
}
