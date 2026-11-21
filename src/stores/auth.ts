import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authService from '../services/auth'
import type { AuthUser, EmailCredentials, SignupDetails } from '../services/auth'

const SESSION_KEY = 'kedak-session'

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Record<string, unknown>
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    (user.provider === 'email' || user.provider === 'google')
  )
}

// Storage can be unavailable (private browsing, blocked site data); the app works without it.
function readSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return isAuthUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeSession(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Session simply won't survive a reload.
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(readSession())
  const isSignedIn = computed(() => user.value !== null)
  const firstName = computed(() => user.value?.name.trim().split(/\s+/)[0] ?? '')

  function setUser(next: AuthUser | null) {
    user.value = next
    writeSession(next)
  }

  async function signIn(credentials: EmailCredentials) {
    setUser(await authService.signInWithEmail(credentials))
  }

  async function signUp(details: SignupDetails) {
    setUser(await authService.signUpWithEmail(details))
  }

  async function signInWithGoogle() {
    setUser(await authService.signInWithGoogle())
  }

  async function signOut() {
    await authService.signOut()
    setUser(null)
  }

  return { user, isSignedIn, firstName, signIn, signUp, signInWithGoogle, signOut }
})
