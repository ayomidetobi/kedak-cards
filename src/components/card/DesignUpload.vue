<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import Button from 'primevue/button'
import FileUpload from 'primevue/fileupload'
import RadioButton from 'primevue/radiobutton'
import type {
  ArtworkAssignment,
  UploadDisplay,
  UploadedArtwork,
  UploadOrientation,
} from '../../types/card'

const props = withDefaults(
  defineProps<{
    uploadedArtworks: UploadedArtwork[]
    assignment: ArtworkAssignment
    quantity: number
    previewArtworkIndex: number
    orientation?: UploadOrientation
    display?: UploadDisplay
    /** True while files are being sent to the API. */
    uploading?: boolean
    /** Upload progress, 0–100. */
    progress?: number
  }>(),
  { orientation: 'landscape', display: 'default', uploading: false, progress: 0 },
)
const emit = defineEmits<{
  upload: [files: File[]]
  remove: []
  preview: [index: number]
  'update:assignment': [assignment: ArtworkAssignment]
  'update:orientation': [orientation: UploadOrientation]
  'update:display': [display: UploadDisplay]
}>()

// Unique radio-group names: this component appears in both the customiser and the cart editor.
const groupId = useId()

const orientationOptions: Array<{ value: UploadOrientation; label: string; hint: string }> = [
  { value: 'landscape', label: 'Landscape', hint: 'As uploaded' },
  { value: 'portrait', label: 'Portrait', hint: 'Turned sideways' },
]
const displayOptions: Array<{ value: UploadDisplay; label: string; hint: string }> = [
  { value: 'cover', label: 'Cover', hint: 'Fills the card' },
  { value: 'default', label: 'Default', hint: 'Artwork spot' },
]

const assignment = computed({
  get: () => props.assignment,
  set: (value: ArtworkAssignment) => emit('update:assignment', value),
})
const fileUploadKey = ref(0)

// PrimeVue only passes the files it accepts and keeps its rejection messages internally, so
// forward the raw selection: useCardCustomization validates it and explains every rejection.
function onSelect(event: { originalEvent?: Event; files: File[] }) {
  const original = event.originalEvent as (Event & { dataTransfer?: DataTransfer }) | undefined
  const raw =
    original?.dataTransfer?.files ?? (original?.target as HTMLInputElement | null)?.files ?? null
  const selected = raw && raw.length ? Array.from(raw) : [...event.files]
  if (!selected.length) return
  emit('upload', selected)
  fileUploadKey.value += 1
}
</script>

