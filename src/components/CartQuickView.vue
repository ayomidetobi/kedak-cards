<script setup lang="ts">
import BarsLoader from './BarsLoader.vue'
import ActionButton from './ActionButton.vue'
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Popover, { type PopoverMethods } from 'primevue/popover'
import { useToast } from 'primevue/usetoast'
import { isCartItemCustomized, useCardCustomizationStore } from '../stores/cardCustomization'
import { PLACEHOLDER_DESIGN } from '../composables/useArtworkSelection'
import { useDesignLookup } from '../queries/artwork'
import { useCartValidation } from '../queries/cart'
import { MAX_ITEM_QUANTITY } from '../types/card'
import { formatMoney } from '../utils/money'
import CardPreview from './card/CardPreview.vue'
import StockBadge from './StockBadge.vue'
import TextLink from './TextLink.vue'
import type { CardCartItem } from '../types/card'

const props = defineProps<{
  variant: 'header' | 'floating'
}>()

const router = useRouter()
const toast = useToast()
const store = useCardCustomizationStore()
// Prices and checkout readiness come from POST /cart/validate; artwork from the artwork API.
const cart = useCartValidation()
const designs = useDesignLookup(() =>
  store.cartItems.flatMap((item) =>
    item.customization?.customizationMode === 'preset' ? [item.customization.designId] : [],
  ),
)
const popover = ref<PopoverMethods | null>(null)
const isPopoverOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)

function togglePopover(event: MouseEvent) {
  popover.value?.toggle(event)
}

function closePopover() {
  popover.value?.hide()
}

function handlePopoverHide() {
  isPopoverOpen.value = false
  pendingDeleteId.value = null
}

function itemDescription(item: CardCartItem) {
  const customization = item.customization
  if (!customization) return 'Design and cardholder details needed'
  const artwork =
    customization.customizationMode === 'custom'
      ? 'Custom artwork'
      : (designs.value.get(customization.designId)?.name ?? 'Pre-designed artwork')
  return [customization.holderName, artwork, customization.contactless ? 'Contactless' : '']
    .filter(Boolean)
    .join(' · ')
}

function itemDesign(item: CardCartItem) {
  const customization = item.customization
  if (!customization || customization.customizationMode !== 'preset') return PLACEHOLDER_DESIGN
  return designs.value.get(customization.designId) ?? PLACEHOLDER_DESIGN
}

function adjustItemQuantity(item: CardCartItem, change: -1 | 1) {
  const quantity = item.quantity + change
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) return

  if (!store.setCartItemQuantity(item.id, quantity)) {
    toast.add({
      severity: 'warn',
      summary: 'Item no longer available',
      detail: 'Your cart has changed. Close this preview and try again.',
      life: 3000,
    })
  }
}

// Checkout needs the server to confirm every item is customised and in stock.
const checkoutBlockedReason = computed(() => {
  if (!store.cartItems.length || cart.canCheckout.value) return ''
  if (cart.isValidating.value && !cart.result.value) return 'Checking prices and stock…'
  if (cart.error.value) return 'We couldn’t check your cart. Open the full cart to try again.'
  const reasons: string[] = []
  if (store.cartItems.some((item) => cart.hasIssue(item.id, 'finish_out_of_stock'))) {
    reasons.push('switch or remove out-of-stock items')
  }
  if (store.cartItems.some((item) => !isCartItemCustomized(item))) {
    reasons.push('customise every item')
  }
  if (!reasons.length) return cart.isValidating.value ? 'Checking prices and stock…' : ''
  return `To check out, ${reasons.join(' and ')}.`
})

function goToCart() {
  closePopover()
  void router.push('/cart')
}

function focusById(id: string) {
  void nextTick(() => document.getElementById(id)?.focus())
}

// Same two-step delete as the cart page: ask first, keep focus on the confirm/cancel controls.
function requestDelete(id: string) {
  pendingDeleteId.value = id
  focusById(`quick-keep-${props.variant}-${id}`)
}

function cancelDelete(id: string) {
  pendingDeleteId.value = null
  focusById(`quick-delete-${props.variant}-${id}`)
}

function openItemEditor(item: CardCartItem) {
  pendingDeleteId.value = null
  closePopover()
  void router.push({ name: 'cart', query: { edit: item.id } })
}

