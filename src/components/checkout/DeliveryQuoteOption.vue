<script setup lang="ts">
import { computed, watch } from 'vue'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import { useShippingQuote } from '../../queries/shipping'
import type { ShippingQuote } from '../../services/api/endpoints/shipping'
import type { Money } from '../../types/api'
import { formatMoney } from '../../utils/money'
import { phoneCountryOptions } from '../../utils/phoneCountries'

/**
 * The return-delivery line at checkout. Once the address is filled in it asks the API for the
 * fee (the cheapest live carrier rate, or the flat fee) and reports the quote to the page, which
 * uses it for the total and sends its token with the order.
 */
const props = defineProps<{
  address?: string
  city?: string
  postcode?: string
  country?: string
  /** Flat fee from the cart check, shown until the address is complete. */
  estimate: Money | null
}>()
const quote = defineModel<ShippingQuote | null>('quote', { required: true })

const countryCode = computed(
  () => phoneCountryOptions.find((option) => option.name === props.country)?.code ?? '',
)
const request = computed(() => {
  const address = props.address?.trim() ?? ''
  const city = props.city?.trim() ?? ''
  const postcode = props.postcode?.trim() ?? ''
  if (address.length < 3 || city.length < 2 || postcode.length < 3 || !countryCode.value) {
    return null
  }
  return { address, city, postcode, country: props.country!, countryCode: countryCode.value }
})
const query = useShippingQuote(request)
const current = computed(() => (request.value ? (query.data.value ?? null) : null))
watch(current, (value) => (quote.value = value), { immediate: true })

const checking = computed(
  () => request.value !== null && (query.isFetching.value || !query.data.value),
)
const title = computed(() =>
  current.value?.source === 'live' && current.value.carrier
    ? `${current.value.carrier}${current.value.service ? ` · ${current.value.service}` : ''}`
    : 'Tracked return delivery',
)
const hint = computed(() => {
  if (!request.value) return 'Enter your address to see the delivery price.'
  const days = current.value?.estimatedDays
  if (current.value?.source === 'live') {
    return days ? `About ${days} day${days === 1 ? '' : 's'} after dispatch. Tracked.` : 'Tracked.'
  }
  return 'Dispatch estimate follows card inspection.'
})
</script>

<template>
  <div class="checkout-delivery-option" :class="{ 'is-checking': checking }" aria-live="polite">
    <span class="icon-tile icon-tile--small" aria-hidden="true">
      <i class="pi pi-truck"></i>
    </span>
    <span class="checkout-delivery-copy">
      <strong>{{ title }}</strong>
      <small>{{ hint }}</small>
    </span>
    <strong class="price-text">
      <SkeletonText v-if="checking && !current" width="3rem" />
      <template v-else>{{ formatMoney(current?.delivery ?? props.estimate) }}</template>
    </strong>
  </div>
</template>
