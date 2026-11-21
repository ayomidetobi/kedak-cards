<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import SkeletonScreen from '../SkeletonScreen.vue'
import PageHeaderSkeleton from '../parts/PageHeaderSkeleton.vue'

// Generic fallback for content pages without a dedicated skeleton (help, compatibility, login…).
</script>

<template>
  <main class="journey-main">
    <SkeletonScreen>
      <PageHeaderSkeleton :title-lines="2" />
      <div class="skeleton-grid skeleton-section">
        <div v-for="card in 3" :key="card" class="info-card skeleton-card">
          <Skeleton width="2.75rem" height="2.75rem" />
          <Skeleton width="60%" height="1.1rem" />
          <Skeleton height="0.9rem" />
          <Skeleton width="80%" height="0.9rem" />
        </div>
      </div>
    </SkeletonScreen>
  </main>
</template>
