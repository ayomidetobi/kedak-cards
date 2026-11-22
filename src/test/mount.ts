import { flushPromises, mount, type ComponentMountingOptions } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'
import { queryClient } from '../queries/query-client'

const Blank = { template: '<div />' }

/** Every app route name the views link to, rendering nothing (keeps tests focused). */
const DEFAULT_ROUTES: RouteRecordRaw[] = [
  'home:/',
  'collections:/collections',
  'product:/collections/:finish',
  'customise:/customise',
  'compatibility:/compatibility',
  'compatibility-result:/compatibility/result',
  'manual-review:/manual-review',
  'cart:/cart',
  'checkout:/checkout',
  'confirmed:/order/confirmed',
  'login:/login',
  'signup:/signup',
  'forgot-password:/forgot-password',
  'reset-password:/reset-password',
  'verify-email:/verify-email',
  'account:/account',
  'tracking:/account/orders/:id',
  'order-lookup:/orders/find',
  'refund-policy:/policies/refunds',
  'privacy-policy:/policies/privacy',
  'help:/help',
  'operations:/ops',
  'quality-check:/ops/quality-check',
].map((entry) => {
  const [name, path] = entry.split(':') as [string, string]
  return { name, path: path.replace('_', ':'), component: Blank }
})

/**
 * Mounts a component with the app's real plugins: Pinia, Vue Query (the shared client),
 * PrimeVue + Toast and a memory router whose route `routeName` renders the component.
 */
export async function mountWithApp<T extends Component>(
  component: T,
  options: {
    path?: string
    routeName?: string
    routePath?: string
    meta?: Record<string, unknown>
    props?: Record<string, unknown>
    mountOptions?: ComponentMountingOptions<T>
  } = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const routes = DEFAULT_ROUTES.map((route) =>
    options.routeName && route.name === options.routeName
      ? { ...route, path: options.routePath ?? route.path, component, meta: options.meta }
      : route,
  ) as RouteRecordRaw[]
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(options.path ?? '/')
  await router.isReady()
  const wrapper = mount(component, {
    props: options.props,
    global: {
      plugins: [
        pinia,
        router,
        [VueQueryPlugin, { queryClient }],
        [PrimeVue, { theme: { preset: Aura } }],
        ToastService,
      ],
      stubs: { teleport: true },
    },
    attachTo: document.body,
    ...(options.mountOptions as object),
  } as ComponentMountingOptions<T>)
  await flushPromises()
  return { wrapper, router, pinia }
}

/** Waits for queued queries/mutations and their re-renders. */
export async function settle(rounds = 4) {
  for (let index = 0; index < rounds; index += 1) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}
