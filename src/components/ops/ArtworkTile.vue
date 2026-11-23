<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import type { StaffArtwork } from '../../services/api/endpoints/products'

/**
 * A design in the Products artwork library. With `loading` it renders the same tile: the
 * square artwork area as a placeholder, and name / ID placeholders in the real text lines.
 */
const props = defineProps<{ design?: StaffArtwork; loading?: boolean; selected?: boolean }>()
defineEmits<{ select: [] }>()
</script>

<template>
  <li>
    <span
      v-if="props.loading || !props.design"
      class="products-tile is-skeleton"
      aria-hidden="true"
    >
      <Skeleton width="100%" height="auto" class="products-tile-art products-tile-art-skeleton" />
      <span class="products-tile-copy">
        <strong><SkeletonText width="80%" /></strong>
        <small><SkeletonText width="4rem" /></small>
      </span>
    </span>
    <button
      v-else
      type="button"
      class="products-tile"
      :class="{ 'is-selected': props.selected, 'is-hidden': !props.design.isPublished }"
      :aria-pressed="props.selected"
      @click="$emit('select')"
    >
      <span class="products-tile-art">
        <img
          v-if="props.design.artworkUrl"
          :src="props.design.artworkUrl"
          :alt="props.design.name"
          loading="lazy"
        />
      </span>
      <span class="products-tile-copy">
        <strong>{{ props.design.name }}</strong>
        <small>{{ props.design.id }}</small>
      </span>
      <span v-if="!props.design.isPublished" class="products-tile-flag">Hidden</span>
    </button>
  </li>
</template>
