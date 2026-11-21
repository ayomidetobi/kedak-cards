import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import CardCustomizer from './CardCustomizer.vue'
import { useCardCustomizationStore } from '../../stores/cardCustomization'

describe('CardCustomizer', () => {
  it('adds the selected design and quantity to the cart', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/customise', component: { template: '<div />' } },
        { path: '/cart', component: { template: '<div />' } },
      ],
    })
    await router.push('/customise')
    await router.isReady()
    const store = useCardCustomizationStore()
    store.setFinish('Gold')

    const wrapper = mount(CardCustomizer, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
        stubs: {
          CardPreview: true,
          CardholderNameInput: true,
          DesignCategoryTabs: true,
          DesignGallery: true,
          DesignUpload: true,
        },
      },
    })

    expect(store.customizationMode).toBe('preset')
    expect(wrapper.find('design-gallery-stub').exists()).toBe(true)
    expect(wrapper.find('design-upload-stub').exists()).toBe(false)
    expect(wrapper.findAll('.customizer-grid > *').map((child) => child.classes()[0])).toEqual([
      'customization-mode-choice',
      'preview-column',
      'controls-column',
    ])
    const controlsChildren = Array.from(wrapper.get('.controls-column').element.children)
    const designOptionsIndex = controlsChildren.findIndex((child) =>
      child.classList.contains('design-choice'),
    )
    const cardholderNameIndex = controlsChildren.findIndex((child) =>
      child.matches('cardholder-name-input-stub'),
    )
    expect(designOptionsIndex).toBeLessThan(cardholderNameIndex)

    await wrapper.get('[aria-label="Increase card quantity"]').trigger('click')
    await wrapper.get('.customizer-add-to-cart').trigger('click')
    await flushPromises()

    expect(store.cartItems[0]?.customization?.finish).toBe('Gold')
    expect(store.cartItems[0]?.quantity).toBe(2)
    expect(store.cartSubtotal).toBe(358)
    expect(router.currentRoute.value.path).toBe('/cart')
  })

  it('prevents adding to cart when per-card artwork count does not match quantity', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/customise', component: { template: '<div />' } }],
    })
    await router.push('/customise')
    await router.isReady()
    const store = useCardCustomizationStore()
    store.setCustomizationMode('custom')
    store.setCartQuantity(2)
    store.setArtworkAssignment('per-card')
    store.setUploadedArtworks([{ name: 'one.png', size: 1, type: 'image/png', url: 'blob:one' }])

    const wrapper = mount(CardCustomizer, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
        stubs: {
          CardPreview: true,
          CardholderNameInput: true,
          DesignCategoryTabs: true,
          DesignGallery: true,
          DesignUpload: true,
        },
      },
    })

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Choose exactly 2 images, one for each card.',
    )
    expect(wrapper.get('.customizer-add-to-cart').attributes('disabled')).toBeDefined()
  })

  it('switches between the pre-designed and custom artwork workflows', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/customise', component: { template: '<div />' } }],
    })
    await router.push('/customise')
    await router.isReady()
    const store = useCardCustomizationStore()

    const wrapper = mount(CardCustomizer, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
        stubs: {
          CardPreview: true,
          CardholderNameInput: true,
          DesignCategoryTabs: true,
          DesignGallery: true,
          DesignUpload: true,
        },
      },
    })

    await wrapper.get('#customization-mode-custom').setValue(true)
    await flushPromises()

    expect(store.customizationMode).toBe('custom')
    expect(wrapper.find('design-gallery-stub').exists()).toBe(false)
    expect(wrapper.find('design-upload-stub').exists()).toBe(true)

    await wrapper.get('#customization-mode-preset').setValue(true)
    await flushPromises()

    expect(store.customizationMode).toBe('preset')
    expect(wrapper.find('design-gallery-stub').exists()).toBe(true)
    expect(wrapper.find('design-upload-stub').exists()).toBe(false)
  })

  it('updates an existing quick-added item when it is customised', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCardCustomizationStore()
    const itemId = store.addUncustomizedItem('Gold', 2)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/customise', component: { template: '<div />' } },
        { path: '/cart', component: { template: '<div />' } },
      ],
    })
    await router.push({ path: '/customise', query: { edit: itemId } })
    await router.isReady()

    const wrapper = mount(CardCustomizer, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
        stubs: {
          CardPreview: true,
          CardholderNameInput: true,
          DesignCategoryTabs: true,
          DesignGallery: true,
          DesignUpload: true,
        },
      },
    })

    expect(store.editingCartItemId).toBe(itemId)
    expect(store.cartQuantity).toBe(2)
    expect(store.cartItems[0]?.customization).toBeNull()

    await wrapper.get('.customizer-add-to-cart').trigger('click')
    await flushPromises()

    expect(store.cartItems).toHaveLength(1)
    expect(store.cartItems[0]?.id).toBe(itemId)
    expect(store.cartItems[0]?.customization?.finish).toBe('Gold')
    expect(store.cartItems[0]?.quantity).toBe(2)
    expect(store.canCheckout).toBe(true)
  })
})
