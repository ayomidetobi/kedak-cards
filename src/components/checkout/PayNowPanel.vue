<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import PaymentMethodPicker from './PaymentMethodPicker.vue'
import type { PaymentProviderId } from '../../data/paymentProviders'
import { usePaymentProviders, useStartPayment } from '../../queries/payments'
import { errorMessage } from '../../services/api/errors'
import type { Order } from '../../types/api'
import { formatMoney } from '../../utils/money'

/**
 * "Complete your payment" for an unpaid order (after a cancelled or failed attempt, or when the
 * redirect at checkout didn't happen). Shown only while the order can still be paid.
 */
const props = defineProps<{ order: Order }>()

const provider = ref<PaymentProviderId | null>(null)
const providersQuery = usePaymentProviders(() => props.order.total.amount)
const available = computed(() => providersQuery.data.value ?? [])
const start = useStartPayment()
const chosen = computed(() => available.value.find((item) => item.id === provider.value) ?? null)

function pay() {
  if (!chosen.value || start.isPending.value) return
  start.mutate({ orderId: props.order.id, provider: chosen.value.id })
}
</script>

<template>
  <section
    v-if="providersQuery.isPending.value || available.length"
    class="info-card pay-now-panel"
    aria-labelledby="pay-now-title"
  >
    <h2 id="pay-now-title">Complete your payment</h2>
    <p class="muted-copy">
      This order hasn’t been paid yet. Pay {{ formatMoney(order.total) }} to confirm it; unpaid
      orders are cancelled automatically after 24 hours.
    </p>
    <PaymentMethodPicker
      v-model="provider"
      :available="available"
      :loading="providersQuery.isPending.value"
    />
    <p v-if="start.error.value" class="upload-error" role="alert">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      <span>{{ errorMessage(start.error.value, 'We couldn’t start the payment.') }}</span>
    </p>
    <Button
      class="kedak-action checkout-submit"
      :label="chosen ? `Pay with ${chosen.name}` : 'Pay now'"
      icon="pi pi-lock"
      :loading="start.isPending.value"
      :disabled="!chosen || start.isPending.value"
      @click="pay"
    />
  </section>
</template>
