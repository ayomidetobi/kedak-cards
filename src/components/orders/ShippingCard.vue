<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import ActionButton from '../ActionButton.vue'
import { useBuyShippingLabel, useRefreshShipping } from '../../queries/shipping'
import { errorMessage } from '../../services/api/errors'
import type { OpsShipping, TrackingStatus } from '../../services/api/endpoints/shipping'
import type { Money } from '../../types/api'
import { formatMoney } from '../../utils/money'
import { formatOrderDate } from '../../utils/orderPolicy'

/**
 * Shipping on a production job: the carrier service the customer paid for, buying its label,
 * then the label and live tracking. Orders priced with the flat fee get a short how-to instead.
 */
const props = defineProps<{
  orderId: string
  shipping: OpsShipping | null
  /** What the customer paid for delivery. */
  charged: Money
}>()

const toast = useToast()
const buy = useBuyShippingLabel()
const refresh = useRefreshShipping()

async function checkStatus() {
  error.value = ''
  try {
    const shipping = await refresh.mutateAsync(props.orderId)
    toast.add({
      severity: 'success',
      summary: shipping.labelPending ? 'No label yet' : 'Shipping updated',
      life: 2400,
    })
  } catch (err) {
    error.value = errorMessage(err, 'The status couldn’t be checked.')
  }
}
const error = ref('')

const TRACKING: Record<TrackingStatus, { label: string; tone: string }> = {
  UNKNOWN: { label: 'Awaiting scan', tone: '' },
  PRE_TRANSIT: { label: 'Label created', tone: '' },
  TRANSIT: { label: 'In transit', tone: 'is-ok' },
  DELIVERED: { label: 'Delivered', tone: 'is-ok' },
  RETURNED: { label: 'Returned', tone: 'is-warn' },
  FAILURE: { label: 'Delivery problem', tone: 'is-warn' },
}
const tracking = computed(() => (props.shipping ? TRACKING[props.shipping.trackingStatus] : null))

async function buyLabel() {
  const shipping = props.shipping
  if (!shipping) return
  const cost = formatMoney(shipping.rate)
  const message = shipping.testMode
    ? `Buy a TEST label for ${shipping.carrier} ${shipping.service}? Test mode: nothing is charged.`
    : shipping.provider === 'packlink'
      ? `Create the ${shipping.carrier} ${shipping.service} shipment in Packlink PRO (about ${cost})? The label is issued once it's paid there.`
      : `Buy the ${shipping.carrier} ${shipping.service} label for about ${cost}? Your carrier account is charged.`
  if (!window.confirm(message)) return
  error.value = ''
  try {
    const result = await buy.mutateAsync(props.orderId)
    toast.add({
      severity: 'success',
      summary: result.labelPending ? 'Shipment created' : 'Label bought',
      detail: result.labelPending
        ? 'Pay for it in Packlink PRO to get the label.'
        : 'Tracking number added.',
      life: 3200,
    })
  } catch (err) {
    error.value = errorMessage(err, 'The label couldn’t be bought.')
  }
}
</script>

<template>
  <section class="info-card ops-shipping" aria-labelledby="ops-shipping-title">
    <div class="ops-delivery-head">
      <h2 id="ops-shipping-title">Shipping</h2>
      <span v-if="props.shipping?.testMode" class="settings-badge is-warn">Test mode</span>
    </div>

    <template v-if="props.shipping">
      <div class="summary-row">
        <span>Service</span>
        <strong>{{ props.shipping.carrier }} · {{ props.shipping.service }}</strong>
      </div>
      <div class="summary-row">
        <span>Customer paid</span><strong>{{ formatMoney(props.charged) }}</strong>
      </div>
      <div class="summary-row">
        <span>{{ props.shipping.hasLabel ? 'Label cost' : 'Carrier rate' }}</span>
        <strong>{{ formatMoney(props.shipping.labelCost ?? props.shipping.rate) }}</strong>
      </div>
      <div v-if="props.shipping.trackingNumber" class="summary-row">
        <span>Tracking</span>
        <strong class="ops-shipping-tracking">{{ props.shipping.trackingNumber }}</strong>
      </div>
      <div v-if="tracking && props.shipping.hasLabel" class="summary-row">
        <span>Status</span>
        <strong>
          <span class="settings-badge" :class="tracking.tone">{{ tracking.label }}</span>
        </strong>
      </div>
      <p v-if="props.shipping.trackingDetail" class="settings-note">
        <i class="pi pi-info-circle" aria-hidden="true"></i>
        <span>{{ props.shipping.trackingDetail }}</span>
      </p>

      <p v-if="error" class="upload-error" role="alert">
        <i class="pi pi-exclamation-circle" aria-hidden="true"></i><span>{{ error }}</span>
      </p>

      <p v-if="props.shipping.labelPending" class="settings-note">
        <i class="pi pi-clock" aria-hidden="true"></i>
        <span>
          Shipment created. Pay for it in Packlink PRO to get the label, then check the status here
          (it also updates automatically).
        </span>
      </p>
      <div v-if="props.shipping.hasLabel" class="ops-shipping-actions">
        <a
          v-if="props.shipping.labelUrl"
          :href="props.shipping.labelUrl"
          target="_blank"
          rel="noopener"
          class="p-button p-component kedak-action ops-shipping-print"
        >
          <i class="pi pi-print" aria-hidden="true"></i><span>Print label</span>
        </a>
        <a
          v-if="props.shipping.trackingUrl"
          :href="props.shipping.trackingUrl"
          target="_blank"
          rel="noopener"
          class="text-link text-link--forward"
        >
          <span class="text-link-label">Track parcel</span>
          <svg
            class="text-link-arrow"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </a>
      </div>
      <ActionButton
        v-if="props.shipping.hasLabel && props.shipping.trackingStatus !== 'DELIVERED'"
        kind="edit"
        compact
        icon="pi pi-refresh"
        label="Check status"
        :loading="refresh.isPending.value"
        @click="checkStatus"
      />
      <p v-if="props.shipping.labelPurchasedAt" class="settings-hint">
        Label bought {{ formatOrderDate(props.shipping.labelPurchasedAt) }}.
      </p>
      <Button
        v-else-if="props.shipping.canBuyLabel"
        class="kedak-action ops-shipping-buy"
        icon="pi pi-tag"
        label="Buy label"
        :loading="buy.isPending.value"
        @click="buyLabel"
      />
      <p v-else class="settings-hint">
        The label can be bought once the card is in the workshop, before dispatch.
      </p>
    </template>

    <p v-else class="settings-note">
      <i class="pi pi-info-circle" aria-hidden="true"></i>
      <span>
        This order used the flat delivery fee. Buy the label with the carrier, then add the tracking
        number when you dispatch.
      </span>
    </p>
  </section>
</template>
