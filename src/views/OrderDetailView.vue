<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import TextLink from '../components/TextLink.vue'
import OrderLookupForm from '../components/orders/OrderLookupForm.vue'
import OrderRequestPanel from '../components/orders/OrderRequestPanel.vue'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.vue'
import OrderTimeline from '../components/orders/OrderTimeline.vue'
import Skeleton from 'primevue/skeleton'
import SkeletonRows from '../components/skeletons/parts/SkeletonRows.vue'
import SkeletonText from '../components/skeletons/parts/SkeletonText.vue'
import PayNowPanel from '../components/checkout/PayNowPanel.vue'
import { useConfirmPayment } from '../queries/payments'
import { restoreAfterPaymentRedirect } from '../services/api/paymentHandoff'
import { normaliseOrderId, useOrderEligibilityQuery, useOrderQuery } from '../queries/orders'
import { ApiError, errorMessage } from '../services/api/errors'
import { useAuthStore } from '../stores/auth'
import type { Order } from '../types/api'
import { formatMoney } from '../utils/money'
import { formatOrderDate } from '../utils/orderPolicy'
import { orderStatusMeta } from '../utils/orderStatus'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const orderId = computed(() => normaliseOrderId(String(route.params.id ?? '')))

// Back from Stripe/Paystack: restore a guest's token (it crossed the redirect in
// sessionStorage) before the order query runs, then confirm with the provider server-side.
const paymentReturn = typeof route.query.payment === 'string' ? route.query.payment : ''
if (paymentReturn) restoreAfterPaymentRedirect(orderId.value)
// GET /orders/{id}: the signed-in owner (cookie) or a guest with this tab's access token.
const orderQuery = useOrderQuery(orderId)
const order = computed<Order | null>(() => orderQuery.data.value ?? null)
// Eligibility is the server's decision (GET /orders/{id}/eligibility).
const eligibilityQuery = useOrderEligibilityQuery(orderId, () => order.value !== null)
const cancellation = computed(() => eligibilityQuery.data.value?.cancellation ?? null)
const refund = computed(() => eligibilityQuery.data.value?.refund ?? null)
const deadline = computed(
  () => eligibilityQuery.data.value?.refundDeadline ?? order.value?.refundDeadline ?? null,
)

const isLoading = computed(() => orderQuery.canRequest.value && orderQuery.isPending.value)
// 401/404 (not yours, wrong link, expired guest token) → ask for reference + email again.
const lookupNotice = computed(() => {
  const error = orderQuery.error.value
  if (!(error instanceof ApiError)) return ''
  if (error.code === 'order_access_token_invalid') return error.message
  if (error.status === 404 && auth.isSignedIn) {
    return 'This order isn’t linked to your account. If you checked out as a guest, verify it with the reference and email used at checkout.'
  }
  return ''
})
const loadError = computed(() => {
  const error = orderQuery.error.value
  if (!error) return ''
  if (error instanceof ApiError && (error.status === 401 || error.status === 404)) return ''
  return errorMessage(error, 'We couldn’t load this order.')
})
const showLookup = computed(() => !isLoading.value && !order.value && !loadError.value)

const meta = computed(() => (order.value ? orderStatusMeta[order.value.status] : null))

const confirmPayment = useConfirmPayment()
const paymentNotice = ref<'confirming' | 'paid' | 'pending' | 'cancelled' | ''>('')
const needsPayment = computed(
  () => order.value?.payment.status === 'not-collected' && order.value.status === 'awaiting-card',
)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Asks the API to check with the provider; the webhook may land a few seconds later. */
async function confirmAfterReturn() {
  paymentNotice.value = 'confirming'
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const updated = await confirmPayment.mutateAsync(orderId.value)
      if (updated.payment.status === 'paid') {
        paymentNotice.value = 'paid'
        return
      }
    } catch {
      // Not authorised (no token) or provider unreachable: fall through to "pending".
    }
    await wait(2500)
  }
  paymentNotice.value = 'pending'
}

