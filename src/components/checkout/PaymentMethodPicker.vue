<script setup lang="ts">
import { computed, useId, watch } from 'vue'
import { paymentProviders, type PaymentProviderId } from '../../data/paymentProviders'
import type { AvailablePaymentProvider } from '../../services/api/endpoints/payments'
import { formatCharged } from '../../utils/money'

/**
 * Payment method choice (Stripe or Paystack) as two compact radio cards. Only providers the
 * API lists (GET /payments/providers) can be chosen; the selected card shows the server's
 * estimate in the currency that provider charges.
 */
const model = defineModel<PaymentProviderId | null>({ required: true })
const props = defineProps<{
  available: AvailablePaymentProvider[]
  loading?: boolean
}>()

const groupId = useId()
const options = computed(() => {
  const live = new Map(props.available.map((provider) => [provider.id, provider]))
  return paymentProviders.map((provider) => ({ ...provider, live: live.get(provider.id) ?? null }))
})
const selected = computed(() => options.value.find((option) => option.id === model.value) ?? null)

// Default to the first available provider; drop a choice that is no longer offered.
watch(
  () => props.available,
  (available) => {
    if (!available.some((provider) => provider.id === model.value)) {
      model.value = (available[0]?.id as PaymentProviderId | undefined) ?? null
    }
  },
  { immediate: true },
)
</script>

<template>
  <fieldset class="payment-picker" :aria-busy="loading">
    <legend class="visually-hidden">Choose how to pay</legend>
    <div class="payment-options">
      <label
        v-for="option in options"
        :key="option.id"
        class="payment-option"
        :class="{ 'is-active': model === option.id, 'is-unavailable': !option.live }"
      >
        <input
          v-model="model"
          type="radio"
          class="visually-hidden"
          :name="`${groupId}-provider`"
          :value="option.id"
          :disabled="!option.live"
        />
        <span class="payment-option-radio" aria-hidden="true"></span>
        <span class="payment-option-copy">
          <strong>{{ option.name }}</strong>
          <small>{{ option.tagline }}</small>
        </span>
        <span class="payment-option-amount">
          <template v-if="option.live?.estimate">
            ≈ {{ formatCharged(option.live.estimate) }}
          </template>
          <template v-else-if="option.live">{{ option.live.currency }}</template>
          <template v-else-if="!loading">Unavailable</template>
        </span>
      </label>
    </div>
    <p v-if="selected?.live" class="payment-flow" aria-live="polite">
      <i class="pi pi-lock" aria-hidden="true"></i>
      <span>You’ll pay on {{ selected.name }}’s secure page. The final amount is set there.</span>
    </p>
    <p v-else-if="!loading && !available.length" class="payment-flow">
      <i class="pi pi-info-circle" aria-hidden="true"></i>
      <span>Online payment isn’t available right now. Placing your order doesn’t charge you.</span>
    </p>
  </fieldset>
</template>
