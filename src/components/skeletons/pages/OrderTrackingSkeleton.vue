<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import SkeletonScreen from '../SkeletonScreen.vue'
import PageHeaderSkeleton from '../parts/PageHeaderSkeleton.vue'
</script>

<template>
  <main class="journey-main">
    <SkeletonScreen label="Loading order status">
      <PageHeaderSkeleton />
      <div class="info-card skeleton-card skeleton-section skeleton-narrow">
        <Skeleton width="10rem" height="1.6rem" />
        <div v-for="step in 5" :key="step" class="skeleton-media-row skeleton-divider">
          <Skeleton shape="circle" size="1.75rem" />
          <div class="skeleton-stack">
            <Skeleton width="45%" height="0.95rem" />
            <Skeleton width="65%" height="0.8rem" />
          </div>
        </div>
      </div>
    </SkeletonScreen>
  </main>
</template>
