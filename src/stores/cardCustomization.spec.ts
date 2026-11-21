import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { finishes, isCartItemCustomized, useCardCustomizationStore } from './cardCustomization'
import {
  MAX_UPLOAD_BYTES,
  validateUpload,
  validateUploads,
} from '../composables/useCardCustomization'

describe('card customisation store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('changes category and resets to the first design', () => {
    const store = useCardCustomizationStore()
    store.selectCategory('Cars')
    expect(store.category).toBe('Cars')
    expect(store.gallery).toHaveLength(10)
    expect(store.selectedDesignId).toBe('cars-01')
  })

  it('saves the upload orientation and display with the cart item and restores them to edit', () => {
    const store = useCardCustomizationStore()
    store.setCustomizationMode('custom')
    store.setUploadedArtworks([{ name: 'a.png', size: 1, type: 'image/png', url: 'blob:a' }])
    store.setUploadOrientation('portrait')
    store.setUploadDisplay('cover')
    const id = store.addToCart()

    expect(store.cartItems[0]?.customization).toMatchObject({
      uploadOrientation: 'portrait',
      uploadDisplay: 'cover',
    })

    store.startNewCustomization('Black')
    expect(store.uploadOrientation).toBe('landscape')
    expect(store.uploadDisplay).toBe('default')

    store.beginEditingCartItem(id)
    expect(store.uploadOrientation).toBe('portrait')
    expect(store.uploadDisplay).toBe('cover')
  })

  it('refuses to add an out-of-stock finish to the cart', () => {
    const store = useCardCustomizationStore()
    expect(() => store.addUncustomizedItem('Signature', 1)).toThrow(/out of stock/)
    store.setFinish('Signature')
    expect(() => store.addToCart()).toThrow(/out of stock/)
    expect(store.cartItems).toHaveLength(0)
  })

  it('blocks checkout while an item is out of stock until its finish is switched', () => {
    const black = finishes.find((item) => item.name === 'Black')!
    const store = useCardCustomizationStore()
    const id = store.addToCart()
    expect(store.canCheckout).toBe(true)

    black.inStock = false
    try {
      expect(store.canCheckout).toBe(false)
      expect(() => store.changeCartItemFinish(id, 'Signature')).toThrow(/out of stock/)

      expect(store.changeCartItemFinish(id, 'Silver')).toBe(true)
      expect(store.cartItems[0]?.finish).toBe('Silver')
      expect(store.cartItems[0]?.customization?.finish).toBe('Silver')
      expect(store.cartItems[0]?.customization?.price).toBe(129)
      expect(store.canCheckout).toBe(true)
    } finally {
      black.inStock = true
    }
  })

  it('updates the selected design', () => {
    const store = useCardCustomizationStore()
    store.selectDesign('sport-02')
    expect(store.selectedDesignId).toBe('sport-02')
  })

  it('limits cardholder names to 22 characters', () => {
    const store = useCardCustomizationStore()
    store.setHolderName('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    expect(store.holderName).toBe('ABCDEFGHIJKLMNOPQRSTUV')
  })

  it('calculates the subtotal and item count for customized cart items', () => {
    const store = useCardCustomizationStore()
    store.setFinish('Gold')
    store.setCartQuantity(2)
    store.addToCart()

    expect(store.cartQuantity).toBe(2)
    expect(store.cartSubtotal).toBe(358)
    expect(store.cartItemCount).toBe(2)
    expect(store.canCheckout).toBe(true)
  })

  it('rejects invalid cart quantities', () => {
    const store = useCardCustomizationStore()
    expect(() => store.setCartQuantity(0)).toThrow(RangeError)
  })

  it('updates cart quantity and requires one uploaded image per card', () => {
    const store = useCardCustomizationStore()
    store.setCustomizationMode('custom')
    store.setArtworkAssignment('per-card')
    store.setCartQuantity(2)
    store.setUploadedArtworks([
      { name: 'one.png', size: 1, type: 'image/png', url: 'blob:one' },
      { name: 'two.png', size: 1, type: 'image/png', url: 'blob:two' },
    ])
    const itemId = store.addToCart()
    const item = store.cartItems[0]!

    expect(store.canCheckout).toBe(true)
    expect(store.setCartItemQuantity(itemId, 3)).toBe(true)
    expect(store.cartItemCount).toBe(3)
    expect(isCartItemCustomized(item)).toBe(false)
    expect(store.canCheckout).toBe(false)
    expect(() => store.setCartItemQuantity(itemId, 0)).toThrow(RangeError)
  })

  it('snapshots the current customization and quantity in the cart', () => {
    const store = useCardCustomizationStore()
    store.setFinish('Gold')
    store.setCartQuantity(2)
    store.addToCart()

    store.setFinish('Silver')
    store.setCartQuantity(1)

    expect(store.cartItems[0]?.customization?.finish).toBe('Gold')
    expect(store.cartItems[0]?.quantity).toBe(2)
    expect(store.cartSubtotal).toBe(358)
  })

  it('keeps quick-added items uncustomized until saved and updates the cart when edited', () => {
    const store = useCardCustomizationStore()
    const itemId = store.addUncustomizedItem('Gold', 3)

    expect(store.cartItems[0]).toMatchObject({
      id: itemId,
      finish: 'Gold',
      quantity: 3,
      customization: null,
    })
    expect(store.cartItemCount).toBe(3)
    expect(store.cartSubtotal).toBe(537)
    expect(store.canCheckout).toBe(false)

    expect(store.beginEditingCartItem(itemId)).toBe(true)
    store.addToCart()

    expect(store.cartItems).toHaveLength(1)
    expect(store.cartItems[0]?.customization?.finish).toBe('Gold')
    expect(store.cartItems[0]?.quantity).toBe(3)
    expect(store.canCheckout).toBe(true)

    store.removeCartItem(itemId)
    expect(store.cartItems).toHaveLength(0)
    expect(store.cartItemCount).toBe(0)
    expect(store.cartSubtotal).toBe(0)
  })

  it('merges repeated quick adds of the same finish', () => {
    const store = useCardCustomizationStore()
    const firstId = store.addUncustomizedItem('Gold', 1)
    const repeatedId = store.addUncustomizedItem('Gold', 2)

    expect(repeatedId).toBe(firstId)
    expect(store.cartItems).toHaveLength(1)
    expect(store.cartItems[0]?.quantity).toBe(3)

    store.addUncustomizedItem('Silver', 1)
    expect(store.cartItems).toHaveLength(2)
  })

  it('merges matching customisations but keeps pre-designed and custom items separate', () => {
    const store = useCardCustomizationStore()
    const presetId = store.addToCart()
    store.startNewCustomization('Black')
    const repeatedPresetId = store.addToCart()

    expect(repeatedPresetId).toBe(presetId)
    expect(store.cartItems).toHaveLength(1)
    expect(store.cartItems[0]?.quantity).toBe(2)

    store.startNewCustomization('Black')
    store.setCustomizationMode('custom')
    store.setUploadedArtworks([{ name: 'art.png', size: 10, type: 'image/png', url: 'blob:art' }])
    const customId = store.addToCart()
    store.startNewCustomization('Black')
    store.setCustomizationMode('custom')
    store.setUploadedArtworks([{ name: 'art.png', size: 10, type: 'image/png', url: 'blob:art' }])
    const repeatedCustomId = store.addToCart()

    expect(customId).not.toBe(presetId)
    expect(repeatedCustomId).toBe(customId)
    expect(store.cartItems).toHaveLength(2)
    expect(store.cartItems.find((item) => item.id === customId)?.quantity).toBe(2)

    store.startNewCustomization('Black')
    store.selectDesign('sport-02')
    const differentPresetId = store.addToCart()
    expect(differentPresetId).not.toBe(presetId)
    expect(store.cartItems).toHaveLength(3)
  })

  it('keeps per-card artwork counts valid when identical items merge', () => {
    const store = useCardCustomizationStore()
    store.setCustomizationMode('custom')
    store.setArtworkAssignment('per-card')
    store.setUploadedArtworks([{ name: 'art.png', size: 10, type: 'image/png', url: 'blob:art' }])
    const firstId = store.addToCart()

    store.startNewCustomization('Black')
    store.setCustomizationMode('custom')
    store.setArtworkAssignment('per-card')
    store.setUploadedArtworks([{ name: 'art.png', size: 10, type: 'image/png', url: 'blob:art' }])
    const repeatedId = store.addToCart()

    const merged = store.cartItems.find((item) => item.id === firstId)
    expect(repeatedId).toBe(firstId)
    expect(merged?.quantity).toBe(2)
    expect(merged?.customization?.uploadedArtworks).toHaveLength(2)
    expect(store.canCheckout).toBe(true)
  })
})

