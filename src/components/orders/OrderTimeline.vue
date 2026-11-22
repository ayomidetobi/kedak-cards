<script setup lang="ts">
import { computed } from 'vue'
import type { Order } from '../../types/api'
import { orderTimeline } from '../../utils/orderStatus'

const props = defineProps<{ order: Order }>()
const steps = computed(() => orderTimeline(props.order))
</script>

<template>
  <ol class="account-steps">
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
