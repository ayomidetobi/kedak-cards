import { onMounted, ref, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirmPayment } from '../queries/payments'
import { restoreAfterPaymentRedirect } from '../services/api/paymentHandoff'

export type PaymentReturnState = 'idle' | 'confirming' | 'paid' | 'pending' | 'cancelled'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Handles `?payment=return|cancelled` when the customer comes back from Stripe/Paystack:
 * restores a guest's order token (carried across the redirect), then asks the API to confirm
 * with the provider server-side, retrying briefly while the webhook lands. The URL is cleaned
 * so a reload doesn't repeat the flow.
 */
export function usePaymentReturn(orderId: Ref<string>) {
  const route = useRoute()
  const router = useRouter()
  const confirm = useConfirmPayment()
  const state = ref<PaymentReturnState>('idle')
  const mode = typeof route.query.payment === 'string' ? route.query.payment : ''

  if (mode && orderId.value) restoreAfterPaymentRedirect(orderId.value)

  async function confirmWithProvider() {
    state.value = 'confirming'
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const order = await confirm.mutateAsync(orderId.value)
        if (order.payment.status === 'paid') {
          state.value = 'paid'
          return
        }
      } catch {
        // No access (token lost) or provider unreachable: fall through to "pending".
      }
      await wait(2500)
    }
    state.value = 'pending'
  }

  onMounted(() => {
    if (!mode || !orderId.value) return
    const { payment: _payment, ...rest } = route.query
    void router.replace({ query: rest })
    if (mode === 'cancelled') state.value = 'cancelled'
    else void confirmWithProvider()
  })

  return { state, retry: confirmWithProvider }
}
