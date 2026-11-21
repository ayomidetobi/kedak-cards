<script setup lang="ts">
import { computed } from 'vue'
import CardCustomizer from '../components/card/CardCustomizer.vue'
import { useCardCustomization } from '../composables/useCardCustomization'
import CollectionProductCard from '../components/CollectionProductCard.vue'
import TextLink from '../components/TextLink.vue'
import { collectionProducts } from '../data/collectionProducts'

const customization = useCardCustomization()
const otherFinishes = computed(() =>
  collectionProducts.filter((product) => product.finish !== customization.store.finish),
)
</script>

<template>
  <main class="collection-customization-view">
    <CardCustomizer />
    <section class="journey-main other-finishes-section" aria-labelledby="other-finishes-heading">
      <p class="eyebrow">EXPLORE THE COLLECTION</p>
      <h2 id="other-finishes-heading" class="section-title">Other finishes</h2>
      <div class="collections-grid">
        <CollectionProductCard
          v-for="product in otherFinishes"
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
