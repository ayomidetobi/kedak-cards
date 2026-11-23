<script setup lang="ts">
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import OrderStatusBadge from './OrderStatusBadge.vue'
import type { OrderSummary } from '../../types/api'
import { formatMoney } from '../../utils/money'
import { formatOrderDate } from '../../utils/orderPolicy'

/**
 * An order in a staff list: the workbench queue (with the "Next" hint) or the compact list on
 * a person's page. With `loading` it renders the same row with placeholders sized to the real
 * content (reference, items line, hint, status pill, total and date).
 */
const props = withDefaults(
  defineProps<{
    order?: OrderSummary
    loading?: boolean
    /** Workbench: show what the team does next. */
    nextHint?: string | null
    compact?: boolean
  }>(),
  { order: undefined, loading: false, nextHint: null, compact: false },
)
</script>

<template>
  <li>
    <span
      v-if="props.loading || !props.order"
      class="ops-row is-skeleton"
      :class="{ 'person-order-row': props.compact }"
      aria-hidden="true"
    >
      <span class="ops-row-main">
        <strong><SkeletonText width="4.6rem" /></strong>
        <small><SkeletonText width="8.5rem" /></small>
      </span>
      <span v-if="!props.compact" class="ops-row-next">
        <small>Next</small>
        <SkeletonText width="9rem" />
      </span>
      <span class="order-status is-skeleton">
        <SkeletonText width="6.5rem" />
      </span>
      <span class="ops-row-meta">
        <strong><SkeletonText width="3rem" /></strong>
        <small><SkeletonText width="5rem" /></small>
      </span>
      <i class="pi pi-chevron-right ops-row-chevron" aria-hidden="true"></i>
    </span>

    <RouterLink
      v-else
      :to="{ name: 'quality-check', query: { order: props.order.id } }"
      class="ops-row"
      :class="{ 'person-order-row': props.compact }"
      :aria-label="`Open production job ${props.order.id}`"
    >
      <span class="ops-row-main">
        <strong>{{ props.order.id }}</strong>
        <small>{{ props.order.itemsSummary }}</small>
      </span>
      <span v-if="!props.compact" class="ops-row-next">
        <small>Next</small>
        {{ props.nextHint ?? '—' }}
      </span>
      <OrderStatusBadge :status="props.order.status" />
      <span class="ops-row-meta">
        <strong>{{ formatMoney(props.order.total) }}</strong>
        <small>{{ formatOrderDate(props.order.placedAt) }}</small>
      </span>
      <i class="pi pi-chevron-right ops-row-chevron" aria-hidden="true"></i>
    </RouterLink>
  </li>
</template>
