<script setup lang="ts">
import type { CardFinish } from '../types/card'
import { finishes } from '../stores/cardCustomization'
import CardPreview from './card/CardPreview.vue'
import type { CardDesign } from '../types/card'

const props = withDefaults(defineProps<{ finish: CardFinish; showDesignMark?: boolean }>(), {
  showDesignMark: false,
})
const sampleDesign: CardDesign = { id: 'preview', name: 'Preview', category: 'Anime', number: '01' }

function finishPrice(finish: CardFinish) {
  return finishes.find((item) => item.name === finish)!.price
}
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
    <span>£{{ finishPrice(props.finish) }}</span>
  </div>
</template>
