import { QueryClient } from '@tanstack/vue-query'
import { ApiError } from '../services/api/errors'

/** Retry reads only for transient failures (network, timeout, 5xx); never for 4xx answers. */
export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= 2) return false
  if (!(error instanceof ApiError)) return true
  if (error.isCancelled) return false
  return error.status === 0 || error.status >= 500
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Never retry writes automatically: orders, cancellations and refunds must not repeat.
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()
