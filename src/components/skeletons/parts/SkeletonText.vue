<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

/**
 * Placeholder for a line of text. Put it inside the element that will hold the real text
 * (<strong>, <small>, a pill…): an invisible character keeps a real text line, so the
 * placeholder takes exactly that element's line height and font size, in any layout (flex,
 * grid or inline). Only the width is a guess (capped at the space available); pick one close
 * to typical content.
 */
withDefaults(defineProps<{ width?: string }>(), { width: '6rem' })
</script>

<template>
  <span class="skeleton-text" :style="{ width }" aria-hidden="true"
    >&#8203;<Skeleton width="100%" height="1em" class="skeleton-text-bar"
  /></span>
</template>
