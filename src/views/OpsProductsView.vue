<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { finishSwatches } from '../queries/catalog'
import {
  useCreateStaffArtwork,
  useCreateStaffFinish,
  useDeleteStaffArtwork,
  useDeleteStaffFinish,
  useStaffArtwork,
  useStaffArtworkCategories,
  useStaffFinishes,
  useUpdateStaffArtwork,
  useUpdateStaffFinish,
} from '../queries/ops'
import { ApiError, errorMessage } from '../services/api/errors'
import type {
  StaffArtwork,
  StaffArtworkFilters,
  StaffArtworkSort,
  StaffFinish,
} from '../services/api/endpoints/products'
import type { CardCategory, CardFinish } from '../types/card'
import { formatMoney } from '../utils/money'
import { formatOrderDate } from '../utils/orderPolicy'

/**
 * Products (/ops/products): finishes (price, stock, description, order) and the artwork library.
 * Ops and administrators can add, edit and delete; Django validates, enforces and audits it.
 * Shoppers see changes within a minute (the public catalogue is cached and refreshed on save).
 */
const route = useRoute()
const router = useRouter()
const toast = useToast()

type Tab = 'finishes' | 'artwork'
const tab = computed<Tab>(() => (route.query.tab === 'artwork' ? 'artwork' : 'finishes'))
function openTab(next: Tab) {
  void router.replace({ query: { ...route.query, tab: next === 'finishes' ? undefined : next } })
}

const accessMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.status === 403
    ? 'Managing products needs the ops role. Ask an administrator for access.'
    : errorMessage(error, fallback)

// --- Money helpers -------------------------------------------------------------------------------
function toMinor(value: string): number | null {
  const cleaned = value.replace(/[^\d.]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const amount = Math.round(Number(cleaned) * 100)
  return amount > 0 && amount <= 1_000_000 ? amount : null
}
const toMajor = (amount: number) => (amount / 100).toFixed(2)

// =================================================================================================
// Finishes
// =================================================================================================
const finishesQuery = useStaffFinishes()
const finishList = computed(() => finishesQuery.data.value)
const currency = computed(() => finishList.value?.currency ?? 'USD')

const editingFinish = ref<CardFinish | null>(null)
const finishForm = reactive({ price: '', description: '', displayOrder: '0', inStock: true })
const finishError = ref('')
const updateFinish = useUpdateStaffFinish()
const createFinish = useCreateStaffFinish()
const deleteFinish = useDeleteStaffFinish()

function editFinish(finish: StaffFinish) {
  editingFinish.value = finish.name
  finishForm.price = toMajor(finish.priceAmount)
  finishForm.description = finish.description
  finishForm.displayOrder = String(finish.displayOrder)
  finishForm.inStock = finish.inStock
  finishError.value = ''
}

function readFinishForm() {
  const priceAmount = toMinor(finishForm.price)
  const displayOrder = Number(finishForm.displayOrder)
  if (priceAmount === null) {
    finishError.value = 'Enter a price such as 149 or 149.99.'
    return null
  }
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 999) {
    finishError.value = 'Display order must be a whole number from 0 to 999.'
    return null
  }
  return {
    priceAmount,
    description: finishForm.description.trim(),
    displayOrder,
    inStock: finishForm.inStock,
  }
}

async function saveFinish(name: CardFinish) {
  finishError.value = ''
  const payload = readFinishForm()
  if (!payload) return
  try {
    await updateFinish.mutateAsync({ name, payload })
    editingFinish.value = null
    toast.add({ severity: 'success', summary: `${name} saved`, life: 2400 })
  } catch (error) {
    finishError.value = errorMessage(error, 'The finish couldn’t be saved.')
  }
}

async function toggleStock(finish: StaffFinish) {
  try {
    await updateFinish.mutateAsync({ name: finish.name, payload: { inStock: !finish.inStock } })
    toast.add({
      severity: 'success',
      summary: `${finish.name} is now ${finish.inStock ? 'out of stock' : 'in stock'}`,
      life: 2400,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: errorMessage(error), life: 3200 })
  }
}

