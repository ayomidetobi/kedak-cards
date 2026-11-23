<script setup lang="ts">
/**
 * The app's "working…" indicator: three vertical bars rising and falling, in the current text
 * colour. Buttons get the same bars through CSS (PrimeVue's loading icon and `.is-loading`).
 *
 *   <BarsLoader />                       inline (inherits font size and colour)
 *   <BarsLoader size="large" label="Loading page" />
 */
withDefaults(defineProps<{ size?: 'inline' | 'large'; label?: string }>(), {
  size: 'inline',
  label: 'Loading',
})
</script>

<template>
  <span class="bars-loader" :class="`is-${size}`" role="status" :aria-label="label"></span>
</template>
