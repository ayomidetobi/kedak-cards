<script setup lang="ts">
import { computed } from 'vue'
import { isFinishInStock } from '../stores/cardCustomization'
import type { CardFinish } from '../types/card'

const props = defineProps<{ finish: CardFinish }>()
const inStock = computed(() => isFinishInStock(props.finish))
</script>

<template>
  <span class="stock-badge" :class="inStock ? 'is-in-stock' : 'is-out-of-stock'">
    <i :class="inStock ? 'pi pi-check' : 'pi pi-ban'" aria-hidden="true"></i>
    {{ inStock ? 'In stock' : 'Out of stock' }}
  </span>
</template>
