<script setup lang="ts">
import { useArtworkCategoriesQuery } from '../../queries/artwork'
import type { CardCategory } from '../../types/card'

defineProps<{ modelValue: CardCategory | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: CardCategory] }>()

// Categories (and their order) come from GET /artwork/categories.
const categoriesQuery = useArtworkCategoriesQuery()
</script>

<template>
  <div
    class="category-tabs"
    role="tablist"
    aria-label="Design category"
    :aria-busy="categoriesQuery.isPending.value"
  >
    <template v-if="categoriesQuery.data.value?.length">
      <button
        v-for="category in categoriesQuery.data.value"
        :key="category.name"
        type="button"
        role="tab"
        :aria-selected="modelValue === category.name"
        :class="{ active: modelValue === category.name }"
        @click="emit('update:modelValue', category.name)"
      >
        {{ category.name }}
      </button>
    </template>
    <template v-else-if="categoriesQuery.isPending.value">
      <button
        v-for="index in 5"
        :key="index"
        type="button"
        role="tab"
        disabled
        aria-label="Loading"
      >
        &nbsp;
      </button>
    </template>
    <p v-else-if="categoriesQuery.isError.value" class="api-state is-error" role="alert">
      Artwork categories couldn’t load.
      <button type="button" class="api-retry" @click="categoriesQuery.refetch()">Try again</button>
    </p>
  </div>
</template>
