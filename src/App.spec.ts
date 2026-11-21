import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import { useCardCustomizationStore } from './stores/cardCustomization'

describe('App', () => {
  it('renders the shared navigation and routed home page', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useCardCustomizationStore().addUncustomizedItem('Gold', 2)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: HomeView },
        { path: '/:pathMatch(.*)*', component: HomeView },
      ],
    })
    await router.push('/')

    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router, [PrimeVue, { theme: { preset: Aura } }], ToastService],
      },
    })

    expect(wrapper.get('.brand').text()).toBe('Kedak Card')
    expect(wrapper.get('h1').text()).toContain('Same card.')
    expect(wrapper.get('.cart-count').text()).toBe('2')
    expect(wrapper.get('.floating-cart-link').attributes('aria-label')).toBe(
      'Open cart preview, 2 items',
    )
    expect(wrapper.get('.floating-cart-link').element.tagName).toBe('BUTTON')
    expect(wrapper.get('.floating-cart-link').attributes('href')).toBeUndefined()

    await router.push('/cart')
    await flushPromises()
    expect(wrapper.find('.floating-cart-link').exists()).toBe(true)
  })
})
