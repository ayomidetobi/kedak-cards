<script setup lang="ts">
import { computed } from 'vue'
import CardCustomizer from '../components/card/CardCustomizer.vue'
import { useCardCustomization } from '../composables/useCardCustomization'
import CollectionProductCard from '../components/CollectionProductCard.vue'
import ProductCardSkeleton from '../components/skeletons/parts/ProductCardSkeleton.vue'
import TextLink from '../components/TextLink.vue'
import { collectionProduct } from '../data/collectionProducts'
import { useFinishCatalog } from '../queries/catalog'

const customization = useCardCustomization()
const catalog = useFinishCatalog()
const otherFinishes = computed(() =>
  catalog.finishes.value
    .filter((finish) => finish.name !== customization.store.finish)
    .map((finish) => collectionProduct(finish.name)),
)
</script>

<template>
  <main class="collection-customization-view">
    <CardCustomizer />
    <section class="journey-main other-finishes-section" aria-labelledby="other-finishes-heading">
      <p class="eyebrow">EXPLORE THE COLLECTION</p>
      <h2 id="other-finishes-heading" class="section-title">Other finishes</h2>
      <p v-if="catalog.isError.value" class="api-state is-error" role="alert">
        Finishes couldn’t load.
        <button type="button" class="api-retry" @click="catalog.refetch()">Try again</button>
      </p>
      <div class="collections-grid" :aria-busy="catalog.isLoading.value">
        <template v-if="catalog.isLoading.value">
          <ProductCardSkeleton v-for="index in 3" :key="index" />
        </template>
        <CollectionProductCard
          v-for="product in otherFinishes"
          v-else
          :key="product.finish"
          v-bind="product"
        />
      </div>
      <p class="legal-note">
        Prices shown are for the conversion service. Your existing payment card is required.
      </p>
      <div class="section-link">
        <TextLink to="/help">Will my card work?</TextLink>
      </div>
    </section>
  </main>
</template>
