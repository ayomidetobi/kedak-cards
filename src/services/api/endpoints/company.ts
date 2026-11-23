import { api } from '../client'
import type { Policy } from '../../../types/api'

/**
 * Company information and policy editing (documented additions to the contract, so the types
 * are declared here). Staff (ops / production) can read; only superusers can save; the API
 * reports which via `canEdit` and enforces it with 403.
 */
export interface Company {
  companyName: string
  companyNumber: string
  registeredAddress: string
  contactEmail: string
  privacyEmail: string
  phone: string
}

export interface OpsCompany extends Company {
  updatedAt: string | null
  updatedBy: string | null
  canEdit: boolean
}

export type PolicySlug = Policy['slug']

export interface PolicySectionInput {
  id?: string
  heading: string
  paragraphs: string[]
  bullets: string[]
}

export interface PolicyInput {
  title: string
  summary: string
  sections: PolicySectionInput[]
}

export interface OpsPolicy extends Omit<PolicyInput, 'sections'> {
  slug: PolicySlug
  lastUpdated: string
  sections: Array<{ id: string; heading: string; paragraphs?: string[]; bullets?: string[] }>
  updatedBy: string | null
  customised: boolean
  canEdit: boolean
  tokens: Array<{ token: string; placeholder: string }>
}

export interface OpsPolicySummary {
  slug: PolicySlug
  title: string
  lastUpdated: string | null
  updatedBy: string | null
  customised: boolean
}

export async function getOpsCompany(signal?: AbortSignal) {
  const { data } = await api.get<OpsCompany>('/ops/company', { signal })
  return data
}

export async function updateOpsCompany(payload: Company) {
  const { data } = await api.put<OpsCompany>('/ops/company', payload)
  return data
}

export async function listOpsPolicies(signal?: AbortSignal) {
  const { data } = await api.get<{ data: OpsPolicySummary[]; canEdit: boolean }>('/ops/policies', {
    signal,
  })
  return data
}

export async function getOpsPolicy(slug: PolicySlug, signal?: AbortSignal) {
  const { data } = await api.get<OpsPolicy>(`/ops/policies/${slug}`, { signal })
  return data
}

export async function updateOpsPolicy(slug: PolicySlug, payload: PolicyInput) {
  const { data } = await api.put<OpsPolicy>(`/ops/policies/${slug}`, payload)
  return data
}
