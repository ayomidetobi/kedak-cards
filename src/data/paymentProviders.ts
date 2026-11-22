/**
 * Presentation copy for the payment options at checkout. Which providers are actually
 * available (and what they charge) comes from the API: GET /payments/providers lists only the
 * providers whose credentials are configured on the server.
 */
export type PaymentProviderId = 'stripe' | 'paystack'

export interface PaymentProvider {
  id: PaymentProviderId
  name: string
  tagline: string
  methods: Array<{ icon: string; label: string }>
  /** What happens after the customer continues to pay. */
  flow: string
  /** Who this option suits best. */
  hint: string
}

export const paymentProviders: readonly PaymentProvider[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    tagline: 'Card, Apple Pay or Google Pay',
    methods: [
      { icon: 'pi pi-credit-card', label: 'Visa, Mastercard, Amex' },
      { icon: 'pi pi-apple', label: 'Apple Pay' },
      { icon: 'pi pi-google', label: 'Google Pay' },
    ],
    flow: 'You’ll finish paying on Stripe’s secure checkout page, then come back here.',
    hint: 'Best for UK, EU and international cards.',
  },
  {
    id: 'paystack',
    name: 'Paystack',
    tagline: 'Card, bank transfer or USSD',
    methods: [
      { icon: 'pi pi-credit-card', label: 'Verve, Visa, Mastercard' },
      { icon: 'pi pi-building-columns', label: 'Bank transfer' },
      { icon: 'pi pi-mobile', label: 'USSD' },
    ],
    flow: 'You’ll finish paying on Paystack’s secure checkout page, then come back here.',
    hint: 'Best for cards and banks in Nigeria, Ghana, Kenya and South Africa.',
  },
]
