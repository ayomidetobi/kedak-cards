<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

// Mirrors CollectionProductCard: card visual, name + price, stock badge, description, actions.
</script>

<template>
  <div class="info-card skeleton-card">
    <Skeleton class="skeleton-card-visual" />
    <div class="skeleton-row">
      <Skeleton width="40%" height="1.25rem" />
      <Skeleton width="18%" height="1.25rem" />
    </div>
    <Skeleton width="6rem" height="1.6rem" />
    <Skeleton width="80%" height="0.9rem" />
    <div class="skeleton-row">
      <Skeleton width="7rem" height="2.75rem" />
      <Skeleton class="skeleton-grow" height="2.75rem" />
    </div>
  </div>
</template>
