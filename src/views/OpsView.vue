<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.vue'
import { useAdvanceOrderStatus, useDecideRefund, useOpsOrder, useOpsOrders } from '../queries/ops'
import { normaliseOrderId } from '../queries/orders'
import { ApiError, errorMessage } from '../services/api/errors'
import type { AdvanceableStatus, OrderStatus, RefundState } from '../types/api'
import { formatMoney } from '../utils/money'
import { formatOrderDate } from '../utils/orderPolicy'
import { orderStatusMeta } from '../utils/orderStatus'

/**
 * Staff workbench (/ops) and production job view (/ops/quality-check?order=KD-…).
 * Every action is authorised by Django: `production` can list and advance orders, `ops` can
 * also decide refunds. A customer who opens this page gets the API's 403 explained.
 */
const route = useRoute()
const router = useRouter()
const toast = useToast()

const isJobPage = computed(() => route.name === 'quality-check')
const selectedOrderId = computed(() =>
  typeof route.query.order === 'string' ? normaliseOrderId(route.query.order) : null,
)

const HAPPY_PATH: OrderStatus[] = [
  'awaiting-card',
  'card-received',
  'assessed',
  'in-production',
  'dispatched',
  'delivered',
]

type FilterKey = 'active' | 'awaiting-card' | 'in-production' | 'dispatched' | 'refunds' | 'all'
const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'active', label: 'Active orders' },
  { key: 'awaiting-card', label: 'Awaiting card' },
  { key: 'in-production', label: 'In production' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'refunds', label: 'Refunds to review' },
  { key: 'all', label: 'All orders' },
]
const activeFilter = ref<FilterKey>('active')
const apiFilters = computed(() => {
  switch (activeFilter.value) {
    case 'refunds':
      return { refundState: 'requested' as RefundState, limit: 50 }
    case 'active':
    case 'all':
      return { limit: 50 }
    default:
      return { status: activeFilter.value as OrderStatus, limit: 50 }
  }
})

// GET /ops/orders (cursor pages)
const ordersQuery = useOpsOrders(apiFilters)
const allLoaded = computed(() => ordersQuery.data.value?.pages.flatMap((page) => page.data) ?? [])
const queue = computed(() =>
  activeFilter.value === 'active'
    ? allLoaded.value.filter((order) =>
        ['awaiting-card', 'card-received', 'assessed', 'in-production', 'dispatched'].includes(
          order.status,
        ),
      )
    : allLoaded.value,
)
const stats = computed(() => {
  const list = allLoaded.value
  return {
    open: list.filter((order) => HAPPY_PATH.slice(0, 5).includes(order.status)).length,
    production: list.filter((order) => order.status === 'in-production').length,
    refunds: list.filter((order) => order.status === 'refund-requested').length,
  }
})
const accessError = computed(() => {
  const error = ordersQuery.error.value
  if (error instanceof ApiError && error.status === 403) {
    return 'Your account doesn’t have staff access. Ask an administrator to add you to the ops or production team.'
  }
  return error ? errorMessage(error, 'Orders couldn’t load.') : ''
})
const today = formatOrderDate(new Date())

function openJob(orderId: string) {
  void router.push({ name: 'quality-check', query: { order: orderId } })
}

// GET /ops/orders/{id} (order + production history)
const jobQuery = useOpsOrder(selectedOrderId)
const job = computed(() => jobQuery.data.value?.order ?? null)
const history = computed(() => jobQuery.data.value?.productionHistory ?? [])
const nextStatus = computed<AdvanceableStatus | null>(() => {
  if (!job.value) return null
  const index = HAPPY_PATH.indexOf(job.value.status)
  return index >= 0 && index < HAPPY_PATH.length - 1
    ? (HAPPY_PATH[index + 1] as AdvanceableStatus)
    : null
})
const checklist = computed(() => {
  if (!job.value) return []
  const current = HAPPY_PATH.indexOf(job.value.status)
  return HAPPY_PATH.slice(1).map((status, index) => ({
    status,
    label: orderStatusMeta[status].label,
    done: current >= 0 && index + 1 <= current,
  }))
})

const trackingNumber = ref('')
const note = ref('')
const refundNote = ref('')
const actionError = ref('')
watch(selectedOrderId, () => {
  trackingNumber.value = ''
  note.value = ''
  refundNote.value = ''
  actionError.value = ''
})

const advance = useAdvanceOrderStatus()
const decide = useDecideRefund()

