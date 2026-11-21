import { describe, expect, it } from 'vitest'
import { checkoutSchema } from './forms'
import { deliveryCountryOptions, phoneCountryOptions } from '../utils/phoneCountries'

const checkoutValues = {
  email: 'alex@example.com',
  fullName: 'Alex Morgan',
  address: '24 Willow Lane',
  city: 'Birmingham',
  postcode: 'B1 1AA',
  country: 'United Kingdom',
  phoneCountry: 'GB',
  phone: '020 7946 0958',
  acknowledgement: true,
}

describe('checkout form validation', () => {
  it('provides searchable international countries and calling codes', () => {
    expect(deliveryCountryOptions.length).toBeGreaterThan(200)
    expect(deliveryCountryOptions).toContainEqual({
      label: 'United States',
      value: 'United States',
    })
    expect(phoneCountryOptions).toContainEqual(
      expect.objectContaining({ code: 'US', callingCode: '1' }),
    )
  })

  it('accepts a valid national number for its selected calling code', () => {
    expect(checkoutSchema.safeParse(checkoutValues).success).toBe(true)
  })

  it('rejects a phone number that is not valid for the selected country', () => {
    const result = checkoutSchema.safeParse({
      ...checkoutValues,
      phone: '123',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('phone'))).toBe(true)
    }
  })

  it('accepts an international-format number regardless of the selected default region', () => {
    expect(
      checkoutSchema.safeParse({
        ...checkoutValues,
        phoneCountry: 'GB',
        phone: '+1 202 555 0123',
      }).success,
    ).toBe(true)
  })
})
