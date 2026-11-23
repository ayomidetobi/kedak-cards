<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import StockBadge from '../StockBadge.vue'
import TextLink from '../TextLink.vue'
import { useArtworkSelection } from '../../composables/useArtworkSelection'
import { useAddOnsQuery, useFinishCatalog } from '../../queries/catalog'
import { errorMessage } from '../../services/api/errors'
import { MAX_ITEM_QUANTITY } from '../../types/card'
import { formatMoney } from '../../utils/money'
import CardPreview from './CardPreview.vue'
import CardExtras from './CardExtras.vue'
import CardholderNameInput from './CardholderNameInput.vue'
import DesignCategoryTabs from './DesignCategoryTabs.vue'
import DesignGallery from './DesignGallery.vue'
import DesignUpload from './DesignUpload.vue'
import { useCardCustomization, validateArtworkCount } from '../../composables/useCardCustomization'
import RadioButton from 'primevue/radiobutton'
import type { CustomizationMode } from '../../types/card'

const customization = useCardCustomization()
const artwork = useArtworkSelection()
const catalog = useFinishCatalog()
const addOns = useAddOnsQuery()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const uploadError = ref('')
const editError = ref('')
const activeEditId = ref<string | null>(null)
const previewArtworkIndex = ref(0)

const category = computed({
  get: () => customization.store.category,
  set: (value) => {
    if (value) customization.selectCategory(value)
  },
})
const customizationMode = computed({
  get: () => customization.store.customizationMode,
  set: (value: CustomizationMode) => setCustomizationMode(value),
})
const contactless = computed({
  get: () => customization.store.contactless,
  set: (value: boolean) => customization.store.setContactless(value),
})
const notes = computed({
  get: () => customization.store.notes,
  set: (value: string) => customization.store.setNotes(value),
})
const holderName = computed({
  get: () => customization.store.holderName,
  set: (value) => customization.updateHolderName(value),
})
const previewArtwork = computed(
  () => customization.store.uploadedArtworks[previewArtworkIndex.value] ?? null,
)
const uploadValidation = computed(() =>
  validateArtworkCount(
    customization.store.uploadedArtworks.length,
    customization.store.artworkAssignment,
    customization.store.cartQuantity,
  ),
)
const visibleUploadError = computed(() => {
  if (uploadError.value) return uploadError.value
  if (
    customization.store.customizationMode === 'custom' &&
    customization.store.uploadedArtworks.length === 0
  ) {
    return 'Upload artwork before adding your custom card to the cart.'
  }
  if (customization.store.uploadedArtworks.length && !uploadValidation.value.valid) {
    return uploadValidation.value.message
  }
  return ''
})
// Stock is the server's (GET /finishes). Out-of-stock finishes can't be added as new items
// (edits to an existing cart item still save; the cart then asks to switch finish).
const stockNote = computed(() =>
  catalog.isLoading.value ||
  catalog.isInStock(customization.store.finish) ||
  customization.store.editingCartItemId
    ? ''
    : `${customization.store.finish} is out of stock and can’t be added to the cart. Choose one of the other finishes below.`,
)
const catalogNote = computed(() =>
  catalog.isLoading.value
    ? 'Loading prices and stock…'
    : catalog.isError.value
      ? errorMessage(catalog.error.value, 'Prices and stock couldn’t load.')
      : '',
)
const designNote = computed(() =>
  customization.store.customizationMode === 'preset' && !artwork.hasSelectedDesign.value
    ? 'Choose a design before adding your card to the cart.'
    : '',
)
const addToCartDisabledReason = computed(
  () =>
    catalogNote.value ||
    stockNote.value ||
    designNote.value ||
    (customization.isUploading.value ? 'Wait for your artwork to finish uploading.' : '') ||
    visibleUploadError.value ||
    editError.value,
)
const canAddToCart = computed(() => !addToCartDisabledReason.value)
const finishPrice = computed(() => catalog.price(customization.store.finish))
const contactlessPrice = computed(() => addOns.data.value?.contactless.price ?? null)
/** Finish price plus contactless when chosen (the server prices the cart the same way). */
const unitPrice = computed(() => {
  if (!finishPrice.value) return null
  if (!customization.store.contactless) return finishPrice.value
  if (!contactlessPrice.value) return null
  return { ...finishPrice.value, amount: finishPrice.value.amount + contactlessPrice.value.amount }
})
const quantityTotal = computed(() =>
  unitPrice.value
    ? { ...unitPrice.value, amount: unitPrice.value.amount * customization.store.cartQuantity }
    : null,
)
const galleryError = computed(() =>
  artwork.error.value ? errorMessage(artwork.error.value, 'Designs couldn’t load.') : '',
)

