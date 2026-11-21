<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

// Eyebrow + page title (one or two lines) + intro line, as used at the top of most pages.
withDefaults(defineProps<{ titleLines?: 1 | 2; intro?: boolean }>(), {
  titleLines: 1,
  intro: true,
})
</script>

<template>
  <div class="skeleton-page-header">
    <Skeleton width="9rem" height="0.75rem" />
    <Skeleton class="skeleton-title" width="min(26rem, 85%)" height="2.6rem" />
    <Skeleton
      v-if="titleLines === 2"
      class="skeleton-title"
      width="min(18rem, 60%)"
      height="2.6rem"
    />
    <Skeleton v-if="intro" width="min(32rem, 95%)" height="1rem" />
  </div>
</template>
