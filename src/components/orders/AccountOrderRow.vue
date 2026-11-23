<script setup lang="ts">
import OrderStatusBadge from './OrderStatusBadge.vue'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import type { OrderSummary } from '../../types/api'
import { formatMoney } from '../../utils/money'
import { formatOrderDate } from '../../utils/orderPolicy'

/**
 * An order in the customer's account list. With `loading` it renders the same row with
 * placeholders sized to the real content ("Order KD-…", date and items, status pill, total).
 */
const props = defineProps<{ order?: OrderSummary; loading?: boolean }>()
</script>

<template>
  <li>
    <span
      v-if="props.loading || !props.order"
      class="account-order-row is-skeleton"
      aria-hidden="true"
    >
      <span class="account-order-row-main">
        <strong><SkeletonText width="7.5rem" /></strong>
        <small><SkeletonText width="14rem" /></small>
      </span>
      <span class="account-order-row-meta">
        <span class="order-status is-skeleton"><SkeletonText width="6.5rem" /></span>
        <strong><SkeletonText width="3rem" /></strong>
      </span>
      <i class="pi pi-chevron-right account-link-chevron" aria-hidden="true"></i>
    </span>
    <RouterLink v-else :to="`/account/orders/${props.order.id}`" class="account-order-row">
      <span class="account-order-row-main">
        <strong>Order {{ props.order.id }}</strong>
        <small>
          Placed {{ formatOrderDate(props.order.placedAt) }} · {{ props.order.itemsSummary }}
        </small>
      </span>
      <span class="account-order-row-meta">
        <OrderStatusBadge :status="props.order.status" />
        <strong>{{ formatMoney(props.order.total) }}</strong>
      </span>
      <i class="pi pi-chevron-right account-link-chevron" aria-hidden="true"></i>
    </RouterLink>
  </li>
</template>
