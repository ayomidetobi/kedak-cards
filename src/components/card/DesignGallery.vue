<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CardDesign } from '../../types/card'

const props = withDefaults(
  defineProps<{
    designs: CardDesign[]
    selectedId: string | null
    /** Designs are still loading from the API. */
    loading?: boolean
    /** Customer-facing error when the designs couldn't load. */
    error?: string
  }>(),
  { loading: false, error: '' },
)
const emit = defineEmits<{ select: [designId: string]; retry: [] }>()

const track = ref<HTMLElement | null>(null)
const canScrollPrev = ref(false)
const canScrollNext = ref(false)
let resizeObserver: ResizeObserver | undefined

function updateControls() {
  const el = track.value
  if (!el) return
  canScrollPrev.value = el.scrollLeft > 1
  canScrollNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function scrollPage(direction: 1 | -1) {
  const el = track.value
  if (!el || typeof el.scrollBy !== 'function') return
  el.scrollBy({
    left: direction * el.clientWidth * 0.9,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

// Bring the selected design into view (e.g. when editing a cart item or switching category).
function revealSelected() {
  const el = track.value
  if (!el) return
  const selected = el.querySelector<HTMLElement>('[aria-pressed="true"]')
  if (!selected) {
    el.scrollLeft = 0
  } else if (
    selected.offsetLeft < el.scrollLeft ||
    selected.offsetLeft + selected.offsetWidth > el.scrollLeft + el.clientWidth
  ) {
    el.scrollLeft = selected.offsetLeft
  }
  updateControls()
}

onMounted(() => {
  revealSelected()
  if (typeof ResizeObserver !== 'undefined' && track.value) {
    resizeObserver = new ResizeObserver(updateControls)
    resizeObserver.observe(track.value)
  }
})

onBeforeUnmount(() => resizeObserver?.disconnect())

watch(
  () => props.designs,
  async () => {
    await nextTick()
    revealSelected()
  },
)
</script>

<template>
  <div class="design-carousel" role="region" aria-roledescription="carousel" aria-label="Designs">
    <p v-if="error" class="upload-error design-gallery-state" role="alert">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      <span>{{ error }}</span>
      <button type="button" class="design-gallery-retry" @click="emit('retry')">Try again</button>
    </p>
    <div
      v-else-if="loading"
      class="design-gallery is-loading"
      aria-busy="true"
      aria-label="Loading designs"
    >
      <span v-for="index in 5" :key="index" class="design-thumbnail design-thumbnail-skeleton"></span>
    </div>
    <p v-else-if="!designs.length" class="muted-copy design-gallery-state">
      No designs in this category yet. Choose another category.
    </p>
    <template v-else>
    <div class="design-carousel-bar">
      <span class="design-carousel-count">
        {{ designs.length }} design{{ designs.length === 1 ? '' : 's' }}
      </span>
      <div v-if="canScrollPrev || canScrollNext" class="design-carousel-controls">
        <button
          type="button"
          class="design-carousel-arrow"
          aria-label="Show previous designs"
          :disabled="!canScrollPrev"
          @click="scrollPage(-1)"
        >
          <i class="pi pi-chevron-left" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="design-carousel-arrow"
          aria-label="Show more designs"
          :disabled="!canScrollNext"
          @click="scrollPage(1)"
        >
          <i class="pi pi-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>
    <div
      ref="track"
      class="design-gallery"
      aria-label="Available card designs"
      @scroll.passive="updateControls"
    >
      <button
        v-for="design in designs"
        :key="design.id"
        type="button"
        :class="{ selected: selectedId === design.id }"
        :aria-label="`Select ${design.name} design`"
        :aria-pressed="selectedId === design.id"
        @click="emit('select', design.id)"
      >
        <span class="design-thumbnail">
          <img
            v-if="design.artworkUrl"
            :src="design.artworkUrl"
            alt=""
            width="120"
            height="120"
            loading="lazy"
            decoding="async"
          />
          <strong v-else>{{ design.number }}</strong>
          <span v-if="selectedId === design.id" class="design-selected-check" aria-hidden="true">
            <i class="pi pi-check"></i>
          </span>
        </span>
        <span class="design-name">{{ design.name }}</span>
      </button>
    </div>
    </template>
  </div>
</template>
