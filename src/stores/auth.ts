import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import * as authApi from '../services/api/endpoints/auth'
import { clearOrderAccess } from '../services/api/orderAccess'
import { onSessionExpired, setSessionHint } from '../services/api/session'
import { currentUserQueryOptions } from '../queries/auth'
import { queryClient } from '../queries/query-client'
import { queryKeys, userScopedRoots } from '../queries/query-keys'
import type { User } from '../types/api'

export interface EmailCredentials {
  email: string
  password: string
}

export interface SignupDetails extends EmailCredentials {
  fullName: string
  acceptTerms: boolean
}

/** Drops every cached query that belongs to a user, so the next person never sees it. */
function resetUserScopedData() {
  for (const root of userScopedRoots) queryClient.removeQueries({ queryKey: root })
}

/**
 * Authentication facade. The signed-in user is server state (GET /auth/me in TanStack Query);
 * this store exposes it to the router and components and runs the auth actions. Session
 * tokens are HTTP-only cookies and never pass through here.
 */
export const useAuthStore = defineStore('auth', () => {
  const meQuery = useQuery(currentUserQueryOptions(), queryClient)
  const user = computed<User | null>(() => meQuery.data.value ?? null)
  const isSignedIn = computed(() => user.value !== null)
  const isReady = computed(() => !meQuery.isPending.value)
  const firstName = computed(() => user.value?.name.trim().split(/\s+/)[0] ?? '')

  function establishSession(next: User) {
    resetUserScopedData()
    setSessionHint(true)
    queryClient.setQueryData(queryKeys.auth.me(), next)
  }

  function endSession() {
    setSessionHint(false)
    resetUserScopedData()
    clearOrderAccess()
    queryClient.setQueryData(queryKeys.auth.me(), null)
  }

  // Session couldn't be refreshed (expired or revoked): forget the user everywhere.
  onSessionExpired(() => {
    if (queryClient.getQueryData(queryKeys.auth.me())) endSession()
  })

  /** Resolves once we know whether someone is signed in (used by route guards). */
  async function ensureSession(): Promise<User | null> {
    try {
      return await queryClient.ensureQueryData(currentUserQueryOptions())
    } catch {
      return null // API unreachable: treat as signed out; the page shows its own errors
    }
  }

  async function signIn(credentials: EmailCredentials) {
    establishSession(
      await authApi.logIn({ email: credentials.email.trim(), password: credentials.password }),
    )
  }

  async function signUp(details: SignupDetails) {
    establishSession(
      await authApi.signUp({
        fullName: details.fullName.trim(),
        email: details.email.trim(),
        password: details.password,
        acceptTerms: true,
      }),
    )
  }

  /** Exchanges the ID token from Google's button for a Kedak session (POST /auth/google). */
  async function signInWithGoogle(idToken: string) {
    establishSession(await authApi.signInWithGoogle(idToken))
  }

  async function signOut() {
    try {
      await authApi.logOut()
    } catch {
      // Already expired or revoked server-side; signing out locally is still correct.
    } finally {
      endSession()
    }
  }

  return {
    user,
    isSignedIn,
    isReady,
    firstName,
    ensureSession,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  }
})
