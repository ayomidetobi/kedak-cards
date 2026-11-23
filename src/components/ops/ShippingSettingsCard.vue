<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import ActionButton from '../ActionButton.vue'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import { useShippingSettings, useUpdateShippingSettings } from '../../queries/shipping'
import { ApiError, errorMessage } from '../../services/api/errors'
import type { ShippingSettingsInput } from '../../services/api/endpoints/shipping'
import { formatMoney } from '../../utils/money'
import { phoneCountryOptions } from '../../utils/phoneCountries'

/**
 * Shipping on the Products page: which provider prices delivery and buys labels, where cards
 * ship from, and the parcel. Ops see it; administrators change it. API keys stay on the server.
 */
const toast = useToast()
const query = useShippingSettings()
const update = useUpdateShippingSettings()
const data = computed(() => query.data.value)

const active = computed(() =>
  data.value?.providers.find((item) => item.id === data.value?.provider),
)
const countryName = (code: string) =>
  phoneCountryOptions.find((option) => option.code === code)?.name ?? code
const origin = computed(() => {
  const d = data.value
  if (!d) return ''
  return [
    d.fromCompany || d.fromName,
    d.fromStreet1,
    d.fromStreet2,
    `${d.fromPostcode} ${d.fromCity}`.trim(),
    d.fromCountry && countryName(d.fromCountry),
  ]
    .filter(Boolean)
    .join(', ')
})
const status = computed(() => {
  const d = data.value
  if (!d) return null
  if (d.liveRates) return { tone: 'is-ok', label: 'Live rates', note: '' }
  if (!active.value?.configured) {
    return {
      tone: 'is-warn',
      label: 'Flat fee',
      note:
        active.value?.note ||
        `${active.value?.name ?? 'This provider'} has no API key on the server, so checkout charges the flat delivery fee.`,
    }
  }
  return {
    tone: 'is-warn',
    label: 'Flat fee',
    note: 'Add the full ship-from address to turn on live rates. Until then checkout charges the flat delivery fee.',
  }
})

const providerOptions = computed(() =>
  (data.value?.providers ?? []).map((item) => ({
    value: item.id,
    label: `${item.name}${item.configured ? (item.testMode ? ' (test mode)' : '') : item.note ? ' (not available yet)' : ' (API key missing)'}`,
  })),
)
const countryOptions = phoneCountryOptions.map((option) => ({
  value: option.code,
  label: option.name,
}))

