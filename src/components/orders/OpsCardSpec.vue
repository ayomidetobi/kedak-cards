<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import CardPreview from '../card/CardPreview.vue'
import { PLACEHOLDER_DESIGN } from '../../composables/useArtworkSelection'
import { resolveApiUrl } from '../../config/env'
import type { OrderLine } from '../../types/api'
import type { CardDesign, UploadedArtwork } from '../../types/card'
import { formatMoney } from '../../utils/money'

/**
 * Production spec for one order line: a live preview of the card as the customer configured it,
 * every customisation choice, and the artwork files to view or download.
 */
const props = defineProps<{
  line: OrderLine
  index: number
  design: CardDesign | null
  defaultOpen?: boolean
}>()

const open = ref(props.defaultOpen ?? true)
const contentId = `ops-spec-${props.index}`
/** One-line recap shown on the collapsed header. */
const recap = computed(() => {
  const c = custom.value
  if (!c) return 'Not customised'
  const artwork = c.customizationMode === 'custom' ? 'Customer upload' : props.line.designName
  const engraving = c.engravingStyle === 'monogram' ? 'Monogram' : 'Full name'
  return [
    artwork,
    engraving,
    c.holderName || props.line.holderName,
    c.contactless ? 'Contactless' : '',
    c.notes ? 'Has notes' : '',
  ]
    .filter(Boolean)
    .join(' · ')
})

const custom = computed(() => props.line.customization ?? null)
const uploads = computed<UploadedArtwork[]>(() =>
  (custom.value?.uploadedArtworks ?? []).map((file) => ({ ...file, url: resolveApiUrl(file.url) })),
)
const isUpload = computed(() => custom.value?.customizationMode === 'custom')
const selectedUpload = ref(0)
const previewUpload = computed(() =>
  isUpload.value ? (uploads.value[selectedUpload.value] ?? uploads.value[0] ?? null) : null,
)
const previewDesign = computed(() => props.design ?? PLACEHOLDER_DESIGN)
const designUrl = computed(() =>
  props.design?.artworkUrl ? resolveApiUrl(props.design.artworkUrl) : '',
)

