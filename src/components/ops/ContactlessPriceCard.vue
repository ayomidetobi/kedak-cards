<script setup lang="ts">
import { computed, ref } from 'vue'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import ActionButton from '../ActionButton.vue'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import { useStaffAddOns, useUpdateStaffAddOns } from '../../queries/ops'
import { errorMessage } from '../../services/api/errors'
import { formatMoney } from '../../utils/money'
import { formatOrderDate } from '../../utils/orderPolicy'

/**
 * The contactless add-on on the Products page: its per-card price, which the shop adds to every
 * card ordered with contactless (on by default). Ops see it; administrators change it.
 */
const toast = useToast()
const query = useStaffAddOns()
const update = useUpdateStaffAddOns()
const data = computed(() => query.data.value)

const editing = ref(false)
const price = ref('')
const error = ref('')

function startEdit() {
  if (!data.value) return
  price.value = (data.value.contactless.priceAmount / 100).toFixed(2)
  error.value = ''
  editing.value = true
}

/** "50", "49.99" or "$50" to minor units; 0 is allowed (contactless free of charge). */
function toMinor(value: string): number | null {
  const cleaned = value.replace(/[^\d.]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const amount = Math.round(Number(cleaned) * 100)
  return amount <= 1_000_000 ? amount : null
}

async function save() {
  const amount = toMinor(price.value)
  if (amount === null) {
    error.value = 'Enter a price such as 50 or 49.99.'
    return
  }
  error.value = ''
  try {
    await update.mutateAsync(amount)
    editing.value = false
    toast.add({ severity: 'success', summary: 'Contactless price saved', life: 2400 })
  } catch (err) {
    error.value = errorMessage(err, 'The price couldn’t be saved.')
  }
}
</script>

<template>
  <section class="info-card ops-panel products-addon" aria-labelledby="addon-contactless-title">
    <span class="icon-tile" aria-hidden="true"><i class="pi pi-wifi card-extra-wave"></i></span>
    <div class="products-addon-copy">
      <h2 id="addon-contactless-title">Contactless add-on</h2>
      <p class="settings-hint">
        One flat price per card, whatever the finish. Contactless is ticked by default in the shop.
      </p>
    </div>

    <p v-if="query.isError.value" class="upload-error products-addon-side" role="alert">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      <span>{{ errorMessage(query.error.value, 'The price couldn’t load.') }}</span>
    </p>

    <form
      v-else-if="editing && data"
      class="products-addon-form products-addon-side"
      novalidate
      @submit.prevent="save"
    >
      <FloatLabel class="checkout-float-label" variant="in">
        <InputText id="addon-contactless-price" v-model="price" inputmode="decimal" />
        <label for="addon-contactless-price">Price per card ({{ data.currency }})</label>
      </FloatLabel>
      <ActionButton kind="cancel" type="button" compact @click="editing = false" />
      <ActionButton kind="save" compact :loading="update.isPending.value" />
      <p v-if="error" class="upload-error" role="alert">
        <i class="pi pi-exclamation-circle" aria-hidden="true"></i><span>{{ error }}</span>
      </p>
    </form>

    <div v-else class="products-addon-side">
      <div class="products-addon-price">
        <strong class="products-price">
          <SkeletonText v-if="!data" width="4rem" />
          <template v-else>{{ formatMoney(data.contactless.price) }}</template>
        </strong>
        <small>
          per card ·
          <SkeletonText v-if="!data" width="5rem" />
          <template v-else>
            updated {{ data.updatedAt ? formatOrderDate(data.updatedAt) : 'never' }}
          </template>
        </small>
      </div>
      <ActionButton
        v-if="data?.canEdit"
        kind="edit"
        compact
        label="Change price"
        @click="startEdit"
      />
      <p v-else-if="data" class="settings-note products-addon-lock">
        <i class="pi pi-lock" aria-hidden="true"></i> Only administrators change this price.
      </p>
    </div>
  </section>
</template>
