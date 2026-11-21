<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import SkeletonScreen from '../SkeletonScreen.vue'
import PageHeaderSkeleton from '../parts/PageHeaderSkeleton.vue'
</script>

<template>
  <main class="journey-main account-main">
    <SkeletonScreen label="Loading your account">
      <div class="skeleton-row skeleton-row--end">
        <PageHeaderSkeleton class="skeleton-grow" />
        <Skeleton width="7rem" height="2.75rem" />
      </div>
      <div class="account-layout">
        <div class="account-primary">
          <div class="info-card skeleton-card">
            <div class="skeleton-row">
              <div class="skeleton-stack skeleton-grow">
                <Skeleton width="7rem" height="0.75rem" />
                <Skeleton width="45%" height="1.5rem" />
              </div>
              <Skeleton width="10rem" height="1.6rem" />
            </div>
            <Skeleton height="6.5rem" />
            <Skeleton width="50%" height="0.95rem" />
            <Skeleton height="0.4rem" />
            <Skeleton height="4rem" />
            <div class="skeleton-row skeleton-row--start">
              <Skeleton width="11rem" height="2.75rem" />
              <Skeleton width="8rem" height="1rem" />
            </div>
          </div>
          <div class="info-card skeleton-card">
            <Skeleton width="50%" height="1.2rem" />
            <div v-for="step in 5" :key="step" class="skeleton-media-row skeleton-divider">
              <Skeleton shape="circle" size="2rem" />
              <div class="skeleton-stack">
                <Skeleton width="45%" height="0.95rem" />
                <Skeleton width="65%" height="0.8rem" />
              </div>
            </div>
          </div>
        </div>
        <div class="account-secondary">
          <div class="info-card skeleton-card skeleton-media-row">
            <Skeleton shape="circle" size="3.25rem" />
            <div class="skeleton-stack">
              <Skeleton width="60%" height="1rem" />
              <Skeleton width="80%" height="0.85rem" />
            </div>
          </div>
          <div class="info-card skeleton-card">
            <Skeleton width="40%" height="1.2rem" />
            <div v-for="link in 3" :key="link" class="skeleton-media-row skeleton-divider">
              <Skeleton width="2.25rem" height="2.25rem" />
              <div class="skeleton-stack">
                <Skeleton width="55%" height="0.95rem" />
                <Skeleton width="70%" height="0.8rem" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonScreen>
  </main>
</template>
