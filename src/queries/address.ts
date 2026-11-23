import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  deleteSavedAddress,
  getSavedAddress,
  saveSavedAddress,
  type SavedAddress,
} from '../services/api/endpoints/address'
import { useAuthStore } from '../stores/auth'
import { queryKeys } from './query-keys'

/** The signed-in customer's saved delivery address (null when none is saved). */
export function useSavedAddress() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: queryKeys.account.address(),
    queryFn: ({ signal }) => getSavedAddress(signal),
    enabled: computed(() => auth.isSignedIn),
    staleTime: 5 * 60_000,
  })
}

export function useSaveAddress() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (address: SavedAddress) => saveSavedAddress(address),
    onSuccess: (address) => client.setQueryData(queryKeys.account.address(), address),
  })
}

export function useDeleteAddress() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => deleteSavedAddress(),
    onSuccess: () => client.setQueryData(queryKeys.account.address(), null),
  })
}
