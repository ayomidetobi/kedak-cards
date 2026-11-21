import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import OrderDetailView from './OrderDetailView.vue'
import { useAuthStore } from '../stores/auth'
import { PREVIEW_ORDER_EMAIL, useOrdersStore } from '../stores/orders'

async function mountOrder(id: string, signedInEmail?: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (signedInEmail) await useAuthStore().signIn({ email: signedInEmail, password: 'x' })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/account', component: { template: '<div />' } },
      { path: '/help', component: { template: '<div />' } },
      { path: '/account/orders/:id', name: 'tracking', component: OrderDetailView },
    ],
  })
  await router.push(`/account/orders/${id}`)
  await router.isReady()
  const wrapper = mount(OrderDetailView, {
    global: { plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService] },
  })
  return { wrapper, orders: useOrdersStore() }
}

function buttonWithText(wrapper: Awaited<ReturnType<typeof mountOrder>>['wrapper'], text: string) {
  return wrapper.findAll('button').find((button) => button.text().includes(text))!
}

describe('OrderDetailView', () => {
  // PrimeVue's auto-resizing Textarea uses ResizeObserver, which jsdom doesn't provide.
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  })
  afterAll(() => vi.unstubAllGlobals())

  it('asks a guest to verify with reference + email before showing the order', async () => {
    const { wrapper } = await mountOrder('KD-2051')

    expect(wrapper.get('h1').text()).toBe('Find your order.')
    expect(wrapper.text()).not.toContain('Need to make a change?')

    await wrapper.get('#lookup-email').setValue('wrong@example.com')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('couldn’t find an order')

    await wrapper.get('#lookup-email').setValue(PREVIEW_ORDER_EMAIL)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Waiting for your card.')
    expect(wrapper.text()).toContain('Need to make a change?')
  })

  it('lets a registered customer cancel an order before conversion', async () => {
    const { wrapper, orders } = await mountOrder('KD-2051', PREVIEW_ORDER_EMAIL)

    await buttonWithText(wrapper, 'Cancel order').trigger('click')
    expect(wrapper.text()).toContain('Cancel this order?')

    // A reason is required.
    await buttonWithText(wrapper, 'Cancel order').trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toContain('Choose a reason')
    expect(orders.getOrder('KD-2051')!.status).toBe('awaiting-card')

    await wrapper.get('input[value="I ordered by mistake"]').setValue(true)
    await buttonWithText(wrapper, 'Cancel order').trigger('click')
    await flushPromises()

    expect(orders.getOrder('KD-2051')!.status).toBe('cancelled')
    expect(wrapper.get('h1').text()).toBe('Order cancelled.')
    expect(wrapper.text()).toContain('I ordered by mistake')
  })

  it('explains why an order in production can’t be cancelled', async () => {
    const { wrapper } = await mountOrder('KD-2048', PREVIEW_ORDER_EMAIL)

    expect(wrapper.text()).toContain('already being converted')
    expect(wrapper.findAll('button').some((button) => button.text() === 'Cancel order')).toBe(false)
  })

  it('lets a customer request a refund after delivery', async () => {
    const { wrapper, orders } = await mountOrder('KD-1987', PREVIEW_ORDER_EMAIL)

    await buttonWithText(wrapper, 'Request refund').trigger('click')
    expect(wrapper.text()).toContain('Request a refund')

    await wrapper.get('input[value="The card arrived damaged"]').setValue(true)
    await buttonWithText(wrapper, 'Submit refund request').trigger('click')
    await flushPromises()

    expect(orders.getOrder('KD-1987')!.status).toBe('refund-requested')
    expect(wrapper.get('h1').text()).toBe('Refund requested.')
    expect(wrapper.text()).toContain('Return your card')
  })
})
