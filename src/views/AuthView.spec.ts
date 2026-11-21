import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AuthView from './AuthView.vue'
import { useAuthStore } from '../stores/auth'

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

function createAuthRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: AuthView },
      { path: '/signup', name: 'signup', component: AuthView },
      { path: '/account', name: 'account', component: { template: '<div />' } },
      { path: '/cart', name: 'cart', component: { template: '<div />' } },
      { path: '/collections', component: { template: '<div />' } },
    ],
  })
}

async function mountAt(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createAuthRouter()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(AuthView, {
    global: { plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService] },
  })
  return { wrapper, router }
}

describe('AuthView', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the login form with Google sign-in and the guest checkout note', async () => {
    const { wrapper } = await mountAt('/login')

    expect(wrapper.get('h1').text()).toBe('Log in to Kedak.')
    expect(wrapper.get('.auth-google-button').text()).toContain('Continue with Google')
    expect(wrapper.get('.auth-guest-note').text()).toContain('check out as a guest')
    expect(wrapper.find('#signup-name').exists()).toBe(false)
  })

  it('shows the sign-up form with password guidance', async () => {
    const { wrapper } = await mountAt('/signup')

    expect(wrapper.get('h1').text()).toBe('Create your account.')
    expect(wrapper.find('#signup-name').exists()).toBe(true)
    expect(wrapper.get('.auth-password-rules').text()).toContain('At least 8 characters')
  })

  it('signs in with Google and returns to a safe redirect', async () => {
    const { wrapper, router } = await mountAt('/login?redirect=/cart')

    await wrapper.get('.auth-google-button').trigger('click')
    await flushPromises()

    expect(useAuthStore().user?.provider).toBe('google')
    expect(router.currentRoute.value.path).toBe('/cart')
  })

  it('ignores redirects to other sites', async () => {
    const { wrapper, router } = await mountAt('/login?redirect=//evil.example')

    await wrapper.get('.auth-google-button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/account')
  })
})
