import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { PendingCheckout } from '../services/checkoutHandoff'
import {
  MAX_ITEM_QUANTITY,
  MAX_NOTES_LENGTH,
  type ArtworkAssignment,
  type CardCartItem,
  type CardCategory,
  type CardCustomization,
  type CardFinish,
  type CustomizationMode,
  type EngravingStyle,
  type UploadDisplay,
  type UploadedArtwork,
  type UploadOrientation,
} from '../types/card'
import type { CompatibilityAnswers, CompatibilityResult } from '../types/api'

/**
 * Client-owned state for designing cards and building the cart.
 *
 * Server-owned data is NOT kept here: finishes, prices and stock come from the catalogue query,
 * artwork from the artwork queries, and cart pricing / checkout readiness from
 * POST /cart/validate (see src/queries). This store only remembers what the customer chose.
 */
export const DEFAULT_HOLDER_NAME = 'ALEX MORGAN'

/** Locally complete: customised, with one image per card when artwork is per card. */
export function isCartItemCustomized(item: CardCartItem) {
  const saved = item.customization
  return (
    saved !== null &&
    (saved.customizationMode !== 'custom' || saved.uploadedArtworks.length > 0) &&
    (saved.artworkAssignment !== 'per-card' || saved.uploadedArtworks.length === item.quantity)
  )
}

function hasSameCustomization(left: CardCustomization, right: CardCustomization) {
  return (
    left.customizationMode === right.customizationMode &&
    left.finish === right.finish &&
    left.engravingStyle === right.engravingStyle &&
    left.holderName === right.holderName &&
    left.artworkAssignment === right.artworkAssignment &&
    left.uploadOrientation === right.uploadOrientation &&
    left.uploadDisplay === right.uploadDisplay &&
    left.contactless === right.contactless &&
    left.notes === right.notes &&
    (left.customizationMode === 'custom' ||
      (left.category === right.category && left.designId === right.designId)) &&
    left.uploadedArtworks.length === right.uploadedArtworks.length &&
    left.uploadedArtworks.every(
      (artwork, index) => artwork.id === right.uploadedArtworks[index]?.id,
    )
  )
}

export function isValidQuantity(quantity: number) {
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= MAX_ITEM_QUANTITY
}

