<script setup lang="ts">
import { artworkCategories } from '../../data/artwork'
import type { CardCategory } from '../../types/card'

defineProps<{ modelValue: CardCategory }>()
const emit = defineEmits<{ 'update:modelValue': [value: CardCategory] }>()
</script>

<template>
  <div class="category-tabs" role="tablist" aria-label="Design category">
    <button
      v-for="category in artworkCategories"
      :key="category"
      type="button"
      role="tab"
      :aria-selected="modelValue === category"
      :class="{ active: modelValue === category }"
      @click="emit('update:modelValue', category)"
    >
      {{ category }}
    </button>
  </div>
</template>