async function handleUpload(files: File[]) {
  uploadError.value = ''
  const result = await customization.handleUploads(
    files,
    customization.store.artworkAssignment,
    customization.store.cartQuantity,
  )
  uploadError.value = result.valid ? '' : result.message
  if (result.valid) previewArtworkIndex.value = 0
}

function removeUploads() {
  customization.removeUploads()
  uploadError.value = ''
  previewArtworkIndex.value = 0
}

function setCustomizationMode(mode: CustomizationMode) {
  if (mode === customization.store.customizationMode) return
  if (mode === 'preset') customization.removeUploads()
  uploadError.value = ''
  previewArtworkIndex.value = 0
  customization.store.setCustomizationMode(mode)
}

function selectDesign(designId: string) {
  customization.selectDesign(designId)
  uploadError.value = ''
  previewArtworkIndex.value = 0
}

function updateQuantity(amount: number) {
  const nextQuantity = Math.min(
    MAX_ITEM_QUANTITY,
    Math.max(1, customization.store.cartQuantity + amount),
  )
  customization.store.setCartQuantity(nextQuantity)
}

function addToCart() {
  if (!canAddToCart.value) return
  const isEditing = customization.store.editingCartItemId !== null
  customization.addToCart()
  toast.add({
    severity: 'success',
    summary: isEditing ? 'Cart item updated' : 'Added to cart',
    detail: isEditing
      ? 'Your customised card has been updated.'
      : 'Your customised card is in the cart.',
    life: 2600,
  })
  void router.push('/cart')
}

watch(
  () => route.query.edit,
  (value) => {
    const id = typeof value === 'string' ? value : null
    if (!id) {
      if (activeEditId.value && customization.store.editingCartItemId === activeEditId.value) {
        customization.startNewCustomization(customization.store.finish)
      }
      activeEditId.value = null
      editError.value = ''
      return
    }

    activeEditId.value = id
    if (!customization.beginEditingCartItem(id)) {
      editError.value = 'This item is no longer in your cart.'
      return
    }
    editError.value = ''
    uploadError.value = ''
    previewArtworkIndex.value = 0
  },
  { immediate: true },
)
</script>