async function removeFinish(finish: StaffFinish) {
  if (
    !window.confirm(
      `Delete ${finish.name} from the store? Shoppers will no longer see it. You can add it back later.`,
    )
  ) {
    return
  }
  try {
    await deleteFinish.mutateAsync(finish.name)
    toast.add({ severity: 'success', summary: `${finish.name} deleted`, life: 2400 })
  } catch (error) {
    toast.add({ severity: 'error', summary: errorMessage(error), life: 3600 })
  }
}

const addingFinish = ref(false)
const newFinishName = ref<CardFinish | null>(null)
function openAddFinish() {
  addingFinish.value = true
  editingFinish.value = null
  newFinishName.value = finishList.value?.available[0] ?? null
  finishForm.price = ''
  finishForm.description = ''
  finishForm.displayOrder = String((finishList.value?.data.length ?? 0) + 1)
  finishForm.inStock = true
  finishError.value = ''
}
async function addFinish() {
  finishError.value = ''
  if (!newFinishName.value) return
  const payload = readFinishForm()
  if (!payload) return
  try {
    await createFinish.mutateAsync({ name: newFinishName.value, ...payload })
    toast.add({ severity: 'success', summary: `${newFinishName.value} added`, life: 2400 })
    addingFinish.value = false
  } catch (error) {
    finishError.value = errorMessage(error, 'The finish couldn’t be added.')
  }
}

// =================================================================================================
// Artwork
// =================================================================================================
const categoriesQuery = useStaffArtworkCategories()
const categories = computed(() => categoriesQuery.data.value ?? [])
const totals = computed(() =>
  categories.value.reduce(
    (sum, category) => ({
      published: sum.published + category.published,
      hidden: sum.hidden + category.hidden,
    }),
    { published: 0, hidden: 0 },
  ),
)

const category = ref<CardCategory | null>(null)
type StatusKey = 'any' | 'published' | 'hidden'
const status = ref<StatusKey>('any')
const statusOptions: Array<{ value: StatusKey; label: string }> = [
  { value: 'any', label: 'Any status' },
  { value: 'published', label: 'Published' },
  { value: 'hidden', label: 'Hidden' },
]
const sort = ref<StaffArtworkSort>('category')
const sortOptions: Array<{ value: StaffArtworkSort; label: string }> = [
  { value: 'category', label: 'By category' },
  { value: 'newest', label: 'Recently updated' },
  { value: 'name', label: 'Name A–Z' },
]
const search = ref('')
const searchTerm = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (searchTerm.value = value.trim()), 300)
})

const PAGE_SIZES = [12, 24, 48, 96] as const
const pageSize = ref<number>(24)
const pageSizeOptions = PAGE_SIZES.map((value) => ({ value, label: String(value) }))

const artworkFilters = computed<Omit<StaffArtworkFilters, 'cursor'>>(() => ({
  limit: pageSize.value,
  sort: sort.value,
  q: searchTerm.value || undefined,
  category: category.value ?? undefined,
  status: status.value === 'any' ? undefined : status.value,
}))
const artworkQuery = useStaffArtwork(artworkFilters)
const pageIndex = ref(0)
watch(artworkFilters, () => (pageIndex.value = 0))
const loadedPages = computed(() => artworkQuery.data.value?.pages ?? [])
const designs = computed(() => loadedPages.value[pageIndex.value]?.data ?? [])
const hasNextPage = computed(
  () => pageIndex.value + 1 < loadedPages.value.length || Boolean(artworkQuery.hasNextPage.value),
)
async function goToNextPage() {
  if (pageIndex.value + 1 >= loadedPages.value.length) {
    if (!artworkQuery.hasNextPage.value) return
    await artworkQuery.fetchNextPage()
  }
  if (pageIndex.value + 1 < loadedPages.value.length) pageIndex.value += 1
}

