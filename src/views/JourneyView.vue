<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { Form, FormField, type FormSubmitEvent } from '@primevue/forms'
import { useMutation } from '@tanstack/vue-query'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import RadioButton from 'primevue/radiobutton'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import CardPreview from '../components/card/CardPreview.vue'
import CardholderNameInput from '../components/card/CardholderNameInput.vue'
import DesignCategoryTabs from '../components/card/DesignCategoryTabs.vue'
import DesignGallery from '../components/card/DesignGallery.vue'
import DesignUpload from '../components/card/DesignUpload.vue'
import FinishCard from '../components/FinishCard.vue'
import PaymentMethodPicker from '../components/checkout/PaymentMethodPicker.vue'
import PayNowPanel from '../components/checkout/PayNowPanel.vue'
import { usePaymentReturn } from '../composables/usePaymentReturn'
import {
  clearCheckoutHandoff,
  saveCheckoutHandoff,
  takeCheckoutHandoff,
} from '../services/checkoutHandoff'
import type { PaymentProviderId } from '../data/paymentProviders'
import { usePaymentProviders, useStartPayment } from '../queries/payments'
import TextLink from '../components/TextLink.vue'
import OrderTimeline from '../components/orders/OrderTimeline.vue'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.vue'
import StockBadge from '../components/StockBadge.vue'
import { PLACEHOLDER_DESIGN, useArtworkSelection } from '../composables/useArtworkSelection'
import { useCardCustomization, validateArtworkCount } from '../composables/useCardCustomization'
import { useDesignLookup } from '../queries/artwork'
import { useCartValidation } from '../queries/cart'
import { useFinishCatalog } from '../queries/catalog'
import {
  newIdempotencyKey,
  useAccountOrders,
  useOrderQuery,
  usePlaceOrder,
} from '../queries/orders'
import { changePassword, resendVerificationEmail } from '../services/api/endpoints/auth'
import { toCartItemInput } from '../services/api/endpoints/cart'
import { checkCompatibility } from '../services/api/endpoints/compatibility'
import { ApiError, errorMessage } from '../services/api/errors'
import { useAuthStore } from '../stores/auth'
import { isCartItemCustomized } from '../stores/cardCustomization'
import { formatOrderDate } from '../utils/orderPolicy'
import { formatMoney } from '../utils/money'
import { deliveryCountryOptions, phoneCountryOptions } from '../utils/phoneCountries'
import { checkoutSchema, compatibilitySchema, passwordRules } from '../types/forms'
import {
  MAX_ITEM_QUANTITY,
  type CardCartItem,
  type CardCategory,
  type CardDesign,
  type CardFinish,
  type CustomizationMode,
  type UploadedArtwork,
} from '../types/card'
import type { CompatibilityAnswers, Order, OrderLine, PlaceOrderRequest } from '../types/api'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const customization = useCardCustomization()
const store = customization.store
// Server state: artwork (cart editor), finishes/stock, and server-side cart pricing.
const artwork = useArtworkSelection()
const catalog = useFinishCatalog()
const cart = useCartValidation()
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
const cartEditCategory = computed<CardCategory | null>({
  get: () => store.category,
  set: (category) => {
    if (category) customization.selectCategory(category)
  },
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
  if (customization.isUploading.value) return 'Wait for your artwork to finish uploading.'
  if (store.customizationMode === 'custom' && store.uploadedArtworks.length === 0) {
    return 'Upload artwork before saving this custom card.'
  }
  if (store.customizationMode === 'preset' && !artwork.hasSelectedDesign.value) {
    return 'Choose a design before saving.'
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
const galleryError = computed(() =>
  artwork.error.value ? errorMessage(artwork.error.value, 'Designs couldn’t load.') : '',
)
const hasUncustomizedItems = computed(() =>
  store.cartItems.some((item) => !isCartItemCustomized(item)),
)
const hasOutOfStockItems = computed(() =>
  store.cartItems.some((item) => cart.hasIssue(item.id, 'finish_out_of_stock')),
)
const inStockFinishes = catalog.inStockFinishes
const checkoutBlockMessage = computed(() => cart.blockingMessages.value.join(' '))
const cartCheckMessage = computed(() => {
  if (!store.cartItems.length) return ''
  if (cart.error.value) return errorMessage(cart.error.value, 'We couldn’t check your cart.')
  if (cart.isValidating.value && !cart.isCurrent.value) return 'Checking prices and stock…'
  return ''
})
const total = computed(() => cart.total.value)
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

// The order just placed (GET /orders/{id} with this tab's access token or the session).
// After Stripe/Paystack the return URL names the order: /order/confirmed?order=KD-…&payment=…
const confirmedOrderId = computed(() =>
  page.value === 'confirmed'
    ? ((typeof route.query.order === 'string' ? route.query.order : store.lastPlacedOrderId) ?? '')
    : '',
)
const confirmedOrderQuery = useOrderQuery(confirmedOrderId)
const paymentReturn = usePaymentReturn(confirmedOrderId)
// Back from Stripe/Paystack: a cancelled payment restores the cart and checkout details and
// opens the cart; a completed one discards the saved copy (the cart was paid for).
{
  const mode = typeof route.query.payment === 'string' ? route.query.payment : ''
  if (page.value === 'confirmed' && mode && confirmedOrderId.value) {
    const saved = takeCheckoutHandoff(confirmedOrderId.value)
    if (mode === 'cancelled' && saved) {
      store.restoreCheckout(saved)
      onMounted(() => {
        void router.replace('/cart')
        toast.add({
          severity: 'info',
          summary: 'Payment cancelled',
          detail: `Your cart is just as you left it. Order ${saved.orderId} is saved — check out again to pay.`,
          life: 6000,
        })
      })
    } else if (mode !== 'cancelled') {
      store.clearCart()
    }
  }
}
const confirmedOrder = computed<Order | null>(() => confirmedOrderQuery.data.value ?? null)
const confirmedLine = computed<OrderLine | null>(() => confirmedOrder.value?.lines[0] ?? null)
// Designs used by cart items and the confirmed order (GET /artwork/{id}, cached).
const designLookup = useDesignLookup(() => [
  ...store.cartItems.flatMap((item) =>
    item.customization?.customizationMode === 'preset' ? [item.customization.designId] : [],
  ),
  ...(confirmedLine.value?.customization?.customizationMode === 'preset' &&
  confirmedLine.value.customization.designId
    ? [confirmedLine.value.customization.designId]
    : []),
])
const confirmedDesign = computed<CardDesign>(() => {
  const designId = confirmedLine.value?.customization?.designId
  return (designId && designLookup.value.get(designId)) || PLACEHOLDER_DESIGN
})

// Account: GET /account/orders (cursor pages).
const accountOrdersQuery = useAccountOrders()
const accountOrders = computed(
  () => accountOrdersQuery.data.value?.pages.flatMap((pageData) => pageData.data) ?? [],
)
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

// Account security: password change (dj-rest-auth) and re-sending the verification email.
const showPasswordForm = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const passwordMutation = useMutation({
  mutationFn: () =>
    changePassword({ oldPassword: currentPassword.value, newPassword: newPassword.value }),
  onSuccess: () => {
    currentPassword.value = ''
    newPassword.value = ''
    showPasswordForm.value = false
    toast.add({ severity: 'success', summary: 'Password updated', life: 2600 })
  },
})
const newPasswordValid = computed(() => passwordRules.every((rule) => rule.test(newPassword.value)))
function submitPasswordChange() {
  if (!currentPassword.value || !newPasswordValid.value || passwordMutation.isPending.value) return
  passwordMutation.mutate()
}
const verificationMutation = useMutation({
  mutationFn: () => resendVerificationEmail(auth.user?.email ?? ''),
  onSuccess: () =>
    toast.add({
      severity: 'success',
      summary: 'Verification email sent',
      detail: 'If your email isn’t verified yet, check your inbox for a new link.',
      life: 4000,
    }),
})

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

// After a cancelled payment the details the customer typed are restored with their cart.
const checkoutInitial = computed(() => ({
  email: auth.user?.email ?? '',
  fullName: auth.user?.name ?? '',
  address: '',
  city: '',
  postcode: '',
  country: '',
  phoneCountry: 'GB',
  phone: '',
  ...(store.pendingCheckout?.details ?? {}),
  acknowledgement: false,
}))

function designForCartItem(item: CardCartItem): CardDesign {
  const saved = item.customization
  if (!saved || saved.customizationMode !== 'preset') return PLACEHOLDER_DESIGN
  return designLookup.value.get(saved.designId) ?? PLACEHOLDER_DESIGN
}

function artworksForCartItem(item: CardCartItem): Array<UploadedArtwork | null> {
  const saved = item.customization
  if (!saved || !saved.uploadedArtworks.length) return [null]
  return saved.artworkAssignment === 'per-card'
    ? saved.uploadedArtworks
    : [saved.uploadedArtworks[0]!]
}

function itemSubtotal(item: CardCartItem) {
  return cart.lineTotal(item.id)
}

function itemUnitPrice(item: CardCartItem) {
  return cart.itemResult(item.id)?.unitPrice ?? null
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
  customization.cancelUpload()
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

async function handleCartEditUploads(files: File[]) {
  cartEditUploadError.value = ''
  const result = await customization.handleUploads(
    files,
    store.artworkAssignment,
    store.cartQuantity,
  )
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
  if (!catalog.isInStock(nextFinish)) {
    toast.add({
      severity: 'warn',
      summary: `${nextFinish} is out of stock`,
      detail: 'Choose another finish.',
      life: 3000,
    })
    return
  }
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
  const quantity = Math.min(MAX_ITEM_QUANTITY, Math.max(1, item.quantity + amount))
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

// Compatibility: preliminary screening by POST /compatibility-checks. The server decides the
// outcome; it is never presented as a guarantee of compatibility or issuer approval.
const compatibilityMutation = useMutation({
  mutationFn: (answers: CompatibilityAnswers) => checkCompatibility(answers),
})
const compatibilityError = computed(() =>
  compatibilityMutation.error.value
    ? errorMessage(compatibilityMutation.error.value, 'We couldn’t check your answers.')
    : '',
)
const compatibilityResult = computed(() => store.compatibilityResult)

async function submitCompatibility(event: FormSubmitEvent) {
  if (!event.valid || compatibilityMutation.isPending.value) return
  const answers = compatibilitySchema.parse(event.values) as CompatibilityAnswers
  store.setCompatibilityAnswers(answers)
  try {
    const result = await compatibilityMutation.mutateAsync(answers)
    store.setCompatibilityResult(result)
    void router.push(
      result.outcome === 'eligible-for-assessment' ? '/compatibility/result' : '/manual-review',
    )
  } catch {
    // compatibilityError shows the server's message.
  }
}

// Checkout: POST /orders with an Idempotency-Key that stays the same while the customer
// retries the same cart, so a lost response can't create a duplicate order.
const placeOrder = usePlaceOrder()
// Payment: providers enabled on the server (GET /payments/providers, with a USD/NGN estimate).
// After POST /orders, the customer is sent to the chosen provider's hosted checkout.
const paymentProvider = ref<PaymentProviderId | null>(null)
const providersQuery = usePaymentProviders(() => total.value?.amount ?? null)
const availableProviders = computed(() => providersQuery.data.value ?? [])
const selectedProvider = computed(
  () => availableProviders.value.find((provider) => provider.id === paymentProvider.value) ?? null,
)
const startPayment = useStartPayment()
const checkoutBusy = computed(() => placeOrder.isPending.value || startPayment.isPending.value)
// While the provider's page loads, checkout shows a "taking you to payment" state instead of
// re-rendering the (now emptied) cart. Set before the redirect, never cleared on success.
const paymentRedirect = ref<{ provider: string; orderId: string } | null>(null)
// Back button from Stripe/Paystack can restore this page from the browser cache: send the
// customer to their order (it's saved and can be paid from there) instead of a stuck spinner.
function onPageShow(event: PageTransitionEvent) {
  if (event.persisted && paymentRedirect.value) {
    // The cart is still here (it's only cleared once payment succeeds): stay on checkout.
    paymentRedirect.value = null
    clearCheckoutHandoff()
    toast.add({
      severity: 'info',
      summary: 'Payment not completed',
      detail: 'Your cart is saved. Pay when you’re ready.',
      life: 4000,
    })
  }
}
onMounted(() => window.addEventListener('pageshow', onPageShow))
onBeforeUnmount(() => window.removeEventListener('pageshow', onPageShow))
const checkoutSubmitLabel = computed(() => {
  const amount = total.value ? ` · ${formatMoney(total.value)}` : ''
  return selectedProvider.value
    ? `Continue to ${selectedProvider.value.name}${amount}`
    : `Place order${amount}`
})
// Confirmation step state: what we know about the order and its payment.
type ConfirmStage =
  'loading' | 'missing' | 'confirming' | 'paid' | 'processing' | 'unpaid' | 'received'
const confirmStage = computed<ConfirmStage>(() => {
  const order = confirmedOrder.value
  if (!order) {
    return confirmedOrderQuery.canRequest.value && confirmedOrderQuery.isPending.value
      ? 'loading'
      : 'missing'
  }
  if (order.payment.status === 'paid') return 'paid'
  if (paymentReturn.state.value === 'confirming') return 'confirming'
  if (paymentReturn.state.value === 'pending') return 'processing'
  if (order.status === 'awaiting-card' && availableProviders.value.length) return 'unpaid'
  return 'received'
})
const confirmCopy = computed(() => {
  const name = confirmedOrder.value?.customerName.split(' ')[0]
  const thanks = name ? `Thanks, ${name}.` : 'Thank you.'
  switch (confirmStage.value) {
    case 'paid':
      return {
        title: 'Payment received.',
        body: `${thanks} Your order is confirmed and your design is saved.`,
      }
    case 'confirming':
      return { title: 'Confirming your payment…', body: 'This usually takes a few seconds.' }
    case 'processing':
      return {
        title: 'Payment processing.',
        body: 'We haven’t had confirmation yet. Bank transfers can take a few minutes; we’ll email you when it arrives.',
      }
    case 'unpaid':
      return {
        title: 'One step left: payment.',
        body:
          paymentReturn.state.value === 'cancelled'
            ? 'Payment was cancelled. Choose a method below to try again.'
            : 'Your order is saved. Complete payment to confirm it.',
      }
    default:
      return { title: 'Order received.', body: `${thanks} Your design is saved.` }
  }
})
const paymentLabel = computed(() => {
  const payment = confirmedOrder.value?.payment
  if (!payment) return ''
  const via =
    payment.provider === 'paystack' ? 'Paystack' : payment.provider === 'stripe' ? 'Stripe' : ''
  if (payment.status === 'paid') return via ? `Paid with ${via}` : 'Paid'
  if (payment.status === 'refunded') return 'Refunded'
  if (payment.status === 'partially-refunded') return 'Partly refunded'
  return confirmStage.value === 'processing' ? 'Processing' : 'Not paid yet'
})
const checkoutErrors = ref<string[]>([])
const cartPayload = computed(() => store.cartItems.map(toCartItemInput))
let checkoutKey = newIdempotencyKey()
watch(
  cartPayload,
  () => {
    checkoutKey = newIdempotencyKey()
  },
  { deep: true },
)

const CHECKOUT_POINTERS: Record<string, string> = {
  '/contact/email': 'Email',
  '/contact/fullName': 'Full name',
  '/contact/phone/number': 'Phone',
  '/contact/phone/countryCode': 'Calling code',
  '/deliveryAddress/address': 'Address',
  '/deliveryAddress/city': 'City',
  '/deliveryAddress/postcode': 'Postcode',
  '/deliveryAddress/country': 'Country',
  '/acknowledgement': 'Acknowledgement',
}

async function submitCheckout(event: FormSubmitEvent) {
  if (!event.valid) {
    checkoutErrors.value = ['Please complete the highlighted details above.']
    void nextTick(() =>
      document
        .querySelector('.checkout-form .p-invalid, .checkout-form [aria-invalid="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
    return
  }
  if (!cart.canCheckout.value || checkoutBusy.value) return
  if (availableProviders.value.length && !selectedProvider.value) {
    checkoutErrors.value = ['Choose how you’d like to pay.']
    return
  }
  checkoutErrors.value = []
  const details = checkoutSchema.parse(event.values)
  const payload: PlaceOrderRequest = {
    contact: {
      email: details.email.trim(),
      fullName: details.fullName.trim(),
      phone: { countryCode: details.phoneCountry, number: details.phone.trim() },
    },
    deliveryAddress: {
      address: details.address.trim(),
      city: details.city.trim(),
      postcode: details.postcode.trim(),
      country: details.country,
    },
    items: cartPayload.value,
    acknowledgement: true,
  }
  try {
    // Checking out again after a cancelled payment, unchanged: pay for the order already
    // created instead of placing a duplicate. Any change places a new order (the old unpaid one
    // is cancelled automatically after UNPAID_ORDER_TTL_HOURS).
    const signature = JSON.stringify(payload)
    const reuse = store.pendingCheckout?.signature === signature ? store.pendingCheckout : null
    const order = reuse
      ? { id: reuse.orderId }
      : await placeOrder.mutateAsync({ payload, idempotencyKey: checkoutKey })
    if (!reuse) checkoutKey = newIdempotencyKey()
    store.setLastPlacedOrder(order.id)
    if (selectedProvider.value) {
      paymentRedirect.value = { provider: selectedProvider.value.name, orderId: order.id }
      const pending = {
        orderId: order.id,
        signature,
        items: store.cartItems,
        details: {
          email: details.email,
          fullName: details.fullName,
          address: details.address,
          city: details.city,
          postcode: details.postcode,
          country: details.country,
          phoneCountry: details.phoneCountry,
          phone: details.phone,
        },
      }
      store.setPendingCheckout(pending)
      saveCheckoutHandoff(pending)
      try {
        // Navigates to the provider's hosted page; we come back to /order/confirmed?order=….
        // The cart is kept (and saved for this tab) until the payment is confirmed.
        await startPayment.mutateAsync({ orderId: order.id, provider: selectedProvider.value.id })
        return
      } catch (paymentError) {
        paymentRedirect.value = null
        clearCheckoutHandoff()
        if (reuse) {
          // The saved order can't be paid any more (expired, cancelled or already paid):
          // keep the cart, forget that order, and let the next attempt place a new one.
          store.setPendingCheckout(null)
          checkoutErrors.value = [
            `${errorMessage(paymentError, `Order ${reuse.orderId} can no longer be paid.`)} Press the button again to place a new order.`,
          ]
          return
        }
        store.clearCart()
        toast.add({
          severity: 'warn',
          summary: 'Order placed, payment not started',
          detail: errorMessage(paymentError, 'You can pay from your order confirmation.'),
          life: 6000,
        })
      }
    } else {
      store.clearCart()
      toast.add({
        severity: 'success',
        summary: 'Order placed',
        detail: `Order ${order.id} has been received.`,
        life: 3000,
      })
    }
    void router.push('/order/confirmed')
  } catch (error) {
    // Never leave the "Taking you to…" panel up after a failure: the order may already be
    // saved, so say so and let the customer retry (an unchanged cart reuses that order).
    if (paymentRedirect.value) {
      const savedOrder = paymentRedirect.value.orderId
      paymentRedirect.value = null
      clearCheckoutHandoff()
      checkoutErrors.value = [
        `Order ${savedOrder} is saved, but we couldn’t open the payment page. Press the button again to retry.`,
      ]
      return
    }
    const apiError = error instanceof ApiError ? error : null
    if (apiError?.status === 409 || apiError?.code === 'checkout_blocked') {
      void cart.retry() // re-price and show the server's current issues in the cart
    }
    const fieldMessages =
      apiError?.fieldErrors.map((fieldError) => {
        const label = CHECKOUT_POINTERS[fieldError.pointer]
        return label ? `${label}: ${fieldError.message}` : fieldError.message
      }) ?? []
    checkoutErrors.value = fieldMessages.length
      ? [...new Set(fieldMessages)]
      : [errorMessage(error, 'Your order couldn’t be placed. Please try again.')]
  }
}

function continueToCheckout() {
  if (!cart.canCheckout.value) return
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
        <p v-if="compatibilityError" class="upload-error" role="alert">
          <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
          <span>{{ compatibilityError }}</span>
        </p>
        <Button
          type="submit"
          class="kedak-action kedak-cta compat-submit"
          label="Review my answers"
          icon="pi pi-arrow-right"
          icon-pos="right"
          :loading="compatibilityMutation.isPending.value"
          :disabled="compatibilityMutation.isPending.value"
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
      <p class="result-lead">
        {{
          compatibilityResult?.message ??
          'Your answers suggest your card can be assessed for conversion.'
        }}
      </p>
      <p class="muted-copy">
        This is a preliminary screen, not an approval. Final suitability is confirmed only after we
        inspect your original card, and it does not confirm issuer approval.
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
          <dd>
            {{ store.compatibilityAnswers.cardType }}
            {{ store.compatibilityAnswers.hasChip ? 'with chip' : 'without chip' }}
          </dd>
        </div>
      </dl>
      <p v-if="!compatibilityResult" class="muted-copy">
        <RouterLink to="/compatibility">Answer the quick check</RouterLink> to get a preliminary
        result for your card.
      </p>
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
      <p v-if="compatibilityResult?.message">{{ compatibilityResult.message }}</p>
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
                  v-if="cart.hasIssue(item.id, 'finish_out_of_stock')"
                  class="cart-stock-badge"
                  :finish="item.finish"
                />
                <ul
                  v-if="
                    cart
                      .issuesFor(item.id)
                      .some(
                        (issue) =>
                          issue.code !== 'finish_out_of_stock' && issue.code !== 'not_customised',
                      )
                  "
                  class="cart-item-issues"
                  role="alert"
                >
                  <template v-for="issue in cart.issuesFor(item.id)" :key="issue.code">
                    <li
                      v-if="issue.code !== 'finish_out_of_stock' && issue.code !== 'not_customised'"
                    >
                      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
                      {{ issue.message }}
                    </li>
                  </template>
                </ul>
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
              v-if="cart.hasIssue(item.id, 'finish_out_of_stock')"
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
                  <strong>{{ formatMoney(option.price) }}</strong>
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
                  :design="artwork.selectedDesign.value"
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
                    :designs="artwork.gallery.value"
                    :selected-id="store.selectedDesignId"
                    :loading="artwork.isLoading.value"
                    :error="galleryError"
                    @select="selectCartEditDesign"
                    @retry="artwork.retry"
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
                    :uploading="customization.isUploading.value"
                    :progress="customization.uploadProgress.value"
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
                  :disabled="item.quantity === MAX_ITEM_QUANTITY"
                  @click="adjustCartItemQuantity(item, 1)"
                >
                  <i class="pi pi-plus" aria-hidden="true"></i>
                </button>
              </div>
              <strong class="cart-item-total">{{ formatMoney(itemSubtotal(item)) }}</strong>
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
          <strong>{{ formatMoney(itemSubtotal(item)) }}</strong>
        </div>
        <div class="summary-row cart-subtotal-row">
          <span>Subtotal</span><strong>{{ formatMoney(cart.subtotal.value) }}</strong>
        </div>
        <div class="summary-row cart-delivery-row">
          <span>Tracked return delivery</span
          ><strong>{{ formatMoney(cart.delivery.value) }}</strong>
        </div>
        <div class="summary-total cart-total-row">
          <strong>Total</strong><strong>{{ formatMoney(total) }}</strong>
        </div>
        <p
          v-if="cartCheckMessage"
          class="api-state"
          :class="{ 'is-error': cart.error.value }"
          role="status"
        >
          <i
            :class="cart.error.value ? 'pi pi-exclamation-circle' : 'pi pi-spin pi-spinner'"
            aria-hidden="true"
          ></i>
          <span>{{ cartCheckMessage }}</span>
          <button v-if="cart.error.value" type="button" class="api-retry" @click="cart.retry()">
            Try again
          </button>
        </p>
        <p
          v-if="
            (hasUncustomizedItems || hasOutOfStockItems || !cart.canCheckout.value) &&
            checkoutBlockMessage
          "
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
          :disabled="!cart.canCheckout.value"
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
    <section
      v-if="paymentRedirect"
      class="notice-card checkout-blocked-panel checkout-redirect"
      role="status"
    >
      <span class="icon-tile result-icon" aria-hidden="true">
        <i class="pi pi-spin pi-spinner"></i>
      </span>
      <div>
        <h2>Taking you to {{ paymentRedirect.provider }}…</h2>
        <p>
          Order {{ paymentRedirect.orderId }} is saved. Complete the payment on
          {{ paymentRedirect.provider }}’s secure page — please don’t close this tab.
        </p>
      </div>
    </section>
    <section
      v-else-if="
        !store.cartItems.length ||
        !store.allItemsCustomized ||
        (cart.isCurrent.value && !cart.canCheckout.value)
      "
      class="notice-card checkout-blocked-panel"
      role="alert"
    >
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
              <strong class="price-text">{{ formatMoney(cart.delivery.value) }}</strong>
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
                    {{ item.quantity }} × {{ formatMoney(itemUnitPrice(item)) }}
                    <template v-if="item.customization?.holderName">
                      · {{ item.customization.holderName }}
                    </template>
                  </small>
                </span>
                <strong>{{ formatMoney(itemSubtotal(item)) }}</strong>
              </li>
            </ul>
            <div class="summary-row">
              <span>Subtotal</span><strong>{{ formatMoney(cart.subtotal.value) }}</strong>
            </div>
            <div class="summary-row">
              <span>Tracked return delivery</span
              ><strong>{{ formatMoney(cart.delivery.value) }}</strong>
            </div>
            <div class="summary-total">
              <strong>Total</strong><strong>{{ formatMoney(total) }}</strong>
            </div>
            <p v-if="cartCheckMessage" class="api-state" role="status">
              <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
              <span>{{ cartCheckMessage }}</span>
            </p>
          </section>

          <section class="info-card checkout-section" aria-labelledby="checkout-payment-title">
            <div class="checkout-section-heading">
              <span class="checkout-step-number" aria-hidden="true">3</span>
              <div>
                <h2 id="checkout-payment-title">Payment</h2>
                <p>Choose how you’d like to pay.</p>
              </div>
            </div>
            <PaymentMethodPicker
              v-model="paymentProvider"
              :available="availableProviders"
              :loading="providersQuery.isPending.value"
            />
            <div v-if="checkoutErrors.length" class="upload-error" role="alert">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
              <span>
                <template v-for="(message, index) in checkoutErrors" :key="message">
                  <br v-if="index" />{{ message }}
                </template>
              </span>
            </div>
            <Button
              type="submit"
              class="kedak-action checkout-submit"
              :label="checkoutSubmitLabel"
              icon="pi pi-lock"
              :loading="checkoutBusy"
              :disabled="!cart.canCheckout.value || checkoutBusy"
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

  <main v-else-if="page === 'confirmed'" class="journey-main receipt-main">
    <ol class="checkout-progress receipt-progress" aria-label="Checkout progress">
      <li class="is-done">
        <span class="checkout-progress-marker" aria-hidden="true"><i class="pi pi-check"></i></span>
        Cart
      </li>
      <li class="is-done">
        <span class="checkout-progress-marker" aria-hidden="true"><i class="pi pi-check"></i></span>
        Details &amp; payment
      </li>
      <li
        :class="confirmStage === 'paid' || confirmStage === 'received' ? 'is-done' : 'is-current'"
        aria-current="step"
      >
        <span class="checkout-progress-marker" aria-hidden="true">
          <i v-if="confirmStage === 'paid' || confirmStage === 'received'" class="pi pi-check"></i>
          <template v-else>3</template>
        </span>
        Confirmation
      </li>
    </ol>

    <p v-if="confirmStage === 'loading'" class="api-state receipt-loading" aria-busy="true">
      <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading your order…
    </p>

    <section v-else-if="confirmStage === 'missing'" class="info-card receipt-empty">
      <span class="icon-tile" aria-hidden="true"><i class="pi pi-envelope"></i></span>
      <div>
        <h1 class="receipt-empty-title">Your order details are in your email.</h1>
        <p class="muted-copy">
          Find your order with its reference (KD-…) and the email you used at checkout.
        </p>
        <div class="receipt-empty-actions">
          <Button
            class="kedak-action"
            label="Find your order"
            icon="pi pi-search"
            @click="router.push('/orders/find')"
          />
          <Button
            class="kedak-outline-action"
            severity="secondary"
            outlined
            label="Continue shopping"
            @click="router.push('/collections')"
          />
        </div>
      </div>
    </section>

    <template v-else-if="confirmedOrder">
      <header class="order-header receipt-header" aria-live="polite">
        <div class="receipt-heading">
          <span class="receipt-status-icon" :class="`is-${confirmStage}`" aria-hidden="true">
            <i
              :class="{
                'pi pi-spin pi-spinner': confirmStage === 'confirming',
                'pi pi-check': confirmStage === 'paid' || confirmStage === 'received',
                'pi pi-clock': confirmStage === 'processing',
                'pi pi-wallet': confirmStage === 'unpaid',
              }"
            ></i>
          </span>
          <div>
            <p class="eyebrow">
              ORDER {{ confirmedOrder.id }} · PLACED
              {{ formatOrderDate(confirmedOrder.placedAt).toUpperCase() }}
            </p>
            <h1 class="page-title">{{ confirmCopy.title }}</h1>
            <p class="intro-copy">{{ confirmCopy.body }}</p>
          </div>
        </div>
        <span class="confirm-pill receipt-pill" :class="`is-${confirmedOrder.payment.status}`">
          {{ paymentLabel }}
        </span>
      </header>

      <div class="order-layout receipt-layout">
        <div class="order-primary">
          <PayNowPanel v-if="confirmStage === 'unpaid'" :order="confirmedOrder" />

          <section class="info-card receipt-items" aria-labelledby="receipt-items-title">
            <div class="receipt-section-head">
              <h2 id="receipt-items-title">Your order</h2>
              <span class="muted-copy">
                {{ confirmedOrder.lines.reduce((sum, line) => sum + line.quantity, 0) }}
                {{
                  confirmedOrder.lines.reduce((sum, line) => sum + line.quantity, 0) === 1
                    ? 'card'
                    : 'cards'
                }}
              </span>
            </div>
            <div class="receipt-items-body">
              <div v-if="confirmedLine" class="receipt-preview">
                <CardPreview
                  :design="confirmedDesign"
                  :finish="confirmedLine.finish"
                  :engraving-style="confirmedLine.customization?.engravingStyle ?? 'name'"
                  :holder-name="confirmedLine.holderName"
                  :uploaded-artwork="confirmedLine.customization?.uploadedArtworks?.[0] ?? null"
                  :upload-orientation="confirmedLine.customization?.uploadOrientation"
                  :upload-display="confirmedLine.customization?.uploadDisplay"
                  :show-design-mark="false"
                />
              </div>
              <div class="receipt-summary">
                <ul class="receipt-lines">
                  <li v-for="(line, index) in confirmedOrder.lines" :key="index">
                    <span class="receipt-line-copy">
                      <strong>{{ line.finish }} metal card</strong>
                      <small>
                        {{ line.designName || 'Your design' }}
                        <template v-if="line.holderName"> · {{ line.holderName }}</template>
                      </small>
                      <small>{{ line.quantity }} × {{ formatMoney(line.unitPrice) }}</small>
                    </span>
                    <strong>{{ formatMoney(line.unitPrice.amount * line.quantity) }}</strong>
                  </li>
                </ul>
                <dl class="receipt-totals">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{{ formatMoney(confirmedOrder.subtotal) }}</dd>
                  </div>
                  <div>
                    <dt>Tracked return delivery</dt>
                    <dd>{{ formatMoney(confirmedOrder.delivery) }}</dd>
                  </div>
                  <div class="is-total">
                    <dt>Total</dt>
                    <dd>{{ formatMoney(confirmedOrder.total) }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <!-- Same step tracker as the order page (done / in progress / upcoming). -->
          <section class="info-card account-timeline" aria-labelledby="confirm-next-title">
            <h2 id="confirm-next-title">Order progress</h2>
            <OrderTimeline :order="confirmedOrder" />
          </section>
        </div>

        <aside class="order-secondary">
          <section
            class="info-card order-summary receipt-facts"
            aria-labelledby="receipt-facts-title"
          >
            <h2 id="receipt-facts-title">Order details</h2>
            <div class="summary-row">
              <span>Reference</span><strong>{{ confirmedOrder.id }}</strong>
            </div>
            <div class="summary-row">
              <span>Placed</span><strong>{{ formatOrderDate(confirmedOrder.placedAt) }}</strong>
            </div>
            <div class="summary-row">
              <span>Payment</span><strong>{{ paymentLabel }}</strong>
            </div>
            <div class="summary-row">
              <span>Updates to</span
              ><strong class="receipt-email">{{ confirmedOrder.email }}</strong>
            </div>
            <div class="summary-total">
              <strong>Total</strong><strong>{{ formatMoney(confirmedOrder.total) }}</strong>
            </div>
            <Button
              class="kedak-action receipt-view-order"
              label="View my order"
              icon="pi pi-arrow-right"
              icon-pos="right"
              @click="router.push(orderLink)"
            />
            <div class="receipt-secondary">
              <TextLink to="/collections">Continue shopping</TextLink>
            </div>
          </section>

          <!-- Same message style as the order page's "Questions about this order?" -->
          <section class="notice-card account-security receipt-notice">
            <h2><i class="pi pi-bell" aria-hidden="true"></i> We’ll keep you posted</h2>
            <p>
              We’ll email <strong>{{ confirmedOrder.email }}</strong> at every step: payment, card
              received, dispatch with tracking, and delivery. Your send-in guide with packing
              instructions arrives by email too.
            </p>
            <p>Never include your PIN or security code when you post your card.</p>
            <TextLink to="/help">How the process works</TextLink>
          </section>

          <section class="notice-card account-security receipt-notice">
            <h2><i class="pi pi-replay" aria-hidden="true"></i> Changed your mind?</h2>
            <p>
              You can cancel for a full refund until conversion starts, from your order page{{
                auth.isSignedIn ? ' or your account' : ''
              }}.
            </p>
            <TextLink to="/policies/refunds">Refund &amp; cancellation policy</TextLink>
          </section>
        </aside>
      </div>
    </template>
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

          <p v-if="accountOrdersQuery.isPending.value" class="api-state" aria-busy="true">
            <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading your orders…
          </p>
          <p v-else-if="accountOrdersQuery.isError.value" class="api-state is-error" role="alert">
            {{ errorMessage(accountOrdersQuery.error.value, 'Your orders couldn’t load.') }}
            <button type="button" class="api-retry" @click="accountOrdersQuery.refetch()">
              Try again
            </button>
          </p>
          <ul v-else-if="accountOrders.length" class="account-order-list">
            <li v-for="order in accountOrders" :key="order.id">
              <RouterLink :to="`/account/orders/${order.id}`" class="account-order-row">
                <span class="account-order-row-main">
                  <strong>Order {{ order.id }}</strong>
                  <small>
                    Placed {{ formatOrderDate(order.placedAt) }} · {{ order.itemsSummary }}
                  </small>
                </span>
                <span class="account-order-row-meta">
                  <OrderStatusBadge :status="order.status" />
                  <strong>{{ formatMoney(order.total) }}</strong>
                </span>
                <i class="pi pi-chevron-right account-link-chevron" aria-hidden="true"></i>
              </RouterLink>
            </li>
          </ul>
          <Button
            v-if="accountOrdersQuery.hasNextPage.value"
            size="small"
            class="kedak-outline-action"
            severity="secondary"
            outlined
            label="Load more orders"
            :loading="accountOrdersQuery.isFetchingNextPage.value"
            @click="accountOrdersQuery.fetchNextPage()"
          />

          <div
            v-if="accountOrdersQuery.isSuccess.value && !accountOrders.length"
            class="account-orders-empty"
          >
            <span class="icon-tile" aria-hidden="true"><i class="pi pi-box"></i></span>
            <p>
              <strong>No orders yet.</strong> Orders placed with
              {{ auth.user?.email || 'your email' }} will appear here.
            </p>
            <p class="muted-copy">
              Checked out as a guest with another email?
              <RouterLink to="/orders/find">Find an order</RouterLink> by reference.
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
          <div class="account-profile-head">
            <span class="account-avatar" aria-hidden="true">
              <i v-if="!accountInitials" class="pi pi-user"></i>
              <template v-else>{{ accountInitials }}</template>
            </span>
            <div class="account-profile-copy">
              <strong>{{ auth.user?.name || 'Kedak member' }}</strong>
              <span v-if="auth.user?.email" class="account-profile-email">{{
                auth.user.email
              }}</span>
            </div>
          </div>
          <p class="account-profile-badges">
            <span v-if="auth.user?.emailVerified" class="settings-badge is-ok">
              <i class="pi pi-check-circle" aria-hidden="true"></i> Email verified
            </span>
            <span v-else-if="auth.user?.emailVerified === false" class="settings-badge is-warn">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i> Email not verified
            </span>
            <span class="settings-badge">
              <i
                :class="auth.user?.provider === 'google' ? 'pi pi-google' : 'pi pi-envelope'"
                aria-hidden="true"
              ></i>
              {{ auth.user?.provider === 'google' ? 'Google sign-in' : 'Email & password' }}
            </span>
          </p>

          <div class="account-profile-actions">
            <template v-if="auth.user?.provider !== 'google'">
              <button
                type="button"
                class="person-action"
                :aria-expanded="showPasswordForm"
                aria-controls="account-password-form"
                @click="showPasswordForm = !showPasswordForm"
              >
                <i class="pi pi-key" aria-hidden="true"></i>
                <span>
                  <strong>{{
                    showPasswordForm ? 'Cancel password change' : 'Change password'
                  }}</strong>
                  <small>Update the password you sign in with.</small>
                </span>
              </button>
              <form
                v-if="showPasswordForm"
                id="account-password-form"
                class="account-password-form"
                novalidate
                @submit.prevent="submitPasswordChange"
              >
                <FloatLabel class="auth-float-label" variant="in">
                  <Password
                    v-model="currentPassword"
                    input-id="account-current-password"
                    :feedback="false"
                    toggle-mask
                    :input-props="{ autocomplete: 'current-password' }"
                  />
                  <label for="account-current-password">Current password</label>
                </FloatLabel>
                <FloatLabel class="auth-float-label" variant="in">
                  <Password
                    v-model="newPassword"
                    input-id="account-new-password"
                    :feedback="false"
                    toggle-mask
                    :invalid="Boolean(newPassword) && !newPasswordValid"
                    :input-props="{ autocomplete: 'new-password' }"
                  />
                  <label for="account-new-password">New password</label>
                </FloatLabel>
                <small class="muted-copy">
                  At least 8 characters, including a letter and a number.
                </small>
                <p v-if="passwordMutation.error.value" class="upload-error" role="alert">
                  <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
                  <span>{{
                    errorMessage(passwordMutation.error.value, 'Your password couldn’t be changed.')
                  }}</span>
                </p>
                <Button
                  type="submit"
                  class="kedak-action"
                  label="Update password"
                  :loading="passwordMutation.isPending.value"
                  :disabled="!currentPassword || !newPasswordValid"
                />
              </form>
            </template>
            <p v-else class="settings-note">
              <i class="pi pi-google" aria-hidden="true"></i>
              Your password and security are managed in your Google account.
            </p>

            <template v-if="auth.user?.emailVerified !== true">
              <button
                type="button"
                class="person-action"
                :disabled="
                  verificationMutation.isPending.value || verificationMutation.isSuccess.value
                "
                @click="verificationMutation.mutate()"
              >
                <i
                  :class="
                    verificationMutation.isPending.value
                      ? 'pi pi-spin pi-spinner'
                      : verificationMutation.isSuccess.value
                        ? 'pi pi-check-circle'
                        : 'pi pi-envelope'
                  "
                  aria-hidden="true"
                ></i>
                <span>
                  <strong>{{
                    verificationMutation.isSuccess.value
                      ? 'Verification email sent'
                      : 'Resend verification email'
                  }}</strong>
                  <small>{{
                    verificationMutation.isSuccess.value
                      ? 'Check your inbox for the link.'
                      : 'Verify your email so all your orders appear here.'
                  }}</small>
                </span>
              </button>
              <small v-if="verificationMutation.error.value" class="auth-field-error" role="alert">
                {{ errorMessage(verificationMutation.error.value) }}
              </small>
            </template>
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
</template>
