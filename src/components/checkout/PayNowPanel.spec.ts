import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import PayNowPanel from './PayNowPanel.vue'
import type { Order } from '../../types/api'

vi.mock('../../queries/payments', () => ({
  usePaymentProviders: () => ({ data: ref([]), isPending: ref(true) }),
  useStartPayment: () => ({ mutate: vi.fn(), isPending: ref(false), error: ref(null) }),
}))

const order = {
  id: 'KD-2051',
  total: { amount: 15700, currency: 'USD' },
} as unknown as Order

describe('PayNowPanel', () => {
  it('promises to keep the unpaid order for 30 days with a reminder', () => {
    const wrapper = mount(PayNowPanel, {
      props: { order },
      global: { plugins: [PrimeVue], stubs: { PaymentMethodPicker: true } },
    })
    const copy = wrapper.get('.muted-copy').text()
    expect(copy).toContain('we’ll keep your order for 30 days and send you a reminder')
    expect(copy).not.toContain('24 hours')
    expect(copy).not.toContain('cancelled')
  })
})