onMounted(() => {
  if (!paymentReturn) return
  void router.replace({ query: {} }) // keep the URL clean on reload/share
  if (paymentReturn === 'cancelled') paymentNotice.value = 'cancelled'
  else void confirmAfterReturn()
})
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

    <section v-if="loadError" class="info-card order-lookup-card" role="alert">
      <p class="api-state is-error">
        {{ loadError }}
        <button type="button" class="api-retry" @click="orderQuery.refetch()">Try again</button>
      </p>
    </section>

    <!-- Guests (or a wrong link): verify with reference + email before showing anything. -->
    <section v-else-if="showLookup" class="order-locked">
      <header class="checkout-header">
        <p class="eyebrow">ORDER {{ orderId || 'LOOKUP' }}</p>
        <h1 class="page-title">Find your order.</h1>
        <p class="intro-copy">
          Enter your order reference and the email you used at checkout to view, cancel or request a
          refund.
        </p>
      </header>
      <p v-if="lookupNotice" class="checkout-account-note" role="status">
        <i class="pi pi-info-circle" aria-hidden="true"></i>
        <span>{{ lookupNotice }}</span>
      </p>
      <div class="info-card order-lookup-card">
        <OrderLookupForm :initial-reference="orderId" @found="onFound" />
      </div>
    </section>

    <template v-else-if="isLoading || (order && meta)">
      <header class="order-header">
        <div>
          <p class="eyebrow">
            ORDER {{ order?.id ?? orderId }} · PLACED
            <SkeletonText v-if="!order" width="5.5rem" />
            <template v-else>{{ formatOrderDate(order.placedAt) }}</template>
          </p>
          <h1 class="page-title">
            <SkeletonText v-if="!meta" width="17rem" />
            <template v-else>{{ meta.headline }}</template>
          </h1>
          <p class="intro-copy">
            <SkeletonText v-if="!meta" width="26rem" />
            <template v-else>{{ meta.description }}</template>
          </p>
        </div>
        <span v-if="!order" class="order-status is-skeleton"><SkeletonText width="6.5rem" /></span>
        <OrderStatusBadge v-else :status="order.status" />
      </header>
      <span v-if="isLoading" class="visually-hidden" role="status">Loading your order…</span>

      <p
        v-if="order && paymentNotice"
        class="checkout-account-note"
        role="status"
        aria-live="polite"
      >
        <i
          :class="{
            'pi pi-spin pi-spinner': paymentNotice === 'confirming',
            'pi pi-check-circle': paymentNotice === 'paid',
            'pi pi-info-circle': paymentNotice === 'pending' || paymentNotice === 'cancelled',
          }"
          aria-hidden="true"
        ></i>
        <span v-if="paymentNotice === 'confirming'">Confirming your payment…</span>
        <span v-else-if="paymentNotice === 'paid'">Payment received. Thank you!</span>
        <span v-else-if="paymentNotice === 'pending'">
          We haven’t had confirmation from the payment provider yet. Bank transfers can take a few
          minutes; this page will show “Paid” once it arrives.
        </span>
        <span v-else>Payment was cancelled. You can try again below.</span>
      </p>
      <div class="order-layout">
        <div class="order-primary">
          <PayNowPanel
            v-if="order && needsPayment && paymentNotice !== 'confirming'"
            :order="order"
          />
          <section class="info-card account-timeline" aria-labelledby="order-progress-title">
            <h2 id="order-progress-title">
              {{
                order?.status === 'cancelled'
                  ? 'Cancellation'
                  : order?.status === 'refund-requested' || order?.status === 'refunded'
                    ? 'Refund progress'
                    : 'Order progress'
              }}
            </h2>
            <OrderTimeline :order="order" :loading="!order" />
          </section>

          <section
            v-if="order?.cancellation || order?.refund"
            class="notice-card order-resolution"
            aria-labelledby="order-resolution-title"
          >
            <h2 id="order-resolution-title">
              {{ order?.cancellation ? 'Why it was cancelled' : 'Your refund request' }}
            </h2>
            <p>
              <strong>Reason:</strong> {{ order?.cancellation?.reason ?? order?.refund?.reason }}
            </p>
            <p v-if="order?.cancellation?.details || order?.refund?.details">
              “{{ order?.cancellation?.details || order?.refund?.details }}”
            </p>
            <p v-if="order?.refund?.state === 'declined'">
              <strong>Refund declined.</strong>
              {{ order.refund.decisionNote }}
            </p>
            <p v-else-if="order?.refund?.state === 'approved'">
              <strong>Refund approved:</strong> up to {{ formatMoney(order.refund.amount) }}.
            </p>
          </section>

          <section class="info-card order-items" aria-labelledby="order-items-title">
            <h2 id="order-items-title">Items</h2>
            <ul>
              <SkeletonRows v-if="!order" :rows="1" label="Loading your items">
                <li aria-hidden="true">
                  <span class="icon-tile icon-tile--small">
                    <i class="pi pi-credit-card"></i>
                  </span>
                  <span class="order-item-copy">
                    <strong><SkeletonText width="8.5rem" /></strong>
                    <small><SkeletonText width="11rem" /></small>
                  </span>
                  <span class="order-item-price">
                    <small><SkeletonText width="4rem" /></small>
                    <strong><SkeletonText width="3rem" /></strong>
                  </span>
                </li>
              </SkeletonRows>
              <li v-for="(line, index) in order?.lines ?? []" :key="index">
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
                  <small>{{ line.quantity }} × {{ formatMoney(line.unitPrice) }}</small>
                  <strong>{{ formatMoney(line.unitPrice.amount * line.quantity) }}</strong>
                </span>
              </li>
            </ul>
          </section>
        </div>

        <aside class="order-secondary">
          <section class="info-card order-summary" aria-labelledby="order-summary-title">
            <h2 id="order-summary-title">Summary</h2>
            <div class="summary-row">
              <span>Subtotal</span
              ><strong
                ><SkeletonText v-if="!order" width="3rem" /><template v-else>{{
                  formatMoney(order.subtotal)
                }}</template></strong
              >
            </div>
            <div class="summary-row">
              <span>Tracked return delivery</span
              ><strong
                ><SkeletonText v-if="!order" width="3rem" /><template v-else>{{
                  formatMoney(order.delivery)
                }}</template></strong
              >
            </div>
            <div class="summary-total">
              <strong>Total</strong
              ><strong
                ><SkeletonText v-if="!order" width="3.5rem" /><template v-else>{{
                  formatMoney(order.total)
                }}</template></strong
              >
            </div>
            <p v-if="!order" class="muted-copy order-payment-note">
              <SkeletonText width="13rem" />
            </p>
            <p
              v-else-if="order.payment.status === 'not-collected'"
              class="muted-copy order-payment-note"
            >
              <i class="pi pi-info-circle" aria-hidden="true"></i>
              Not paid yet: nothing has been charged.
            </p>
            <p v-else-if="order.payment.status === 'paid'" class="muted-copy order-payment-note">
              <i class="pi pi-check-circle" aria-hidden="true"></i>
              Paid{{
                order.payment.provider
                  ? ` with ${order.payment.provider === 'paystack' ? 'Paystack' : 'Stripe'}`
                  : ''
              }}.
            </p>
            <p v-else class="muted-copy order-payment-note">
              <i class="pi pi-replay" aria-hidden="true"></i>
              {{ order.payment.status === 'refunded' ? 'Refunded in full.' : 'Partly refunded.' }}
            </p>
          </section>

          <OrderRequestPanel
            v-if="openPanel && order"
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

            <SkeletonRows
              v-if="!order || eligibilityQuery.isPending.value"
              :rows="2"
              label="Checking what you can do"
            >
              <template #default="{ index }">
                <div class="order-action is-skeleton" aria-hidden="true">
                  <div>
                    <strong><SkeletonText :width="index === 1 ? '7rem' : '8.5rem'" /></strong>
                    <p><SkeletonText width="16rem" /></p>
                  </div>
                  <Skeleton
                    v-if="index === 1"
                    width="8.5rem"
                    height="2.75rem"
                    border-radius="8px"
                  />
                </div>
              </template>
            </SkeletonRows>
            <p v-else-if="eligibilityQuery.isError.value" class="api-state is-error" role="alert">
              {{ errorMessage(eligibilityQuery.error.value) }}
              <button type="button" class="api-retry" @click="eligibilityQuery.refetch()">
                Try again
              </button>
            </p>
            <div v-if="cancellation" class="order-action">
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

            <div v-if="refund" class="order-action">
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
              Quote <strong>{{ order?.id ?? orderId }}</strong>. We’ll never ask for your PIN, CVV
              or full card number.
            </p>
            <TextLink to="/help">Help &amp; FAQ</TextLink>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>
