<script setup lang="ts">
import SkeletonText from '../skeletons/parts/SkeletonText.vue'

/**
 * Artwork category filter (Products page): name and live/hidden counts. With `loading` the
 * chip keeps its size; a known `name` (e.g. "All artwork") stays visible and only the API
 * parts (name if unknown, counts) become placeholders.
 */
const props = defineProps<{
  name?: string
  published?: number
  hidden?: number
  active?: boolean
  loading?: boolean
}>()
defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    class="products-category"
    :class="{ 'is-active': props.active, 'is-skeleton': props.loading }"
    :aria-pressed="props.active"
    :disabled="props.loading && !props.name"
    @click="$emit('select')"
  >
    <strong>
      <template v-if="props.name">{{ props.name }}</template>
      <SkeletonText v-else width="3.5rem" />
    </strong>
    <small>
      <SkeletonText v-if="props.loading" width="6rem" />
      <template v-else>{{ props.published }} live · {{ props.hidden }} hidden</template>
    </small>
  </button>
</template>
