import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import PolicyView from './PolicyView.vue'
import { refundPolicy } from '../data/policies'
import { REFUND_WINDOW_DAYS } from '../utils/orderPolicy'

async function mountPolicy(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/policies/refunds', name: 'refund-policy', component: PolicyView },
      { path: '/policies/privacy', name: 'privacy-policy', component: PolicyView },
    ],
  })
  await router.push(path)
  await router.isReady()
  return mount(PolicyView, { global: { plugins: [router] } })
}

describe('policy pages', () => {
  it('publishes the same 3-week refund window the order flow enforces', async () => {
    expect(REFUND_WINDOW_DAYS).toBe(21)
    const text = JSON.stringify(refundPolicy)
    expect(text).toContain('21 days (3 weeks)')
    expect(text).toContain(
      'can’t accept refund requests more than 21 days after confirmed delivery',
    )

    const wrapper = await mountPolicy('/policies/refunds')
    expect(wrapper.get('h1').text()).toBe('Refund & cancellation policy')
    expect(wrapper.text()).toContain('confirmed delivery')
    expect(wrapper.get('[aria-current="page"]').text()).toBe('Refund & cancellation')
  })

  it('renders the privacy policy, including what we never collect', async () => {
    const wrapper = await mountPolicy('/policies/privacy')
    expect(wrapper.get('h1').text()).toBe('Privacy policy')
    expect(wrapper.get('#what-we-never-collect').text()).toContain('PIN, CVV')
    expect(wrapper.findAll('.policy-toc a').length).toBeGreaterThan(5)
  })
})
