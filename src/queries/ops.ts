import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import * as companyApi from '../services/api/endpoints/company'
import type { Company, PolicyInput, PolicySlug } from '../services/api/endpoints/company'
import * as opsApi from '../services/api/endpoints/ops'
import type { OpsOrderFilters } from '../services/api/endpoints/ops'
import * as productsApi from '../services/api/endpoints/products'
import type {
  StaffArtworkFilters,
  StaffFinishInput,
  StaffFinishList,
} from '../services/api/endpoints/products'
import type { CardFinish } from '../types/card'
import * as usersApi from '../services/api/endpoints/users'
import type {
  CreateStaffUserInput,
  StaffUserDetail,
  StaffUserFilters,
  UpdateStaffUserInput,
} from '../services/api/endpoints/users'
import type { AdvanceStatusRequest, Order, RefundDecisionRequest, UserRole } from '../types/api'
import { queryKeys } from './query-keys'

export function useOpsOrders(filters: MaybeRefOrGetter<Omit<OpsOrderFilters, 'cursor'>>) {
  return useInfiniteQuery({
    queryKey: computed(() => queryKeys.ops.orders(toValue(filters))),
    queryFn: ({ pageParam, signal }) =>
      opsApi.listOpsOrders({ ...toValue(filters), cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
}

export function useOpsOrder(orderId: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.ops.order(toValue(orderId) ?? '')),
    queryFn: ({ signal }) => opsApi.getOpsOrder(toValue(orderId)!, signal),
    enabled: computed(() => Boolean(toValue(orderId))),
    staleTime: 10_000,
  })
}

function useRefreshAfterStaffAction() {
  const client = useQueryClient()
  return (order: Order) => {
    void client.invalidateQueries({ queryKey: queryKeys.ops.all() })
    // A customer view of this order (same browser, rare) must not stay stale either.
    void client.invalidateQueries({ queryKey: queryKeys.orders.detail(order.id) })
  }
}

export function useAdvanceOrderStatus() {
  const refresh = useRefreshAfterStaffAction()
  return useMutation({
    mutationFn: (input: { orderId: string; payload: AdvanceStatusRequest }) =>
      opsApi.advanceOrderStatus(input.orderId, input.payload),
    onSuccess: refresh,
  })
}

export function useDecideRefund() {
  const refresh = useRefreshAfterStaffAction()
  return useMutation({
    mutationFn: (input: { orderId: string; payload: RefundDecisionRequest }) =>
      opsApi.decideRefund(input.orderId, input.payload),
    onSuccess: refresh,
  })
}

// --- Company information & policies (staff read, superusers save) ---------------------------

export function useOpsCompany() {
  return useQuery({
    queryKey: queryKeys.ops.company(),
    queryFn: ({ signal }) => companyApi.getOpsCompany(signal),
    staleTime: 60_000,
  })
}

export function useUpdateOpsCompany() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: Company) => companyApi.updateOpsCompany(payload),
    onSuccess: (company) => {
      client.setQueryData(queryKeys.ops.company(), company)
      // Company details are filled into the published policies.
      void client.invalidateQueries({ queryKey: queryKeys.policies.all() })
      void client.invalidateQueries({ queryKey: queryKeys.ops.policies() })
    },
  })
}

export function useOpsPolicies() {
  return useQuery({
    queryKey: queryKeys.ops.policies(),
    queryFn: ({ signal }) => companyApi.listOpsPolicies(signal),
    staleTime: 60_000,
  })
}

export function useOpsPolicy(slug: MaybeRefOrGetter<PolicySlug | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.ops.policy(toValue(slug) ?? '')),
    queryFn: ({ signal }) => companyApi.getOpsPolicy(toValue(slug)!, signal),
    enabled: computed(() => Boolean(toValue(slug))),
    staleTime: 60_000,
  })
}

export function useUpdateOpsPolicy() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { slug: PolicySlug; payload: PolicyInput }) =>
      companyApi.updateOpsPolicy(input.slug, input.payload),
    onSuccess: (policy) => {
      client.setQueryData(queryKeys.ops.policy(policy.slug), policy)
      void client.invalidateQueries({ queryKey: queryKeys.ops.policies() })
      void client.invalidateQueries({ queryKey: queryKeys.policies.all() })
    },
  })
}

// --- People (staff user management) --------------------------------------------------------

export function useStaffUsers(filters: MaybeRefOrGetter<Omit<StaffUserFilters, 'cursor'>>) {
  return useInfiniteQuery({
    queryKey: computed(() => queryKeys.ops.users(toValue(filters))),
    queryFn: ({ pageParam, signal }) =>
      usersApi.listStaffUsers({ ...toValue(filters), cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 15_000,
  })
}

export function useStaffUser(id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.ops.user(toValue(id) ?? '')),
    queryFn: ({ signal }) => usersApi.getStaffUser(toValue(id)!, signal),
    enabled: computed(() => Boolean(toValue(id))),
    staleTime: 10_000,
  })
}

/** Store the fresh detail and refresh every list (counts, filters and sorting may change). */
function useStaffUserSaved() {
  const client = useQueryClient()
  return (detail: StaffUserDetail) => {
    client.setQueryData(queryKeys.ops.user(detail.user.id), detail)
    void client.invalidateQueries({ queryKey: queryKeys.ops.usersRoot() })
  }
}

