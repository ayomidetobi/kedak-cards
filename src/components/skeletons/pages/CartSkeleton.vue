<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import SkeletonScreen from '../SkeletonScreen.vue'
import CartItemSkeleton from '../parts/CartItemSkeleton.vue'
import OrderSummarySkeleton from '../parts/OrderSummarySkeleton.vue'

withDefaults(defineProps<{ items?: number }>(), { items: 2 })
</script>

<template>
  <main class="journey-main cart-main">
    <SkeletonScreen label="Loading your cart">
      <Skeleton width="9rem" height="1rem" />
      <Skeleton class="skeleton-title skeleton-section" width="14rem" height="2.8rem" />
      <div class="journey-columns cart-layout">
        <div class="cart-items-list">
          <CartItemSkeleton v-for="item in items" :key="item" />
        </div>
        <OrderSummarySkeleton :rows="3" />
      </div>
    </SkeletonScreen>
  </main>
</template>
