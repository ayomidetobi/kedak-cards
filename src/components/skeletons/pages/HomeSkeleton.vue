<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import SkeletonScreen from '../SkeletonScreen.vue'
import ProductCardSkeleton from '../parts/ProductCardSkeleton.vue'
</script>

<template>
  <main class="journey-main home-main">
    <SkeletonScreen label="Loading home page">
      <section class="home-hero">
        <div class="skeleton-stack skeleton-stack--loose">
          <Skeleton width="10rem" height="0.75rem" />
          <div class="skeleton-stack">
            <Skeleton width="90%" height="3.4rem" />
            <Skeleton width="75%" height="3.4rem" />
            <Skeleton width="50%" height="3.4rem" />
          </div>
          <Skeleton width="85%" height="1.1rem" />
          <div class="skeleton-row skeleton-row--start">
            <Skeleton width="13rem" height="2.75rem" />
            <Skeleton width="8rem" height="1.1rem" />
          </div>
          <Skeleton width="60%" height="0.85rem" />
        </div>
        <div class="skeleton-panel">
          <Skeleton class="skeleton-card-visual" />
          <div class="skeleton-row">
            <Skeleton width="30%" height="1.3rem" />
            <Skeleton width="18%" height="1.3rem" />
          </div>
          <div class="skeleton-row skeleton-divider">
            <Skeleton width="45%" height="0.85rem" />
            <Skeleton width="20%" height="0.85rem" />
          </div>
        </div>
      </section>
      <section class="home-section">
        <div class="skeleton-stack">
          <Skeleton width="11rem" height="0.75rem" />
          <Skeleton width="16rem" height="2.4rem" />
        </div>
        <div class="featured-finishes">
          <ProductCardSkeleton v-for="card in 2" :key="card" />
        </div>
      </section>
    </SkeletonScreen>
  </main>
</template>
