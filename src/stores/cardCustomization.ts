import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { artworkLibrary, defaultArtworkCategory } from '../data/artwork'
import type {
  CardCategory,
  CardCartItem,
  CardCustomization,
  CardDesign,
  CardFinish,
  ArtworkAssignment,
  CompatibilityAnswers,
  CustomizationMode,
  EngravingStyle,
  UploadedArtwork,
  UploadDisplay,
  UploadOrientation,
} from '../types/card'

// Built from the SVG files in src/assets/artwork (see src/data/artwork.ts).
export const designs: Record<CardCategory, CardDesign[]> = artworkLibrary

// Set `inStock: false` to mark a finish as unavailable: it shows an "Out of stock" badge,
// can't be added to the cart, and blocks checkout for any cart item already using it.
// Reactive so badges, buttons and checkout update if stock changes while the app is open.
export const finishes = reactive<
  Array<{
    name: CardFinish
    price: number
    color: string
    foreground: string
    inStock: boolean
  }>
>([
  { name: 'Silver', price: 129, color: '#c2c4c9', foreground: '#222226', inStock: true },
  { name: 'Black', price: 149, color: '#242426', foreground: '#f2f2f5', inStock: true },
  { name: 'Gold', price: 179, color: '#a99570', foreground: '#f7f3e8', inStock: true },
  { name: 'Signature', price: 219, color: '#39343d', foreground: '#f2f2f5', inStock: false },
])

export function isFinishInStock(finish: CardFinish) {
  return finishes.find((item) => item.name === finish)?.inStock ?? false
}

export function isCartItemCustomized(item: CardCartItem) {
  const saved = item.customization
  return (
    saved !== null &&
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
    (left.customizationMode === 'custom' ||
      (left.category === right.category && left.designId === right.designId)) &&
    left.uploadedArtworks.length === right.uploadedArtworks.length &&
    left.uploadedArtworks.every(
      (artwork, index) => artwork.url === right.uploadedArtworks[index]?.url,
    )
  )
}

