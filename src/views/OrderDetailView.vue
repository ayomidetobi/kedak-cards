<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import TextLink from '../components/TextLink.vue'
import OrderLookupForm from '../components/orders/OrderLookupForm.vue'
import OrderRequestPanel from '../components/orders/OrderRequestPanel.vue'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.vue'
import OrderTimeline from '../components/orders/OrderTimeline.vue'
import { useAuthStore } from '../stores/auth'
import { useOrdersStore } from '../stores/orders'
import type { Order } from '../types/order'
import {
  cancellationEligibility,
  formatOrderDate,
  refundDeadline,
  refundEligibility,
} from '../utils/orderPolicy'
import { orderStatusMeta } from '../utils/orderStatus'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const orders = useOrdersStore()

const orderId = computed(() => String(route.params.id ?? ''))
const order = computed(() => orders.getOrder(orderId.value))
// Registered customers see orders placed with their email; guests unlock them by reference + email.
const hasAccess = computed(
  () => order.value !== null && orders.canAccess(order.value, auth.user?.email),
)
const meta = computed(() => (order.value ? orderStatusMeta[order.value.status] : null))
const cancellation = computed(() => (order.value ? cancellationEligibility(order.value) : null))
const refund = computed(() => (order.value ? refundEligibility(order.value) : null))
const deadline = computed(() => (order.value ? refundDeadline(order.value) : null))

const openPanel = ref<'cancel' | 'refund' | null>(null)
watch(orderId, () => {
  openPanel.value = null
})

function onFound(found: Order) {
  if (found.id !== orderId.value) void router.replace(`/account/orders/${found.id}`)
}

function onCompleted() {
  openPanel.value = null
}
</script>

<template>
  <main class="journey-main order-main">
    <TextLink :to="auth.isSignedIn ? '/account' : '/'" direction="back">
      {{ auth.isSignedIn ? 'Back to my account' : 'Back to home' }}
    </TextLink>

    <!-- Guests (or a wrong link): verify with reference + email before showing anything. -->
    <section v-if="!order || !hasAccess" class="order-locked">
      <header class="checkout-header">
        <p class="eyebrow">ORDER {{ orderId || 'LOOKUP' }}</p>
        <h1 class="page-title">Find your order.</h1>
        <p class="intro-copy">
          Enter your order reference and the email you used at checkout to view, cancel or request a
          refund.
        </p>
      </header>
      <div class="info-card order-lookup-card">
        <OrderLookupForm :initial-reference="orderId" @found="onFound" />
      </div>
    </section>

    <template v-else-if="order && meta">
      <header class="order-header">
        <div>
          <p class="eyebrow">ORDER {{ order.id }} · PLACED {{ formatOrderDate(order.placedAt) }}</p>
          <h1 class="page-title">{{ meta.headline }}</h1>
          <p class="intro-copy">{{ meta.description }}</p>
        </div>
        <OrderStatusBadge :status="order.status" />
      </header>

      <div class="order-layout">
        <div class="order-primary">
          <section class="info-card account-timeline" aria-labelledby="order-progress-title">
            <h2 id="order-progress-title">
              {{
                order.status === 'cancelled'
                  ? 'Cancellation'
                  : order.status === 'refund-requested' || order.status === 'refunded'
                    ? 'Refund progress'
                    : 'Order progress'
              }}
            </h2>
            <OrderTimeline :order="order" />
          </section>

          <section
            v-if="order.cancellation || order.refund"
            class="notice-card order-resolution"
            aria-labelledby="order-resolution-title"
          >
            <h2 id="order-resolution-title">
              {{ order.cancellation ? 'Why it was cancelled' : 'Your refund request' }}
            </h2>
            <p><strong>Reason:</strong> {{ order.cancellation?.reason ?? order.refund?.reason }}</p>
            <p v-if="order.cancellation?.details || order.refund?.details">
              “{{ order.cancellation?.details || order.refund?.details }}”
            </p>
          </section>

          <section class="info-card order-items" aria-labelledby="order-items-title">
            <h2 id="order-items-title">Items</h2>
            <ul>
              <li v-for="(line, index) in order.lines" :key="index">
                <span class="icon-tile icon-tile--small" aria-hidden="true">
                  <i class="pi pi-credit-card"></i>
                </span>
                <span class="order-item-copy">
                  <strong>{{ line.finish }} metal card</strong>
                  <small>
                    {{ line.designName }}
                    <template v-if="line.holderName"> · {{ line.holderName }}</template>
                  </small>
                </span>
                <span class="order-item-price">
                  <small>{{ line.quantity }} × £{{ line.unitPrice }}</small>
                  <strong>£{{ line.unitPrice * line.quantity }}</strong>
                </span>
              </li>
            </ul>
          </section>
        </div>

        <aside class="order-secondary">
          <section class="info-card order-summary" aria-labelledby="order-summary-title">
            <h2 id="order-summary-title">Summary</h2>
            <div class="summary-row">
              <span>Subtotal</span><strong>£{{ order.subtotal }}</strong>
            </div>
            <div class="summary-row">
              <span>Tracked return delivery</span><strong>£{{ order.delivery }}</strong>
            </div>
            <div class="summary-total">
              <strong>Total</strong><strong>£{{ order.total }}</strong>
            </div>
            <p v-if="order.payment === 'not-collected'" class="muted-copy order-payment-note">
              <i class="pi pi-info-circle" aria-hidden="true"></i>
              Preview order: Stripe isn’t connected, so no payment was taken.
            </p>
          </section>

          <OrderRequestPanel
            v-if="openPanel"
            :key="openPanel"
            :order="order"
            :kind="openPanel"
            @close="openPanel = null"
            @completed="onCompleted"
          />

          <section v-else class="info-card order-actions" aria-labelledby="order-actions-title">
            <h2 id="order-actions-title">Need to make a change?</h2>
            <p class="order-actions-policy">
              See our
              <RouterLink to="/policies/refunds">refund &amp; cancellation policy</RouterLink>.
            </p>

            <div class="order-action">
              <div>
                <strong>Cancel order</strong>
                <p v-if="cancellation?.allowed">
                  Available until we start converting your card. Full refund.
                </p>
                <p v-else>{{ cancellation?.message }}</p>
              </div>
              <Button
                v-if="cancellation?.allowed"
                size="small"
                class="cart-delete-action"
                label="Cancel order"
                icon="pi pi-times"
                @click="openPanel = 'cancel'"
              />
            </div>

            <div class="order-action">
              <div>
                <strong>Request a refund</strong>
                <p v-if="refund?.allowed">
                  Available until
                  {{ deadline ? formatOrderDate(deadline) : 'the refund deadline' }}.
                </p>
                <p v-else>{{ refund?.message }}</p>
              </div>
              <Button
                v-if="refund?.allowed"
                size="small"
                class="kedak-outline-action"
                severity="secondary"
                outlined
                label="Request refund"
                icon="pi pi-replay"
                @click="openPanel = 'refund'"
              />
            </div>
          </section>

          <section class="notice-card account-security">
            <h2><i class="pi pi-lock" aria-hidden="true"></i> Questions about this order?</h2>
            <p>
              Quote <strong>{{ order.id }}</strong>. We’ll never ask for your PIN, CVV or full card
              number.
            </p>
            <TextLink to="/help">Help &amp; FAQ</TextLink>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>