<template>
  <div class="upload-block">
    <fieldset v-if="quantity > 1" class="artwork-assignment">
      <legend>How should artwork be applied?</legend>
      <div class="artwork-assignment-options">
        <label
          for="artwork-shared"
          class="artwork-assignment-option"
          :class="{ 'is-active': assignment === 'shared' }"
        >
          <RadioButton
            v-model="assignment"
            input-id="artwork-shared"
            name="artwork-assignment"
            value="shared"
          />
          <span>Use one image for all {{ quantity }} cards</span>
        </label>
        <label
          for="artwork-per-card"
          class="artwork-assignment-option"
          :class="{ 'is-active': assignment === 'per-card' }"
        >
          <RadioButton
            v-model="assignment"
            input-id="artwork-per-card"
            name="artwork-assignment"
            value="per-card"
          />
          <span>Use a different image for each card</span>
        </label>
      </div>
    </fieldset>
    <FileUpload
      :key="fileUploadKey"
      mode="advanced"
      :custom-upload="true"
      accept="image/png,image/jpeg,image/webp"
      :max-file-size="5242880"
      :multiple="true"
      :show-upload-button="false"
      :show-cancel-button="false"
      invalid-file-type-message="{0}: Choose a PNG, JPEG or WebP image."
      invalid-file-size-message="{0}: The image must be 5 MB or smaller."
      :pt="{ root: { class: 'kedak-file-upload' } }"
      @select="onSelect"
    >
      <template #header="{ chooseCallback }">
        <Button
          size="small"
          class="kedak-outline-action upload-choose-button"
          severity="secondary"
          outlined
          :label="
            uploading ? 'Uploading…' : uploadedArtworks.length ? 'Replace artwork' : 'Choose artwork'
          "
          :icon="uploading ? 'pi pi-spin pi-spinner' : 'pi pi-upload'"
          :disabled="uploading"
          @click="chooseCallback()"
        />
      </template>
      <template #empty>
        <div class="upload-dropzone-copy">
          <span class="icon-tile" aria-hidden="true"><i class="pi pi-image"></i></span>
          <strong>Drag and drop your artwork here</strong>
          <span class="upload-guidance">
            {{
              assignment === 'shared'
                ? 'Choose one image to use across your order.'
                : `Choose exactly ${quantity} images, one for each card.`
            }}
          </span>
          <small>PNG, JPEG or WebP · up to 5 MB</small>
          <small>After uploading, choose its orientation and how it sits on the card.</small>
        </div>
      </template>
    </FileUpload>
    <div
      v-if="uploading"
      class="upload-progress"
      role="progressbar"
      aria-label="Uploading artwork"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="progress"
    >
      <span class="upload-progress-bar" :style="{ width: `${progress}%` }"></span>
      <small>Uploading your artwork… {{ progress }}%</small>
    </div>
    <div v-if="uploadedArtworks.length" class="uploaded-artwork-list">
      <button
        v-for="(artwork, index) in uploadedArtworks"
        :key="artwork.id"
        type="button"
        class="uploaded-artwork-option"
        :class="{ 'is-previewed': previewArtworkIndex === index }"
        :aria-pressed="previewArtworkIndex === index"
        :aria-label="`Preview artwork ${index + 1}: ${artwork.name}`"
        @click="emit('preview', index)"
      >
        <img :src="artwork.previewUrl ?? artwork.url" :alt="`Artwork ${index + 1}`" />
        <span>{{ artwork.name }}</span>
      </button>
    </div>
    <div v-if="uploadedArtworks.length" class="upload-layout">
      <fieldset class="upload-layout-group">
        <legend>Orientation</legend>
        <div class="upload-layout-options">
          <label
            v-for="option in orientationOptions"
            :key="option.value"
            class="upload-layout-option"
            :class="{ 'is-active': orientation === option.value }"
          >
            <input
              type="radio"
              class="visually-hidden"
              :name="`${groupId}-orientation`"
              :value="option.value"
              :checked="orientation === option.value"
              @change="emit('update:orientation', option.value)"
            />
            <svg class="upload-layout-icon" viewBox="0 0 32 32" aria-hidden="true">
              <rect
                v-if="option.value === 'landscape'"
                x="4"
                y="9"
                width="24"
                height="15"
                rx="2.5"
              />
              <rect v-else x="9" y="4" width="15" height="24" rx="2.5" />
            </svg>
            <span class="upload-layout-copy">
              <strong>{{ option.label }}</strong>
              <small>{{ option.hint }}</small>
            </span>
          </label>
        </div>
      </fieldset>
      <fieldset class="upload-layout-group">
        <legend>Display</legend>
        <div class="upload-layout-options">
          <label
            v-for="option in displayOptions"
            :key="option.value"
            class="upload-layout-option"
            :class="{ 'is-active': display === option.value }"
          >
            <input
              type="radio"
              class="visually-hidden"
              :name="`${groupId}-display`"
              :value="option.value"
              :checked="display === option.value"
              @change="emit('update:display', option.value)"
            />
            <svg class="upload-layout-icon" viewBox="0 0 32 32" aria-hidden="true">
              <rect x="3" y="8" width="26" height="17" rx="2.5" />
              <rect
                v-if="option.value === 'cover'"
                class="is-filled"
                x="5.5"
                y="10.5"
                width="21"
                height="12"
                rx="1"
              />
              <rect v-else class="is-filled" x="17" y="12" width="8.5" height="8.5" rx="1" />
            </svg>
            <span class="upload-layout-copy">
              <strong>{{ option.label }}</strong>
              <small>{{ option.hint }}</small>
            </span>
          </label>
        </div>
      </fieldset>
    </div>
    <button
      v-if="uploadedArtworks.length"
      type="button"
      class="remove-upload"
      @click="emit('remove')"
    >
      <i class="pi pi-trash" aria-hidden="true"></i>
      Remove artwork
    </button>
  </div>
</template>
