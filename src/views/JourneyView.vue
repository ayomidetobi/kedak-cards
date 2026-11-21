<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { Form, FormField, type FormSubmitEvent } from '@primevue/forms'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import RadioButton from 'primevue/radiobutton'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import CardPreview from '../components/card/CardPreview.vue'
import CardholderNameInput from '../components/card/CardholderNameInput.vue'
import DesignCategoryTabs from '../components/card/DesignCategoryTabs.vue'
import DesignGallery from '../components/card/DesignGallery.vue'
import DesignUpload from '../components/card/DesignUpload.vue'
import FinishCard from '../components/FinishCard.vue'
import TextLink from '../components/TextLink.vue'
import { useCardCustomization, validateArtworkCount } from '../composables/useCardCustomization'
import { useAuthStore } from '../stores/auth'
import { PREVIEW_ORDER_EMAIL, useOrdersStore } from '../stores/orders'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.vue'
import { formatOrderDate } from '../utils/orderPolicy'
import StockBadge from '../components/StockBadge.vue'
import {
  designs,
  finishes,
  isCartItemCustomized,
  isFinishInStock,
} from '../stores/cardCustomization'
import { deliveryCountryOptions, phoneCountryOptions } from '../utils/phoneCountries'
import { checkoutSchema, compatibilitySchema } from '../types/forms'
import type {
  CardCartItem,
  CardCategory,
  CardDesign,
  CardFinish,
  CustomizationMode,
  UploadedArtwork,
} from '../types/card'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const customization = useCardCustomization()
const store = customization.store
const activeCartEditId = ref<string | null>(null)
const cartEditUploadError = ref('')
const cartEditPreviewArtworkIndex = ref(0)
const page = computed(() => String(route.name))

const helpSteps = [
  {
    icon: 'pi pi-palette',
    title: 'Design your metal card',
    description: 'Choose Silver, Black, Gold or Signature. Add your name and choose a design.',
  },
  {
    icon: 'pi pi-send',
    title: 'Check, order & send',
    description:
      'Complete the initial compatibility check. After ordering, use your personalised send-in guide and a tracked service.',
  },
  {
    icon: 'pi pi-search',
    title: 'Assessment & conversion',
    description:
      'We inspect the original card before proceeding. If suitable, the existing chip is transferred into your personalised metal body.',
  },
  {
    icon: 'pi pi-check-circle',
    title: 'Checked & returned',
    description:
      'Your order moves through quality checks and is returned with tracking. Functionality depends on your card.',
  },
]

const helpChecklist = [
  { icon: 'pi pi-file', text: 'Review your issuer’s modification terms.' },
  { icon: 'pi pi-wallet', text: 'Keep a backup way to pay.' },
  { icon: 'pi pi-map-marker', text: 'Use only the address in your order guide.' },
  { icon: 'pi pi-box', text: 'Pack securely and retain tracking.' },
  { icon: 'pi pi-lock', text: 'Never include a PIN or security code.', warning: true },
]

const helpFaqs = [
  {
    question: 'Is this a new bank card?',
    answer:
      'No. Kedak Card converts your existing eligible plastic bank card into a personalised metal card. It is not a bank, a digital business card or an NFC networking product.',
  },
  {
    question: 'Will contactless and ATMs still work?',
    answer:
      'Not necessarily. Tap-to-pay and ATM performance can change with a metal body. Suitability depends on the original card; ask your issuer and keep another way to pay.',
  },
  {
    question: 'Do you need my PIN or banking login?',
    answer:
      'Never. Do not share your PIN, banking login, CVV or full card number. Our assessment asks only for non-sensitive card characteristics.',
  },
  {
    question: 'How long will I be without my card?',
    answer:
      'Timing depends on receipt, inspection and production. We will share updates about progress; a dispatch estimate follows assessment.',
  },
  {
    question: 'What if my card is not suitable?',
    answer:
      'Production will not proceed until assessment. We will explain what you need to do and available options before any conversion.',
  },
  {
    question: 'Is my bank okay with card modification?',
    answer:
      'Issuer rules differ. Check your card agreement and ask your provider before sending your original payment card.',
  },
]
const cartEditCategory = computed<CardCategory>({
  get: () => store.category,
  set: (category) => customization.selectCategory(category),
})
const cartEditMode = computed<CustomizationMode>({
  get: () => store.customizationMode,
  set: (mode) => setCartEditMode(mode),
})
const cartEditHolderName = computed({
  get: () => store.holderName,
  set: (name: string) => customization.updateHolderName(name),
})
const cartEditPreviewArtwork = computed(
  () => store.uploadedArtworks[cartEditPreviewArtworkIndex.value] ?? null,
)
const cartEditValidationMessage = computed(() => {
  if (cartEditUploadError.value) return cartEditUploadError.value
  if (store.customizationMode === 'custom' && store.uploadedArtworks.length === 0) {
    return 'Upload artwork before saving this custom card.'
  }
  if (store.uploadedArtworks.length) {
    const result = validateArtworkCount(
      store.uploadedArtworks.length,
      store.artworkAssignment,
      store.cartQuantity,
    )
    if (!result.valid) return result.message
  }
  return ''
})
const canSaveCartEdit = computed(
  () => activeCartEditId.value !== null && !cartEditValidationMessage.value,
)
const orderCustomization = computed(
  () => store.cartItems.find((item) => item.customization)?.customization ?? store.customization,
)
const hasUncustomizedItems = computed(() =>
  store.cartItems.some((item) => !isCartItemCustomized(item)),
)
const hasOutOfStockItems = computed(() =>
  store.cartItems.some((item) => !isFinishInStock(item.finish)),
)
const inStockFinishes = finishes.filter((item) => item.inStock)
const checkoutBlockMessage = computed(() => {
  if (!store.cartItems.length) return 'Your cart is empty. Add a card before checkout.'
  const reasons: string[] = []
  if (hasOutOfStockItems.value) {
    reasons.push(
      'Some items are out of stock. Switch them to another finish or remove them before checkout.',
    )
  }
  if (hasUncustomizedItems.value) {
    reasons.push(
      'Please customise every item in your cart before checkout. Edit any item marked “Not customised”.',
    )
  }
  return reasons.join(' ')
})
const design = computed<CardDesign>(() => {
  const order = orderCustomization.value
  return designs[order.category].find((item) => item.id === order.designId) ?? store.selectedDesign
})
const total = computed(() => store.cartSubtotal + 8)
const hasChip = ref(store.compatibilityAnswers.hasChip)
const compatibilityResolver = zodResolver(compatibilitySchema)
const checkoutResolver = zodResolver(checkoutSchema)

const countries = deliveryCountryOptions
const networks = ['Visa / Mastercard', 'American Express', 'Other / Not sure'].map((label) => ({
  label,
  value: label,
}))
const cardTypes = [
  'Personal debit card',
  'Personal credit card',
  'Business card',
  'Other / Not sure',
].map((label) => ({ label, value: label }))

