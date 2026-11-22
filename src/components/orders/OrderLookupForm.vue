<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import { useLookupOrder } from '../../queries/orders'
import { ApiError, errorMessage } from '../../services/api/errors'
import type { Order } from '../../types/api'

const props = withDefaults(defineProps<{ initialReference?: string }>(), { initialReference: '' })
const emit = defineEmits<{ found: [order: Order] }>()

// POST /orders/lookup: reference + checkout email → the order and a guest access token
// (kept in memory only; see services/api/orderAccess.ts).
const lookup = useLookupOrder()
const reference = ref(props.initialReference)
const email = ref('')
const error = ref('')

async function submit() {
  if (lookup.isPending.value) return
  error.value = ''
  if (!reference.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    error.value = 'Enter your order reference and the email address you used at checkout.'
    return
  }
  try {
    const order = await lookup.mutateAsync({ reference: reference.value, email: email.value })
    emit('found', order)
  } catch (cause) {
    // The API answers the same 404 whether the reference or the email is wrong.
    error.value =
      cause instanceof ApiError && cause.status === 404
        ? 'We couldn’t find an order with those details. Check the reference in your confirmation email.'
        : errorMessage(cause, 'We couldn’t look up your order. Please try again.')
  }
}
</script>

<template>
  <form class="order-lookup-form" novalidate @submit.prevent="submit">
    <FloatLabel class="auth-float-label" variant="in">
      <InputText
        id="lookup-reference"
        v-model="reference"
        autocomplete="off"
        autocapitalize="characters"
        :invalid="Boolean(error)"
      />
      <label for="lookup-reference">Order reference (e.g. KD-2051)</label>
    </FloatLabel>
    <FloatLabel class="auth-float-label" variant="in">
      <InputText
        id="lookup-email"
        v-model="email"
        type="email"
        autocomplete="email"
        :invalid="Boolean(error)"
      />
      <label for="lookup-email">Email used at checkout</label>
    </FloatLabel>
    <p v-if="error" class="upload-error" role="alert">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      <span>{{ error }}</span>
    </p>
    <Button
      type="submit"
      class="kedak-action auth-submit"
      label="Find my order"
      icon="pi pi-search"
      :loading="lookup.isPending.value"
      :disabled="lookup.isPending.value"
    />
  </form>
</template>
