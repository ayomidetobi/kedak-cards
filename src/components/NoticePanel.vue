<script setup lang="ts">
/**
 * Full-width status message for a page or step: an icon, a title, a short message and optional
 * actions. One component for every such state so they look the same everywhere, e.g. "Finish
 * your cart first", "Taking you to Stripe…", "Your order details are in your email".
 *
 *   tone="info"      neutral information (default)
 *   tone="warning"   something blocks the next step
 *   tone="progress"  work in progress (shows a spinner instead of the icon)
 *
 * Actions follow the house rule: one solid primary button, then a TextLink for the second.
 */
const props = withDefaults(
  defineProps<{
    title: string
    tone?: 'info' | 'warning' | 'progress'
    icon?: string
    /** Use 1 when the panel is the page's main content (it then carries the page heading). */
    level?: 1 | 2
  }>(),
  { tone: 'info', icon: 'pi pi-info-circle', level: 2 },
)
</script>

<template>
  <section
    class="notice-panel"
    :class="`is-${props.tone}`"
    :role="props.tone === 'warning' ? 'alert' : 'status'"
    :aria-busy="props.tone === 'progress' || undefined"
  >
    <span class="notice-panel-icon" aria-hidden="true">
      <i :class="props.tone === 'progress' ? 'pi pi-spin pi-spinner' : props.icon"></i>
    </span>
    <div class="notice-panel-copy">
      <component :is="`h${props.level}`" class="notice-panel-title">{{ props.title }}</component>
      <div class="notice-panel-body"><slot /></div>
      <div v-if="$slots.actions" class="notice-panel-actions"><slot name="actions" /></div>
    </div>
  </section>
</template>