export const useCardCustomizationStore = defineStore('cardCustomization', () => {
  const category = ref<CardCategory>(defaultArtworkCategory)
  const selectedDesignId = ref(designs[defaultArtworkCategory][0]!.id)
  const customizationMode = ref<CustomizationMode>('preset')
  const finish = ref<CardFinish>('Black')
  const cartQuantity = ref(1)
  const cartItems = ref<CardCartItem[]>([])
  const editingCartItemId = ref<string | null>(null)
  const engravingStyle = ref<EngravingStyle>('name')
  const holderName = ref('ALEX MORGAN')
  const uploadedArtworks = ref<UploadedArtwork[]>([])
  const artworkAssignment = ref<ArtworkAssignment>('shared')
  const uploadOrientation = ref<UploadOrientation>('landscape')
  const uploadDisplay = ref<UploadDisplay>('default')
  const compatibilityAnswers = ref<CompatibilityAnswers>({
    country: 'United Kingdom',
    network: 'Visa / Mastercard',
    cardType: 'Personal debit card',
    hasChip: true,
    acknowledged: true,
  })
  const orderPlaced = ref(false)

  const gallery = computed(() => designs[category.value])
  const selectedDesign = computed(
    () => gallery.value.find((design) => design.id === selectedDesignId.value) ?? gallery.value[0]!,
  )
  const selectedFinish = computed(() => finishes.find((item) => item.name === finish.value)!)
  const uploadedArtwork = computed(() => uploadedArtworks.value[0] ?? null)
  const cartItemCount = computed(() =>
    cartItems.value.reduce((count, item) => count + item.quantity, 0),
  )
  const cartSubtotal = computed(() =>
    cartItems.value.reduce(
      (subtotal, item) =>
        subtotal +
        (item.customization?.price ??
          finishes.find((finishItem) => finishItem.name === item.finish)!.price) *
          item.quantity,
      0,
    ),
  )
  // Every item must be customised and in stock before checkout.
  const canCheckout = computed(
    () =>
      cartItems.value.length > 0 &&
      cartItems.value.every((item) => isCartItemCustomized(item) && isFinishInStock(item.finish)),
  )

  const customization = computed<CardCustomization>(() => ({
    category: category.value,
    designId: selectedDesign.value.id,
    customizationMode: customizationMode.value,
    finish: finish.value,
    engravingStyle: engravingStyle.value,
    holderName: holderName.value,
    uploadedArtwork: uploadedArtwork.value,
    uploadedArtworks: [...uploadedArtworks.value],
    artworkAssignment: artworkAssignment.value,
    uploadOrientation: uploadOrientation.value,
    uploadDisplay: uploadDisplay.value,
    price: selectedFinish.value.price,
  }))

  function selectCategory(nextCategory: CardCategory) {
    category.value = nextCategory
    selectedDesignId.value = designs[nextCategory][0]!.id
  }

  function setCustomizationMode(mode: CustomizationMode) {
    customizationMode.value = mode
  }

  function selectDesign(designId: string) {
    if (gallery.value.some((design) => design.id === designId)) {
      selectedDesignId.value = designId
      uploadedArtworks.value = []
    }
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

  function setFinish(nextFinish: CardFinish) {
    finish.value = nextFinish
  }

  function validateQuantity(quantity: number) {
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new RangeError('Cart quantity must be a positive safe integer.')
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
    category.value = defaultArtworkCategory
    selectedDesignId.value = designs[defaultArtworkCategory][0]!.id
    customizationMode.value = 'preset'
    finish.value = nextFinish
    cartQuantity.value = quantity
    engravingStyle.value = 'name'
    holderName.value = 'ALEX MORGAN'
    uploadedArtworks.value = []
    artworkAssignment.value = 'shared'
    uploadOrientation.value = 'landscape'
    uploadDisplay.value = 'default'
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
      selectedDesignId.value = saved.designId
      customizationMode.value = saved.customizationMode
      finish.value = saved.finish
      cartQuantity.value = item.quantity
      engravingStyle.value = saved.engravingStyle
      holderName.value = saved.holderName
      uploadedArtworks.value = [...saved.uploadedArtworks]
      artworkAssignment.value = saved.artworkAssignment
      uploadOrientation.value = saved.uploadOrientation
      uploadDisplay.value = saved.uploadDisplay
    }
    editingCartItemId.value = id
    return true
  }

  function assertInStock(itemFinish: CardFinish) {
    if (!isFinishInStock(itemFinish)) {
      throw new Error(`${itemFinish} is out of stock and can't be added to the cart.`)
    }
  }

  function addUncustomizedItem(itemFinish: CardFinish, quantity: number) {
    assertInStock(itemFinish)
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

  function addToCart() {
    // New items must be in stock; edits to an item already in the cart are still allowed to save.
    if (editingCartItemId.value === null) assertInStock(finish.value)
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

  // Swap a cart item to another (in-stock) finish, keeping its design, name and quantity.
  function changeCartItemFinish(id: string, nextFinish: CardFinish) {
    assertInStock(nextFinish)
    const item = cartItems.value.find((cartItem) => cartItem.id === id)
    if (!item) return false
    const price = finishes.find((candidate) => candidate.name === nextFinish)!.price
    item.finish = nextFinish
    if (item.customization) {
      item.customization = { ...item.customization, finish: nextFinish, price }
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
  }

  function setEngravingStyle(style: EngravingStyle) {
    engravingStyle.value = style
  }

  function setCompatibilityAnswers(answers: CompatibilityAnswers) {
    compatibilityAnswers.value = answers
  }

  function setOrderPlaced(placed: boolean) {
    orderPlaced.value = placed
  }

  return {
    category,
    selectedDesignId,
    customizationMode,
    finish,
    engravingStyle,
    holderName,
    compatibilityAnswers,
    orderPlaced,
    gallery,
    selectedDesign,
    selectedFinish,
    customization,
    cartItems,
    cartItemCount,
    canCheckout,
    editingCartItemId,
    uploadedArtworks,
    uploadedArtwork,
    artworkAssignment,
    uploadOrientation,
    uploadDisplay,
    cartQuantity,
    cartSubtotal,
    selectCategory,
    selectDesign,
    setHolderName,
    setCustomizationMode,
    setUploadedArtworks,
    setArtworkAssignment,
    setUploadOrientation,
    setUploadDisplay,
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
    setOrderPlaced,
  }
})