export function useCreateStaffUser() {
  const saved = useStaffUserSaved()
  return useMutation({
    mutationFn: (payload: CreateStaffUserInput) => usersApi.createStaffUser(payload),
    onSuccess: saved,
  })
}

export function useUpdateStaffUser() {
  const saved = useStaffUserSaved()
  return useMutation({
    mutationFn: (input: { id: string; payload: UpdateStaffUserInput }) =>
      usersApi.updateStaffUser(input.id, input.payload),
    onSuccess: saved,
  })
}

export function useChangeStaffUserRole() {
  const saved = useStaffUserSaved()
  return useMutation({
    mutationFn: (input: { id: string; role: UserRole }) =>
      usersApi.changeStaffUserRole(input.id, input.role),
    onSuccess: saved,
  })
}

export function useDeleteStaffUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteStaffUser(id),
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: queryKeys.ops.user(id) })
      void client.invalidateQueries({ queryKey: queryKeys.ops.usersRoot() })
    },
  })
}

export function useSendStaffUserEmail() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; kind: 'verification' | 'password-reset' }) =>
      usersApi.sendStaffUserEmail(input.id, input.kind),
    // The account's activity log gains an entry.
    onSuccess: (_data, input) =>
      void client.invalidateQueries({ queryKey: queryKeys.ops.user(input.id) }),
  })
}

export function useStaffUserSummary() {
  return useQuery({
    queryKey: queryKeys.ops.usersSummary(),
    queryFn: ({ signal }) => usersApi.getStaffUserSummary(signal),
    staleTime: 30_000,
  })
}

// --- Products (finishes and artwork) --------------------------------------------------------

/** Staff edits also refresh the storefront's own copies (finishes, artwork) in this browser. */
function useRefreshStorefrontCatalog() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.catalog.finishes() })
    void client.invalidateQueries({ queryKey: queryKeys.artwork.all() })
  }
}

export function useStaffFinishes() {
  return useQuery({
    queryKey: queryKeys.ops.finishes(),
    queryFn: ({ signal }) => productsApi.listStaffFinishes(signal),
    staleTime: 30_000,
  })
}

function useFinishesSaved() {
  const client = useQueryClient()
  const refreshStorefront = useRefreshStorefrontCatalog()
  return (list: StaffFinishList) => {
    client.setQueryData(queryKeys.ops.finishes(), list)
    refreshStorefront()
  }
}

export function useCreateStaffFinish() {
  const saved = useFinishesSaved()
  return useMutation({
    mutationFn: (payload: StaffFinishInput & { name: CardFinish }) =>
      productsApi.createStaffFinish(payload),
    onSuccess: saved,
  })
}

export function useUpdateStaffFinish() {
  const saved = useFinishesSaved()
  return useMutation({
    mutationFn: (input: { name: CardFinish; payload: StaffFinishInput }) =>
      productsApi.updateStaffFinish(input.name, input.payload),
    onSuccess: saved,
  })
}

export function useStaffAddOns() {
  return useQuery({
    queryKey: queryKeys.ops.addOns(),
    queryFn: ({ signal }) => productsApi.getStaffAddOns(signal),
    staleTime: 30_000,
  })
}

/** Saves the contactless price and refreshes the shop's copy so this browser sees it at once. */
export function useUpdateStaffAddOns() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (contactlessAmount: number) => productsApi.updateStaffAddOns({ contactlessAmount }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.ops.addOns(), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.addOns() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all() })
    },
  })
}

export function useDeleteStaffFinish() {
  const saved = useFinishesSaved()
  return useMutation({
    mutationFn: (name: CardFinish) => productsApi.deleteStaffFinish(name),
    onSuccess: saved,
  })
}

export function useStaffArtworkCategories() {
  return useQuery({
    queryKey: queryKeys.ops.artworkCategories(),
    queryFn: ({ signal }) => productsApi.listStaffArtworkCategories(signal),
    staleTime: 30_000,
  })
}

export function useStaffArtwork(filters: MaybeRefOrGetter<Omit<StaffArtworkFilters, 'cursor'>>) {
  return useInfiniteQuery({
    queryKey: computed(() => queryKeys.ops.artwork(toValue(filters))),
    queryFn: ({ pageParam, signal }) =>
      productsApi.listStaffArtwork({ ...toValue(filters), cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 30_000,
  })
}

function useArtworkChanged() {
  const client = useQueryClient()
  const refreshStorefront = useRefreshStorefrontCatalog()
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.ops.artworkRoot() })
    refreshStorefront()
  }
}

export function useCreateStaffArtwork() {
  const changed = useArtworkChanged()
  return useMutation({
    mutationFn: productsApi.createStaffArtwork,
    onSuccess: changed,
  })
}

export function useUpdateStaffArtwork() {
  const changed = useArtworkChanged()
  return useMutation({
    mutationFn: (input: {
      id: string
      payload: { name?: string; isPublished?: boolean; file?: File | null }
    }) => productsApi.updateStaffArtwork(input.id, input.payload),
    onSuccess: changed,
  })
}

export function useDeleteStaffArtwork() {
  const changed = useArtworkChanged()
  return useMutation({
    mutationFn: (id: string) => productsApi.deleteStaffArtwork(id),
    onSuccess: changed,
  })
}