<template>
  <section class="journey-main customize-main" data-node-id="6:66">
    <header class="customize-header">
      <p class="eyebrow">01 DESIGN&nbsp; / &nbsp;02 CHECK&nbsp; / &nbsp;03 ORDER</p>
      <h1 class="page-title">Make it<br />unmistakably yours.</h1>
    </header>
    <section class="customizer-grid">
      <fieldset class="customization-mode-choice" aria-label="Choose design method">
        <legend>How would you like to customise your card?</legend>
        <label
          for="customization-mode-preset"
          class="customization-mode-option"
          :class="{ 'is-active': customizationMode === 'preset' }"
        >
          <span class="icon-tile" aria-hidden="true"><i class="pi pi-images"></i></span>
          <span class="customization-mode-option-copy">
            <strong>Choose a pre-designed look</strong>
            <small>Choose Sport, Cars, Anime, Love or Nature artwork.</small>
          </span>
          <RadioButton
            v-model="customizationMode"
            input-id="customization-mode-preset"
            name="customization-mode"
            value="preset"
          />
        </label>
        <label
          for="customization-mode-custom"
          class="customization-mode-option"
          :class="{ 'is-active': customizationMode === 'custom' }"
        >
          <span class="icon-tile" aria-hidden="true"><i class="pi pi-upload"></i></span>
          <span class="customization-mode-option-copy">
            <strong>Customise with your own artwork</strong>
            <small>Upload an image for your card or cards.</small>
          </span>
          <RadioButton
            v-model="customizationMode"
            input-id="customization-mode-custom"
            name="customization-mode"
            value="custom"
          />
        </label>
      </fieldset>
      <div class="preview-column">
        <div class="preview-heading">
          <span class="eyebrow">LIVE PREVIEW</span>
          <span class="preview-finish-group">
            <span class="preview-finish">{{ customization.store.finish }}</span>
            <StockBadge :finish="customization.store.finish" />
          </span>
        </div>
        <CardPreview
          :design="artwork.selectedDesign.value"
          :finish="customization.store.finish"
          :engraving-style="customization.store.engravingStyle"
          :holder-name="customization.store.holderName"
          :uploaded-artwork="previewArtwork"
          :upload-orientation="customization.store.uploadOrientation"
          :upload-display="customization.store.uploadDisplay"
        />
        <p class="preview-caption">Front view · Engraving placement is illustrative</p>
      </div>

      <div class="controls-column">
        <p v-if="stockNote" class="stock-note" role="alert">
          <i class="pi pi-ban" aria-hidden="true"></i>
          <span>{{ stockNote }}</span>
        </p>
        <p v-if="editError" class="upload-error" role="alert">
          <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
          <span>{{ editError }}</span>
        </p>
        <div v-if="customizationMode === 'preset'" class="design-choice">
          <h2 class="control-heading">Choose a pre-designed artwork</h2>
          <DesignCategoryTabs v-model="category" />
          <DesignGallery
            :designs="artwork.gallery.value"
            :selected-id="customization.store.selectedDesignId"
            :loading="artwork.isLoading.value"
            :error="galleryError"
            @select="selectDesign"
            @retry="artwork.retry"
          />
        </div>
        <div v-else class="design-choice">
          <h2 class="control-heading">Upload your artwork</h2>
          <DesignUpload
            :uploaded-artworks="customization.store.uploadedArtworks"
            :assignment="customization.store.artworkAssignment"
            :quantity="customization.store.cartQuantity"
            :preview-artwork-index="previewArtworkIndex"
            :orientation="customization.store.uploadOrientation"
            :display="customization.store.uploadDisplay"
            :uploading="customization.isUploading.value"
            :progress="customization.uploadProgress.value"
            @update:assignment="customization.store.setArtworkAssignment"
            @update:orientation="customization.store.setUploadOrientation"
            @update:display="customization.store.setUploadDisplay"
            @upload="handleUpload"
            @remove="removeUploads"
            @preview="previewArtworkIndex = $event"
          />
          <p v-if="visibleUploadError" class="upload-error" role="alert">
            <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
            <span>{{ visibleUploadError }}</span>
          </p>
        </div>
        <CardholderNameInput v-model="holderName" />
        <CardExtras
          v-model:contactless="contactless"
          v-model:notes="notes"
          :price="contactlessPrice"
        />
        <section class="price-card">
          <div class="price-heading">
            <span>Your conversion</span>
            <strong v-if="finishPrice">{{ formatMoney(finishPrice) }}</strong>
            <strong v-else class="price-pending" aria-label="Price loading">—</strong>
          </div>
          <div v-if="contactless" class="price-heading price-extra">
            <span>Contactless</span>
            <span>+{{ contactlessPrice ? formatMoney(contactlessPrice) : '—' }}</span>
          </div>
          <p>Per card. Name and engraving included. Return delivery calculated at checkout.</p>
          <div class="customizer-quantity-row">
            <span>Quantity</span>
            <div class="quantity-control" role="group" aria-label="Card quantity">
              <button
                type="button"
                aria-label="Decrease card quantity"
                :disabled="customization.store.cartQuantity === 1"
                @click="updateQuantity(-1)"
              >
                <i class="pi pi-minus" aria-hidden="true"></i>
              </button>
              <output aria-live="polite">{{ customization.store.cartQuantity }}</output>
              <button
                type="button"
                aria-label="Increase card quantity"
                :disabled="customization.store.cartQuantity === MAX_ITEM_QUANTITY"
                @click="updateQuantity(1)"
              >
                <i class="pi pi-plus" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="price-heading quantity-total">
            <span
              >Total for {{ customization.store.cartQuantity }} card{{
                customization.store.cartQuantity === 1 ? '' : 's'
              }}</span
            >
            <strong>{{ formatMoney(quantityTotal) }}</strong>
          </div>
          <span
            class="kedak-disabled-button-help"
            role="group"
            :tabindex="addToCartDisabledReason ? 0 : undefined"
            :title="addToCartDisabledReason || undefined"
            :aria-label="addToCartDisabledReason || undefined"
          >
            <Button
              size="small"
              class="kedak-action customizer-add-to-cart"
              label="Add to cart"
              icon="pi pi-shopping-cart"
              :disabled="!canAddToCart"
              @click="addToCart"
            />
          </span>
          <div class="price-card-link">
            <TextLink to="/compatibility">Check my card</TextLink>
          </div>
        </section>
        <p class="permissions-note">
          Please only use artwork and names you have permission to reproduce.
        </p>
      </div>
    </section>
  </section>
</template>
