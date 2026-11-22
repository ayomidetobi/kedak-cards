<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId } from 'vue'
import Button from 'primevue/button'
import RadioButton from 'primevue/radiobutton'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import { newIdempotencyKey, useCancelOrder, useRequestRefund } from '../../queries/orders'
import { ApiError, errorMessage } from '../../services/api/errors'
import type { CancelReason, Order, RefundReason } from '../../types/api'
import { formatMoney } from '../../utils/money'
import {
  CANCEL_REASONS,
  holdsOriginalCard,
  REASON_NEEDING_DETAILS,
  REFUND_REASONS,
  REFUND_WINDOW_DAYS,
  formatOrderDate,
} from '../../utils/orderPolicy'

// One panel for both flows: cancelling before conversion, or requesting a refund after delivery.
// The API decides eligibility and validates the request; this panel only collects the reason.
const props = defineProps<{ order: Order; kind: 'cancel' | 'refund' }>()
const emit = defineEmits<{ close: []; completed: [order: Order] }>()

const toast = useToast()
const id = useId()
const heading = ref<HTMLElement | null>(null)
const reason = ref('')
const details = ref('')
const error = ref('')
// One key per attempt: re-submitting after a network error can't cancel/refund twice.
const idempotencyKey = newIdempotencyKey()

const cancelMutation = useCancelOrder(() => props.order.id)
const refundMutation = useRequestRefund(() => props.order.id)
const submitting = computed(
  () => cancelMutation.isPending.value || refundMutation.isPending.value,
)

const isCancel = computed(() => props.kind === 'cancel')
const reasons = computed<readonly string[]>(() => (isCancel.value ? CANCEL_REASONS : REFUND_REASONS))
const needsDetails = computed(() => reason.value === REASON_NEEDING_DETAILS)
const noPayment = computed(() => props.order.payment.status === 'not-collected')

// Plain-language summary of what will happen, shown before the customer confirms.
const consequences = computed(() => {
  const amount = formatMoney(props.order.total)
  if (isCancel.value) {
    return [
      noPayment.value
        ? 'No payment has been taken for this order, so there’s nothing to refund.'
        : `You’ll get a full refund of ${amount} to your original payment method.`,
      holdsOriginalCard(props.order)
        ? 'We already have your original card. We’ll send it back to you with tracked delivery.'
        : 'Don’t send us your card. If it’s already in the post, we’ll return it when it arrives.',
      'Your design is discarded and the order can’t be restarted. You can place a new order any time.',
    ]
  }
  const deadline = props.order.refundDeadline
  return [
    'We’ll email return instructions and a prepaid label for your metal card.',
    `Once we’ve inspected it, we’ll refund up to ${amount} to your original payment method.`,
    deadline
      ? `Refund requests are open for ${REFUND_WINDOW_DAYS} days (3 weeks) after confirmed delivery — until ${formatOrderDate(deadline)}.`
      : `Refund requests are open for ${REFUND_WINDOW_DAYS} days (3 weeks) after confirmed delivery.`,
  ]
})

onMounted(() => {
  void nextTick(() => heading.value?.focus())
})

async function submit() {
  if (submitting.value) return
  error.value = ''
  if (!reason.value) {
    error.value = 'Choose a reason.'
    return
  }
  if (needsDetails.value && details.value.trim().length < 3) {
    error.value = 'Tell us a little more so we can help.'
    return
  }
  const input = { details: details.value.trim().slice(0, 500), idempotencyKey }
  try {
    const updated = isCancel.value
      ? await cancelMutation.mutateAsync({ ...input, reason: reason.value as CancelReason })
      : await refundMutation.mutateAsync({ ...input, reason: reason.value as RefundReason })
    toast.add({
      severity: 'success',
      summary: isCancel.value ? 'Order cancelled' : 'Refund requested',
      detail: isCancel.value
        ? `Order ${updated.id} has been cancelled.`
        : `We’ll email return instructions for order ${updated.id}.`,
      life: 3500,
    })
    emit('completed', updated)
  } catch (cause) {
    error.value =
      cause instanceof ApiError && cause.fieldErrors.length
        ? cause.fieldErrors[0]!.message
        : errorMessage(cause, 'Something went wrong. Please try again.')
  }
}
</script>

<template>
  <section class="info-card order-request" :aria-labelledby="`${id}-title`">
    <h2 :id="`${id}-title`" ref="heading" tabindex="-1">
      {{ isCancel ? 'Cancel this order?' : 'Request a refund' }}
    </h2>

    <ul class="order-request-consequences">
      <li v-for="line in consequences" :key="line">
        <i class="pi pi-info-circle" aria-hidden="true"></i>
        <span>{{ line }}</span>
      </li>
      <li>
        <i class="pi pi-file" aria-hidden="true"></i>
        <span>
          Read the full
          <RouterLink to="/policies/refunds">refund &amp; cancellation policy</RouterLink>.
        </span>
      </li>
    </ul>

    <fieldset class="order-request-reasons">
      <legend>{{ isCancel ? 'Why are you cancelling?' : 'What’s the problem?' }}</legend>
      <label
        v-for="(option, index) in reasons"
        :key="option"
        :for="`${id}-reason-${index}`"
        class="artwork-assignment-option"
        :class="{ 'is-active': reason === option }"
      >
        <RadioButton
          v-model="reason"
          :input-id="`${id}-reason-${index}`"
          :name="`${id}-reason`"
          :value="option"
        />
        <span>{{ option }}</span>
      </label>
    </fieldset>

    <div class="order-request-details">
      <label :for="`${id}-details`">
        {{ needsDetails ? 'Tell us more' : 'Anything else we should know? (optional)' }}
      </label>
      <Textarea
        :id="`${id}-details`"
        v-model="details"
        rows="3"
        maxlength="500"
        auto-resize
        :invalid="needsDetails && Boolean(error)"
      />
    </div>

    <p v-if="error" class="upload-error" role="alert">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      <span>{{ error }}</span>
    </p>

    <div class="cart-delete-confirm-actions order-request-actions">
      <Button
        size="small"
        class="kedak-outline-action"
        severity="secondary"
        outlined
        :label="isCancel ? 'Keep my order' : 'Go back'"
        @click="emit('close')"
      />
      <Button
        size="small"
        :class="isCancel ? 'cart-delete-confirm-button' : 'kedak-action'"
        :label="isCancel ? 'Cancel order' : 'Submit refund request'"
        :icon="isCancel ? 'pi pi-times' : 'pi pi-send'"
        :loading="submitting"
        @click="submit"
      />
    </div>
  </section>
</template>