async function advanceJob() {
  if (!job.value || !nextStatus.value || advance.isPending.value) return
  actionError.value = ''
  if (nextStatus.value === 'dispatched' && !trackingNumber.value.trim()) {
    actionError.value = 'Add the tracking number before marking the order as dispatched.'
    return
  }
  try {
    const updated = await advance.mutateAsync({
      orderId: job.value.id,
      payload: {
        status: nextStatus.value,
        trackingNumber: trackingNumber.value.trim() || undefined,
        note: note.value.trim() || undefined,
      },
    })
    trackingNumber.value = ''
    note.value = ''
    toast.add({
      severity: 'success',
      summary: `${updated.id} updated`,
      detail: `Now: ${orderStatusMeta[updated.status].label}.`,
      life: 2600,
    })
  } catch (error) {
    actionError.value =
      error instanceof ApiError && error.fieldErrors.length
        ? error.fieldErrors[0]!.message
        : errorMessage(error, 'The status couldn’t be changed.')
  }
}

async function decideJobRefund(action: 'approve' | 'decline' | 'complete') {
  if (!job.value || decide.isPending.value) return
  actionError.value = ''
  if (action === 'decline' && !refundNote.value.trim()) {
    actionError.value = 'Explain the decision to the customer before declining.'
    return
  }
  try {
    const updated = await decide.mutateAsync({
      orderId: job.value.id,
      payload: { action, note: refundNote.value.trim() || undefined },
    })
    refundNote.value = ''
    toast.add({
      severity: 'success',
      summary: `Refund ${action === 'approve' ? 'approved' : action === 'decline' ? 'declined' : 'completed'}`,
      detail: `${updated.id}: ${orderStatusMeta[updated.status].label}.`,
      life: 2600,
    })
  } catch (error) {
    actionError.value =
      error instanceof ApiError && error.status === 403
        ? 'Only the ops team can decide refunds.'
        : errorMessage(error, 'The refund decision couldn’t be saved.')
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <main v-if="!isJobPage" class="journey-main ops-main">
    <p class="eyebrow">KEDAK / OPERATIONS / INTERNAL</p>
    <h1 class="page-title">The workbench.</h1>
    <p class="muted-copy">Production overview · {{ today }}</p>

    <p v-if="accessError" class="api-state is-error" role="alert">
      {{ accessError }}
      <button
        v-if="!(ordersQuery.error.value instanceof ApiError && ordersQuery.error.value.status === 403)"
        type="button"
        class="api-retry"
        @click="ordersQuery.refetch()"
      >
        Try again
      </button>
    </p>

    <template v-else>
      <div class="ops-stat-grid">
        <div class="info-card"><strong>{{ stats.open }}</strong><small>Open</small></div>
        <div class="info-card">
          <strong>{{ stats.production }}</strong><small>In production</small>
        </div>
        <div class="info-card">
          <strong>{{ stats.refunds }}</strong><small>Refunds requested</small>
        </div>
      </div>
      <section class="info-card">
        <h2>Today’s queue</h2>
        <div class="ops-filters" role="group" aria-label="Filter orders">
          <Button
            v-for="filter in filters"
            :key="filter.key"
            size="small"
            :class="activeFilter === filter.key ? 'kedak-action' : 'kedak-outline-action'"
            :severity="activeFilter === filter.key ? undefined : 'secondary'"
            :outlined="activeFilter !== filter.key"
            :label="filter.label"
            :aria-pressed="activeFilter === filter.key"
            @click="activeFilter = filter.key"
          />
        </div>
        <p v-if="ordersQuery.isPending.value" class="api-state" aria-busy="true">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading orders…
        </p>
        <p v-else-if="!queue.length" class="muted-copy">No orders match this filter.</p>
        <article v-for="order in queue" :key="order.id" class="queue-row">
          <div>
            <strong>{{ order.id }}</strong>
            <small>
              {{ order.itemsSummary }} · {{ formatOrderDate(order.placedAt) }} ·
              {{ formatMoney(order.total) }}
            </small>
          </div>
          <span class="status-pill">{{ orderStatusMeta[order.status].label }}</span>
          <Button
            size="small"
            class="kedak-outline-action"
            severity="secondary"
            outlined
            label="Open production job"
            @click="openJob(order.id)"
          />
        </article>
        <Button
          v-if="ordersQuery.hasNextPage.value"
          size="small"
          class="kedak-outline-action"
          severity="secondary"
          outlined
          label="Load more"
          :loading="ordersQuery.isFetchingNextPage.value"
          @click="ordersQuery.fetchNextPage()"
        />
      </section>
    </template>
    <p class="legal-note">
      Restricted workspace. No customer PINs, CVVs or full card numbers are stored.
    </p>
  </main>

  <main v-else class="journey-main ops-main">
    <p class="eyebrow">OPERATIONS / {{ selectedOrderId ?? 'PRODUCTION JOB' }}</p>
    <p v-if="!selectedOrderId" class="muted-copy">
      Choose an order from the production queue to open its job.
    </p>
    <p v-else-if="jobQuery.isPending.value" class="api-state" aria-busy="true">
      <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading job…
    </p>
    <p v-else-if="jobQuery.isError.value" class="api-state is-error" role="alert">
      {{
        jobQuery.error.value instanceof ApiError && jobQuery.error.value.status === 403
          ? 'Your account doesn’t have staff access.'
          : errorMessage(jobQuery.error.value, 'This job couldn’t load.')
      }}
    </p>
    <template v-else-if="job">
      <h1 class="page-title">{{ orderStatusMeta[job.status].headline }}</h1>
      <section class="info-card qc-card">
        <OrderStatusBadge :status="job.status" />
        <h2>{{ job.customerName }}</h2>
        <p v-for="(line, index) in job.lines" :key="index" class="muted-copy">
          {{ line.finish }} collection × {{ line.quantity }} · {{ line.designName }}
          <template v-if="line.holderName"> · {{ line.holderName }}</template>
          <template v-if="line.customization">
            · {{ line.customization.engravingStyle === 'monogram' ? 'Monogram' : 'Name' }}
            engraving
          </template>
        </p>
        <p v-for="step in checklist" :key="step.status">
          <span v-if="step.done" class="checkmark">✓</span><span v-else>○</span> &nbsp;
          {{ step.label }}
        </p>
        <p class="muted-copy">
          Quality checks require a physical inspection. No dispatch is released automatically.
        </p>

        <form v-if="nextStatus" class="ops-action-form" novalidate @submit.prevent="advanceJob">
          <FloatLabel v-if="nextStatus === 'dispatched'" class="checkout-float-label" variant="in">
            <InputText id="ops-tracking" v-model="trackingNumber" autocomplete="off" />
            <label for="ops-tracking">Tracking number</label>
          </FloatLabel>
          <FloatLabel class="checkout-float-label" variant="in">
            <InputText id="ops-note" v-model="note" maxlength="500" autocomplete="off" />
            <label for="ops-note">Production note (optional)</label>
          </FloatLabel>
          <Button
            type="submit"
            size="small"
            class="kedak-action"
            :label="`Mark as ${orderStatusMeta[nextStatus].label.toLowerCase()}`"
            icon="pi pi-check"
            :loading="advance.isPending.value"
          />
        </form>

        <div v-if="job.refund" class="ops-action-form">
          <p>
            <strong>Refund {{ job.refund.state }}</strong> · up to
            {{ formatMoney(job.refund.amount) }} · {{ job.refund.reason }}
            <template v-if="job.refund.details"> — “{{ job.refund.details }}”</template>
          </p>
          <template v-if="job.refund.state === 'requested'">
            <FloatLabel class="checkout-float-label" variant="in">
              <InputText id="ops-refund-note" v-model="refundNote" maxlength="500" />
              <label for="ops-refund-note">Note to customer (required to decline)</label>
            </FloatLabel>
            <div class="cart-delete-confirm-actions">
              <Button
                size="small"
                class="kedak-action"
                label="Approve refund"
                :loading="decide.isPending.value"
                @click="decideJobRefund('approve')"
              />
              <Button
                size="small"
                class="kedak-outline-action"
                severity="secondary"
                outlined
                label="Decline"
                :disabled="decide.isPending.value"
                @click="decideJobRefund('decline')"
              />
            </div>
          </template>
          <Button
            v-else-if="
              job.refund.state === 'approved' ||
              (job.refund.state === 'pending' && job.status === 'cancelled')
            "
            size="small"
            class="kedak-action"
            label="Mark refund completed"
            :loading="decide.isPending.value"
            @click="decideJobRefund('complete')"
          />
        </div>

        <p v-if="actionError" class="upload-error" role="alert">
          <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
          <span>{{ actionError }}</span>
        </p>
      </section>

      <section class="info-card">
        <h2>Production history</h2>
        <p v-if="!history.length" class="muted-copy">No production updates yet.</p>
        <ul v-else class="ops-history">
          <li v-for="(event, index) in history" :key="index">
            {{ formatDateTime(event.createdAt) }} &nbsp;
            {{ orderStatusMeta[event.fromStatus].label }} →
            {{ orderStatusMeta[event.toStatus].label }}
            <template v-if="event.actor"> · {{ event.actor }}</template>
            <template v-if="event.trackingNumber"> · Tracking {{ event.trackingNumber }}</template>
            <template v-if="event.note"> · “{{ event.note }}”</template>
          </li>
        </ul>
      </section>
    </template>
    <Button
      size="small"
      class="kedak-outline-action"
      severity="secondary"
      outlined
      label="Return to production queue"
      @click="router.push('/ops')"
    />
    <p class="legal-note">
      Internal workspace. Staff access only. Never record PINs, CVVs or full card numbers.
    </p>
  </main>
</template>
