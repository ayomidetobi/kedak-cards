<script setup lang="ts">
/**
 * Placeholder rows for a list, table or grid whose items come from the API. The surrounding
 * card, heading and column headers stay rendered; the slot is one row in the page's own markup
 * (same classes as a real row, with <Skeleton> in place of values), repeated `rows` times.
 * Screen readers hear `label` once; the shapes themselves are hidden from them.
 *
 *   <SkeletonRows v-if="isPending" :rows="5" label="Loading orders">
 *     <li class="ops-row"><Skeleton width="6rem" /> …</li>
 *   </SkeletonRows>
 *   <template v-else> …real rows… </template>
 */
withDefaults(defineProps<{ rows?: number; label?: string }>(), { rows: 5, label: 'Loading' })
</script>

<template>
  <span class="visually-hidden" role="status">{{ label }}…</span>
  <template v-for="index in rows" :key="index">
    <slot :index="index" />
  </template>
</template>