// --- Selected design editor ----------------------------------------------------------------------
const selected = ref<StaffArtwork | null>(null)
const editName = ref('')
const replacement = ref<File | null>(null)
const replacementPreview = ref('')
const artworkError = ref('')
const updateArtwork = useUpdateStaffArtwork()
const deleteArtwork = useDeleteStaffArtwork()

function revoke(url: string) {
  if (url) URL.revokeObjectURL(url)
}
onBeforeUnmount(() => {
  revoke(replacementPreview.value)
  revoke(uploadPreview.value)
})

/** On narrow screens the panel sits below the library: bring it into view. */
function revealPanel() {
  if (window.innerWidth >= 1000) return
  void nextTick(() =>
    document
      .querySelector('.products-panel')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  )
}

function selectDesign(design: StaffArtwork) {
  uploading.value = false
  selected.value = design
  editName.value = design.name
  replacement.value = null
  revoke(replacementPreview.value)
  replacementPreview.value = ''
  artworkError.value = ''
}
// Keep the editor in sync after a save refreshes the list.
watch(designs, (list) => {
  if (!selected.value) return
  const fresh = list.find((design) => design.id === selected.value?.id)
  if (fresh) selected.value = fresh
})

function pickSvg(event: Event, target: 'replace' | 'upload') {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  if (file && !/\.svg$/i.test(file.name)) {
    artworkError.value = 'Choose an SVG file (.svg).'
    return
  }
  artworkError.value = ''
  if (target === 'replace') {
    replacement.value = file
    revoke(replacementPreview.value)
    replacementPreview.value = file ? URL.createObjectURL(file) : ''
  } else {
    uploadFile.value = file
    revoke(uploadPreview.value)
    uploadPreview.value = file ? URL.createObjectURL(file) : ''
  }
}

function fileError(error: unknown, fallback: string) {
  return error instanceof ApiError
    ? (error.fieldError('/file') ?? error.fieldError('/name') ?? error.message)
    : errorMessage(error, fallback)
}

async function saveDesign() {
  if (!selected.value) return
  artworkError.value = ''
  if (editName.value.trim().length < 2) {
    artworkError.value = 'Enter a name of at least 2 characters.'
    return
  }
  try {
    const updated = await updateArtwork.mutateAsync({
      id: selected.value.id,
      payload: { name: editName.value.trim(), file: replacement.value },
    })
    selectDesign(updated)
    toast.add({ severity: 'success', summary: `${updated.name} saved`, life: 2400 })
  } catch (error) {
    artworkError.value = fileError(error, 'The artwork couldn’t be saved.')
  }
}

async function togglePublished(design: StaffArtwork) {
  try {
    const updated = await updateArtwork.mutateAsync({
      id: design.id,
      payload: { isPublished: !design.isPublished },
    })
    if (selected.value?.id === design.id) selected.value = updated
    toast.add({
      severity: 'success',
      summary: updated.isPublished ? `${updated.name} is live` : `${updated.name} hidden`,
      life: 2400,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: errorMessage(error), life: 3200 })
  }
}

async function removeDesign(design: StaffArtwork) {
  if (!window.confirm(`Delete “${design.name}” (${design.id}) permanently?`)) return
  try {
    await deleteArtwork.mutateAsync(design.id)
    selected.value = null
    toast.add({ severity: 'success', summary: `${design.name} deleted`, life: 2400 })
  } catch (error) {
    artworkError.value = errorMessage(error, 'The artwork couldn’t be deleted.')
  }
}

// --- Upload ----------------------------------------------------------------------------------------
const uploading = ref(false)
const uploadName = ref('')
const uploadCategory = ref<CardCategory>('Sport')
const uploadPublished = ref(true)
const uploadFile = ref<File | null>(null)
const uploadPreview = ref('')
const createArtwork = useCreateStaffArtwork()
const categoryOptions = computed(() =>
  categories.value.map((item) => ({ value: item.name, label: item.name })),
)

function openUpload() {
  selected.value = null
  uploading.value = true
  uploadName.value = ''
  uploadCategory.value = category.value ?? 'Sport'
  uploadPublished.value = true
  uploadFile.value = null
  revoke(uploadPreview.value)
  uploadPreview.value = ''
  artworkError.value = ''
  revealPanel()
}

