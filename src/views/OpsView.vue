<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import NoticePanel from '../components/NoticePanel.vue'
import TextLink from '../components/TextLink.vue'
import OpsCardSpec from '../components/orders/OpsCardSpec.vue'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.vue'
import OrderQueueRow from '../components/orders/OrderQueueRow.vue'
import SkeletonRows from '../components/skeletons/parts/SkeletonRows.vue'
import StatTile from '../components/ops/StatTile.vue'
import { useDesignLookup } from '../queries/artwork'
import { useAdvanceOrderStatus, useDecideRefund, useOpsOrder, useOpsOrders } from '../queries/ops'
import { normaliseOrderId } from '../queries/orders'
import { ApiError, errorMessage } from '../services/api/errors'
import type { OpsOrderFilters, OpsOrderSort } from '../services/api/endpoints/ops'
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
// Page size (10 by default), remembered on this device.
const PAGE_SIZES = [10, 20, 50, 100] as const
type PageSize = (typeof PAGE_SIZES)[number]
const PAGE_SIZE_KEY = 'kedak-ops-page-size'
function storedPageSize(): PageSize {
  try {
    const value = Number(localStorage.getItem(PAGE_SIZE_KEY))
    return (PAGE_SIZES as readonly number[]).includes(value) ? (value as PageSize) : 10
  } catch {
    return 10
  }
}
const pageSize = ref<PageSize>(storedPageSize())
const pageSizeOptions = PAGE_SIZES.map((value) => ({ value, label: String(value) }))
watch(pageSize, (size) => {
  try {
    localStorage.setItem(PAGE_SIZE_KEY, String(size))
  } catch {
    /* storage unavailable: keep the choice for this visit only */
  }
})

// Filtering, search, sorting and paging all run on the server (GET /ops/orders).
// The search waits for a pause in typing before asking the API.
const search = ref('')
const searchTerm = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (searchTerm.value = value.trim()), 300)
})
const isSearching = computed(() => search.value.trim() !== searchTerm.value)
const sortOptions: Array<{ value: OpsOrderSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'total-high', label: 'Highest total' },
  { value: 'total-low', label: 'Lowest total' },
]
const sort = ref<OpsOrderSort>('newest')

const apiFilters = computed<Omit<OpsOrderFilters, 'cursor'>>(() => {
  const base = { limit: pageSize.value, sort: sort.value, q: searchTerm.value || undefined }
  switch (activeFilter.value) {
    case 'refunds':
      return { ...base, refundState: 'requested' as RefundState }
    case 'active':
      return { ...base, active: true }
    case 'all':
      return base
    default:
      return { ...base, status: activeFilter.value as OrderStatus }
  }
})

