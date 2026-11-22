import MockAdapter from 'axios-mock-adapter'
import { api } from '../services/api/client'
import type {
  ArtworkCategorySummary,
  CartItemInput,
  CartValidationResult,
  Finish,
  Order,
  User,
} from '../types/api'
import type { CardCategory, CardDesign } from '../types/card'

/**
 * Test doubles for the Django API, attached to the real shared Axios instance so interceptors
 * (CSRF, refresh, error normalisation) run exactly as in the browser. Fixture shapes follow
 * the OpenAPI contract.
 */
export function mockApi() {
  const mock = new MockAdapter(api, { onNoMatch: 'throwException' })
  mock.onGet('/auth/csrf').reply(200, { csrfToken: 'csrf-test-token' })
  return mock
}

export const finishesFixture: Finish[] = [
  { name: 'Silver', price: { amount: 12900, currency: 'GBP' }, inStock: true },
  { name: 'Black', price: { amount: 14900, currency: 'GBP' }, inStock: true },
  { name: 'Gold', price: { amount: 17900, currency: 'GBP' }, inStock: true },
  { name: 'Signature', price: { amount: 21900, currency: 'GBP' }, inStock: false },
]

const CATEGORIES: CardCategory[] = ['Sport', 'Cars', 'Anime', 'Love', 'Nature']

export const categoriesFixture: ArtworkCategorySummary[] = CATEGORIES.map((name) => ({
  name,
  designCount: 10,
}))

export function designsFixture(category: CardCategory): CardDesign[] {
  const slug = category.toLowerCase()
  return Array.from({ length: 10 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0')
    return {
      id: `${slug}-${number}`,
      name: `${category} Design ${number}`,
      category,
      number,
      artworkUrl: `https://res.cloudinary.test/kedak/artwork/${slug}/${number}.svg`,
    }
  })
}

export const userFixture: User = {
  id: 'usr_1',
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  provider: 'email',
}

/** Catalogue + artwork endpoints most pages need. */
export function mockCatalogue(mock: MockAdapter, finishes: Finish[] = finishesFixture) {
  mock.onGet('/finishes').reply(200, { data: finishes })
  mock.onGet('/artwork/categories').reply(200, { data: categoriesFixture })
  mock.onGet('/artwork').reply((config) => {
    const category = (config.params?.category ?? 'Sport') as CardCategory
    return [200, { data: designsFixture(category) }]
  })
  mock.onGet(/\/artwork\/[a-z]+-\d{2}$/).reply((config) => {
    const designId = config.url!.split('/').pop()!
    const [slug] = designId.split('-')
    const category = CATEGORIES.find((name) => name.toLowerCase() === slug)!
    const design = designsFixture(category).find((item) => item.id === designId)
    return design ? [200, design] : [404, { status: 404, code: 'design_not_found', title: 'x', type: 'x' }]
  })
}

/** A server-side cart quote computed from the fixtures (mirrors apps/cart/services.py). */
export function quoteCart(items: CartItemInput[], finishes: Finish[] = finishesFixture) {
  const quoted = items.map((item, index) => {
    const finish = finishes.find((candidate) => candidate.name === item.finish)!
    const issues: CartValidationResult['items'][number]['issues'] = []
    if (!item.customization) {
      issues.push({ code: 'not_customised', message: 'Customise this card before checkout.' })
    }
    if (!finish.inStock) {
      issues.push({
        code: 'finish_out_of_stock',
        message: `${item.finish} is out of stock. Switch to another finish or remove this item.`,
      })
    }
    return {
      index,
      finish: item.finish,
      quantity: item.quantity,
      unitPrice: finish.price,
      issues,
    }
  })
  const subtotal = quoted.reduce((sum, item) => sum + item.unitPrice.amount * item.quantity, 0)
  const result: CartValidationResult = {
    canCheckout: quoted.every((item) => item.issues.length === 0),
    subtotal: { amount: subtotal, currency: 'GBP' },
    delivery: { amount: 800, currency: 'GBP' },
    total: { amount: subtotal + 800, currency: 'GBP' },
    items: quoted,
  }
  return result
}

export function mockCartValidation(mock: MockAdapter, finishes: Finish[] = finishesFixture) {
  mock.onPost('/cart/validate').reply((config) => {
    const body = JSON.parse(config.data) as { items: CartItemInput[] }
    return [200, quoteCart(body.items, finishes)]
  })
}

export function orderFixture(overrides: Partial<Order> = {}): Order {
  return {
    id: 'KD-2051',
    email: 'alex.morgan@example.com',
    customerName: 'Alex Morgan',
    placedAt: '2026-11-19T10:12:00Z',
    deliveredAt: null,
    refundDeadline: null,
    status: 'awaiting-card',
    lines: [
      {
        finish: 'Gold',
        quantity: 1,
        unitPrice: { amount: 17900, currency: 'GBP' },
        holderName: 'ALEX MORGAN',
        designName: 'Championship Trophy',
        customization: null,
      },
    ],
    subtotal: { amount: 17900, currency: 'GBP' },
    delivery: { amount: 800, currency: 'GBP' },
    total: { amount: 18700, currency: 'GBP' },
    payment: { status: 'not-collected', provider: null },
    ...overrides,
  }
}

export function problem(status: number, code: string, detail = '', errors?: unknown[]) {
  return {
    type: `https://api.example.com/problems/${code}`,
    title: 'Problem',
    status,
    code,
    ...(detail ? { detail } : {}),
    ...(errors ? { errors } : {}),
  }
}