const auth = useAuthStore()
const orders = useOrdersStore()
// Orders placed with the signed-in customer's email (newest first).
const accountOrders = computed(() =>
  auth.user?.email ? orders.ordersForEmail(auth.user.email) : [],
)
const confirmedOrder = computed(() => orders.lastPlacedOrder)
const accountLinks = [
  {
    to: '/collections',
    icon: 'pi pi-palette',
    title: 'Start a new design',
    text: 'Browse the four finishes',
  },
  {
    to: '/compatibility',
    icon: 'pi pi-credit-card',
    title: 'Check another card',
    text: 'Quick compatibility check',
  },
  {
    to: '/help',
    icon: 'pi pi-question-circle',
    title: 'Help & FAQ',
    text: 'How the process works',
  },
]
const accountInitials = computed(() =>
  (auth.user?.name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join(''),
)
// Guests and registered customers both manage an order on its own page.
const orderLink = computed(() =>
  confirmedOrder.value ? `/account/orders/${confirmedOrder.value.id}` : '/orders/find',
)

async function signOutOfAccount() {
  await auth.signOut()
  toast.add({ severity: 'success', summary: 'You’re logged out', life: 2600 })
  await router.push('/')
}

const compatibilityNotes = [
  { icon: 'pi pi-credit-card', text: 'Your original card is required for assessment.' },
  { icon: 'pi pi-wifi', text: 'Contactless and ATM use may be affected.' },
  { icon: 'pi pi-file', text: 'Check modification rules with your card issuer.' },
  { icon: 'pi pi-wallet', text: 'Keep another way to pay while your card is with us.' },
]

const compatibilityInitial = {
  country: store.compatibilityAnswers.country,
  network: store.compatibilityAnswers.network,
  cardType: store.compatibilityAnswers.cardType,
  hasChip: store.compatibilityAnswers.hasChip,
  acknowledged: store.compatibilityAnswers.acknowledged,
}

const checkoutInitial = {
  email: auth.user?.email ?? '',
  fullName: auth.user?.name ?? '',
  address: '',
  city: '',
  postcode: '',
  country: '',
  phoneCountry: 'GB',
  phone: '',
  acknowledgement: false,
}

function designForCartItem(item: CardCartItem) {
  const saved = item.customization
  if (!saved) return store.selectedDesign
  return (
    designs[saved.category].find((designItem) => designItem.id === saved.designId) ?? design.value
  )
}

function artworksForCartItem(item: CardCartItem): Array<UploadedArtwork | null> {
  const saved = item.customization
  if (!saved || !saved.uploadedArtworks.length) return [null]
  return saved.artworkAssignment === 'per-card'
    ? saved.uploadedArtworks
    : [saved.uploadedArtworks[0]!]
}

function itemSubtotal(item: CardCartItem) {
  const price =
    item.customization?.price ?? finishes.find((finish) => finish.name === item.finish)!.price
  return price * item.quantity
}

function editCartItem(item: CardCartItem) {
  if (activeCartEditId.value === item.id) {
    cancelCartItemEdit(item)
    return
  }
  if (!customization.beginEditingCartItem(item.id)) {
    toast.add({
      severity: 'warn',
      summary: 'Item no longer available',
      detail: 'Refresh your cart to see the latest items.',
      life: 3000,
    })
    return
  }
  activeCartEditId.value = item.id
  cartEditUploadError.value = ''
  cartEditPreviewArtworkIndex.value = 0
}

watch(
  () => [page.value, route.query.edit] as const,
  ([currentPage, itemId]) => {
    if (currentPage !== 'cart' || typeof itemId !== 'string') return

    const item = store.cartItems.find((cartItem) => cartItem.id === itemId)
    if (item) {
      if (activeCartEditId.value !== item.id) editCartItem(item)
    } else {
      toast.add({
        severity: 'warn',
        summary: 'Item no longer available',
        detail: 'Your cart has changed. Choose an item from the cart to edit.',
        life: 3000,
      })
    }

    void router.replace({ name: 'cart' })
  },
  { immediate: true },
)

function cancelCartItemEdit(item: CardCartItem) {
  if (activeCartEditId.value !== item.id) return
  customization.startNewCustomization(item.finish)
  activeCartEditId.value = null
  cartEditUploadError.value = ''
  cartEditPreviewArtworkIndex.value = 0
}

function saveCartItemEdit(item: CardCartItem) {
  if (activeCartEditId.value !== item.id || !canSaveCartEdit.value) return
  customization.addToCart()
  activeCartEditId.value = null
  cartEditUploadError.value = ''
  cartEditPreviewArtworkIndex.value = 0
  toast.add({
    severity: 'success',
    summary: 'Customisation saved',
    detail: 'Your cart item has been updated.',
    life: 2600,
  })
}

function setCartEditMode(mode: CustomizationMode) {
  if (mode === store.customizationMode) return
  if (mode === 'preset') customization.removeUploads()
  cartEditUploadError.value = ''
  cartEditPreviewArtworkIndex.value = 0
  store.setCustomizationMode(mode)
}

function handleCartEditUploads(files: File[]) {
  const result = customization.handleUploads(files, store.artworkAssignment, store.cartQuantity)
  cartEditUploadError.value = result.valid ? '' : result.message
  if (result.valid) cartEditPreviewArtworkIndex.value = 0
}

function removeCartEditUploads() {
  customization.removeUploads()
  cartEditUploadError.value = ''
  cartEditPreviewArtworkIndex.value = 0
}

function selectCartEditDesign(designId: string) {
  customization.selectDesign(designId)
  cartEditUploadError.value = ''
  cartEditPreviewArtworkIndex.value = 0
}

function switchCartItemFinish(item: CardCartItem, nextFinish: CardFinish) {
  const previous = item.finish
  if (!store.changeCartItemFinish(item.id, nextFinish)) {
    toast.add({
      severity: 'warn',
      summary: 'Item no longer available',
      detail: 'Refresh your cart to see the latest items.',
      life: 3000,
    })
    return
  }
  toast.add({
    severity: 'success',
    summary: 'Finish updated',
    detail: `Switched from ${previous} to ${nextFinish}.`,
    life: 2600,
  })
}

const pendingCartDeleteId = ref<string | null>(null)

function focusById(id: string) {
  void nextTick(() => document.getElementById(id)?.focus())
}

// Deleting is a two-step action: ask first, and keep keyboard focus on the confirm/cancel controls.
function requestCartItemDelete(id: string) {
  pendingCartDeleteId.value = id
  focusById(`cart-keep-${id}`)
}

function cancelCartItemDelete(id: string) {
  pendingCartDeleteId.value = null
  focusById(`cart-delete-${id}`)
}

function confirmCartItemDelete(id: string) {
  pendingCartDeleteId.value = null
  removeCartItem(id)
}

function removeCartItem(id: string) {
  const removedItem = customization.removeCartItem(id)
  if (!removedItem) {
    toast.add({
      severity: 'warn',
      summary: 'Item no longer available',
      detail: 'Refresh your cart to see the latest items.',
      life: 3000,
    })
    return
  }
  if (activeCartEditId.value === id) {
    customization.startNewCustomization(removedItem.finish)
    activeCartEditId.value = null
    cartEditUploadError.value = ''
    cartEditPreviewArtworkIndex.value = 0
  }
  toast.add({
    severity: 'success',
    summary: 'Item removed',
    detail: `${removedItem.finish} card removed from your cart.`,
    life: 2600,
  })
}

function adjustCartItemQuantity(item: CardCartItem, amount: number) {
  const quantity = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, item.quantity + amount))
  const updated = store.setCartItemQuantity(item.id, quantity)
  if (!updated) {
    toast.add({
      severity: 'warn',
      summary: 'Item no longer available',
      detail: 'Refresh your cart to see the latest items.',
      life: 3000,
    })
    return
  }
  if (activeCartEditId.value === item.id) store.setCartQuantity(quantity)
}

function submitCompatibility(event: FormSubmitEvent) {
  if (!event.valid) return
  const answers = compatibilitySchema.parse(event.values)
  store.setCompatibilityAnswers(answers)
  void router.push(answers.hasChip ? '/compatibility/result' : '/manual-review')
}

