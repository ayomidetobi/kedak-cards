import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import CollectionProductCard from './CollectionProductCard.vue'
import { finishes, useCardCustomizationStore } from '../stores/cardCustomization'

describe('CollectionProductCard', () => {
  it('opens the customizer with the selected finish', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/customise', name: 'customise', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(CollectionProductCard, {
      props: {
        finish: 'Gold',
        description: 'A warmer take on everyday luxury.',
      },
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
        stubs: { FinishCard: true },
      },
    })
    const store = useCardCustomizationStore()

    await wrapper.get('.collection-product-link').trigger('click')
    await flushPromises()

    expect(store.finish).toBe('Gold')
    expect(router.currentRoute.value.path).toBe('/customise')
  })

  it('adds the selected quantity as an uncustomized cart item', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/customise', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(CollectionProductCard, {
      props: {
        finish: 'Gold',
        description: 'A warmer take on everyday luxury.',
      },
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
        stubs: { FinishCard: true },
      },
    })
    const store = useCardCustomizationStore()

    await wrapper.get('[aria-label="Increase Gold quantity"]').trigger('click')
    await wrapper.get('[aria-label="Increase Gold quantity"]').trigger('click')
    await wrapper.get('.collection-add-to-cart').trigger('click')

    expect(store.cartItemCount).toBe(3)
    expect(store.cartItems[0]).toMatchObject({
      finish: 'Gold',
      quantity: 3,
      customization: null,
    })
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('shows an in-stock badge by default', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(CollectionProductCard, {
      props: { finish: 'Gold', description: 'A warmer take on everyday luxury.' },
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
        stubs: { FinishCard: true },
      },
    })

    expect(wrapper.get('.stock-badge').text()).toBe('In stock')
    expect(wrapper.get('.collection-add-to-cart').attributes('disabled')).toBeUndefined()
  })

  it('disables adding an out-of-stock finish to the cart', async () => {
    const gold = finishes.find((item) => item.name === 'Gold')!
    gold.inStock = false
    try {
      const pinia = createPinia()
      setActivePinia(pinia)
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', component: { template: '<div />' } }],
      })
      await router.push('/')
      await router.isReady()

      const wrapper = mount(CollectionProductCard, {
        props: { finish: 'Gold', description: 'A warmer take on everyday luxury.' },
        global: {
          plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
          stubs: { FinishCard: true },
        },
      })
      const store = useCardCustomizationStore()

      expect(wrapper.get('.stock-badge').text()).toBe('Out of stock')
      const addButton = wrapper.get('.collection-add-to-cart')
      expect(addButton.text()).toContain('Out of stock')
      expect(addButton.attributes('disabled')).toBeDefined()
      await addButton.trigger('click')
      expect(store.cartItemCount).toBe(0)
    } finally {
      gold.inStock = true
    }
  })
})
