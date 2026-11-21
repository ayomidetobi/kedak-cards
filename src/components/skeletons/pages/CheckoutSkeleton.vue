<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import SkeletonScreen from '../SkeletonScreen.vue'
import FormSectionSkeleton from '../parts/FormSectionSkeleton.vue'
import OrderSummarySkeleton from '../parts/OrderSummarySkeleton.vue'
import PageHeaderSkeleton from '../parts/PageHeaderSkeleton.vue'
</script>

<template>
  <main class="journey-main checkout-main">
    <SkeletonScreen label="Loading checkout">
      <Skeleton width="8rem" height="1rem" />
      <PageHeaderSkeleton class="skeleton-section" />
      <div class="skeleton-row skeleton-row--start skeleton-section">
        <Skeleton v-for="step in 3" :key="step" width="7rem" height="1.6rem" />
      </div>
      <div class="checkout-layout skeleton-section">
        <div class="checkout-details">
          <Skeleton height="3rem" />
          <FormSectionSkeleton :fields="3" />
          <FormSectionSkeleton :fields="4" />
        </div>
        <div class="checkout-payment-column">
          <OrderSummarySkeleton :rows="3" :action="false" />
          <div class="info-card skeleton-card">
            <Skeleton width="40%" height="1.2rem" />
            <Skeleton height="4.5rem" />
            <Skeleton height="3.25rem" />
          </div>
        </div>
      </div>
    </SkeletonScreen>
  </main>
</template>
