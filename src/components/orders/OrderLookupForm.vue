<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import { PREVIEW_ORDER_EMAIL, useOrdersStore } from '../../stores/orders'
import type { Order } from '../../types/order'

const props = withDefaults(defineProps<{ initialReference?: string }>(), { initialReference: '' })
const emit = defineEmits<{ found: [order: Order] }>()

const orders = useOrdersStore()
const reference = ref(props.initialReference)
const email = ref('')
const error = ref('')

function submit() {
  error.value = ''
  if (!reference.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    error.value = 'Enter your order reference and the email address you used at checkout.'
    return
  }
  const order = orders.findOrder(reference.value, email.value)
  if (!order) {
    // Same message whether the reference or the email is wrong, so orders can't be probed.
    error.value =
      'We couldn’t find an order with those details. Check the reference in your confirmation email.'
    return
  }
  orders.grantAccess(order.id)
  emit('found', order)
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
    />
    <p class="muted-copy order-lookup-preview">
      Preview: try <strong>KD-2051</strong>, <strong>KD-2048</strong> or
      <strong>KD-1987</strong> with {{ PREVIEW_ORDER_EMAIL }}.
    </p>
  </form>
</template>
