<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import SkeletonScreen from '../SkeletonScreen.vue'
</script>

<template>
  <main class="journey-main product-main">
    <SkeletonScreen label="Loading product">
      <Skeleton width="12rem" height="0.75rem" />
      <section class="product-split">
        <div class="skeleton-panel">
          <Skeleton class="skeleton-card-visual" />
          <Skeleton width="65%" height="0.85rem" class="skeleton-center" />
        </div>
        <div class="skeleton-stack skeleton-stack--loose">
          <Skeleton width="9rem" height="0.9rem" />
          <Skeleton width="55%" height="2.8rem" />
          <Skeleton width="40%" height="1rem" />
          <div class="skeleton-row skeleton-row--start">
            <Skeleton width="5rem" height="1.8rem" />
            <Skeleton width="6rem" height="1.6rem" />
          </div>
          <div class="skeleton-stack">
            <Skeleton height="0.95rem" />
            <Skeleton width="85%" height="0.95rem" />
          </div>
          <div class="skeleton-four-up">
            <Skeleton v-for="finish in 4" :key="finish" height="2.6rem" />
          </div>
          <Skeleton height="2.75rem" />
          <Skeleton height="2.75rem" />
          <div class="info-card skeleton-card">
            <Skeleton width="55%" height="1.1rem" />
            <Skeleton v-for="line in 3" :key="line" width="75%" height="0.9rem" />
          </div>
        </div>
      </section>
    </SkeletonScreen>
  </main>
</template>