export const useCardCustomizationStore = defineStore('cardCustomization', () => {
  /** null until the artwork categories load; then the first category from the API. */
  const category = ref<CardCategory | null>(null)
  /** null until the gallery loads; then the first design of the category. */
  const selectedDesignId = ref<string | null>(null)
  const customizationMode = ref<CustomizationMode>('preset')
  const finish = ref<CardFinish>('Black')
  const cartQuantity = ref(1)
  const cartItems = ref<CardCartItem[]>([])
  const editingCartItemId = ref<string | null>(null)
  const engravingStyle = ref<EngravingStyle>('name')
  const holderName = ref(DEFAULT_HOLDER_NAME)
  const uploadedArtworks = ref<UploadedArtwork[]>([])
  const artworkAssignment = ref<ArtworkAssignment>('shared')
  const uploadOrientation = ref<UploadOrientation>('landscape')
  const uploadDisplay = ref<UploadDisplay>('default')
  /** Contactless is on by default; the customer can opt out. */
  const contactless = ref(true)
  const notes = ref('')
  const compatibilityAnswers = ref<CompatibilityAnswers>({
    country: 'United Kingdom',
    network: 'Visa / Mastercard',
    cardType: 'Personal debit card',
    hasChip: true,
    acknowledged: true,
  })
  /** Last preliminary screening from POST /compatibility-checks (never a guarantee). */
  const compatibilityResult = ref<CompatibilityResult | null>(null)
  /** Reference of the order just placed, for the confirmation page. */
  const lastPlacedOrderId = ref<string | null>(null)

  const uploadedArtwork = computed(() => uploadedArtworks.value[0] ?? null)
  const cartItemCount = computed(() =>
    cartItems.value.reduce((count, item) => count + item.quantity, 0),
  )
  const allItemsCustomized = computed(
    () => cartItems.value.length > 0 && cartItems.value.every(isCartItemCustomized),
  )

  const customization = computed<CardCustomization>(() => ({
    category: category.value ?? 'Sport',
    designId: selectedDesignId.value ?? '',
    customizationMode: customizationMode.value,
    finish: finish.value,
    engravingStyle: engravingStyle.value,
    holderName: holderName.value,
    uploadedArtwork: uploadedArtwork.value,
    uploadedArtworks: [...uploadedArtworks.value],
    artworkAssignment: artworkAssignment.value,
    uploadOrientation: uploadOrientation.value,
    uploadDisplay: uploadDisplay.value,
    contactless: contactless.value,
    notes: notes.value,
  }))

  function selectCategory(nextCategory: CardCategory) {
    if (category.value === nextCategory) return
    category.value = nextCategory
    selectedDesignId.value = null // the gallery picks the category's first design once loaded
  }

  /** Initial defaults once the API data arrives; never overrides a customer choice. */
  function ensureCategory(defaultCategory: CardCategory) {
    if (category.value === null) category.value = defaultCategory
  }

  function ensureDesign(designId: string) {
    selectedDesignId.value = designId
  }

  function setCustomizationMode(mode: CustomizationMode) {
    customizationMode.value = mode
  }

  function selectDesign(designId: string) {
    selectedDesignId.value = designId
    uploadedArtworks.value = []
  }

  function setHolderName(value: string) {
    holderName.value = value.slice(0, 22)
  }

  function setUploadedArtworks(artworks: UploadedArtwork[]) {
    uploadedArtworks.value = artworks
  }

  function setArtworkAssignment(assignment: ArtworkAssignment) {
    artworkAssignment.value = assignment
  }

  function setUploadOrientation(orientation: UploadOrientation) {
    uploadOrientation.value = orientation
  }

  function setUploadDisplay(display: UploadDisplay) {
    uploadDisplay.value = display
  }

  function setContactless(value: boolean) {
    contactless.value = value
  }

  function setNotes(value: string) {
    notes.value = value.slice(0, MAX_NOTES_LENGTH)
  }

  function setFinish(nextFinish: CardFinish) {
    finish.value = nextFinish
  }

  function validateQuantity(quantity: number) {
    if (!isValidQuantity(quantity)) {
      throw new RangeError(`Cart quantity must be between 1 and ${MAX_ITEM_QUANTITY}.`)
    }
  }

  function setCartQuantity(quantity: number) {
    validateQuantity(quantity)
    cartQuantity.value = quantity
  }

  let fallbackCartItemId = 0

  function createCartItemId() {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
    fallbackCartItemId += 1
    return `cart-${Date.now()}-${fallbackCartItemId}`
  }

  function resetDraft(nextFinish: CardFinish, quantity = 1) {
    selectedDesignId.value = null
    category.value = null
    customizationMode.value = 'preset'
    finish.value = nextFinish
    cartQuantity.value = quantity
    engravingStyle.value = 'name'
    holderName.value = DEFAULT_HOLDER_NAME
    uploadedArtworks.value = []
    artworkAssignment.value = 'shared'
    uploadOrientation.value = 'landscape'
    uploadDisplay.value = 'default'
    contactless.value = true
    notes.value = ''
  }

  function startNewCustomization(nextFinish: CardFinish) {
    resetDraft(nextFinish)
    editingCartItemId.value = null
  }

  function beginEditingCartItem(id: string) {
    const item = cartItems.value.find((cartItem) => cartItem.id === id)
    if (!item) return false

    if (!item.customization) {
      resetDraft(item.finish, item.quantity)
    } else {
      const saved = item.customization
      category.value = saved.category
      selectedDesignId.value = saved.designId || null
      customizationMode.value = saved.customizationMode
      finish.value = saved.finish
      cartQuantity.value = item.quantity
      engravingStyle.value = saved.engravingStyle
      holderName.value = saved.holderName
      uploadedArtworks.value = [...saved.uploadedArtworks]
      artworkAssignment.value = saved.artworkAssignment
      uploadOrientation.value = saved.uploadOrientation
      uploadDisplay.value = saved.uploadDisplay
      // Items saved before contactless existed were priced without it.
      contactless.value = saved.contactless ?? false
      notes.value = saved.notes ?? ''
    }
    editingCartItemId.value = id
    return true
  }

  function addUncustomizedItem(itemFinish: CardFinish, quantity: number) {
    validateQuantity(quantity)
    const existing = cartItems.value.find(
      (item) => item.finish === itemFinish && item.customization === null,
    )
    if (existing) {
      validateQuantity(existing.quantity + quantity)
      existing.quantity += quantity
      return existing.id
    }

    const item: CardCartItem = {
      id: createCartItemId(),
      finish: itemFinish,
      quantity,
      customization: null,
    }
    cartItems.value.push(item)
    return item.id
  }

  function setCartItemQuantity(id: string, quantity: number) {
    validateQuantity(quantity)
    const item = cartItems.value.find((cartItem) => cartItem.id === id)
    if (!item) return false
    item.quantity = quantity
    return true
  }

  /** Saves the draft as a new cart item, or over the item being edited. */
  function addToCart() {
    const id = editingCartItemId.value ?? createCartItemId()
    const savedCustomization: CardCustomization = {
      ...customization.value,
      uploadedArtworks: [...uploadedArtworks.value],
    }
    const item: CardCartItem = {
      id,
      finish: finish.value,
      quantity: cartQuantity.value,
      customization: savedCustomization,
    }
    const existingIndex = cartItems.value.findIndex((cartItem) => cartItem.id === id)
    const duplicate = cartItems.value.find(
      (cartItem): cartItem is CardCartItem & { customization: CardCustomization } =>
        cartItem.id !== id &&
        cartItem.finish === item.finish &&
        cartItem.customization !== null &&
        hasSameCustomization(cartItem.customization, savedCustomization),
    )
    if (duplicate) {
      validateQuantity(duplicate.quantity + item.quantity)
      duplicate.quantity += item.quantity
      if (savedCustomization.artworkAssignment === 'per-card') {
        duplicate.customization.uploadedArtworks.push(...savedCustomization.uploadedArtworks)
      }
      if (existingIndex >= 0) cartItems.value.splice(existingIndex, 1)
      else if (savedCustomization.artworkAssignment === 'shared') {
        duplicate.customization.uploadedArtworks = [...savedCustomization.uploadedArtworks]
      }
      editingCartItemId.value = null
      return duplicate.id
    }
    if (existingIndex < 0) cartItems.value.push(item)
    else cartItems.value[existingIndex] = item
    editingCartItemId.value = null
    return id
  }

  /** Swap a cart item to another finish, keeping its design, name and quantity. */
  function changeCartItemFinish(id: string, nextFinish: CardFinish) {
    const item = cartItems.value.find((cartItem) => cartItem.id === id)
    if (!item) return false
    item.finish = nextFinish
    if (item.customization) {
      item.customization = { ...item.customization, finish: nextFinish }
    }
    return true
  }

  function removeCartItem(id: string) {
    const index = cartItems.value.findIndex((item) => item.id === id)
    if (index < 0) return null
    const [removedItem] = cartItems.value.splice(index, 1)
    if (editingCartItemId.value === id) editingCartItemId.value = null
    return removedItem ?? null
  }

  function clearCart() {
    cartItems.value = []
    editingCartItemId.value = null
    pendingCheckout.value = null
  }

  /** An unpaid order already created for the current cart (see services/checkoutHandoff). */
  const pendingCheckout = ref<PendingCheckout | null>(null)

  function setPendingCheckout(pending: PendingCheckout | null) {
    pendingCheckout.value = pending
  }

  /** Puts the cart back after the customer cancelled payment on Stripe/Paystack. */
  function restoreCheckout(pending: PendingCheckout) {
    cartItems.value = pending.items
    editingCartItemId.value = null
    pendingCheckout.value = pending
  }

  function setEngravingStyle(style: EngravingStyle) {
    engravingStyle.value = style
  }

  function setCompatibilityAnswers(answers: CompatibilityAnswers) {
    compatibilityAnswers.value = answers
  }

  function setCompatibilityResult(result: CompatibilityResult | null) {
    compatibilityResult.value = result
    if (result) compatibilityAnswers.value = result.answers
  }

  function setLastPlacedOrder(orderId: string | null) {
    lastPlacedOrderId.value = orderId
  }

  return {
    category,
    selectedDesignId,
    customizationMode,
    finish,
    engravingStyle,
    holderName,
    compatibilityAnswers,
    compatibilityResult,
    lastPlacedOrderId,
    pendingCheckout,
    setPendingCheckout,
    restoreCheckout,
    customization,
    cartItems,
    cartItemCount,
    allItemsCustomized,
    editingCartItemId,
    uploadedArtworks,
    uploadedArtwork,
    artworkAssignment,
    uploadOrientation,
    uploadDisplay,
    contactless,
    notes,
    cartQuantity,
    selectCategory,
    ensureCategory,
    ensureDesign,
    selectDesign,
    setHolderName,
    setCustomizationMode,
    setUploadedArtworks,
    setArtworkAssignment,
    setUploadOrientation,
    setUploadDisplay,
    setContactless,
    setNotes,
    setFinish,
    setCartQuantity,
    startNewCustomization,
    beginEditingCartItem,
    addUncustomizedItem,
    setCartItemQuantity,
    addToCart,
    changeCartItemFinish,
    removeCartItem,
    clearCart,
    setEngravingStyle,
    setCompatibilityAnswers,
    setCompatibilityResult,
    setLastPlacedOrder,
  }
})