function removeItem(item: CardCartItem) {
  const removedItem = store.removeCartItem(item.id)
  pendingDeleteId.value = null
  if (!removedItem) {
    toast.add({
      severity: 'warn',
      summary: 'Item no longer available',
      detail: 'Your cart has changed. Close this preview and try again.',
      life: 3000,
    })
    return
  }

  toast.add({
    severity: 'success',
    summary: 'Removed from cart',
    detail: `${item.finish} card removed.`,
    life: 2600,
  })
}
</script>

<template>
  <div class="cart-quick-view" :class="`is-${variant}`">
    <Button
      v-if="variant === 'header'"
      type="button"
      class="cart-link cart-quick-view-trigger"
      :aria-label="`Cart, ${store.cartItemCount} item${store.cartItemCount === 1 ? '' : 's'}`"
      :aria-controls="`cart-quick-view-panel-${variant}`"
      aria-haspopup="dialog"
      :aria-expanded="isPopoverOpen"
      @click="togglePopover"
    >
      <i class="pi pi-shopping-cart" aria-hidden="true"></i>
      <span>Cart</span>
      <span v-if="store.cartItemCount" class="cart-count" aria-hidden="true">
        {{ store.cartItemCount }}
      </span>
    </Button>
    <Button
      v-else
      type="button"
      class="floating-cart-link cart-quick-view-trigger"
      :aria-label="`Open cart preview, ${store.cartItemCount} item${store.cartItemCount === 1 ? '' : 's'}`"
      :aria-controls="`cart-quick-view-panel-${variant}`"
      aria-haspopup="dialog"
      :aria-expanded="isPopoverOpen"
      @click="togglePopover"
    >
      <i class="pi pi-shopping-cart" aria-hidden="true"></i>
      <span>Cart</span>
      <span v-if="store.cartItemCount" class="floating-cart-count" aria-hidden="true">
        {{ store.cartItemCount }}
      </span>
    </Button>

    <Popover
      ref="popover"
      class="cart-quick-view-popover"
      :breakpoints="{ '640px': 'calc(100vw - 24px)' }"
      @show="isPopoverOpen = true"
      @hide="handlePopoverHide"
    >
      <section
        :id="`cart-quick-view-panel-${variant}`"
        class="cart-quick-view-panel"
        role="dialog"
        aria-label="Cart preview"
      >
        <header class="cart-quick-view-heading">
          <h2>Your cart</h2>
          <button
            type="button"
            class="cart-quick-view-close"
            aria-label="Close cart preview"
            @click="closePopover"
          >
            <i class="pi pi-times" aria-hidden="true"></i>
          </button>
        </header>

        <div v-if="!store.cartItems.length" class="cart-quick-view-empty">
          <span class="icon-tile" aria-hidden="true"><i class="pi pi-shopping-cart"></i></span>
          <p>Your cart is empty.</p>
          <span>Choose a finish to get started.</span>
          <TextLink to="/collections" @click="closePopover">Browse collections</TextLink>
        </div>

        <ul v-else class="cart-quick-view-items">
          <li v-for="item in store.cartItems" :key="item.id" class="cart-quick-view-item">
            <div class="cart-quick-view-item-main">
              <div class="cart-quick-view-card-preview">
                <CardPreview
                  :finish="item.finish"
                  :design="itemDesign(item)"
                  :engraving-style="item.customization?.engravingStyle ?? 'name'"
                  :holder-name="item.customization?.holderName ?? ''"
                  :uploaded-artwork="item.customization?.uploadedArtworks[0] ?? null"
                  :upload-orientation="item.customization?.uploadOrientation"
                  :upload-display="item.customization?.uploadDisplay"
                  :show-design-mark="false"
                />
              </div>
              <div class="cart-quick-view-item-content">
                <div class="cart-quick-view-item-heading">
                  <strong>{{ item.finish }} metal card</strong>
                  <strong class="price-text">{{ formatMoney(cart.lineTotal(item.id)) }}</strong>
                </div>
                <span class="cart-quick-view-item-description">{{ itemDescription(item) }}</span>
                <span
                  class="cart-customization-status"
                  :class="{ 'is-pending': !isCartItemCustomized(item) }"
                >
                  <i
                    :class="
                      isCartItemCustomized(item) ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'
                    "
                    aria-hidden="true"
                  ></i>
                  {{ isCartItemCustomized(item) ? 'Customised' : 'Not customised' }}
                </span>
                <StockBadge
                  v-if="cart.hasIssue(item.id, 'finish_out_of_stock')"
                  :finish="item.finish"
                />
              </div>
            </div>

            <div
              v-if="pendingDeleteId === item.id"
              class="cart-delete-confirm cart-quick-view-confirm"
              role="alertdialog"
              :aria-labelledby="`quick-delete-question-${variant}-${item.id}`"
            >
              <p :id="`quick-delete-question-${variant}-${item.id}`">
                Remove this {{ item.finish }} card from your cart?
              </p>
              <div class="cart-delete-confirm-actions">
                <ActionButton
                  kind="cancel"
                  label="Keep item"
                  :id="`quick-keep-${variant}-${item.id}`"
                  type="button"
                  compact
                  @click="cancelDelete(item.id)"
                />
                <ActionButton kind="delete" type="button" compact @click="removeItem(item)" />
              </div>
            </div>
            <div v-else class="cart-quick-view-actions">
              <div
                class="quantity-control cart-quick-view-quantity"
                role="group"
                :aria-label="`${item.finish} quantity`"
              >
                <button
                  type="button"
                  :aria-label="`Decrease ${item.finish} quantity`"
                  :disabled="item.quantity === 1"
                  @click="adjustItemQuantity(item, -1)"
                >
                  <i class="pi pi-minus" aria-hidden="true"></i>
                </button>
                <output aria-live="polite">{{ item.quantity }}</output>
                <button
                  type="button"
                  :aria-label="`Increase ${item.finish} quantity`"
                  :disabled="item.quantity === MAX_ITEM_QUANTITY"
                  @click="adjustItemQuantity(item, 1)"
                >
                  <i class="pi pi-plus" aria-hidden="true"></i>
                </button>
              </div>
              <div class="cart-quick-view-item-buttons">
                <ActionButton
                  kind="edit"
                  type="button"
                  :label="isCartItemCustomized(item) ? 'Edit' : 'Customise'"
                  :aria-label="`${isCartItemCustomized(item) ? 'Edit' : 'Customise'} ${item.finish} card`"
                  class="cart-quick-view-edit"
                  compact
                  @click="openItemEditor(item)"
                />
                <Button
                  :id="`quick-delete-${variant}-${item.id}`"
                  type="button"
                  size="small"
                  label="Delete"
                  icon="pi pi-trash"
                  severity="secondary"
                  text
                  class="cart-delete-action"
                  :aria-label="`Delete ${item.finish} card`"
                  @click="requestDelete(item.id)"
                />
              </div>
            </div>
          </li>
        </ul>

        <footer v-if="store.cartItems.length" class="cart-quick-view-footer">
          <div class="cart-quick-view-subtotal">
            <span>Subtotal</span>
            <strong class="price-text">{{ formatMoney(cart.subtotal.value) }}</strong>
          </div>
          <p class="cart-quick-view-note">Return delivery calculated at checkout.</p>
          <p
            v-if="checkoutBlockedReason"
            :id="`cart-quick-view-blocked-${variant}`"
            class="cart-quick-view-blocked"
          >
            <i class="pi pi-info-circle" aria-hidden="true"></i>
            <span>{{ checkoutBlockedReason }}</span>
          </p>
          <!-- The full cart is the main action (review, edit, then check out from there). -->
          <Button
            type="button"
            class="kedak-action cart-quick-view-checkout"
            label="View full cart"
            icon="pi pi-arrow-right"
            icon-pos="right"
            @click="goToCart"
          />
          <div class="cart-quick-view-secondary">
            <TextLink v-if="cart.canCheckout.value" to="/checkout" @click="closePopover">
              Checkout
            </TextLink>
            <span
              v-else
              class="cart-quick-view-checkout-disabled"
              :class="{ 'is-loading': cart.isValidating.value }"
              aria-disabled="true"
              :aria-describedby="
                checkoutBlockedReason ? `cart-quick-view-blocked-${variant}` : undefined
              "
            >
              <BarsLoader v-if="cart.isValidating.value" label="Checking prices" />
              Checkout
            </span>
          </div>
        </footer>
      </section>
    </Popover>
  </div>
</template>
