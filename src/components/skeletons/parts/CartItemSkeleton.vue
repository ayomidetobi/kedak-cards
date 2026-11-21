<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

// Mirrors a cart line item: thumbnail, title, status badge, details, quantity + total, actions.
</script>

<template>
  <div class="info-card skeleton-card">
    <div class="skeleton-media-row">
      <Skeleton class="skeleton-thumb" />
      <div class="skeleton-stack">
        <Skeleton width="60%" height="1.2rem" />
        <Skeleton width="7rem" height="1.6rem" />
        <Skeleton width="75%" height="0.9rem" />
      </div>
    </div>
    <div class="skeleton-row skeleton-divider">
      <Skeleton width="7rem" height="2.75rem" />
      <Skeleton width="4rem" height="1.4rem" />
    </div>
    <div class="skeleton-row">
      <Skeleton width="8rem" height="2.5rem" />
      <Skeleton width="6rem" height="2.5rem" />
    </div>
  </div>
</template>
