import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import CartQuickView from './CartQuickView.vue'
import { finishes, useCardCustomizationStore } from '../stores/cardCustomization'

function createRouterForCart() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/cart', name: 'cart', component: { template: '<div />' } },
    ],
  })
}

describe('CartQuickView', () => {
  it('shows cart details and confirms before deleting an item', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    store.addToCart()
    const router = createRouterForCart()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(CartQuickView, {
      props: { variant: 'floating' },
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })

    await wrapper.get('.cart-quick-view-trigger').trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Black metal card')
    expect(document.body.textContent).toContain('Customised')
    expect(document.body.querySelector('.cart-quick-view-quantity output')?.textContent).toBe('1')

    document.body
      .querySelector<HTMLButtonElement>('[aria-label="Increase Black quantity"]')
      ?.click()
    await flushPromises()
    expect(store.cartItemCount).toBe(2)
    expect(store.cartSubtotal).toBe(298)

    document.body
      .querySelector<HTMLButtonElement>('[aria-label="Decrease Black quantity"]')
      ?.click()
    await flushPromises()
    expect(store.cartItemCount).toBe(1)

    const deleteAction = document.body.querySelector<HTMLButtonElement>(
      '[aria-label="Delete Black card"]',
    )
    expect(deleteAction).not.toBeNull()
    deleteAction?.click()
    await flushPromises()

    expect(store.cartItemCount).toBe(1)
    expect(document.body.textContent).toContain('Remove this Black card from your cart?')

    const confirmButton = document.querySelector<HTMLButtonElement>(
      '.cart-quick-view-confirm button:last-child',
    )
    expect(confirmButton).not.toBeNull()
    confirmButton?.click()
    await flushPromises()

    expect(store.cartItemCount).toBe(0)
    expect(document.body.textContent).toContain('Your cart is empty.')
    wrapper.unmount()
  })

  it('only enables checkout when every item is customised and in stock', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    const goldId = store.addUncustomizedItem('Gold', 1)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/cart', name: 'cart', component: { template: '<div />' } },
        { path: '/checkout', name: 'checkout', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(CartQuickView, {
      props: { variant: 'floating' },
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })
    await wrapper.get('.cart-quick-view-trigger').trigger('click')
    await flushPromises()

    const checkout = () =>
      document.body.querySelector<HTMLButtonElement>('.cart-quick-view-checkout')!
    expect(checkout().disabled).toBe(true)
    expect(document.body.querySelector('.cart-quick-view-blocked')?.textContent).toContain(
      'customise every item',
    )

    // Customise the item: checkout becomes available.
    store.beginEditingCartItem(goldId)
    store.addToCart()
    await flushPromises()
    expect(checkout().disabled).toBe(false)
    expect(document.body.querySelector('.cart-quick-view-blocked')).toBeNull()

    // The finish goes out of stock: checkout is blocked again with advice.
    const gold = finishes.find((item) => item.name === 'Gold')!
    gold.inStock = false
    try {
      await flushPromises()
      expect(checkout().disabled).toBe(true)
      expect(document.body.querySelector('.cart-quick-view-blocked')?.textContent).toContain(
        'switch or remove out-of-stock items',
      )
    } finally {
      gold.inStock = true
    }

    await flushPromises()
    checkout().click()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/checkout')
    wrapper.unmount()
  })

  it('opens the selected cart item editor from the edit action', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    const itemId = store.addToCart()
    const router = createRouterForCart()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(CartQuickView, {
      props: { variant: 'header' },
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })

    await wrapper.get('.cart-quick-view-trigger').trigger('click')
    await flushPromises()
    const editAction = document.body.querySelector<HTMLButtonElement>(
      '[aria-label="Edit Black card"]',
    )
    expect(editAction).not.toBeNull()
    editAction?.click()
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/cart')
    expect(router.currentRoute.value.query.edit).toBe(itemId)
    wrapper.unmount()
  })
})
