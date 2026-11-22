import { getCurrentUser } from '../services/api/endpoints/auth'
import { ApiError } from '../services/api/errors'
import { hasSessionHint, setSessionHint } from '../services/api/session'
import type { User } from '../types/api'
import { shouldRetryQuery } from './query-client'
import { queryKeys } from './query-keys'

/**
 * GET /auth/me as the single source of truth for "who is signed in". `null` = signed out.
 * Browsers without a session hint skip the request entirely (no 401 noise for visitors).
 */
export function currentUserQueryOptions() {
  return {
    queryKey: queryKeys.auth.me(),
    queryFn: async ({ signal }: { signal: AbortSignal }): Promise<User | null> => {
      if (!hasSessionHint()) return null
      try {
        return await getCurrentUser(signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setSessionHint(false)
          return null
        }
        throw error
      }
    },
    staleTime: 5 * 60_000,
    retry: shouldRetryQuery,
  }
}
