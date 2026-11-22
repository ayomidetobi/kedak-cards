<script setup lang="ts">
import { computed } from 'vue'
import type { CardDesign, CardFinish } from '../types/card'
import { useFinishCatalog } from '../queries/catalog'
import { formatMoney } from '../utils/money'
import CardPreview from './card/CardPreview.vue'

const props = withDefaults(defineProps<{ finish: CardFinish; showDesignMark?: boolean }>(), {
  showDesignMark: false,
})
const sampleDesign: CardDesign = { id: 'preview', name: 'Preview', category: 'Anime', number: '01' }
const catalog = useFinishCatalog()
const price = computed(() => catalog.price(props.finish))
</script>

<template>
  <CardPreview
    :design="sampleDesign"
    :finish="props.finish"
    engraving-style="name"
    holder-name="ALEX MORGAN"
    :uploaded-artwork="null"
    :show-design-mark="props.showDesignMark"
  />
  <div class="finish-card-caption">
    <strong>{{ props.finish }}</strong>
    <span v-if="price">{{ formatMoney(price) }}</span>
    <span v-else class="price-pending" aria-label="Price loading">—</span>
  </div>
</template>
