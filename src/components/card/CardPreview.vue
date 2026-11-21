<script setup lang="ts">
import { computed } from 'vue'
import type {
  CardDesign,
  CardFinish,
  EngravingStyle,
  UploadDisplay,
  UploadedArtwork,
  UploadOrientation,
} from '../../types/card'
import { uploadPlacement } from '../../utils/uploadPlacement'

const props = withDefaults(
  defineProps<{
    design: CardDesign
    finish: CardFinish
    engravingStyle: EngravingStyle
    holderName: string
    uploadedArtwork: UploadedArtwork | null
    uploadOrientation?: UploadOrientation
    uploadDisplay?: UploadDisplay
    showDesignMark?: boolean
  }>(),
  { showDesignMark: true, uploadOrientation: 'landscape', uploadDisplay: 'default' },
)

const finishes: Record<CardFinish, { color: string; foreground: string }> = {
  Silver: { color: '#c2c4c9', foreground: '#222226' },
  Black: { color: '#242426', foreground: '#f2f2f5' },
  Gold: { color: '#a99570', foreground: '#252019' },
  Signature: { color: '#c88182', foreground: '#3c2628' },
}

const finishImageUrls: Partial<Record<CardFinish, string>> = {
  Black: '/assets/card-black.png',
  Gold: '/assets/card-gold.png',
  Signature: '/assets/card-signature.png',
}

// Uploaded artwork is placed from the customer's choices (see utils/uploadPlacement.ts).
const placement = computed(() =>
  props.uploadedArtwork ? uploadPlacement(props.uploadOrientation, props.uploadDisplay) : null,
)
const isFullBleed = computed(
  () => props.uploadedArtwork !== null && props.uploadDisplay === 'cover',
)

// A full-bleed upload hides the finish (and the chip printed on its image), so draw the chip.
const showBuiltInChip = computed(() => isFullBleed.value || !finishImageUrls[props.finish])

const cardStyle = computed(() => ({
  backgroundImage: finishImageUrls[props.finish]
    ? `url("${finishImageUrls[props.finish]}")`
    : `linear-gradient(134deg, rgba(255,255,255,.13) 12%, rgba(255,255,255,0) 46%, rgba(0,0,0,.24) 88%), linear-gradient(90deg, ${finishes[props.finish].color}, ${finishes[props.finish].color})`,
  // Text over a full-bleed photo stays light (the image gets a soft dark overlay).
  color: isFullBleed.value ? '#f2f2f5' : finishes[props.finish].foreground,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
}))

// Library artwork is engraved in the card's own text colour (see .card-artwork).
const showArtwork = computed(
  () => !props.uploadedArtwork && props.showDesignMark && Boolean(props.design.artworkUrl),
)

const ariaLabel = computed(() => {
  const artwork = props.uploadedArtwork
    ? ' with your artwork'
    : showArtwork.value
      ? ` with ${props.design.name} artwork`
      : ''
  return `Metal card preview: ${props.finish} finish${artwork} for ${props.holderName}`
})

const monogram = computed(() =>
  props.holderName
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase(),
)
</script>

<template>
  <div class="preview-frame">
    <div class="metal-card-shell" role="img" :aria-label="ariaLabel">
      <div class="metal-card" :style="cardStyle" :class="`finish-${finish.toLowerCase()}`">
        <span
          v-if="uploadedArtwork && placement"
          class="card-upload"
          :class="`is-${placement}`"
          :data-placement="placement"
          aria-hidden="true"
        >
          <img :src="uploadedArtwork.url" alt="" />
        </span>
        <span
          v-if="showArtwork"
          class="card-artwork"
          :style="{ '--card-artwork': `url('${design.artworkUrl}')` }"
          aria-hidden="true"
        ></span>
        <div class="card-wordmark">
          <span>kedak</span>
          <span class="card-metal-label">METAL</span>
        </div>
        <div class="card-middle">
          <img v-if="showBuiltInChip" class="payment-chip" src="/assets/payment-chip.svg" alt="" />
          <span
            v-if="!uploadedArtwork && props.showDesignMark && !design.artworkUrl"
            class="card-design-mark"
          >
            ARTWORK {{ design.number }}
          </span>
          <span v-if="engravingStyle === 'monogram'" class="card-monogram">{{ monogram }}</span>
        </div>
        <p v-if="engravingStyle === 'name'" class="card-holder">{{ holderName || 'YOUR NAME' }}</p>
      </div>
    </div>
  </div>
</template>