describe('image upload validation', () => {
  it('accepts PNG, JPEG and WebP within 5 MB', () => {
    expect(validateUpload(new File(['x'], 'card.png', { type: 'image/png' })).valid).toBe(true)
    expect(validateUpload(new File(['x'], 'card.jpg', { type: 'image/jpeg' })).valid).toBe(true)
    expect(validateUpload(new File(['x'], 'card.webp', { type: 'image/webp' })).valid).toBe(true)
  })

  it('rejects unsupported types and oversized images', () => {
    expect(validateUpload(new File(['x'], 'card.gif', { type: 'image/gif' })).valid).toBe(false)
    const large = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'large.png', {
      type: 'image/png',
    })
    expect(validateUpload(large)).toEqual({
      valid: false,
      message: 'The image must be 5 MB or smaller.',
    })
  })

  it('requires artwork count to match the selected assignment', () => {
    const first = new File(['x'], 'one.png', { type: 'image/png' })
    const second = new File(['x'], 'two.webp', { type: 'image/webp' })
    const third = new File(['x'], 'three.jpg', { type: 'image/jpeg' })

    expect(validateUploads([first], 'shared', 3).valid).toBe(true)
    expect(validateUploads([first], 'per-card', 2)).toEqual({
      valid: false,
      message: 'Choose exactly 2 images, one for each card.',
    })
    expect(validateUploads([first, second, third], 'per-card', 2)).toEqual({
      valid: false,
      message: 'Choose exactly 2 images, one for each card.',
    })
    expect(validateUploads([first, second], 'per-card', 2).valid).toBe(true)
  })
})
