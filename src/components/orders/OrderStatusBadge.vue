<script setup lang="ts">
import { computed } from 'vue'
import type { OrderStatus } from '../../types/api'
import { orderStatusMeta } from '../../utils/orderStatus'

const props = defineProps<{ status: OrderStatus }>()
const meta = computed(() => orderStatusMeta[props.status])
</script>

<template>
  <span class="order-status" :class="`is-${meta.tone}`">
    <i :class="meta.icon" aria-hidden="true"></i>
    {{ meta.label }}
  </span>
</template>
