<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { RouterLink } from 'vue-router'
import { useCardCustomization } from '../composables/useCardCustomization'
import type { CollectionProduct } from '../data/collectionProducts'
import { useFinishCatalog } from '../queries/catalog'
import { MAX_ITEM_QUANTITY } from '../types/card'
import FinishCard from './FinishCard.vue'
import StockBadge from './StockBadge.vue'

const { finish, description } = defineProps<CollectionProduct>()
const customization = useCardCustomization()
const toast = useToast()
const catalog = useFinishCatalog()
const quantity = ref(1)
// Stock is the server's answer (GET /finishes); while it loads, nothing can be added.
const inStock = computed(() => catalog.isInStock(finish))
const stockKnown = computed(() => catalog.finish(finish) !== null)

function updateQuantity(amount: number) {
  quantity.value = Math.min(MAX_ITEM_QUANTITY, Math.max(1, quantity.value + amount))
}

function openCustomizer() {
  customization.startNewCustomization(finish)
}

function addToCart() {
  if (!inStock.value) return
  customization.store.addUncustomizedItem(finish, quantity.value)
  toast.add({
    severity: 'success',
    summary: 'Added to cart',
    detail: `${quantity.value} ${finish} card${quantity.value === 1 ? '' : 's'} ready to customise.`,
    life: 2600,
  })
}
</script>

<template>
  <article class="collection-product">
    <RouterLink to="/customise" class="collection-product-link" @click="openCustomizer">
      <FinishCard :finish="finish" />
      <StockBadge :finish="finish" />
      <p class="collection-product-description">{{ description }}</p>
    </RouterLink>
    <div class="collection-product-actions">
      <div class="quantity-control" role="group" :aria-label="`${finish} quantity`">
        <button
          type="button"
          :aria-label="`Decrease ${finish} quantity`"
          :disabled="!inStock || quantity === 1"
          @click="updateQuantity(-1)"
        >
          <i class="pi pi-minus" aria-hidden="true"></i>
        </button>
        <output aria-live="polite">{{ quantity }}</output>
        <button
          type="button"
          :aria-label="`Increase ${finish} quantity`"
          :disabled="!inStock || quantity === MAX_ITEM_QUANTITY"
          @click="updateQuantity(1)"
        >
          <i class="pi pi-plus" aria-hidden="true"></i>
        </button>
      </div>
      <Button
        size="small"
        class="collection-add-to-cart"
        :label="!stockKnown ? 'Add to cart' : inStock ? 'Add to cart' : 'Out of stock'"
        :icon="!stockKnown || inStock ? 'pi pi-shopping-cart' : 'pi pi-ban'"
        :disabled="!inStock"
        @click="addToCart"
      />
    </div>
  </article>
</template>