// GET /ops/orders: cursor pages, shown one page at a time.
const ordersQuery = useOpsOrders(apiFilters)
const pageIndex = ref(0)
watch(apiFilters, () => {
  pageIndex.value = 0
})
const loadedPages = computed(() => ordersQuery.data.value?.pages ?? [])
const queue = computed(() => loadedPages.value[pageIndex.value]?.data ?? [])
const hasNextPage = computed(
  () => pageIndex.value + 1 < loadedPages.value.length || Boolean(ordersQuery.hasNextPage.value),
)
const pageRange = computed(() => {
  const start = pageIndex.value * pageSize.value
  return { from: queue.value.length ? start + 1 : 0, to: start + queue.value.length }
})
async function goToNextPage() {
  if (pageIndex.value + 1 >= loadedPages.value.length) {
    if (!ordersQuery.hasNextPage.value) return
    await ordersQuery.fetchNextPage()
  }
  if (pageIndex.value + 1 < loadedPages.value.length) pageIndex.value += 1
  document.getElementById('ops-queue-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function goToPreviousPage() {
  if (pageIndex.value > 0) pageIndex.value -= 1
}
// Overview counts come from the latest orders regardless of the selected filter.
const overviewQuery = useOpsOrders(() => ({ limit: 100 }))
const overview = computed(() => overviewQuery.data.value?.pages.flatMap((page) => page.data) ?? [])
const countOf = (statuses: OrderStatus[]) =>
  overview.value.filter((order) => statuses.includes(order.status)).length
const stats = computed<Array<{ key: FilterKey; label: string; icon: string; value: number }>>(
  () => [
    {
      key: 'active',
      label: 'Open orders',
      icon: 'pi pi-inbox',
      value: countOf(['awaiting-card', 'card-received', 'assessed', 'in-production', 'dispatched']),
    },
    {
      key: 'awaiting-card',
      label: 'Awaiting card',
      icon: 'pi pi-envelope',
      value: countOf(['awaiting-card']),
    },
    {
      key: 'in-production',
      label: 'In production',
      icon: 'pi pi-cog',
      value: countOf(['in-production']),
    },
    {
      key: 'refunds',
      label: 'Refunds to review',
      icon: 'pi pi-replay',
      value: countOf(['refund-requested']),
    },
  ],
)

const visibleQueue = queue
const searchedReference = computed(() => {
  const reference = normaliseOrderId(search.value)
  return /^KD-\d{4,8}$/.test(reference) &&
    !visibleQueue.value.some((order) => order.id === reference)
    ? reference
    : null
})
/** What the team does next for an order in this status. */
const nextHint: Partial<Record<OrderStatus, string>> = {
  'awaiting-card': 'Wait for the customer’s card',
  'card-received': 'Assess the card',
  assessed: 'Start production',
  'in-production': 'Quality-check and dispatch',
  dispatched: 'Confirm delivery',
  'refund-requested': 'Decide the refund',
}
const accessError = computed(() => {
  const error = ordersQuery.error.value
  if (error instanceof ApiError && error.status === 403) {
    return 'Your account doesn’t have staff access. Ask an administrator to add you to the ops or production team.'
  }
  return error ? errorMessage(error, 'Orders couldn’t load.') : ''
})
const today = formatOrderDate(new Date())

// Quality check without an order: open a job by its reference.
const jumpReference = ref('')
const jumpError = ref('')
function openJumpReference() {
  // Accept "KD-1234", "kd 1234", "KD1234" or just "1234".
  const digits = normaliseOrderId(jumpReference.value).match(/^(?:KD-?)?(\d{4,8})$/)?.[1]
  jumpError.value = digits ? '' : 'Enter a reference like KD-1234.'
  if (digits) openJob(`KD-${digits}`)
}

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
  // Refunds and cancellations leave the happy path: fall back to what the history recorded.
  const reached = new Set(history.value.map((event) => event.toStatus))
  return HAPPY_PATH.slice(1).map((status, index) => ({
    status,
    label: orderStatusMeta[status].label,
    done: (current >= 0 && index + 1 <= current) || reached.has(status),
  }))
})

