import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { describe, expect, it } from 'vitest'
import {
  AccountSkeleton,
  CartSkeleton,
  CheckoutSkeleton,
  CollectionsSkeleton,
  HomeSkeleton,
  OrderTrackingSkeleton,
  PageSkeleton,
  ProductDetailsSkeleton,
  skeletonForRoute,
} from '.'

const pageSkeletons = {
  AccountSkeleton,
  CartSkeleton,
  CheckoutSkeleton,
  CollectionsSkeleton,
  HomeSkeleton,
  OrderTrackingSkeleton,
  PageSkeleton,
  ProductDetailsSkeleton,
}

describe('skeleton loaders', () => {
  it('maps routes to their page skeleton and falls back to the generic one', () => {
    expect(skeletonForRoute('cart')).toBe(CartSkeleton)
    expect(skeletonForRoute('customise')).toBe(CollectionsSkeleton)
    expect(skeletonForRoute('tracking')).toBe(OrderTrackingSkeleton)
    expect(skeletonForRoute('help')).toBe(PageSkeleton)
    expect(skeletonForRoute(undefined)).toBe(PageSkeleton)
  })

  it.each(Object.entries(pageSkeletons))(
    '%s announces loading once and hides its placeholder shapes',
    (_name, component) => {
      const wrapper = mount(component, {
        global: { plugins: [[PrimeVue, { theme: { preset: Aura } }]] },
      })

      const status = wrapper.get('[role="status"]')
      expect(status.attributes('aria-busy')).toBe('true')
      expect(status.text()).toMatch(/Loading.*…/)
      expect(wrapper.get('.skeleton-screen-body').attributes('aria-hidden')).toBe('true')
      expect(wrapper.findAll('.p-skeleton').length).toBeGreaterThan(3)
    },
  )
})
