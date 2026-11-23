<script setup lang="ts">
import { computed } from 'vue'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import type { Order } from '../../types/api'
import { orderTimeline } from '../../utils/orderStatus'

/**
 * Order progress steps. With `loading` (no order yet) it renders the usual six fulfilment
 * steps' markers and lines with text placeholders, so the card keeps its final size.
 */
const props = defineProps<{ order?: Order | null; loading?: boolean }>()
const steps = computed(() => (props.order ? orderTimeline(props.order) : []))
const PLACEHOLDER_STEPS = 6
</script>

<template>
  <ol v-if="props.loading || !props.order" class="account-steps" aria-hidden="true">
    <li v-for="index in PLACEHOLDER_STEPS" :key="index">
      <span class="account-step-marker">{{ String(index).padStart(2, '0') }}</span>
      <div>
        <strong><SkeletonText :width="index % 2 ? '9rem' : '11rem'" /></strong>
        <small><SkeletonText :width="index % 2 ? '8rem' : '6.5rem'" /></small>
      </div>
    </li>
  </ol>
  <ol v-else class="account-steps">
    <li
      v-for="(step, index) in steps"
      :key="step.title"
      :class="{ 'is-done': step.state === 'done', 'is-current': step.state === 'current' }"
      :aria-current="step.state === 'current' ? 'step' : undefined"
    >
      <span class="account-step-marker" aria-hidden="true">
        <i v-if="step.state === 'done'" class="pi pi-check"></i>
        <template v-else>{{ String(index + 1).padStart(2, '0') }}</template>
      </span>
      <div>
        <strong>{{ step.title }}</strong>
        <small v-if="step.detail">{{ step.detail }}</small>
      </div>
      <span v-if="step.state === 'current'" class="account-step-tag">In progress</span>
    </li>
  </ol>
</template>