// Stripe is out of scope for now: checkout places the order without taking payment
// (the order is marked "payment not collected").
function submitCheckout(event: FormSubmitEvent) {
  if (!event.valid || !store.canCheckout) return
  const details = checkoutSchema.parse(event.values)
  const order = orders.placeOrder({
    email: details.email,
    customerName: details.fullName,
    delivery: 8,
    lines: store.cartItems.map((item) => ({
      finish: item.finish,
      quantity: item.quantity,
      unitPrice: itemSubtotal(item) / item.quantity,
      holderName: item.customization?.holderName ?? '',
      designName:
        item.customization?.customizationMode === 'custom'
          ? 'Your own artwork'
          : designForCartItem(item).name,
      customization: item.customization,
    })),
  })
  store.clearCart()
  toast.add({
    severity: 'success',
    summary: 'Order placed',
    detail: `Order ${order.id} is confirmed.`,
    life: 3000,
  })
  void router.push('/order/confirmed')
}

function continueToCheckout() {
  if (!store.canCheckout) return
  void router.push('/checkout')
}
</script>

<template>
  <main v-if="page === 'compatibility'" class="journey-main" data-node-id="6:74">
    <p class="eyebrow">02 / CARD COMPATIBILITY</p>
    <h1 class="page-title">A quick check.<br />A better fit.</h1>
    <p class="intro-copy">Tell us about your existing card. It takes less than a minute.</p>
    <p class="compat-safety">
      <i class="pi pi-lock" aria-hidden="true"></i>
      <span>Do not enter any card number, PIN or security code.</span>
    </p>
    <div class="compat-layout">
      <Form
        class="journey-form compatibility-form info-card"
        :initial-values="compatibilityInitial"
        :resolver="compatibilityResolver"
        @submit="submitCompatibility"
      >
        <h2 class="control-heading compat-form-title">About your card</h2>
        <FormField v-slot="$field" name="country">
          <label for="issue-country">Country of issue</label>
          <Select
            id="issue-country"
            v-bind="$field.props"
            :options="countries"
            option-label="label"
            option-value="value"
            filter
            filter-placeholder="Search countries"
            class="form-control"
          />
          <Message v-if="$field.invalid" severity="error" size="small">{{
            $field.error?.message
          }}</Message>
        </FormField>
        <div class="compat-field-row">
          <FormField v-slot="$field" name="network">
            <label for="card-network">Card network</label>
            <Select
              id="card-network"
              v-bind="$field.props"
              :options="networks"
              option-label="label"
              option-value="value"
              class="form-control"
            />
            <Message v-if="$field.invalid" severity="error" size="small">{{
              $field.error?.message
            }}</Message>
          </FormField>
          <FormField v-slot="$field" name="cardType">
            <label for="card-type">Card type</label>
            <Select
              id="card-type"
              v-bind="$field.props"
              :options="cardTypes"
              option-label="label"
              option-value="value"
              class="form-control"
            />
            <Message v-if="$field.invalid" severity="error" size="small">{{
              $field.error?.message
            }}</Message>
          </FormField>
        </div>
        <FormField v-slot="$field" name="hasChip">
          <fieldset class="chip-question">
            <legend>Does your plastic card have a chip?</legend>
            <div class="chip-question-options">
              <label class="choice-row" :class="{ 'is-active': hasChip === true }" for="chip-yes">
                <span class="icon-tile" aria-hidden="true"><i class="pi pi-credit-card"></i></span>
                <span class="choice-row-copy">
                  <strong>Yes, it is a plastic chip card</strong>
                  <small>Continue to a preliminary review.</small>
                </span>
                <RadioButton
                  v-model="hasChip"
                  input-id="chip-yes"
                  name="card-chip"
                  :value="true"
                  @change="$field.props.onChange({ value: hasChip })"
                />
              </label>
              <label class="choice-row" :class="{ 'is-active': hasChip === false }" for="chip-no">
                <span class="icon-tile" aria-hidden="true"
                  ><i class="pi pi-question-circle"></i
                ></span>
                <span class="choice-row-copy">
                  <strong>No, or I am not sure</strong>
                  <small>We will ask a specialist to assess this first.</small>
                </span>
                <RadioButton
                  v-model="hasChip"
                  input-id="chip-no"
                  name="card-chip"
                  :value="false"
                  @change="$field.props.onChange({ value: hasChip })"
                />
              </label>
            </div>
          </fieldset>
        </FormField>
        <FormField v-slot="$field" name="acknowledged">
          <div class="acknowledgment">
            <label class="checkbox-row">
              <Checkbox v-bind="$field.props" input-id="compat-ack" :binary="true" />
              <span>I understand conversion may affect card functions and issuer terms.</span>
            </label>
            <p>This is an initial screen, not a guarantee of compatibility or issuer approval.</p>
            <Message v-if="$field.invalid" severity="error" size="small">{{
              $field.error?.message
            }}</Message>
          </div>
        </FormField>
        <Button
          type="submit"
          class="kedak-action kedak-cta compat-submit"
          label="Review my answers"
          icon="pi pi-arrow-right"
          icon-pos="right"
        />
      </Form>
      <aside class="info-card compat-aside" aria-labelledby="compat-aside-title">
        <h2 id="compat-aside-title">A few things to know</h2>
        <ul class="help-checklist compat-checklist">
          <li v-for="item in compatibilityNotes" :key="item.text">
            <span class="icon-tile icon-tile--small" aria-hidden="true">
              <i :class="item.icon"></i>
            </span>
            <span>{{ item.text }}</span>
          </li>
        </ul>
      </aside>
    </div>
  </main>

  <main v-else-if="page === 'compatibility-result'" class="journey-main" data-node-id="6:78">
    <p class="eyebrow">PRELIMINARY RESULT</p>
    <h1 class="page-title">Ready for a<br />closer look.</h1>
    <section class="info-card result-card">
      <div class="result-card-header">
        <span class="icon-tile result-icon is-success" aria-hidden="true">
          <i class="pi pi-check"></i>
        </span>
        <h2>Initial check complete</h2>
      </div>
      <p class="result-lead">Your answers suggest your card can be assessed for conversion.</p>
      <p class="muted-copy">
        Final suitability is confirmed only after we inspect your original card. This does not
        confirm issuer approval.
      </p>
      <dl class="answer-list">
        <div>
          <dt>Country</dt>
          <dd>{{ store.compatibilityAnswers.country }}</dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>{{ store.compatibilityAnswers.network }}</dd>
        </div>
        <div>
          <dt>Card</dt>
          <dd>{{ store.compatibilityAnswers.cardType }} with chip</dd>
        </div>
      </dl>
      <div class="result-actions">
        <Button
          class="kedak-action kedak-cta"
          label="Continue to cart"
          icon="pi pi-arrow-right"
          icon-pos="right"
          @click="router.push('/cart')"
        />
        <TextLink to="/compatibility" direction="back">Change my answers</TextLink>
      </div>
    </section>
    <section class="notice-card compat-notice">
      <h2>Wait for your send-in guide.</h2>
      <p>
        Order first. We will provide packing and tracking instructions. Never send a card until you
        have reviewed the process and issuer terms.
      </p>
    </section>
  </main>

  <main v-else-if="page === 'manual-review'" class="journey-main" data-node-id="6:799">
    <p class="eyebrow">SPECIALIST REVIEW</p>
    <h1 class="page-title">Let’s check<br />before you commit.</h1>
    <section class="info-card manual-card">
      <div class="result-card-header">
        <span class="icon-tile result-icon is-pending" aria-hidden="true">
          <i class="pi pi-search"></i>
        </span>
        <h2>Your card needs a closer look.</h2>
      </div>
      <p>
        Existing metal cards, chipless cards and unfamiliar card types need individual assessment.
        Please do not place an order or send your card yet.
      </p>
      <h3 class="control-heading manual-card-subheading">What to tell our team</h3>
      <ul class="manual-card-list">
        <li><i class="pi pi-building-columns" aria-hidden="true"></i> Your card issuer</li>
        <li><i class="pi pi-globe" aria-hidden="true"></i> Country of issue</li>
        <li><i class="pi pi-credit-card" aria-hidden="true"></i> Card type</li>
      </ul>
      <p class="compat-safety">
        <i class="pi pi-lock" aria-hidden="true"></i>
        <span>Do not include card photos, a full card number, PIN or security code.</span>
      </p>
      <div class="result-actions">
        <Button
          class="kedak-action kedak-cta"
          label="Read compatibility FAQ"
          icon="pi pi-arrow-right"
          icon-pos="right"
          @click="router.push('/help')"
        />
        <TextLink to="/compatibility" direction="back">Try different answers</TextLink>
      </div>
    </section>
  </main>

  <main v-else-if="page === 'cart'" class="journey-main cart-main" data-node-id="6:82">
    <TextLink class="cart-back-link" to="/collections" direction="back">
      Continue shopping
    </TextLink>
    <h1 class="page-title cart-page-title">Your cart</h1>
    <div v-if="store.cartItems.length" class="journey-columns cart-layout">
      <div class="cart-items-list">
        <section
          v-for="item in store.cartItems"
          :key="item.id"
          class="info-card cart-product"
          :aria-label="`${item.finish} card, quantity ${item.quantity}`"
        >
          <div class="cart-product-layout">
            <div class="cart-product-overview">
              <div class="cart-card-preview">
                <CardPreview
                  v-if="item.customization"
                  :design="designForCartItem(item)"
                  :finish="item.finish"
                  :engraving-style="item.customization.engravingStyle"
                  :holder-name="item.customization.holderName"
                  :uploaded-artwork="artworksForCartItem(item)[0] ?? null"
                  :upload-orientation="item.customization?.uploadOrientation"
                  :upload-display="item.customization?.uploadDisplay"
                  :show-design-mark="false"
                />
                <FinishCard v-else :finish="item.finish" />
              </div>
              <div class="cart-product-title">
                <h2>{{ item.finish }} metal card</h2>
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
                  v-if="!isFinishInStock(item.finish)"
                  class="cart-stock-badge"
                  :finish="item.finish"
                />
                <div
                  v-if="item.customization && activeCartEditId !== item.id"
                  class="cart-product-details"
                >
                  <p>
                    {{
                      item.customization.customizationMode === 'preset'
                        ? 'Pre-designed artwork'
                        : 'Custom artwork'
                    }}
                    <template v-if="item.customization.holderName">
                      · <span class="name-review">{{ item.customization.holderName }}</span>
                    </template>
                  </p>
                  <ul
                    v-if="
                      item.customization.artworkAssignment === 'per-card' &&
                      item.customization.uploadedArtworks.length > 1
                    "
                    class="cart-artwork-files"
                    aria-label="Uploaded artwork for each card"
                  >
                    <li
                      v-for="(artwork, index) in item.customization.uploadedArtworks"
                      :key="artwork.url"
                    >
                      Card {{ index + 1 }}: {{ artwork.name }}
                    </li>
                  </ul>
                </div>
              </div>
              <p
                v-if="!isCartItemCustomized(item) && activeCartEditId !== item.id"
                class="muted-copy cart-pending-copy"
              >
                Choose your design and cardholder details before checkout.
              </p>
            </div>
            <div
              v-if="!isFinishInStock(item.finish)"
              class="cart-stock-warning"
              role="group"
              :aria-labelledby="`cart-stock-title-${item.id}`"
            >
              <p :id="`cart-stock-title-${item.id}`" class="cart-stock-warning-title">
                <i class="pi pi-ban" aria-hidden="true"></i>
                <span>
                  <strong>{{ item.finish }} is out of stock.</strong>
                  Switch to another finish or remove this item to continue to checkout. Your design,
                  name and quantity stay the same if you switch.
                </span>
              </p>
              <div
                class="cart-stock-options"
                role="group"
                aria-label="Switch to an available finish"
              >
                <button
                  v-for="option in inStockFinishes"
                  :key="option.name"
                  type="button"
                  class="cart-stock-option"
                  @click="switchCartItemFinish(item, option.name)"
                >
                  <span>Switch to {{ option.name }}</span>
                  <strong>£{{ option.price }}</strong>
                </button>
              </div>
              <Button
                size="small"
                class="cart-delete-action"
                label="Remove item"
                icon="pi pi-trash"
                :aria-label="`Remove ${item.finish} item`"
                @click="requestCartItemDelete(item.id)"
              />
            </div>
            <section
              v-if="activeCartEditId === item.id"
              class="cart-customization-editor"
              aria-label="Customise cart item"
            >
              <fieldset class="customization-mode-choice" aria-label="Choose design method">
                <legend>How would you like to customise your card?</legend>
                <label
                  for="cart-customization-mode-preset"
                  class="customization-mode-option"
                  :class="{ 'is-active': cartEditMode === 'preset' }"
                >
                  <span class="icon-tile" aria-hidden="true"><i class="pi pi-images"></i></span>
                  <span class="customization-mode-option-copy">
                    <strong>Choose a pre-designed look</strong>
                    <small>Choose Sport, Cars, Anime, Love or Nature artwork.</small>
                  </span>
                  <RadioButton
                    v-model="cartEditMode"
                    input-id="cart-customization-mode-preset"
                    name="cart-customization-mode"
                    value="preset"
                  />
                </label>
                <label
                  for="cart-customization-mode-custom"
                  class="customization-mode-option"
                  :class="{ 'is-active': cartEditMode === 'custom' }"
                >
                  <span class="icon-tile" aria-hidden="true"><i class="pi pi-upload"></i></span>
                  <span class="customization-mode-option-copy">
                    <strong>Customise with your own artwork</strong>
                    <small>Upload an image for your card or cards.</small>
                  </span>
                  <RadioButton
                    v-model="cartEditMode"
                    input-id="cart-customization-mode-custom"
                    name="cart-customization-mode"
                    value="custom"
                  />
                </label>
              </fieldset>
              <div class="cart-customization-preview">
                <span class="eyebrow">LIVE PREVIEW</span>
                <CardPreview
                  :design="store.selectedDesign"
                  :finish="store.finish"
                  :engraving-style="store.engravingStyle"
                  :holder-name="store.holderName"
                  :uploaded-artwork="cartEditPreviewArtwork"
                  :upload-orientation="store.uploadOrientation"
                  :upload-display="store.uploadDisplay"
                />
              </div>
              <div class="cart-customization-fields">
                <div v-if="cartEditMode === 'preset'" class="design-choice">
                  <h3 class="control-heading">Choose a pre-designed artwork</h3>
                  <DesignCategoryTabs v-model="cartEditCategory" />
                  <DesignGallery
                    :designs="store.gallery"
                    :selected-id="store.selectedDesignId"
                    @select="selectCartEditDesign"
                  />
                </div>
                <div v-else class="design-choice">
                  <h3 class="control-heading">Upload your artwork</h3>
                  <DesignUpload
                    :uploaded-artworks="store.uploadedArtworks"
                    :assignment="store.artworkAssignment"
                    :quantity="store.cartQuantity"
                    :preview-artwork-index="cartEditPreviewArtworkIndex"
                    :orientation="store.uploadOrientation"
                    :display="store.uploadDisplay"
                    @update:assignment="store.setArtworkAssignment"
                    @update:orientation="store.setUploadOrientation"
                    @update:display="store.setUploadDisplay"
                    @upload="handleCartEditUploads"
                    @remove="removeCartEditUploads"
                    @preview="cartEditPreviewArtworkIndex = $event"
                  />
                  <p
                    v-if="cartEditValidationMessage"
                    class="upload-error cart-edit-validation"
                    role="status"
                  >
                    <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
                    <span>{{ cartEditValidationMessage }}</span>
                  </p>
                </div>
                <CardholderNameInput v-model="cartEditHolderName" />
                <div class="cart-editor-actions">
                  <span
                    class="kedak-disabled-button-help"
                    role="group"
                    :tabindex="cartEditValidationMessage ? 0 : undefined"
                    :title="cartEditValidationMessage || undefined"
                    :aria-label="cartEditValidationMessage || undefined"
                  >
                    <Button
                      size="small"
                      class="kedak-action cart-editor-save"
                      label="Save"
                      icon="pi pi-save"
                      :disabled="!canSaveCartEdit"
                      @click="saveCartItemEdit(item)"
                    />
                  </span>
                  <Button
                    size="small"
                    class="kedak-outline-action cart-editor-cancel"
                    severity="secondary"
                    outlined
                    label="Cancel"
                    @click="cancelCartItemEdit(item)"
                  />
                </div>
              </div>
            </section>
            <div class="cart-quantity-row">
              <div class="quantity-control" role="group" :aria-label="`${item.finish} quantity`">
                <button
                  type="button"
                  :aria-label="`Decrease ${item.finish} quantity`"
                  :disabled="item.quantity === 1"
                  @click="adjustCartItemQuantity(item, -1)"
                >
                  <i class="pi pi-minus" aria-hidden="true"></i>
                </button>
                <output aria-live="polite">{{ item.quantity }}</output>
                <button
                  type="button"
                  :aria-label="`Increase ${item.finish} quantity`"
                  :disabled="item.quantity === Number.MAX_SAFE_INTEGER"
                  @click="adjustCartItemQuantity(item, 1)"
                >
                  <i class="pi pi-plus" aria-hidden="true"></i>
                </button>
              </div>
              <strong class="cart-item-total">£{{ itemSubtotal(item) }}</strong>
            </div>
            <div
              v-if="pendingCartDeleteId === item.id"
              class="cart-delete-confirm"
              role="alertdialog"
              :aria-labelledby="`cart-delete-question-${item.id}`"
            >
              <p :id="`cart-delete-question-${item.id}`">
                Remove this {{ item.finish }} card from your cart?
              </p>
              <div class="cart-delete-confirm-actions">
                <Button
                  :id="`cart-keep-${item.id}`"
                  size="small"
                  class="kedak-outline-action"
                  severity="secondary"
                  outlined
                  label="Keep item"
                  @click="cancelCartItemDelete(item.id)"
                />
                <Button
                  size="small"
                  class="cart-delete-confirm-button"
                  label="Delete"
                  icon="pi pi-trash"
                  :aria-label="`Confirm delete ${item.finish} item`"
                  @click="confirmCartItemDelete(item.id)"
                />
              </div>
            </div>
            <div
              v-else
              class="cart-product-actions"
              :class="{ 'is-editing': activeCartEditId === item.id }"
            >
              <Button
                v-if="activeCartEditId !== item.id"
                size="small"
                class="kedak-outline-action"
                severity="secondary"
                outlined
                :label="isCartItemCustomized(item) ? 'Edit item' : 'Customise item'"
                icon="pi pi-pencil"
                @click="editCartItem(item)"
              />
              <Button
                :id="`cart-delete-${item.id}`"
                size="small"
                class="cart-delete-action"
                severity="secondary"
                text
                label="Delete"
                icon="pi pi-trash"
                :aria-label="`Delete ${item.finish} item`"
                @click="requestCartItemDelete(item.id)"
              />
            </div>
          </div>
        </section>
      </div>
      <section class="info-card order-summary cart-summary">
        <h2>Order summary</h2>
        <div
          v-for="item in store.cartItems"
          :key="`summary-${item.id}`"
          class="summary-row cart-summary-item"
        >
          <span>{{ item.finish }} × {{ item.quantity }}</span>
          <strong>£{{ itemSubtotal(item) }}</strong>
        </div>
        <div class="summary-row cart-subtotal-row">
          <span>Subtotal</span><strong>£{{ store.cartSubtotal }}</strong>
        </div>
        <div class="summary-row cart-delivery-row">
          <span>Tracked return delivery</span><strong>£8</strong>
        </div>
        <div class="summary-total cart-total-row">
          <strong>Total</strong><strong>£{{ total }}</strong>
        </div>
        <p
          v-if="hasUncustomizedItems || hasOutOfStockItems"
          class="checkout-blocked-error"
          role="alert"
        >
          {{ checkoutBlockMessage }}
        </p>
        <p v-else class="muted-copy cart-desktop-checkout-note">
          Final suitability is confirmed after inspection. Review compatibility before sending your
          card.
        </p>
        <p class="muted-copy cart-delivery-note">Return delivery calculated at checkout.</p>
        <Button
          size="small"
          class="kedak-action cart-checkout-button"
          :disabled="!store.canCheckout"
          label="Checkout"
          icon="pi pi-arrow-right"
          icon-pos="right"
          @click="continueToCheckout"
        />
      </section>
    </div>
    <section v-else class="info-card cart-empty">
      <span class="icon-tile" aria-hidden="true"><i class="pi pi-shopping-cart"></i></span>
      <h2>Your cart is empty.</h2>
      <p class="muted-copy">Choose a finish to start building your card.</p>
      <Button
        class="kedak-action kedak-cta"
        label="Browse collections"
        icon="pi pi-arrow-right"
        icon-pos="right"
        @click="router.push('/collections')"
      />
    </section>
    <section class="notice-card cart-notice">
      <h2>Keep your original card for now.</h2>
      <p>
        After checkout, follow your send-in instructions. You pay for a conversion service; we do
        not issue a new bank card.
      </p>
    </section>
  </main>

  <main v-else-if="page === 'checkout'" class="journey-main checkout-main" data-node-id="6:86">
    <TextLink to="/cart" direction="back">Back to cart</TextLink>
    <header class="checkout-header">
      <p class="eyebrow">03 / SECURE CHECKOUT</p>
      <h1 class="page-title">One step closer.</h1>
      <p class="intro-copy">Your details are for order communication and delivery only.</p>
    </header>
    <ol class="checkout-progress" aria-label="Checkout progress">
      <li class="is-done">
        <span class="checkout-progress-marker" aria-hidden="true"><i class="pi pi-check"></i></span>
        Cart
      </li>
      <li class="is-current" aria-current="step">
        <span class="checkout-progress-marker" aria-hidden="true">2</span>
        Details &amp; payment
      </li>
      <li>
        <span class="checkout-progress-marker" aria-hidden="true">3</span>
        Confirmation
      </li>
    </ol>
    <section v-if="!store.canCheckout" class="notice-card checkout-blocked-panel" role="alert">
      <span class="icon-tile result-icon is-pending" aria-hidden="true">
        <i class="pi pi-exclamation-circle"></i>
      </span>
      <div>
        <h2>Finish your cart first.</h2>
        <p>{{ checkoutBlockMessage }}</p>
        <Button
          class="kedak-action kedak-cta"
          label="Back to cart"
          icon="pi pi-arrow-left"
          @click="router.push('/cart')"
        />
      </div>
    </section>
    <Form
      v-else
      class="checkout-form"
      :initial-values="checkoutInitial"
      :resolver="checkoutResolver"
      @submit="submitCheckout"
    >
      <div class="checkout-layout">
        <div class="checkout-details">
          <p v-if="auth.isSignedIn" class="checkout-account-note">
            <i class="pi pi-user" aria-hidden="true"></i>
            <span>
              Signed in{{ auth.user?.email ? ` as ${auth.user.email}` : '' }}. This order will
              appear in your account.
            </span>
          </p>
          <p v-else class="checkout-account-note">
            <i class="pi pi-shopping-bag" aria-hidden="true"></i>
            <span>
              You’re checking out as a guest. Have an account?
              <RouterLink :to="{ path: '/login', query: { redirect: '/checkout' } }"
                >Log in</RouterLink
              >
            </span>
          </p>
          <section class="info-card checkout-section" aria-labelledby="checkout-contact-title">
            <div class="checkout-section-heading">
              <span class="checkout-step-number" aria-hidden="true">1</span>
              <div>
                <h2 id="checkout-contact-title">Contact</h2>
                <p>We’ll send order updates and your send-in guide here.</p>
              </div>
            </div>
            <FormField v-slot="$field" name="email">
              <FloatLabel class="checkout-float-label" variant="in">
                <InputText
                  id="checkout-email"
                  v-bind="$field.props"
                  type="email"
                  autocomplete="email"
                  placeholder="name@example.com"
                  :invalid="$field.invalid"
                />
                <label for="checkout-email">Email address</label>
              </FloatLabel>
              <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
                $field.error?.message
              }}</small>
            </FormField>
            <div class="checkout-phone-row">
              <FormField v-slot="$field" name="phoneCountry">
                <FloatLabel class="checkout-float-label" variant="in">
                  <Select
                    input-id="checkout-phone-country"
                    v-bind="$field.props"
                    :options="phoneCountryOptions"
                    option-label="label"
                    option-value="code"
                    placeholder="Select country code"
                    filter
                    filter-placeholder="Search country or code"
                    :invalid="$field.invalid"
                  />
                  <label for="checkout-phone-country">Calling code</label>
                </FloatLabel>
                <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
                  $field.error?.message
                }}</small>
              </FormField>
              <FormField v-slot="$field" name="phone">
                <FloatLabel class="checkout-float-label" variant="in">
                  <InputText
                    id="checkout-phone"
                    v-bind="$field.props"
                    type="tel"
                    inputmode="tel"
                    autocomplete="tel-national"
                    placeholder="e.g. 20 7946 0958"
                    :invalid="$field.invalid"
                  />
                  <label for="checkout-phone">Phone number</label>
                </FloatLabel>
                <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
                  $field.error?.message
                }}</small>
              </FormField>
            </div>
          </section>
          <section class="info-card checkout-section" aria-labelledby="checkout-delivery-title">
            <div class="checkout-section-heading">
              <span class="checkout-step-number" aria-hidden="true">2</span>
              <div>
                <h2 id="checkout-delivery-title">Return delivery</h2>
                <p>Where we send your finished card.</p>
              </div>
            </div>
            <FormField v-slot="$field" name="fullName">
              <FloatLabel class="checkout-float-label" variant="in">
                <InputText
                  id="checkout-name"
                  v-bind="$field.props"
                  autocomplete="name"
                  placeholder="Full name"
                  :invalid="$field.invalid"
                />
                <label for="checkout-name">Full name</label>
              </FloatLabel>
              <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
                $field.error?.message
              }}</small>
            </FormField>
            <FormField v-slot="$field" name="address">
              <FloatLabel class="checkout-float-label" variant="in">
                <InputText
                  id="checkout-address"
                  v-bind="$field.props"
                  autocomplete="address-line1"
                  placeholder="Street and number"
                  :invalid="$field.invalid"
                />
                <label for="checkout-address">Address line 1</label>
              </FloatLabel>
              <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
                $field.error?.message
              }}</small>
            </FormField>
            <div class="form-row">
              <FormField v-slot="$field" name="city">
                <FloatLabel class="checkout-float-label" variant="in">
                  <InputText
                    id="checkout-city"
                    v-bind="$field.props"
                    autocomplete="address-level2"
                    placeholder="City or town"
                    :invalid="$field.invalid"
                  />
                  <label for="checkout-city">City</label>
                </FloatLabel>
                <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
                  $field.error?.message
                }}</small>
              </FormField>
              <FormField v-slot="$field" name="postcode">
                <FloatLabel class="checkout-float-label" variant="in">
                  <InputText
                    id="checkout-postcode"
                    v-bind="$field.props"
                    autocomplete="postal-code"
                    placeholder="Postcode"
                    :invalid="$field.invalid"
                  />
                  <label for="checkout-postcode">Postcode</label>
                </FloatLabel>
                <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
                  $field.error?.message
                }}</small>
              </FormField>
            </div>
            <FormField v-slot="$field" name="country">
              <FloatLabel class="checkout-float-label" variant="in">
                <Select
                  input-id="checkout-country"
                  v-bind="$field.props"
                  :options="countries"
                  option-label="label"
                  option-value="value"
                  placeholder="Select a country"
                  filter
                  filter-placeholder="Search countries"
                  :invalid="$field.invalid"
                />
                <label for="checkout-country">Country</label>
              </FloatLabel>
              <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
                $field.error?.message
              }}</small>
            </FormField>
            <div class="checkout-delivery-option">
              <span class="icon-tile icon-tile--small" aria-hidden="true">
                <i class="pi pi-truck"></i>
              </span>
              <span class="checkout-delivery-copy">
                <strong>Tracked return delivery</strong>
                <small>Dispatch estimate follows card inspection.</small>
              </span>
              <strong class="price-text">£8</strong>
            </div>
          </section>
          <FormField v-slot="$field" name="acknowledgement">
            <div class="info-card acknowledgment checkout-acknowledgment">
              <label class="checkbox-row"
                ><Checkbox
                  v-bind="$field.props"
                  input-id="order-ack"
                  :binary="true"
                  :invalid="$field.invalid"
                /><span>I own this card and understand the conversion risks.</span></label
              >
              <p>
                Card modification may affect issuer terms, contactless payments and ATM use. Final
                suitability is confirmed after inspection. You can cancel until conversion starts —
                see our
                <RouterLink to="/policies/refunds">refund &amp; cancellation policy</RouterLink>.
              </p>
              <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
                $field.error?.message
              }}</small>
            </div>
          </FormField>
        </div>
        <div class="checkout-payment-column">
          <section class="info-card order-summary checkout-summary">
            <h2>Order summary</h2>
            <ul class="checkout-items">
              <li v-for="item in store.cartItems" :key="`checkout-${item.id}`">
                <div class="checkout-item-preview" aria-hidden="true">
                  <CardPreview
                    :design="designForCartItem(item)"
                    :finish="item.finish"
                    :engraving-style="item.customization?.engravingStyle ?? 'name'"
                    :holder-name="item.customization?.holderName ?? ''"
                    :uploaded-artwork="artworksForCartItem(item)[0] ?? null"
                    :upload-orientation="item.customization?.uploadOrientation"
                    :upload-display="item.customization?.uploadDisplay"
                    :show-design-mark="false"
                  />
                  <span class="checkout-item-quantity">{{ item.quantity }}</span>
                </div>
                <span class="checkout-item-copy">
                  <strong>{{ item.finish }} metal card</strong>
                  <small>
                    {{ item.quantity }} × £{{ itemSubtotal(item) / item.quantity }}
                    <template v-if="item.customization?.holderName">
                      · {{ item.customization.holderName }}
                    </template>
                  </small>
                </span>
                <strong>£{{ itemSubtotal(item) }}</strong>
              </li>
            </ul>
            <div class="summary-row">
              <span>Subtotal</span><strong>£{{ store.cartSubtotal }}</strong>
            </div>
            <div class="summary-row"><span>Tracked return delivery</span><strong>£8</strong></div>
            <div class="summary-total">
              <strong>Total</strong><strong>£{{ total }}</strong>
            </div>
          </section>

          <section class="info-card checkout-section" aria-labelledby="checkout-payment-title">
            <div class="checkout-section-heading">
              <span class="checkout-step-number" aria-hidden="true">3</span>
              <div>
                <h2 id="checkout-payment-title">Payment</h2>
                <p>Card payments are handled securely by Stripe.</p>
              </div>
            </div>
            <div class="stripe-payment-placeholder" role="status">
              <i class="pi pi-lock" aria-hidden="true"></i>
              <span>
                <strong>Secure card payment with Stripe</strong>
                <small>Stripe's payment form will be connected before checkout is enabled.</small>
              </span>
            </div>
            <p class="muted-copy stripe-payment-note">
              No card details are collected and no payment is processed in this preview.
            </p>
            <Button
              type="submit"
              class="kedak-action checkout-submit"
              :label="`Place order & pay £${total}`"
              icon="pi pi-lock"
              :disabled="!store.canCheckout"
            />
          </section>

          <ul class="checkout-assurances">
            <li>
              <i class="pi pi-shield" aria-hidden="true"></i>
              We never ask for your PIN, CVV or full card number.
            </li>
            <li>
              <i class="pi pi-search" aria-hidden="true"></i>
              Your card is inspected before any conversion starts.
            </li>
            <li>
              <i class="pi pi-truck" aria-hidden="true"></i>
              Tracked return delivery on every order.
            </li>
          </ul>
        </div>
      </div>
    </Form>
  </main>

  <main v-else-if="page === 'confirmed'" class="journey-main" data-node-id="6:90">
    <p class="eyebrow">
      {{ confirmedOrder ? `ORDER ${confirmedOrder.id} / CONFIRMED` : 'ORDER CONFIRMED' }}
    </p>
    <h1 class="page-title">Your next chapter<br />is metal.</h1>
    <p class="intro-copy">
      Thanks{{
        confirmedOrder?.customerName ? `, ${confirmedOrder.customerName.split(' ')[0]}` : ''
      }}. Your design is saved. Now let’s get your card ready for its transformation.
    </p>
    <section class="info-card confirmation-card">
      <CardPreview
        :design="design"
        :finish="orderCustomization.finish"
        :engraving-style="orderCustomization.engravingStyle"
        :holder-name="orderCustomization.holderName"
        :uploaded-artwork="orderCustomization.uploadedArtwork"
        :upload-orientation="orderCustomization.uploadOrientation"
        :upload-display="orderCustomization.uploadDisplay"
      />
      <strong class="confirmation-total">£{{ confirmedOrder?.total ?? total }}</strong>
      <p v-if="confirmedOrder" class="muted-copy">
        Order confirmation sent to<br />{{ confirmedOrder.email }}
      </p>
    </section>
    <p class="checkout-account-note confirmation-cancel-note">
      <i class="pi pi-info-circle" aria-hidden="true"></i>
      <span>
        Changed your mind? You can cancel for a full refund until we start converting your card —
        from your order page{{ auth.isSignedIn ? ' or your account' : '' }}.
      </span>
    </p>
    <div class="process-list">
      <article class="info-card">
        <strong>01 &nbsp;Read your send-in guide</strong>
        <p>Review packing instructions and issuer terms before sending anything.</p>
      </article>
      <article class="info-card">
        <strong>02 &nbsp;Send with tracking</strong>
        <p>Use the address and packing guidance in your order. Keep your tracking receipt.</p>
      </article>
      <article class="info-card">
        <strong>03 &nbsp;We assess, then convert</strong>
        <p>We inspect your original card before production and keep you updated.</p>
      </article>
    </div>
    <Button
      size="small"
      class="kedak-action"
      label="View or manage my order"
      icon="pi pi-arrow-up-right"
      icon-pos="right"
      @click="router.push(orderLink)"
    />
    <Button
      size="small"
      class="kedak-outline-action"
      severity="secondary"
      outlined
      label="How the process works"
      @click="router.push('/help')"
    />
  </main>

  <main v-else-if="page === 'account'" class="journey-main account-main">
    <header class="account-header">
      <div>
        <p class="eyebrow">YOUR ACCOUNT</p>
        <h1 class="page-title">Hello{{ auth.firstName ? `, ${auth.firstName}` : '' }}.</h1>
        <p class="intro-copy">Your next everyday essential, in the making.</p>
      </div>
      <Button
        class="kedak-outline-action account-signout"
        severity="secondary"
        outlined
        label="Log out"
        icon="pi pi-sign-out"
        @click="signOutOfAccount"
      />
    </header>

    <div class="account-layout">
      <div class="account-primary">
        <section class="info-card account-orders" aria-labelledby="account-orders-title">
          <div class="account-orders-heading">
            <h2 id="account-orders-title">Your orders</h2>
            <span v-if="accountOrders.length" class="muted-copy">
              {{ accountOrders.length }} order{{ accountOrders.length === 1 ? '' : 's' }}
            </span>
          </div>

          <ul v-if="accountOrders.length" class="account-order-list">
            <li v-for="order in accountOrders" :key="order.id">
              <RouterLink :to="`/account/orders/${order.id}`" class="account-order-row">
                <span class="account-order-row-main">
                  <strong>Order {{ order.id }}</strong>
                  <small>
                    Placed {{ formatOrderDate(order.placedAt) }} ·
                    {{ order.lines.map((line) => `${line.finish} × ${line.quantity}`).join(', ') }}
                  </small>
                </span>
                <span class="account-order-row-meta">
                  <OrderStatusBadge :status="order.status" />
                  <strong>£{{ order.total }}</strong>
                </span>
                <i class="pi pi-chevron-right account-link-chevron" aria-hidden="true"></i>
              </RouterLink>
            </li>
          </ul>

          <div v-else class="account-orders-empty">
            <span class="icon-tile" aria-hidden="true"><i class="pi pi-box"></i></span>
            <p>
              <strong>No orders yet.</strong> Orders placed with
              {{ auth.user?.email || 'your email' }} will appear here.
            </p>
            <p class="muted-copy">
              Preview: sign in as {{ PREVIEW_ORDER_EMAIL }} to see sample orders, or
              <RouterLink to="/orders/find">find an order</RouterLink> by reference.
            </p>
            <Button
              class="kedak-action kedak-cta"
              label="Start a design"
              icon="pi pi-arrow-right"
              icon-pos="right"
              @click="router.push('/collections')"
            />
          </div>
        </section>

        <p class="checkout-account-note">
          <i class="pi pi-info-circle" aria-hidden="true"></i>
          <span>
            Open an order to track it, cancel it before conversion starts, or request a refund after
            delivery.
          </span>
        </p>
      </div>

      <aside class="account-secondary">
        <section class="info-card account-profile" aria-labelledby="account-profile-title">
          <h2 id="account-profile-title" class="visually-hidden">Your details</h2>
          <span class="account-avatar" aria-hidden="true">
            <i v-if="!accountInitials" class="pi pi-user"></i>
            <template v-else>{{ accountInitials }}</template>
          </span>
          <div class="account-profile-copy">
            <strong>{{ auth.user?.name || 'Kedak member' }}</strong>
            <span v-if="auth.user?.email">{{ auth.user.email }}</span>
            <span class="account-signin-method">
              <i
                :class="auth.user?.provider === 'google' ? 'pi pi-google' : 'pi pi-envelope'"
                aria-hidden="true"
              ></i>
              {{
                auth.user?.provider === 'google' ? 'Signed in with Google' : 'Email and password'
              }}
            </span>
          </div>
        </section>

        <nav class="info-card account-links" aria-labelledby="account-links-title">
          <h2 id="account-links-title">Shortcuts</h2>
          <ul>
            <li v-for="link in accountLinks" :key="link.to">
              <RouterLink :to="link.to">
                <span class="icon-tile icon-tile--small" aria-hidden="true">
                  <i :class="link.icon"></i>
                </span>
                <span class="account-link-copy">
                  <strong>{{ link.title }}</strong>
                  <small>{{ link.text }}</small>
                </span>
                <i class="pi pi-chevron-right account-link-chevron" aria-hidden="true"></i>
              </RouterLink>
            </li>
          </ul>
        </nav>

        <section class="notice-card account-security">
          <h2><i class="pi pi-lock" aria-hidden="true"></i> Questions along the way?</h2>
          <p>We will only ask for your order reference—not your PIN, CVV or full card number.</p>
        </section>
      </aside>
    </div>
  </main>

  <main v-else-if="page === 'help'" class="journey-main help-main">
    <TextLink to="/" direction="back">Back to home</TextLink>
    <header class="help-header">
      <p class="eyebrow">HOW IT WORKS / HELP</p>
      <h1 class="page-title">A new feel.<br />A considered process.</h1>
      <p class="intro-copy">Your existing payment card, transformed into something personal.</p>
    </header>

    <ol class="help-steps" aria-label="How it works">
      <li v-for="(step, index) in helpSteps" :key="step.title" class="info-card help-step">
        <div class="help-step-top">
          <span class="icon-tile" aria-hidden="true"><i :class="step.icon"></i></span>
          <span class="help-step-number">{{ String(index + 1).padStart(2, '0') }}</span>
        </div>
        <h2>{{ step.title }}</h2>
        <p>{{ step.description }}</p>
      </li>
    </ol>

    <section class="help-split" aria-labelledby="help-checklist-title">
      <div class="help-split-heading">
        <p class="eyebrow">GOOD TO KNOW</p>
        <h2 id="help-checklist-title" class="section-title">Before you send.</h2>
        <p class="muted-copy">A few simple steps keep your card and your details safe.</p>
      </div>
      <ul class="info-card help-checklist">
        <li
          v-for="item in helpChecklist"
          :key="item.text"
          :class="{ 'help-checklist-warning': item.warning }"
        >
          <span class="icon-tile icon-tile--small" aria-hidden="true">
            <i :class="item.icon"></i>
          </span>
          <span>{{ item.text }}</span>
        </li>
      </ul>
    </section>

    <section class="help-split" aria-labelledby="help-faq-title">
      <div class="help-split-heading">
        <p class="eyebrow">GOOD QUESTIONS</p>
        <h2 id="help-faq-title" class="section-title">The finer details.</h2>
      </div>
      <div class="info-card help-faq">
        <details v-for="faq in helpFaqs" :key="faq.question">
          <summary>
            <span>{{ faq.question }}</span>
            <i class="pi pi-plus help-faq-toggle" aria-hidden="true"></i>
          </summary>
          <p>{{ faq.answer }}</p>
        </details>
      </div>
    </section>

    <section class="notice-card help-cta">
      <div>
        <h2>Ready when you are.</h2>
        <p>Start your design, or check your card’s suitability first.</p>
      </div>
      <div class="help-cta-actions">
        <Button
          class="kedak-action kedak-cta"
          label="Start my design"
          icon="pi pi-arrow-right"
          icon-pos="right"
          @click="router.push('/collections')"
        />
        <TextLink to="/compatibility">Check my card</TextLink>
      </div>
    </section>
  </main>

  <main v-else-if="page === 'operations'" class="journey-main ops-main">
    <p class="eyebrow">KEDAK / OPERATIONS / INTERNAL</p>
    <h1 class="page-title">The workbench.</h1>
    <p class="muted-copy">Production overview · 21 November 2026</p>
    <div class="ops-stat-grid">
      <div class="info-card"><strong>12</strong><small>Open</small></div>
      <div class="info-card"><strong>4</strong><small>In craft</small></div>
      <div class="info-card"><strong>3</strong><small>In QC</small></div>
    </div>
    <section class="info-card">
      <h2>Today’s queue</h2>
      <p class="muted-copy">Filter: Active orders</p>
      <article
        v-for="job in [
          ['KD-2048', 'Alex Morgan', 'Black', 'Awaiting card'],
          ['KD-2044', 'Jamie Taylor', 'Black', 'Quality check'],
          ['KD-2041', 'Sam Ellis', 'Silver', 'Quality check'],
        ]"
        :key="job[0]"
        class="queue-row"
      >
        <div>
          <strong>{{ job[0] }}</strong><small>{{ job[1] }} · {{ job[2] }}</small>
        </div>
        <span class="status-pill">{{ job[3] }}</span><Button
          v-if="job[0] === 'KD-2044'"
          size="small"
          class="kedak-outline-action"
          severity="secondary"
          outlined
          label="Open production job"
          @click="router.push('/ops/quality-check')"
        />
      </article>
    </section>
    <section class="info-card">
      <p class="eyebrow">ACTIVE JOB / KD-2044</p>
      <h2>Ready for quality check.</h2>
      <p>Jamie Taylor · Black collection</p>
      <p><span class="checkmark">✓</span> Original card received &amp; logged</p>
      <p><span class="checkmark">✓</span> Physical compatibility assessed</p>
      <p><span class="checkmark">✓</span> Artwork approved</p>
      <p><span class="checkmark">✓</span> Engraving complete</p>
      <p>○ Chip transfer &amp; quality check</p>
      <Button
        size="small"
        class="kedak-action"
        label="Open quality check"
        icon="pi pi-arrow-up-right"
        icon-pos="right"
        @click="router.push('/ops/quality-check')"
      />
    </section>
    <section class="info-card">
      <h2>Recent activity</h2>
      <p class="muted-copy">
        10:42 &nbsp; KD-2044 moved to engraving<br />10:18 &nbsp; KD-2041 entered quality check<br />09:56
        &nbsp; KD-2048 order confirmed
      </p>
    </section>
    <p class="legal-note">
      Restricted workspace. No customer PINs, CVVs or full card numbers are stored.
    </p>
  </main>

  <main v-else class="journey-main ops-main">
    <p class="eyebrow">OPERATIONS / KD-2044</p>
    <h1 class="page-title">Ready for<br />quality check.</h1>
    <section class="info-card qc-card">
      <span class="status-pill">Engraving completed</span>
      <h2>Jamie Taylor</h2>
      <p class="muted-copy">Black collection · Name-only engraving</p>
      <p><span class="checkmark">✓</span> &nbsp; Original card logged</p>
      <p><span class="checkmark">✓</span> &nbsp; Card assessed</p>
      <p><span class="checkmark">✓</span> &nbsp; Artwork approved</p>
      <p><span class="checkmark">✓</span> &nbsp; Engraving completed</p>
      <p>○ &nbsp; Chip transfer verification</p>
      <p>○ &nbsp; Functional checks</p>
      <p>○ &nbsp; Packaging &amp; dispatch approval</p>
      <p class="muted-copy">
        Quality checks require a physical inspection. No dispatch is released automatically.
      </p>
    </section>
    <Button
      size="small"
      class="kedak-outline-action"
      severity="secondary"
      outlined
      label="Return to production queue"
      @click="router.push('/ops')"
    />
    <p class="legal-note">
      Internal workspace. Staff access only. Never record PINs, CVVs or full card numbers.
    </p>
  </main>
</template>
