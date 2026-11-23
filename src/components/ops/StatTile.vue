<script setup lang="ts">
import SkeletonText from '../skeletons/parts/SkeletonText.vue'

/**
 * Summary tile (workbench, People, person summary). The icon and label are static and always
 * render; while `loading`, only the value (and detail) become placeholders inside the same
 * elements, so the tile keeps its exact size. Clickable tiles act as filters (`select`).
 */
const props = withDefaults(
  defineProps<{
    icon: string
    label: string
    value?: string | number | null
    detail?: string
    loading?: boolean
    /** Placeholder width for the value; numbers are short, words longer. */
    valueWidth?: string
    /** Reserve the detail line while loading (it only has text once data arrives). */
    hasDetail?: boolean
    active?: boolean
    interactive?: boolean
  }>(),
  {
    value: null,
    detail: '',
    loading: false,
    valueWidth: '2.2ch',
    hasDetail: false,
    active: false,
    interactive: true,
  },
)
defineEmits<{ select: [] }>()
</script>

<template>
  <component
    :is="props.interactive ? 'button' : 'div'"
    :type="props.interactive ? 'button' : undefined"
    class="ops-stat"
    :class="{ 'is-active': props.active, 'is-static': !props.interactive }"
    :aria-pressed="props.interactive ? props.active : undefined"
    :aria-busy="props.loading || undefined"
    @click="props.interactive && $emit('select')"
  >
    <span class="icon-tile icon-tile--small" aria-hidden="true"><i :class="props.icon"></i></span>
    <span class="ops-stat-copy">
      <strong>
        <SkeletonText v-if="props.loading" :width="props.valueWidth" />
        <template v-else>{{ props.value }}</template>
      </strong>
      <small>{{ props.label }}</small>
      <em v-if="props.loading && props.hasDetail" class="people-stat-detail">
        <SkeletonText width="9rem" />
      </em>
      <em v-else-if="props.detail" class="people-stat-detail">{{ props.detail }}</em>
    </span>
  </component>
</template>