async function upload() {
  artworkError.value = ''
  if (uploadName.value.trim().length < 2) {
    artworkError.value = 'Enter a name of at least 2 characters.'
    return
  }
  if (!uploadFile.value) {
    artworkError.value = 'Choose an SVG file.'
    return
  }
  try {
    const created = await createArtwork.mutateAsync({
      name: uploadName.value.trim(),
      category: uploadCategory.value,
      isPublished: uploadPublished.value,
      file: uploadFile.value,
    })
    uploading.value = false
    selectDesign(created)
    toast.add({
      severity: 'success',
      summary: `${created.name} uploaded as ${created.id}`,
      life: 2800,
    })
  } catch (error) {
    artworkError.value = fileError(error, 'The artwork couldn’t be uploaded.')
  }
}

const artworkLoadError = computed(() =>
  artworkQuery.error.value ? accessMessage(artworkQuery.error.value, 'Artwork couldn’t load.') : '',
)
</script>

<template>
  <main class="journey-main ops-main ops-products">
    <header class="order-header">
      <div>
        <p class="eyebrow">KEDAK / OPERATIONS / PRODUCTS</p>
        <h1 class="page-title">Products.</h1>
        <p class="intro-copy">
          Finishes, prices and stock, and the artwork library shoppers choose from. Changes reach
          the shop within a minute.
        </p>
      </div>
    </header>

    <div class="ops-tabs products-tabs" role="tablist" aria-label="Product data">
      <button
        type="button"
        role="tab"
        class="ops-tab"
        :class="{ 'is-active': tab === 'finishes' }"
        :aria-selected="tab === 'finishes'"
        @click="openTab('finishes')"
      >
        <i class="pi pi-palette" aria-hidden="true"></i> Finishes
        <span v-if="finishList" class="products-tab-count">{{ finishList.data.length }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="ops-tab"
        :class="{ 'is-active': tab === 'artwork' }"
        :aria-selected="tab === 'artwork'"
        @click="openTab('artwork')"
      >
        <i class="pi pi-images" aria-hidden="true"></i> Artwork
        <span v-if="categories.length" class="products-tab-count">{{
          totals.published + totals.hidden
        }}</span>
      </button>
    </div>

    <!-- ================================ Finishes ================================ -->
    <section v-if="tab === 'finishes'" aria-label="Finishes">
      <p v-if="finishesQuery.isPending.value" class="api-state" aria-busy="true">
        <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading finishes…
      </p>
      <p v-else-if="finishesQuery.isError.value" class="api-state is-error" role="alert">
        {{ accessMessage(finishesQuery.error.value, 'Finishes couldn’t load.') }}
      </p>
      <template v-else-if="finishList">
        <div class="products-bar">
          <p class="settings-note">
            <i class="pi pi-info-circle" aria-hidden="true"></i>
            Prices are in {{ currency }}. The store currency and delivery fee are set by an
            administrator in the admin console.
          </p>
          <Button
            v-if="finishList.available.length && !addingFinish"
            class="kedak-outline-action products-bar-action"
            severity="secondary"
            outlined
            icon="pi pi-plus"
            label="Add finish"
            @click="openAddFinish"
          />
        </div>

        <!-- Add finish -->
        <section v-if="addingFinish" class="info-card ops-panel products-add">
          <div class="people-add-head">
            <h2>Add a finish</h2>
            <button
              type="button"
              class="ops-icon-button"
              aria-label="Close"
              @click="addingFinish = false"
            >
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>
          <form class="products-finish-form is-wide" novalidate @submit.prevent="addFinish">
            <div class="people-field">
              <label class="people-label" for="new-finish-type">Finish</label>
              <Select
                v-model="newFinishName"
                input-id="new-finish-type"
                :options="finishList.available"
                class="kedak-select"
              />
            </div>
            <div class="people-field">
              <FloatLabel class="checkout-float-label" variant="in">
                <InputText id="new-finish-price" v-model="finishForm.price" inputmode="decimal" />
                <label for="new-finish-price">Price ({{ currency }})</label>
              </FloatLabel>
            </div>
            <div class="people-field">
              <FloatLabel class="checkout-float-label" variant="in">
                <InputText
                  id="new-finish-order"
                  v-model="finishForm.displayOrder"
                  inputmode="numeric"
                />
                <label for="new-finish-order">Display order</label>
              </FloatLabel>
            </div>
            <div class="people-field people-span">
              <FloatLabel class="checkout-float-label" variant="in">
                <InputText
                  id="new-finish-description"
                  v-model="finishForm.description"
                  maxlength="200"
                />
                <label for="new-finish-description">Short description</label>
              </FloatLabel>
            </div>
            <label class="people-check people-span">
              <input v-model="finishForm.inStock" type="checkbox" />
              <span
                ><strong>In stock</strong><small>Shoppers can order it straight away.</small></span
              >
            </label>
            <p v-if="finishError" class="upload-error people-span" role="alert">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i
              ><span>{{ finishError }}</span>
            </p>
            <div class="people-add-actions people-span">
              <Button
                type="button"
                class="kedak-outline-action"
                severity="secondary"
                outlined
                label="Cancel"
                @click="addingFinish = false"
              />
              <Button
                type="submit"
                class="kedak-action"
                icon="pi pi-check"
                label="Add finish"
                :loading="createFinish.isPending.value"
              />
            </div>
          </form>
        </section>

        <div v-if="finishList.data.length" class="products-finishes">
          <article
            v-for="finish in finishList.data"
            :key="finish.name"
            class="info-card products-finish"
            :class="{ 'is-editing': editingFinish === finish.name }"
          >
            <div
              class="products-swatch"
              :style="{
                background: finishSwatches[finish.name]?.color,
                color: finishSwatches[finish.name]?.foreground,
              }"
            >
              <span>{{ finish.name }}</span>
              <small>KEDAK METAL</small>
            </div>

            <template v-if="editingFinish !== finish.name">
              <div class="products-finish-head">
                <div>
                  <h2>{{ finish.name }}</h2>
                  <p class="products-price">{{ formatMoney(finish.price) }}</p>
                </div>
                <span class="settings-badge" :class="finish.inStock ? 'is-ok' : 'is-warn'">
                  <i
                    :class="finish.inStock ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'"
                    aria-hidden="true"
                  ></i>
                  {{ finish.inStock ? 'In stock' : 'Out of stock' }}
                </span>
              </div>
              <p class="products-description">
                {{ finish.description || 'No description yet.' }}
              </p>
              <dl class="products-facts">
                <div>
                  <dt>Orders</dt>
                  <dd>{{ finish.orderCount }}</dd>
                </div>
                <div>
                  <dt>Display order</dt>
                  <dd>{{ finish.displayOrder }}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{{ finish.updatedAt ? formatOrderDate(finish.updatedAt) : '—' }}</dd>
                </div>
              </dl>
              <div class="products-actions">
                <Button
                  size="small"
                  class="kedak-action"
                  icon="pi pi-pencil"
                  label="Edit"
                  @click="editFinish(finish)"
                />
                <Button
                  size="small"
                  class="kedak-outline-action"
                  severity="secondary"
                  outlined
                  :icon="finish.inStock ? 'pi pi-ban' : 'pi pi-check'"
                  :label="finish.inStock ? 'Mark out of stock' : 'Mark in stock'"
                  :disabled="updateFinish.isPending.value"
                  @click="toggleStock(finish)"
                />
                <Button
                  size="small"
                  class="kedak-outline-action person-danger-soft"
                  severity="secondary"
                  outlined
                  icon="pi pi-trash"
                  label="Delete"
                  :disabled="!finish.canDelete"
                  :title="
                    finish.canDelete
                      ? 'Remove this finish from the store'
                      : 'Ordered before, so it can’t be deleted. Mark it out of stock instead.'
                  "
                  @click="removeFinish(finish)"
                />
              </div>
              <p v-if="!finish.canDelete" class="settings-hint products-hint">
                Already ordered, so it can’t be deleted. Mark it out of stock to stop sales.
              </p>
            </template>

            <form
              v-else
              class="products-finish-form"
              novalidate
              @submit.prevent="saveFinish(finish.name)"
            >
              <h2>Edit {{ finish.name }}</h2>
              <div class="people-field">
                <FloatLabel class="checkout-float-label" variant="in">
                  <InputText
                    :id="`price-${finish.name}`"
                    v-model="finishForm.price"
                    inputmode="decimal"
                  />
                  <label :for="`price-${finish.name}`">Price ({{ currency }})</label>
                </FloatLabel>
              </div>
              <div class="people-field">
                <FloatLabel class="checkout-float-label" variant="in">
                  <InputText
                    :id="`order-${finish.name}`"
                    v-model="finishForm.displayOrder"
                    inputmode="numeric"
                  />
                  <label :for="`order-${finish.name}`">Display order</label>
                </FloatLabel>
              </div>
              <div class="people-field">
                <FloatLabel class="checkout-float-label" variant="in">
                  <InputText
                    :id="`description-${finish.name}`"
                    v-model="finishForm.description"
                    maxlength="200"
                  />
                  <label :for="`description-${finish.name}`">Short description</label>
                </FloatLabel>
              </div>
              <label class="people-check">
                <input v-model="finishForm.inStock" type="checkbox" />
                <span><strong>In stock</strong><small>Untick to pause sales.</small></span>
              </label>
              <p v-if="finishError" class="upload-error" role="alert">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i
                ><span>{{ finishError }}</span>
              </p>
              <div class="people-add-actions">
                <Button
                  type="button"
                  class="kedak-outline-action"
                  severity="secondary"
                  outlined
                  label="Cancel"
                  @click="editingFinish = null"
                />
                <Button
                  type="submit"
                  class="kedak-action"
                  icon="pi pi-check"
                  label="Save"
                  :loading="updateFinish.isPending.value"
                />
              </div>
            </form>
          </article>
        </div>
        <div v-else class="info-card ops-empty">
          <span class="icon-tile" aria-hidden="true"><i class="pi pi-palette"></i></span>
          <p>
            <strong>No finishes in the store</strong>
            <small>Add one so shoppers can order.</small>
          </p>
        </div>
      </template>
    </section>

    <!-- ================================ Artwork ================================ -->
    <section v-else aria-label="Artwork">
      <p v-if="artworkLoadError" class="api-state is-error" role="alert">
        {{ artworkLoadError }}
      </p>
      <template v-else>
        <div class="products-categories" role="group" aria-label="Filter by category">
          <button
            type="button"
            class="products-category"
            :class="{ 'is-active': category === null }"
            :aria-pressed="category === null"
            @click="category = null"
          >
            <strong>All artwork</strong>
            <small>{{ totals.published }} live · {{ totals.hidden }} hidden</small>
          </button>
          <button
            v-for="item in categories"
            :key="item.name"
            type="button"
            class="products-category"
            :class="{ 'is-active': category === item.name }"
            :aria-pressed="category === item.name"
            @click="category = item.name"
          >
            <strong>{{ item.name }}</strong>
            <small>{{ item.published }} live · {{ item.hidden }} hidden</small>
          </button>
        </div>

        <div class="products-artwork-layout" :class="{ 'has-panel': selected || uploading }">
          <section class="info-card ops-queue products-library" aria-labelledby="library-title">
            <div class="ops-queue-head people-head">
              <h2 id="library-title">Library</h2>
              <span class="ops-search">
                <i class="pi pi-search" aria-hidden="true"></i>
                <input
                  v-model="search"
                  type="search"
                  placeholder="Name or ID"
                  aria-label="Search artwork"
                  autocomplete="off"
                />
              </span>
              <Select
                v-model="status"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                class="kedak-select ops-sort"
                aria-label="Filter by status"
              />
              <Select
                v-model="sort"
                :options="sortOptions"
                option-label="label"
                option-value="value"
                class="kedak-select ops-sort"
                aria-label="Sort artwork"
              />
              <Button
                class="kedak-action products-upload-button"
                icon="pi pi-upload"
                label="Upload"
                @click="openUpload"
              />
            </div>

            <p v-if="artworkQuery.isPending.value" class="api-state" aria-busy="true">
              <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading artwork…
            </p>
            <div v-else-if="!designs.length" class="ops-empty">
              <span class="icon-tile" aria-hidden="true"><i class="pi pi-images"></i></span>
              <p>
                <strong>No artwork here</strong>
                <small>Try another category or filter, or upload a design.</small>
              </p>
            </div>
            <ul v-else class="products-grid">
              <li v-for="design in designs" :key="design.id">
                <button
                  type="button"
                  class="products-tile"
                  :class="{
                    'is-selected': selected?.id === design.id,
                    'is-hidden': !design.isPublished,
                  }"
                  :aria-pressed="selected?.id === design.id"
                  @click="(selectDesign(design), revealPanel())"
                >
                  <span class="products-tile-art">
                    <img
                      v-if="design.artworkUrl"
                      :src="design.artworkUrl"
                      :alt="design.name"
                      loading="lazy"
                    />
                  </span>
                  <span class="products-tile-copy">
                    <strong>{{ design.name }}</strong>
                    <small>{{ design.id }}</small>
                  </span>
                  <span v-if="!design.isPublished" class="products-tile-flag">Hidden</span>
                </button>
              </li>
            </ul>

            <nav
              v-if="!artworkQuery.isPending.value && (designs.length || pageIndex > 0)"
              class="ops-pagination"
              aria-label="Artwork pages"
            >
              <div class="ops-page-size">
                <span>Show</span>
                <Select
                  v-model="pageSize"
                  :options="pageSizeOptions"
                  option-label="label"
                  option-value="value"
                  class="kedak-select kedak-select--small"
                  aria-label="Designs per page"
                />
                <span>per page</span>
              </div>
              <p class="ops-page-status" aria-live="polite">Page {{ pageIndex + 1 }}</p>
              <div class="ops-page-buttons">
                <button
                  type="button"
                  :disabled="pageIndex === 0"
                  aria-label="Previous page"
                  @click="pageIndex -= 1"
                >
                  <i class="pi pi-chevron-left" aria-hidden="true"></i>
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  :disabled="!hasNextPage || artworkQuery.isFetchingNextPage.value"
                  aria-label="Next page"
                  @click="goToNextPage"
                >
                  <span>Next</span>
                  <i class="pi pi-chevron-right" aria-hidden="true"></i>
                </button>
              </div>
            </nav>
          </section>

          <!-- Upload panel -->
          <aside v-if="uploading" class="info-card ops-panel products-panel" aria-label="Upload">
            <div class="people-add-head">
              <h2>Upload artwork</h2>
              <button
                type="button"
                class="ops-icon-button"
                aria-label="Close"
                @click="uploading = false"
              >
                <i class="pi pi-times" aria-hidden="true"></i>
              </button>
            </div>
            <form class="products-panel-form" novalidate @submit.prevent="upload">
              <label class="products-drop">
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  @change="pickSvg($event, 'upload')"
                />
                <span class="products-preview">
                  <img v-if="uploadPreview" :src="uploadPreview" alt="Preview" />
                  <i v-else class="pi pi-upload" aria-hidden="true"></i>
                </span>
                <span>
                  <strong>{{ uploadFile ? uploadFile.name : 'Choose an SVG file' }}</strong>
                  <small>120×120 viewBox, transparent, #111111 only, under 200 KB.</small>
                </span>
              </label>
              <FloatLabel class="checkout-float-label" variant="in">
                <InputText id="upload-name" v-model="uploadName" maxlength="80" />
                <label for="upload-name">Design name</label>
              </FloatLabel>
              <div class="people-field">
                <label class="people-label" for="upload-category">Category</label>
                <Select
                  v-model="uploadCategory"
                  input-id="upload-category"
                  :options="categoryOptions"
                  option-label="label"
                  option-value="value"
                  class="kedak-select"
                />
                <small class="settings-hint">The category can’t be changed after upload.</small>
              </div>
              <label class="people-check">
                <input v-model="uploadPublished" type="checkbox" />
                <span
                  ><strong>Publish now</strong
                  ><small>Untick to keep it hidden from shoppers.</small></span
                >
              </label>
              <p v-if="artworkError" class="upload-error" role="alert">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i
                ><span>{{ artworkError }}</span>
              </p>
              <Button
                type="submit"
                class="kedak-action person-full"
                icon="pi pi-upload"
                label="Upload artwork"
                :loading="createArtwork.isPending.value"
              />
            </form>
          </aside>

          <!-- Edit panel -->
          <aside
            v-else-if="selected"
            class="info-card ops-panel products-panel"
            aria-label="Edit artwork"
          >
            <div class="people-add-head">
              <div>
                <p class="ops-card-kicker">{{ selected.category }} · {{ selected.id }}</p>
                <h2>{{ selected.name }}</h2>
              </div>
              <button
                type="button"
                class="ops-icon-button"
                aria-label="Close"
                @click="selected = null"
              >
                <i class="pi pi-times" aria-hidden="true"></i>
              </button>
            </div>
            <div class="products-preview is-large">
              <img
                v-if="replacementPreview || selected.artworkUrl"
                :src="replacementPreview || selected.artworkUrl || ''"
                :alt="selected.name"
              />
            </div>
            <p class="products-panel-status">
              <span class="settings-badge" :class="selected.isPublished ? 'is-ok' : 'is-warn'">
                {{ selected.isPublished ? 'Live in the shop' : 'Hidden from shoppers' }}
              </span>
              <span v-if="selected.updatedAt" class="settings-hint">
                Updated {{ formatOrderDate(selected.updatedAt) }}
              </span>
            </p>
            <form class="products-panel-form" novalidate @submit.prevent="saveDesign">
              <FloatLabel class="checkout-float-label" variant="in">
                <InputText id="edit-design-name" v-model="editName" maxlength="80" />
                <label for="edit-design-name">Design name</label>
              </FloatLabel>
              <label class="products-drop is-compact">
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  @change="pickSvg($event, 'replace')"
                />
                <i class="pi pi-refresh" aria-hidden="true"></i>
                <span>
                  <strong>{{ replacement ? replacement.name : 'Replace SVG' }}</strong>
                  <small>Optional. Same artwork rules apply.</small>
                </span>
              </label>
              <p v-if="artworkError" class="upload-error" role="alert">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i
                ><span>{{ artworkError }}</span>
              </p>
              <Button
                type="submit"
                class="kedak-action person-full"
                icon="pi pi-check"
                label="Save changes"
                :disabled="editName.trim() === selected.name && !replacement"
                :loading="updateArtwork.isPending.value"
              />
            </form>
            <div class="products-panel-actions">
              <Button
                class="kedak-outline-action"
                severity="secondary"
                outlined
                :icon="selected.isPublished ? 'pi pi-eye-slash' : 'pi pi-eye'"
                :label="selected.isPublished ? 'Hide' : 'Publish'"
                :disabled="updateArtwork.isPending.value"
                @click="togglePublished(selected)"
              />
              <Button
                class="kedak-outline-action person-danger-soft"
                severity="secondary"
                outlined
                icon="pi pi-trash"
                label="Delete"
                :loading="deleteArtwork.isPending.value"
                @click="removeDesign(selected)"
              />
            </div>
            <p class="settings-hint">
              Artwork that’s part of an order can’t be deleted; hide it instead.
            </p>
          </aside>
        </div>
      </template>
    </section>

    <p class="legal-note">Every change here is recorded with your name.</p>
  </main>
</template>
