<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import SkeletonScreen from '../SkeletonScreen.vue'
import OrderSummarySkeleton from '../parts/OrderSummarySkeleton.vue'
import PageHeaderSkeleton from '../parts/PageHeaderSkeleton.vue'
import ProductCardSkeleton from '../parts/ProductCardSkeleton.vue'

// Collections / customise: the card customiser followed by the "other finishes" grid.
</script>

<template>
  <main class="journey-main">
    <SkeletonScreen label="Loading the card customiser">
      <PageHeaderSkeleton :title-lines="2" :intro="false" />
      <div class="skeleton-two-up skeleton-section">
        <Skeleton height="4.75rem" />
        <Skeleton height="4.75rem" />
      </div>
      <div class="skeleton-split skeleton-section">
        <div class="skeleton-panel">
          <div class="skeleton-row">
            <Skeleton width="6rem" height="0.75rem" />
            <Skeleton width="5rem" height="1.8rem" />
          </div>
          <Skeleton class="skeleton-card-visual" />
          <Skeleton width="60%" height="0.85rem" class="skeleton-center" />
        </div>
        <div class="skeleton-stack skeleton-stack--loose">
          <Skeleton width="50%" height="1.1rem" />
          <Skeleton height="3rem" />
          <div class="skeleton-three-up">
            <Skeleton v-for="design in 3" :key="design" class="skeleton-card-visual" />
          </div>
          <Skeleton class="skeleton-field" />
          <OrderSummarySkeleton :rows="2" />
        </div>
      </div>
      <div class="skeleton-stack skeleton-section">
        <Skeleton width="10rem" height="0.75rem" />
        <Skeleton width="14rem" height="2.2rem" />
      </div>
      <div class="collections-grid">
        <ProductCardSkeleton v-for="card in 3" :key="card" />
      </div>
    </SkeletonScreen>
  </main>
</template>