const designLookup = useDesignLookup(() =>
  (job.value?.lines ?? []).flatMap((line) =>
    line.customization?.customizationMode === 'preset' && line.customization.designId
      ? [line.customization.designId]
      : [],
  ),
)
const historyNewestFirst = computed(() => [...history.value].reverse())
const jobSummary = computed(() => {
  if (!job.value) return ''
  const cards = job.value.lines.reduce((sum, line) => sum + line.quantity, 0)
  const finishes = [...new Set(job.value.lines.map((line) => line.finish))].join(', ')
  return `${cards} ${cards === 1 ? 'card' : 'cards'} · ${finishes} · ${formatMoney(job.value.total)}`
})
/** Staff guidance for each step (what to check before pressing the button). */
const nextStepGuide: Record<AdvanceableStatus, string> = {
  'card-received': 'Confirm the customer’s card has arrived and note its condition.',
  assessed: 'Check the card is suitable: chip intact, no cracks, contactless antenna undamaged.',
  'in-production': 'Start engraving and converting. Match the design and holder name below.',
  dispatched: 'Quality-check the finished card, pack it securely and add the tracking number.',
  delivered: 'Mark as delivered once the carrier confirms delivery.',
}
const closedCopy = computed(() => {
  switch (job.value?.status) {
    case 'delivered':
      return 'This order has been delivered. Refund requests appear here if the customer makes one.'
    case 'cancelled':
      return 'This order was cancelled. Return any original card held for it.'
    case 'refunded':
      return 'This order has been refunded.'
    default:
      return 'This order is waiting on a refund decision.'
  }
})
const refundTitle = computed(() => {
  switch (job.value?.refund?.state) {
    case 'requested':
      return 'Waiting for your decision'
    case 'approved':
      return 'Approved, awaiting payout'
    case 'completed':
      return 'Refund completed'
    case 'declined':
      return 'Refund declined'
    default:
      return 'Refund pending'
  }
})
const paymentLabel = computed(() => {
  const payment = job.value?.payment
  if (!payment) return '—'
  const provider = payment.provider
    ? ` · ${payment.provider[0]!.toUpperCase()}${payment.provider.slice(1)}`
    : ''
  const labels: Record<string, string> = {
    paid: 'Paid',
    'not-collected': 'Not paid',
    refunded: 'Refunded',
    'partially-refunded': 'Partly refunded',
  }
  return (labels[payment.status] ?? payment.status) + provider
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
  <main v-if="!isJobPage" class="journey-main ops-main ops-workbench">
    <header class="order-header">
      <div>
        <p class="eyebrow">KEDAK / OPERATIONS · {{ today.toUpperCase() }}</p>
        <h1 class="page-title">Workbench.</h1>
        <p class="intro-copy">Every order that needs hands-on work, newest first.</p>
      </div>
      <Button
        v-if="!accessError"
        size="small"
        class="kedak-outline-action ops-refresh"
        severity="secondary"
        outlined
        icon="pi pi-refresh"
        label="Refresh"
        :loading="ordersQuery.isRefetching.value"
        @click="(ordersQuery.refetch(), overviewQuery.refetch())"
      />
    </header>

    <p v-if="accessError" class="api-state is-error" role="alert">
      {{ accessError }}
      <button
        v-if="
          !(ordersQuery.error.value instanceof ApiError && ordersQuery.error.value.status === 403)
        "
        type="button"
        class="api-retry"
        @click="ordersQuery.refetch()"
      >
        Try again
      </button>
    </p>

    <template v-else>
      <div class="ops-stats">
        <StatTile
          v-for="stat in stats"
          :key="stat.key"
          :icon="stat.icon"
          :label="stat.label"
          :value="stat.value"
          :loading="overviewQuery.isPending.value"
          :active="activeFilter === stat.key"
          @select="activeFilter = stat.key"
        />
      </div>

      <section class="info-card ops-queue" aria-labelledby="ops-queue-title">
        <div class="ops-queue-head">
          <h2 id="ops-queue-title">Queue</h2>
          <span class="ops-search">
            <i class="pi pi-search" aria-hidden="true"></i>
            <input
              v-model="search"
              type="search"
              placeholder="Reference, email, name or finish"
              aria-label="Search orders"
              autocomplete="off"
            />
            <i
              v-if="isSearching || (ordersQuery.isFetching.value && searchTerm)"
              class="pi pi-spin pi-spinner ops-search-busy"
              aria-hidden="true"
            ></i>
          </span>
          <Select
            v-model="sort"
            :options="sortOptions"
            option-label="label"
            option-value="value"
            class="kedak-select ops-sort"
            aria-label="Sort orders"
          />
        </div>

        <div class="ops-tabs ops-queue-tabs" role="tablist" aria-label="Filter orders">
          <button
            v-for="filter in filters"
            :key="filter.key"
            type="button"
            role="tab"
            class="ops-tab"
            :class="{ 'is-active': activeFilter === filter.key }"
            :aria-selected="activeFilter === filter.key"
            @click="activeFilter = filter.key"
          >
            {{ filter.label }}
          </button>
        </div>

        <ul v-if="ordersQuery.isPending.value" class="ops-rows">
          <SkeletonRows :rows="Math.min(pageSize, 6)" label="Loading orders">
            <OrderQueueRow loading />
          </SkeletonRows>
        </ul>
        <div v-else-if="!visibleQueue.length" class="ops-empty">
          <span class="icon-tile" aria-hidden="true"><i class="pi pi-check-circle"></i></span>
          <p>
            <strong>{{ search ? 'No matching orders' : 'Nothing here right now' }}</strong>
            <small>
              {{
                search
                  ? 'Try another reference or filter.'
                  : 'Orders in this view will appear here.'
              }}
            </small>
          </p>
          <Button
            v-if="searchedReference"
            size="small"
            class="kedak-action"
            :label="`Open ${searchedReference}`"
            icon="pi pi-arrow-right"
            icon-pos="right"
            @click="openJob(searchedReference)"
          />
        </div>
        <ul v-else class="ops-rows">
          <OrderQueueRow
            v-for="order in visibleQueue"
            :key="order.id"
            :order="order"
            :next-hint="nextHint[order.status]"
          />
        </ul>
        <nav
          v-if="!ordersQuery.isPending.value && (queue.length || pageIndex > 0)"
          class="ops-pagination"
          aria-label="Queue pages"
        >
          <div class="ops-page-size">
            <span>Show</span>
            <Select
              v-model="pageSize"
              :options="pageSizeOptions"
              option-label="label"
              option-value="value"
              class="kedak-select kedak-select--small"
              aria-label="Orders per page"
            />
            <span>per page</span>
          </div>
          <p class="ops-page-status" aria-live="polite">
            Page {{ pageIndex + 1 }} · {{ pageRange.from }}–{{ pageRange.to }}
          </p>
          <div class="ops-page-buttons">
            <button
              type="button"
              :disabled="pageIndex === 0"
              aria-label="Previous page"
              @click="goToPreviousPage"
            >
              <i class="pi pi-chevron-left" aria-hidden="true"></i>
              <span>Previous</span>
            </button>
            <button
              type="button"
              :disabled="!hasNextPage || ordersQuery.isFetchingNextPage.value"
              :class="{ 'is-loading': ordersQuery.isFetchingNextPage.value }"
              aria-label="Next page"
              @click="goToNextPage"
            >
              <span>Next</span>
              <i class="pi pi-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </nav>
      </section>
    </template>
    <p class="legal-note">
      Restricted workspace. No customer PINs, CVVs or full card numbers are stored.
    </p>
  </main>

  <main v-else class="journey-main ops-main ops-job">
    <RouterLink to="/ops" class="text-link ops-back">
      <i class="pi pi-arrow-left" aria-hidden="true"></i> Production queue
    </RouterLink>

    <NoticePanel v-if="!selectedOrderId" :level="1" icon="pi pi-inbox" title="No job selected">
      <p>Choose an order from the production queue, or open one by its reference.</p>
      <template #actions>
        <form class="ops-job-jump" novalidate @submit.prevent="openJumpReference">
          <InputText
            v-model="jumpReference"
            class="ops-job-jump-input"
            placeholder="Order reference, e.g. KD-1234"
            aria-label="Order reference"
            autocomplete="off"
            :invalid="Boolean(jumpError)"
          />
          <Button
            type="submit"
            class="kedak-action"
            label="Open job"
            icon="pi pi-arrow-right"
            icon-pos="right"
          />
        </form>
        <TextLink to="/ops">Go to the workbench</TextLink>
        <small v-if="jumpError" class="ops-field-error ops-job-jump-error">{{ jumpError }}</small>
      </template>
    </NoticePanel>
    <!-- Loading a job: the page frame and headings render now; only the order data pulses. -->
    <template v-else-if="jobQuery.isPending.value">
      <header class="order-header" aria-busy="true">
        <div>
          <p class="eyebrow">PRODUCTION JOB · {{ selectedOrderId }}</p>
          <Skeleton width="16rem" height="2.6rem" class="skeleton-title" />
          <Skeleton width="14rem" height="1rem" />
        </div>
        <Skeleton width="7rem" height="1.6rem" border-radius="999px" />
      </header>
      <span class="visually-hidden" role="status">Loading job…</span>

      <div class="order-layout" aria-hidden="true">
        <div class="order-primary">
          <section class="info-card ops-next">
            <p class="ops-card-kicker">Next step</p>
            <Skeleton width="12rem" height="1.4rem" />
            <Skeleton height="0.9rem" class="skeleton-gap" />
            <Skeleton height="2.75rem" class="skeleton-gap" />
          </section>
          <section class="info-card ops-cards">
            <h2>Card details</h2>
            <Skeleton height="4.5rem" class="skeleton-gap" />
          </section>
          <section class="info-card ops-history-card">
            <h2>Production history</h2>
            <div v-for="row in 3" :key="row" class="skeleton-row skeleton-gap">
              <Skeleton width="45%" height="0.9rem" />
              <Skeleton width="25%" height="0.8rem" />
            </div>
          </section>
        </div>
        <aside class="order-secondary">
          <section class="info-card ops-progress">
            <h2>Progress</h2>
            <div v-for="row in 5" :key="row" class="skeleton-row skeleton-gap">
              <Skeleton shape="circle" size="1.4rem" />
              <Skeleton width="70%" height="0.9rem" />
            </div>
          </section>
          <section class="info-card ops-order-facts">
            <h2>Order</h2>
            <div v-for="row in 4" :key="row" class="skeleton-row skeleton-gap">
              <Skeleton width="35%" height="0.85rem" />
              <Skeleton width="40%" height="0.85rem" />
            </div>
          </section>
          <section class="notice-card ops-privacy">
            <h2><i class="pi pi-lock" aria-hidden="true"></i> Staff only</h2>
            <p>Never record PINs, CVVs or full card numbers in notes.</p>
          </section>
        </aside>
      </div>
    </template>
    <p v-else-if="jobQuery.isError.value" class="api-state is-error" role="alert">
      {{
        jobQuery.error.value instanceof ApiError && jobQuery.error.value.status === 403
          ? 'Your account doesn’t have staff access.'
          : errorMessage(jobQuery.error.value, 'This job couldn’t load.')
      }}
    </p>

    <template v-else-if="job">
      <header class="order-header">
        <div>
          <p class="eyebrow">
            PRODUCTION JOB · {{ job.id }} · PLACED {{ formatOrderDate(job.placedAt).toUpperCase() }}
          </p>
          <h1 class="page-title">{{ job.customerName }}</h1>
          <p class="intro-copy">{{ jobSummary }}</p>
        </div>
        <OrderStatusBadge :status="job.status" />
      </header>

      <div class="order-layout">
        <div class="order-primary">
          <!-- Next step -->
          <section v-if="nextStatus" class="info-card ops-next" aria-labelledby="ops-next-title">
            <p class="ops-card-kicker">Next step</p>
            <h2 id="ops-next-title">{{ orderStatusMeta[nextStatus].label }}</h2>
            <p class="muted-copy">{{ nextStepGuide[nextStatus] }}</p>
            <p v-if="job.payment.status === 'not-collected'" class="ops-unpaid-note" role="note">
              <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
              <span>
                <strong>Not paid yet.</strong> The customer hasn’t completed payment. Check with the
                ops team before moving this order on.
              </span>
            </p>

            <form class="ops-next-form" novalidate @submit.prevent="advanceJob">
              <FloatLabel
                v-if="nextStatus === 'dispatched'"
                class="checkout-float-label"
                variant="in"
              >
                <InputText
                  id="ops-tracking"
                  v-model="trackingNumber"
                  autocomplete="off"
                  :invalid="Boolean(actionError) && !trackingNumber.trim()"
                />
                <label for="ops-tracking">Tracking number</label>
              </FloatLabel>
              <FloatLabel class="checkout-float-label" variant="in">
                <Textarea id="ops-note" v-model="note" maxlength="500" rows="2" auto-resize />
                <label for="ops-note">Production note (optional)</label>
              </FloatLabel>
              <p v-if="actionError" class="upload-error" role="alert">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
                <span>{{ actionError }}</span>
              </p>
              <Button
                type="submit"
                class="kedak-action"
                :label="`Mark as ${orderStatusMeta[nextStatus].label.toLowerCase()}`"
                icon="pi pi-check"
                :loading="advance.isPending.value"
              />
            </form>
            <p class="ops-safety">
              <i class="pi pi-shield" aria-hidden="true"></i>
              Quality checks need a physical inspection. Nothing is dispatched automatically.
            </p>
          </section>
          <section v-else-if="!job.refund" class="info-card ops-next is-closed">
            <p class="ops-card-kicker">Next step</p>
            <h2>Nothing to advance</h2>
            <p class="muted-copy">{{ closedCopy }}</p>
          </section>

          <!-- Refund -->
          <section
            v-if="job.refund"
            class="info-card ops-refund"
            aria-labelledby="ops-refund-title"
          >
            <div class="ops-refund-head">
              <div>
                <p class="ops-card-kicker">Refund</p>
                <h2 id="ops-refund-title">{{ refundTitle }}</h2>
              </div>
              <strong class="ops-refund-amount">Up to {{ formatMoney(job.refund.amount) }}</strong>
            </div>
            <dl class="ops-facts">
              <div>
                <dt>Reason</dt>
                <dd>{{ job.refund.reason }}</dd>
              </div>
              <div v-if="job.refund.details">
                <dt>Customer note</dt>
                <dd>“{{ job.refund.details }}”</dd>
              </div>
              <div v-if="job.refund.decisionNote">
                <dt>Decision note</dt>
                <dd>{{ job.refund.decisionNote }}</dd>
              </div>
            </dl>
            <template v-if="job.refund.state === 'requested'">
              <FloatLabel class="checkout-float-label" variant="in">
                <Textarea
                  id="ops-refund-note"
                  v-model="refundNote"
                  maxlength="500"
                  rows="2"
                  auto-resize
                />
                <label for="ops-refund-note">Note to the customer (required to decline)</label>
              </FloatLabel>
              <div class="ops-refund-actions">
                <Button
                  class="kedak-action"
                  label="Approve refund"
                  icon="pi pi-check"
                  :loading="decide.isPending.value"
                  @click="decideJobRefund('approve')"
                />
                <Button
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
              class="kedak-action"
              label="Mark refund completed"
              icon="pi pi-check"
              :loading="decide.isPending.value"
              @click="decideJobRefund('complete')"
            />
            <p v-if="actionError && !nextStatus" class="upload-error" role="alert">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
              <span>{{ actionError }}</span>
            </p>
          </section>

          <!-- Card details -->
          <section class="info-card ops-cards" aria-labelledby="ops-items-title">
            <h2 id="ops-items-title">Card details</h2>
            <p class="muted-copy ops-cards-intro">
              Produce exactly what the customer approved: preview, settings and original files.
            </p>
            <OpsCardSpec
              v-for="(line, index) in job.lines"
              :key="index"
              :line="line"
              :index="index"
              :default-open="index === 0"
              :design="
                line.customization?.designId
                  ? (designLookup.get(line.customization.designId) ?? null)
                  : null
              "
            />
          </section>

          <!-- History -->
          <section class="info-card ops-history-card" aria-labelledby="ops-history-title">
            <h2 id="ops-history-title">Production history</h2>
            <p v-if="!history.length" class="muted-copy">No production updates yet.</p>
            <ol v-else class="ops-timeline">
              <li v-for="(event, index) in historyNewestFirst" :key="index">
                <span class="ops-timeline-dot" aria-hidden="true"></span>
                <div>
                  <p class="ops-timeline-title">
                    {{ orderStatusMeta[event.toStatus].label }}
                    <small>from {{ orderStatusMeta[event.fromStatus].label }}</small>
                  </p>
                  <p class="ops-timeline-meta">
                    {{ formatDateTime(event.createdAt) }}
                    <template v-if="event.actor"> · {{ event.actor }}</template>
                  </p>
                  <p v-if="event.trackingNumber" class="ops-timeline-note">
                    <i class="pi pi-truck" aria-hidden="true"></i> Tracking
                    {{ event.trackingNumber }}
                  </p>
                  <p v-if="event.note" class="ops-timeline-note">“{{ event.note }}”</p>
                </div>
              </li>
            </ol>
          </section>
        </div>

        <aside class="order-secondary">
          <section class="info-card ops-progress" aria-labelledby="ops-progress-title">
            <h2 id="ops-progress-title">Progress</h2>
            <ol class="ops-steps">
              <li
                v-for="step in checklist"
                :key="step.status"
                :class="{ 'is-done': step.done, 'is-next': step.status === nextStatus }"
              >
                <span class="ops-step-mark" aria-hidden="true">
                  <i v-if="step.done" class="pi pi-check"></i>
                </span>
                <span>{{ step.label }}</span>
                <small v-if="step.status === nextStatus">Next</small>
              </li>
            </ol>
          </section>

          <section class="info-card ops-order-facts" aria-labelledby="ops-order-title">
            <h2 id="ops-order-title">Order</h2>
            <div class="summary-row">
              <span>Reference</span><strong>{{ job.id }}</strong>
            </div>
            <div class="summary-row">
              <span>Placed</span><strong>{{ formatOrderDate(job.placedAt) }}</strong>
            </div>
            <div class="summary-row">
              <span>Payment</span>
              <strong :class="job.payment.status === 'paid' ? 'ops-paid' : 'ops-unpaid'">
                {{ paymentLabel }}
              </strong>
            </div>
            <div class="summary-row">
              <span>Total</span><strong>{{ formatMoney(job.total) }}</strong>
            </div>
            <div class="summary-row ops-email">
              <span>Customer</span><strong>{{ job.email }}</strong>
            </div>
          </section>

          <section class="notice-card ops-privacy">
            <h2><i class="pi pi-lock" aria-hidden="true"></i> Staff only</h2>
            <p>Never record PINs, CVVs or full card numbers in notes.</p>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>
