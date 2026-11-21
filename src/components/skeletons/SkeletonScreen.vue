<script setup lang="ts">
// Wraps a skeleton layout: announces "Loading…" to screen readers once and hides the
// placeholder shapes from assistive technology.
withDefaults(defineProps<{ label?: string }>(), { label: 'Loading content' })
</script>

<template>
  <div class="skeleton-screen" role="status" aria-live="polite" aria-busy="true">
    <span class="visually-hidden">{{ label }}…</span>
    <div class="skeleton-screen-body" aria-hidden="true">
      <slot />
    </div>
  </div>
</template>
