import { computed } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { toCartItemInput, validateCart } from '../services/api/endpoints/cart'
import { isCartItemCustomized, useCardCustomizationStore } from '../stores/cardCustomization'
import type { CartIssue, CartValidationItem } from '../types/api'
import { queryKeys } from './query-keys'

/**
 * Server pricing and checkout readiness for the browser cart (POST /cart/validate).
 *
 * The request is a pure quote, so it is cached as a query keyed by the cart contents: any
 * change to items, finishes, quantities or artwork re-validates. Checkout is allowed only when
 * the latest server answer (not a placeholder from a previous cart) says `canCheckout`.
 */
export function useCartValidation() {
  const store = useCardCustomizationStore()
  const payload = computed(() => store.cartItems.map(toCartItemInput))

  const query = useQuery({
    queryKey: computed(() => queryKeys.cart.validation(payload.value)),
    queryFn: ({ signal }) => validateCart(payload.value, signal),
    enabled: computed(() => payload.value.length > 0),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const result = computed(() => (payload.value.length ? (query.data.value ?? null) : null))
  /** Results line up with the request by index; only trust them once they're current. */
  const isCurrent = computed(
    () => result.value !== null && !query.isPlaceholderData.value && !query.isFetching.value,
  )

  const itemResults = computed(() => {
    const map = new Map<string, CartValidationItem>()
    const items = result.value?.items ?? []
    store.cartItems.forEach((item, index) => {
      const quoted = items.find((entry) => entry.index === index)
      if (quoted && quoted.finish === item.finish && quoted.quantity === item.quantity) {
        map.set(item.id, quoted)
      }
    })
    return map
  })

  function issuesFor(itemId: string): CartIssue[] {
    return itemResults.value.get(itemId)?.issues ?? []
  }

  function hasIssue(itemId: string, code: CartIssue['code']) {
    return issuesFor(itemId).some((issue) => issue.code === code)
  }

  function lineTotal(itemId: string) {
    const quoted = itemResults.value.get(itemId)
    return quoted ? { amount: quoted.unitPrice.amount * quoted.quantity, currency: 'GBP' as const } : null
  }

  const canCheckout = computed(
    () =>
      store.cartItems.length > 0 &&
      store.allItemsCustomized &&
      isCurrent.value &&
      result.value!.canCheckout,
  )

  /** Plain-language reasons checkout is blocked, from the server's issues where available. */
  const blockingMessages = computed(() => {
    if (!store.cartItems.length) return ['Your cart is empty. Add a card before checkout.']
    const messages = new Set<string>()
    if (store.cartItems.some((item) => !isCartItemCustomized(item))) {
      messages.add(
        'Please customise every item in your cart before checkout. Edit any item marked “Not customised”.',
      )
    }
    if (result.value && !query.isPlaceholderData.value) {
      for (const item of result.value.items) {
        for (const issue of item.issues) {
          if (issue.code === 'finish_out_of_stock') {
            messages.add(
              'Some items are out of stock. Switch them to another finish or remove them before checkout.',
            )
          } else if (issue.code !== 'not_customised') {
            messages.add(issue.message)
          }
        }
      }
    }
    return [...messages]
  })

  return {
    query,
    result,
    isValidating: computed(() => query.isFetching.value),
    isCurrent,
    error: computed(() => query.error.value),
    subtotal: computed(() => result.value?.subtotal ?? null),
    delivery: computed(() => result.value?.delivery ?? null),
    total: computed(() => result.value?.total ?? null),
    itemResult: (itemId: string) => itemResults.value.get(itemId) ?? null,
    issuesFor,
    hasIssue,
    lineTotal,
    canCheckout,
    blockingMessages,
    retry: () => query.refetch(),
  }
}