const editing = ref(false)
const error = ref('')
const form = reactive<ShippingSettingsInput>({
  provider: '',
  fromName: '',
  fromCompany: '',
  fromStreet1: '',
  fromStreet2: '',
  fromCity: '',
  fromState: '',
  fromPostcode: '',
  fromCountry: '',
  fromPhone: '',
  fromEmail: '',
  parcelLengthCm: '',
  parcelWidthCm: '',
  parcelHeightCm: '',
  parcelWeightG: 0,
  customsDescription: '',
  customsTariffNumber: '',
})
/** Flat fee typed in major units ("8" or "12.50"); sent in minor units. */
const flatFee = ref('')
function toMinor(value: string): number | null {
  const cleaned = value.replace(/[^\d.]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const amount = Math.round(Number(cleaned) * 100)
  return amount <= 100_000 ? amount : null
}

const weight = computed({
  get: () => String(form.parcelWeightG || ''),
  set: (value: string) => (form.parcelWeightG = Number(value.replace(/\D/g, '')) || 0),
})

function startEdit() {
  if (!data.value) return
  for (const key of Object.keys(form) as (keyof ShippingSettingsInput)[]) {
    ;(form as Record<string, unknown>)[key] = data.value[key]
  }
  flatFee.value = ((data.value.flatFeeAmount ?? 800) / 100).toFixed(2)
  error.value = ''
  editing.value = true
}

async function save() {
  error.value = ''
  const flatFeeAmount = toMinor(flatFee.value)
  if (flatFeeAmount === null) {
    error.value = 'Enter a flat delivery fee such as 8 or 12.50 (up to 1,000).'
    return
  }
  try {
    await update.mutateAsync({ ...form, flatFeeAmount })
    editing.value = false
    toast.add({ severity: 'success', summary: 'Shipping settings saved', life: 2400 })
  } catch (err) {
    error.value =
      err instanceof ApiError && err.status === 422
        ? 'Check the highlighted values: country is a 2-letter code, sizes and weight are numbers.'
        : errorMessage(err, 'The settings couldn’t be saved.')
  }
}

const fields: { key: keyof ShippingSettingsInput; label: string; wide?: boolean; mode?: string }[] =
  [
    { key: 'fromName', label: 'Contact name' },
    { key: 'fromCompany', label: 'Company' },
    { key: 'fromStreet1', label: 'Street address', wide: true },
    { key: 'fromStreet2', label: 'Address line 2 (optional)', wide: true },
    { key: 'fromCity', label: 'City' },
    { key: 'fromPostcode', label: 'Postcode' },
    { key: 'fromState', label: 'Region / state (optional)' },
    { key: 'fromPhone', label: 'Phone', mode: 'tel' },
    { key: 'fromEmail', label: 'Email', mode: 'email' },
  ]
const parcelFields: { key: keyof ShippingSettingsInput; label: string }[] = [
  { key: 'parcelLengthCm', label: 'Length (cm)' },
  { key: 'parcelWidthCm', label: 'Width (cm)' },
  { key: 'parcelHeightCm', label: 'Height (cm)' },
]
</script>

<template>
  <section class="info-card ops-panel products-shipping" aria-labelledby="shipping-settings-title">
    <div class="products-shipping-head">
      <span class="icon-tile" aria-hidden="true"><i class="pi pi-truck"></i></span>
      <div class="products-addon-copy">
        <h2 id="shipping-settings-title">Shipping</h2>
        <p class="settings-hint">
          Prices return delivery at checkout (the cheapest carrier rate) and buys labels in Ops.
        </p>
      </div>
      <span v-if="status" class="settings-badge" :class="status.tone">{{ status.label }}</span>
      <ActionButton
        v-if="data?.canEdit && !editing"
        kind="edit"
        compact
        label="Edit"
        @click="startEdit"
      />
    </div>

    <p v-if="query.isError.value" class="upload-error" role="alert">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      <span>{{ errorMessage(query.error.value, 'Shipping settings couldn’t load.') }}</span>
    </p>

    <form
      v-else-if="editing && data"
      class="products-shipping-form"
      novalidate
      @submit.prevent="save"
    >
      <div class="people-field people-span">
        <label class="people-label" for="shipping-provider">Shipping provider</label>
        <Select
          v-model="form.provider"
          input-id="shipping-provider"
          :options="providerOptions"
          option-label="label"
          option-value="value"
          class="kedak-select"
        />
      </div>
      <div class="people-field people-span">
        <FloatLabel class="checkout-float-label" variant="in">
          <InputText id="shipping-flat-fee" v-model="flatFee" inputmode="decimal" />
          <label for="shipping-flat-fee"
            >Flat delivery fee ({{ data.flatFee?.currency ?? 'USD' }})</label
          >
        </FloatLabel>
        <small class="settings-hint">
          Charged when there's no live rate (for example the US or Nigeria) or the provider is
          unavailable.
        </small>
      </div>
      <p class="products-shipping-group people-span">Ships from</p>
      <div
        v-for="field in fields"
        :key="field.key"
        class="people-field"
        :class="{ 'people-span': field.wide }"
      >
        <FloatLabel class="checkout-float-label" variant="in">
          <InputText
            :id="`shipping-${field.key}`"
            v-model="form[field.key] as string"
            :type="field.mode === 'email' ? 'email' : 'text'"
            :inputmode="field.mode === 'tel' ? 'tel' : undefined"
          />
          <label :for="`shipping-${field.key}`">{{ field.label }}</label>
        </FloatLabel>
      </div>
      <div class="people-field">
        <label class="people-label" for="shipping-country">Country</label>
        <Select
          v-model="form.fromCountry"
          input-id="shipping-country"
          :options="countryOptions"
          option-label="label"
          option-value="value"
          filter
          filter-placeholder="Search countries"
          class="kedak-select"
        />
      </div>
      <p class="products-shipping-group people-span">Parcel and customs</p>
      <div v-for="field in parcelFields" :key="field.key" class="people-field">
        <FloatLabel class="checkout-float-label" variant="in">
          <InputText
            :id="`shipping-${field.key}`"
            v-model="form[field.key] as string"
            inputmode="decimal"
          />
          <label :for="`shipping-${field.key}`">{{ field.label }}</label>
        </FloatLabel>
      </div>
      <div class="people-field">
        <FloatLabel class="checkout-float-label" variant="in">
          <InputText id="shipping-weight" v-model="weight" inputmode="numeric" />
          <label for="shipping-weight">Weight (g)</label>
        </FloatLabel>
      </div>
      <div class="people-field">
        <FloatLabel class="checkout-float-label" variant="in">
          <InputText id="shipping-customs" v-model="form.customsDescription" />
          <label for="shipping-customs">Customs description</label>
        </FloatLabel>
      </div>
      <div class="people-field">
        <FloatLabel class="checkout-float-label" variant="in">
          <InputText id="shipping-hs" v-model="form.customsTariffNumber" />
          <label for="shipping-hs">HS tariff code</label>
        </FloatLabel>
      </div>
      <p v-if="error" class="upload-error people-span" role="alert">
        <i class="pi pi-exclamation-circle" aria-hidden="true"></i><span>{{ error }}</span>
      </p>
      <div class="people-add-actions people-span">
        <ActionButton kind="cancel" type="button" @click="editing = false" />
        <ActionButton kind="save" :loading="update.isPending.value" />
      </div>
    </form>

    <template v-else>
      <dl class="products-facts products-shipping-facts">
        <div>
          <dt>Provider</dt>
          <dd>
            <SkeletonText v-if="!data" width="5rem" />
            <template v-else>
              {{ active?.name ?? data.provider }}
              <small v-if="active?.testMode"> · test mode</small>
            </template>
          </dd>
        </div>
        <div>
          <dt>Ships from</dt>
          <dd>
            <SkeletonText v-if="!data" width="12rem" />
            <template v-else>{{ origin || 'Not set' }}</template>
          </dd>
        </div>
        <div>
          <dt>Flat fee</dt>
          <dd>
            <SkeletonText v-if="!data" width="3rem" />
            <template v-else>{{ data.flatFee ? formatMoney(data.flatFee) : '—' }}</template>
          </dd>
        </div>
        <div>
          <dt>Parcel</dt>
          <dd>
            <SkeletonText v-if="!data" width="7rem" />
            <template v-else>
              {{ data.parcelLengthCm }} × {{ data.parcelWidthCm }} × {{ data.parcelHeightCm }} cm ·
              {{ data.parcelWeightG }} g
            </template>
          </dd>
        </div>
      </dl>
      <p v-if="status?.note" class="settings-note">
        <i class="pi pi-info-circle" aria-hidden="true"></i><span>{{ status.note }}</span>
      </p>
      <p v-if="data && !data.canEdit" class="settings-note">
        <i class="pi pi-lock" aria-hidden="true"></i> Only administrators change shipping settings.
      </p>
    </template>
  </section>
</template>