const facts = computed(() => {
  const c = custom.value
  if (!c) return [{ label: 'Customisation', value: 'Not customised' }]
  const rows = [
    { label: 'Finish', value: `${props.line.finish} metal` },
    { label: 'Quantity', value: String(props.line.quantity) },
    {
      label: 'Artwork',
      value: isUpload.value
        ? `Customer upload${uploads.value.length > 1 ? `s (${uploads.value.length})` : ''}`
        : `${props.line.designName}${c.designId ? ` · ${c.designId}` : ''}`,
    },
  ]
  if (isUpload.value) {
    rows.push(
      {
        label: 'Orientation',
        value:
          c.uploadOrientation === 'portrait'
            ? 'Portrait (turned sideways)'
            : 'Landscape (as uploaded)',
      },
      {
        label: 'Display',
        value:
          c.uploadDisplay === 'cover' ? 'Full cover (fills the card)' : 'Artwork spot (right side)',
      },
    )
    if (props.line.quantity > 1) {
      rows.push({
        label: 'Assignment',
        value:
          c.artworkAssignment === 'per-card' ? 'One image per card' : 'Same image on every card',
      })
    }
  }
  rows.push(
    { label: 'Engraving', value: c.engravingStyle === 'monogram' ? 'Monogram' : 'Full name' },
    { label: 'Holder name', value: c.holderName || props.line.holderName || '—' },
    {
      label: 'Contactless',
      value: c.contactless
        ? `Yes, fit antenna${c.contactlessPrice ? ` (${formatMoney(c.contactlessPrice)} per card)` : ''}`
        : 'No',
    },
  )
  return rows
})

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`
}

const downloading = ref<string | null>(null)
/** Saves the file with a production-friendly name; falls back to opening it if the host blocks fetch. */
async function download(url: string, filename: string) {
  downloading.value = url
  try {
    const response = await fetch(url, { credentials: 'omit' })
    if (!response.ok) throw new Error(String(response.status))
    const blob = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = blob
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(blob), 2000)
  } catch {
    window.open(url, '_blank', 'noopener')
  } finally {
    downloading.value = null
  }
}

const reference = computed(() => `card-${props.index + 1}`)
function uploadFilename(file: UploadedArtwork, position: number) {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : file.type.split('/')[1]
  return `${reference.value}-artwork-${position + 1}.${extension}`
}
</script>

<template>
  <article class="ops-spec" :class="{ 'is-open': open }">
    <button
      type="button"
      class="ops-spec-toggle"
      :aria-expanded="open"
      :aria-controls="contentId"
      @click="open = !open"
    >
      <span class="ops-spec-toggle-copy">
        <strong>
          Card {{ index + 1 }} · {{ line.finish }} metal
          <small v-if="line.quantity > 1">× {{ line.quantity }}</small>
        </strong>
        <small>{{ recap }}</small>
      </span>
      <i class="pi pi-chevron-down ops-spec-chevron" aria-hidden="true"></i>
    </button>

    <div v-show="open" :id="contentId" class="ops-spec-content">
      <div class="ops-spec-preview">
        <CardPreview
          :design="previewDesign"
          :finish="line.finish"
          :engraving-style="custom?.engravingStyle ?? 'name'"
          :holder-name="custom?.holderName || line.holderName || ''"
          :uploaded-artwork="previewUpload"
          :upload-orientation="custom?.uploadOrientation ?? 'landscape'"
          :upload-display="custom?.uploadDisplay ?? 'default'"
        />
        <div
          v-if="uploads.length > 1"
          class="ops-spec-switch"
          role="group"
          aria-label="Preview card"
        >
          <button
            v-for="(file, position) in uploads"
            :key="file.id"
            type="button"
            :class="{ 'is-active': position === selectedUpload }"
            :aria-pressed="position === selectedUpload"
            @click="selectedUpload = position"
          >
            Card {{ position + 1 }}
          </button>
        </div>
      </div>

      <div class="ops-spec-body">
        <dl class="ops-facts ops-spec-facts">
          <div v-for="fact in facts" :key="fact.label">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>
        <div v-if="custom?.notes" class="ops-spec-notes">
          <p class="ops-files-title">Customer notes</p>
          <blockquote>{{ custom.notes }}</blockquote>
        </div>
      </div>

      <div v-if="isUpload && uploads.length" class="ops-files">
        <p class="ops-files-title">Artwork files</p>
        <div v-for="(file, position) in uploads" :key="file.id" class="ops-file">
          <img
            :src="file.url"
            :alt="`Artwork ${position + 1}`"
            class="ops-file-thumb"
            loading="lazy"
          />
          <span class="ops-file-copy">
            <strong>{{ file.name }}</strong>
            <small>
              {{ file.type.replace('image/', '').toUpperCase() }} · {{ formatSize(file.size) }}
              <template v-if="custom?.artworkAssignment === 'per-card' && line.quantity > 1">
                · card {{ position + 1 }}
              </template>
            </small>
          </span>
          <a :href="file.url" target="_blank" rel="noopener" class="ops-file-view">View</a>
          <Button
            size="small"
            class="kedak-action ops-file-download"
            icon="pi pi-download"
            label="Download"
            :loading="downloading === file.url"
            @click="download(file.url, uploadFilename(file, position))"
          />
        </div>
      </div>
      <div v-else-if="!isUpload && design && designUrl" class="ops-files">
        <p class="ops-files-title">Library artwork</p>
        <div class="ops-file">
          <img :src="designUrl" alt="" class="ops-file-thumb is-svg" loading="lazy" />
          <span class="ops-file-copy">
            <strong>{{ design.name }}</strong>
            <small>SVG · {{ design.id }}</small>
          </span>
          <a :href="designUrl" target="_blank" rel="noopener" class="ops-file-view"> View </a>
          <Button
            size="small"
            class="kedak-action ops-file-download"
            icon="pi pi-download"
            label="Download"
            :loading="downloading === designUrl"
            @click="download(designUrl, `${reference}-${design.id}.svg`)"
          />
        </div>
      </div>
    </div>
  </article>
</template>
