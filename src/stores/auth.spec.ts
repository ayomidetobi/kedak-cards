import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './auth'

// Newer Node versions shadow jsdom's localStorage with an undefined global, so provide one.
function createMemoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  }
}

describe('auth store', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage())
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('signs up, exposes the first name and persists the session without the password', async () => {
    const auth = useAuthStore()
    await auth.signUp({ fullName: 'Alex Morgan', email: 'Alex@Example.com', password: 'secret123' })

    expect(auth.isSignedIn).toBe(true)
    expect(auth.firstName).toBe('Alex')
    expect(auth.user?.email).toBe('alex@example.com')
    const saved = localStorage.getItem('kedak-session') ?? ''
    expect(saved).toContain('alex@example.com')
    expect(saved).not.toContain('secret123')
  })

  it('restores a saved session and clears it on sign out', async () => {
    await useAuthStore().signIn({ email: 'sam.lee@example.com', password: 'x' })

    setActivePinia(createPinia())
    const restored = useAuthStore()
    expect(restored.user?.name).toBe('Sam Lee')

    await restored.signOut()
    expect(restored.isSignedIn).toBe(false)
    expect(localStorage.getItem('kedak-session')).toBeNull()
  })

  it('ignores a malformed saved session', () => {
    localStorage.setItem('kedak-session', '{"id":1}')
    expect(useAuthStore().isSignedIn).toBe(false)
  })
})
