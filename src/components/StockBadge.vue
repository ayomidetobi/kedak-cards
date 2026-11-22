<script setup lang="ts">
import { computed } from 'vue'
import { useFinishCatalog } from '../queries/catalog'
import type { CardFinish } from '../types/card'

const props = defineProps<{ finish: CardFinish }>()
const catalog = useFinishCatalog()
// Stock comes from GET /finishes; nothing is shown until the server has answered.
const known = computed(() => catalog.finish(props.finish) !== null)
const inStock = computed(() => catalog.isInStock(props.finish))
</script>

<template>
  <span v-if="known" class="stock-badge" :class="inStock ? 'is-in-stock' : 'is-out-of-stock'">
    <i :class="inStock ? 'pi pi-check' : 'pi pi-ban'" aria-hidden="true"></i>
    {{ inStock ? 'In stock' : 'Out of stock' }}
  </span>
</template>
