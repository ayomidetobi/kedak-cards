<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

/**
 * A single value from the API: a placeholder while `loading`, then the slot content.
 * Labels and headings around it stay rendered, so only the data itself pulses.
 *
 *   <dt>Orders</dt>
 *   <dd><SkeletonValue :loading="isPending" width="2rem">{{ count }}</SkeletonValue></dd>
 */
withDefaults(
  defineProps<{ loading: boolean; width?: string; height?: string; rounded?: boolean }>(),
  { width: '4rem', height: '1em', rounded: false },
)
</script>

<template>
  <Skeleton
    v-if="loading"
    class="skeleton-value"
    :width="width"
    :height="height"
    :border-radius="rounded ? '999px' : undefined"
    aria-hidden="true"
  />
  <slot v-else />
</template>
