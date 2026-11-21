<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

// Mirrors the order summary card used on the cart and checkout pages.
withDefaults(defineProps<{ rows?: number; action?: boolean }>(), { rows: 3, action: true })
</script>

<template>
  <div class="info-card skeleton-card">
    <Skeleton width="45%" height="1.3rem" />
    <div v-for="row in rows" :key="row" class="skeleton-row skeleton-divider">
      <Skeleton width="45%" height="0.95rem" />
      <Skeleton width="3.5rem" height="0.95rem" />
    </div>
    <div class="skeleton-row">
      <Skeleton width="4rem" height="1.2rem" />
      <Skeleton width="5rem" height="1.6rem" />
    </div>
    <Skeleton v-if="action" height="3rem" />
  </div>
</template>
