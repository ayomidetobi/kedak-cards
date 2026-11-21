<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

// Mirrors a numbered checkout-style form section: heading row and a set of input fields.
withDefaults(defineProps<{ fields?: number }>(), { fields: 3 })
</script>

<template>
  <div class="info-card skeleton-card">
    <div class="skeleton-media-row skeleton-divider-bottom">
      <Skeleton shape="circle" size="1.9rem" />
      <div class="skeleton-stack">
        <Skeleton width="40%" height="1.2rem" />
        <Skeleton width="70%" height="0.9rem" />
      </div>
    </div>
    <Skeleton v-for="field in fields" :key="field" class="skeleton-field" />
  </div>
</template>
