import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { Form } from '@primevue/forms'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import JourneyView from './JourneyView.vue'
import { finishes, useCardCustomizationStore } from '../stores/cardCustomization'
import { useOrdersStore } from '../stores/orders'

afterEach(() => {
  vi.unstubAllGlobals()
})

function createJourneyRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/cart', name: 'cart', component: JourneyView },
      { path: '/bag', redirect: '/cart' },
      { path: '/checkout', name: 'checkout', component: JourneyView },
      { path: '/customise', name: 'customise', component: { template: '<div />' } },
    ],
  })
}

describe('cart workflow', () => {
  it('redirects the legacy bag URL to the cart', async () => {
    const router = createJourneyRouter()
    await router.push('/bag')

    expect(router.currentRoute.value.path).toBe('/cart')
  })

  it('shows uncustomized items, blocks checkout and opens the item editor', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    const itemId = store.addUncustomizedItem('Gold', 2)
    const router = createJourneyRouter()
    await router.push('/cart')
    await router.isReady()

    const wrapper = mount(JourneyView, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })

    expect(wrapper.get('.cart-customization-status').text()).toBe('Not customised')
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Please customise every item in your cart before checkout.',
    )
    expect(wrapper.get('.order-summary .kedak-action').attributes('disabled')).toBeDefined()

    await wrapper.get('.cart-product-actions button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/cart')
    expect(wrapper.find('.cart-customization-editor').exists()).toBe(true)
    expect(
      wrapper.findAll('.cart-customization-editor > *').map((child) => child.classes()[0]),
    ).toEqual([
      'customization-mode-choice',
      'cart-customization-preview',
      'cart-customization-fields',
    ])
    expect(
      wrapper.findAll('.cart-customization-fields > *').map((child) => child.classes()[0]),
    ).toEqual(['design-choice', 'field-block', 'cart-editor-actions'])

    await wrapper.get('.cart-editor-save').trigger('click')
    await flushPromises()

    expect(store.cartItems[0]?.id).toBe(itemId)
    expect(store.cartItems[0]?.customization?.designId).toBe('sport-01')
    expect(wrapper.get('.cart-customization-status').text()).toBe('Customised')
  })

  it('opens the requested cart item editor from the cart preview', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    const itemId = store.addUncustomizedItem('Gold', 1)
    const router = createJourneyRouter()
    await router.push({ name: 'cart', query: { edit: itemId } })
    await router.isReady()

    const wrapper = mount(JourneyView, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })
    await flushPromises()

    expect(wrapper.find('.cart-customization-editor').exists()).toBe(true)
    expect(store.editingCartItemId).toBe(itemId)
    expect(router.currentRoute.value.query.edit).toBeUndefined()
  })

  it('explains why saving custom artwork is disabled when no image is uploaded', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useCardCustomizationStore().addUncustomizedItem('Gold', 1)
    const router = createJourneyRouter()
    await router.push('/cart')
    await router.isReady()

    const wrapper = mount(JourneyView, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })

    await wrapper.get('.cart-product-actions button').trigger('click')
    await wrapper.get('#cart-customization-mode-custom').setValue(true)
    await flushPromises()

    expect(wrapper.get('.cart-editor-save').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.cart-edit-validation').text()).toContain(
      'Upload artwork before saving this custom card.',
    )
    expect(wrapper.find('.cart-customization-editor .remove-upload').exists()).toBe(false)
    expect(wrapper.get('.kedak-disabled-button-help').attributes('title')).toBe(
      'Upload artwork before saving this custom card.',
    )
  })

  it('asks before deleting and keeps the item when cancelled', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    store.addUncustomizedItem('Silver', 1)
    const router = createJourneyRouter()
    await router.push('/cart')
    await router.isReady()

    const wrapper = mount(JourneyView, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })

    await wrapper.get('[aria-label="Delete Silver item"]').trigger('click')

    expect(store.cartItemCount).toBe(1)
    expect(wrapper.get('[role="alertdialog"]').text()).toContain(
      'Remove this Silver card from your cart?',
    )

    await wrapper.get('.cart-delete-confirm .kedak-outline-action').trigger('click')

    expect(store.cartItemCount).toBe(1)
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('deletes an item after confirming and shows the empty cart state', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    store.addUncustomizedItem('Silver', 1)
    const router = createJourneyRouter()
    await router.push('/cart')
    await router.isReady()

    const wrapper = mount(JourneyView, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })

    await wrapper.get('[aria-label="Delete Silver item"]').trigger('click')
    await wrapper.get('[aria-label="Confirm delete Silver item"]').trigger('click')

    expect(store.cartItemCount).toBe(0)
    expect(wrapper.get('.cart-empty h2').text()).toBe('Your cart is empty.')
  })

  it('blocks checkout for an out-of-stock item and lets the customer switch its finish', async () => {
    const black = finishes.find((item) => item.name === 'Black')!
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    store.addToCart()
    black.inStock = false
    try {
      const router = createJourneyRouter()
      await router.push('/cart')
      await router.isReady()

      const wrapper = mount(JourneyView, {
        global: {
          plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
        },
      })

      expect(wrapper.get('.cart-stock-warning').text()).toContain('Black is out of stock.')
      expect(wrapper.get('.cart-summary [role="alert"]').text()).toContain('out of stock')
      expect(wrapper.get('.cart-checkout-button').attributes('disabled')).toBeDefined()

      const silver = wrapper
        .findAll('.cart-stock-option')
        .find((option) => option.text().includes('Silver'))!
      await silver.trigger('click')

      expect(store.cartItems[0]?.finish).toBe('Silver')
      expect(wrapper.find('.cart-stock-warning').exists()).toBe(false)
      expect(wrapper.get('.cart-checkout-button').attributes('disabled')).toBeUndefined()
    } finally {
      black.inStock = true
    }
  })

  it('updates the cart quantity and subtotal from the item controls', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    store.addUncustomizedItem('Silver', 1)
    const router = createJourneyRouter()
    await router.push('/cart')
    await router.isReady()

    const wrapper = mount(JourneyView, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })

    await wrapper.get('[aria-label="Increase Silver quantity"]').trigger('click')

    expect(store.cartItemCount).toBe(2)
    expect(store.cartSubtotal).toBe(258)
    expect(wrapper.get('.cart-quantity-row output').text()).toBe('2')
  })

  it('shows a clear error when checkout is opened with an uncustomized item', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useCardCustomizationStore().addUncustomizedItem('Black', 1)
    const router = createJourneyRouter()
    await router.push('/checkout')
    await router.isReady()

    const wrapper = mount(JourneyView, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Please customise every item in your cart before checkout.',
    )
    expect(wrapper.find('.checkout-form').exists()).toBe(false)
  })

  it('uses floating checkout labels and places an unpaid order (Stripe not connected yet)', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    store.addToCart()
    const router = createJourneyRouter()
    await router.push('/checkout')
    await router.isReady()

    const wrapper = mount(JourneyView, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })

    expect(wrapper.findAll('.checkout-float-label')).toHaveLength(8)
    expect(wrapper.findAll('.checkout-layout > *').map((child) => child.classes()[0])).toEqual([
      'checkout-details',
      'checkout-payment-column',
    ])
    expect(wrapper.get('.stripe-payment-placeholder').text()).toContain('Stripe')
    expect(wrapper.get('.stripe-payment-note').text()).toContain('No card details are collected')
    expect(wrapper.get('#checkout-email').attributes('placeholder')).toBe('name@example.com')
    expect(wrapper.get('#checkout-phone').attributes('type')).toBe('tel')
    expect(wrapper.find('#checkout-phone-country').exists()).toBe(true)

    wrapper.findComponent(Form).vm.$emit('submit', {
      valid: true,
      values: {
        email: 'alex@example.com',
        fullName: 'Alex Morgan',
        address: '24 Willow Lane',
        city: 'Birmingham',
        postcode: 'B1 1AA',
        country: 'United Kingdom',
        phoneCountry: 'GB',
        phone: '020 7946 0958',
        acknowledgement: true,
      },
    })
    await flushPromises()

    const orders = useOrdersStore()
    const order = orders.lastPlacedOrder
    expect(order).toMatchObject({
      email: 'alex@example.com',
      customerName: 'Alex Morgan',
      status: 'awaiting-card',
      payment: 'not-collected',
      total: 157,
    })
    expect(order?.lines[0]).toMatchObject({ finish: 'Black', quantity: 1, unitPrice: 149 })
    // The guest who placed it can manage it straight away; the cart is emptied.
    expect(orders.canAccess(order!, null)).toBe(true)
    expect(store.cartItems).toHaveLength(0)
    expect(router.currentRoute.value.path).toBe('/order/confirmed')
  })
})
