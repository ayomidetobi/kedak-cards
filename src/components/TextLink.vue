<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

withDefaults(
  defineProps<{
    to: RouteLocationRaw
    direction?: 'forward' | 'back'
  }>(),
  { direction: 'forward' },
)
</script>

<template>
  <RouterLink :to="to" class="text-link" :class="`text-link--${direction}`">
    <svg
      v-if="direction === 'back'"
      class="text-link-arrow"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M13 8H3M7 4 3 8l4 4" />
    </svg>
    <span class="text-link-label"><slot /></span>
    <svg
      v-if="direction === 'forward'"
      class="text-link-arrow"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  </RouterLink>
</template>
