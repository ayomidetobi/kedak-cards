<script setup lang="ts">
import { ref } from 'vue'
import ActionButton from '../ActionButton.vue'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import type { OpsDelivery } from '../../services/api/endpoints/ops'
import { phoneCountryOptions } from '../../utils/phoneCountries'

/**
 * "Deliver to" on a production job: recipient, address, phone and email, with one-click copy
 * of the address label for courier forms. With `loading` the same card shows placeholders.
 */
const props = defineProps<{ delivery?: OpsDelivery | null; loading?: boolean }>()

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
async function copyLabel() {
  if (!props.delivery) return
  try {
    await navigator.clipboard.writeText(props.delivery.label)
  } catch {
    // Clipboard blocked (permissions/insecure context): select-and-copy fallback.
    const area = document.createElement('textarea')
    area.value = props.delivery.label
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 2000)
}

function callingCode(countryCode: string) {
  const option = phoneCountryOptions.find((item) => item.code === countryCode.toUpperCase())
  return option ? `+${option.callingCode}` : ''
}

/** tel: link with the calling code and no spaces, e.g. tel:+442079460958. */
function telHref(delivery: OpsDelivery) {
  const local = delivery.phone.number.replace(/[^\d+]/g, '').replace(/^0+/, '')
  return `tel:${callingCode(delivery.phone.countryCode)}${local}`
}
</script>

<template>
  <section class="info-card ops-delivery" aria-labelledby="ops-delivery-title">
    <div class="ops-delivery-head">
      <h2 id="ops-delivery-title">Deliver to</h2>
      <ActionButton
        v-if="props.delivery && !props.loading"
        kind="edit"
        compact
        :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
        :label="copied ? 'Copied' : 'Copy address'"
        @click="copyLabel"
      />
    </div>
    <address
      v-if="props.loading || !props.delivery"
      class="account-address-lines"
      aria-hidden="true"
    >
      <strong><SkeletonText width="8rem" /></strong>
      <span><SkeletonText width="11rem" /></span>
      <span><SkeletonText width="7rem" /></span>
      <span><SkeletonText width="6rem" /></span>
      <span class="ops-delivery-contact"><SkeletonText width="9rem" /></span>
    </address>
    <template v-else>
      <address class="account-address-lines">
        <strong>{{ props.delivery.name }}</strong>
        <span>{{ props.delivery.address }}</span>
        <span>{{ props.delivery.city }} {{ props.delivery.postcode }}</span>
        <span>{{ props.delivery.country }}</span>
      </address>
      <p class="ops-delivery-contact">
        <a :href="telHref(props.delivery)">
          <i class="pi pi-phone" aria-hidden="true"></i>
          {{ callingCode(props.delivery.phone.countryCode) }} {{ props.delivery.phone.number }}
        </a>
        <a :href="`mailto:${props.delivery.email}`">
          <i class="pi pi-envelope" aria-hidden="true"></i> {{ props.delivery.email }}
        </a>
      </p>
    </template>
  </section>
</template>
