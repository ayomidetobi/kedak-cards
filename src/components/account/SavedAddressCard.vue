<script setup lang="ts">
import { computed, ref } from 'vue'
import { Form, FormField, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import ActionButton from '../ActionButton.vue'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import { useDeleteAddress, useSaveAddress, useSavedAddress } from '../../queries/address'
import { addressLines } from '../../services/api/endpoints/address'
import { errorMessage } from '../../services/api/errors'
import { savedAddressSchema } from '../../types/forms'
import { deliveryCountryOptions, phoneCountryOptions } from '../../utils/phoneCountries'

/**
 * The customer's saved delivery address on the account page: view, edit, remove. Checkout
 * pre-fills from it. Same fields and checks as checkout; orders keep their own copy.
 */
const toast = useToast()
const addressQuery = useSavedAddress()
const saved = computed(() => addressQuery.data.value ?? null)
const save = useSaveAddress()
const remove = useDeleteAddress()

const editing = ref(false)
const formError = ref('')
const resolver = zodResolver(savedAddressSchema)
const initialValues = computed(() => ({
  fullName: saved.value?.fullName ?? '',
  phoneCountry: saved.value?.phone.countryCode ?? 'GB',
  phone: saved.value?.phone.number ?? '',
  address: saved.value?.address ?? '',
  city: saved.value?.city ?? '',
  postcode: saved.value?.postcode ?? '',
  country: saved.value?.country ?? '',
}))

async function submit(event: FormSubmitEvent) {
  formError.value = ''
  if (!event.valid) return
  const values = savedAddressSchema.parse(event.values)
  try {
    await save.mutateAsync({
      fullName: values.fullName,
      phone: { countryCode: values.phoneCountry, number: values.phone },
      address: values.address,
      city: values.city,
      postcode: values.postcode,
      country: values.country,
    })
    editing.value = false
    toast.add({ severity: 'success', summary: 'Delivery address saved', life: 2400 })
  } catch (error) {
    formError.value = errorMessage(error, 'Your address couldn’t be saved.')
  }
}

async function forget() {
  if (!window.confirm('Remove your saved delivery address? Past orders aren’t affected.')) return
  try {
    await remove.mutateAsync()
    toast.add({ severity: 'success', summary: 'Saved address removed', life: 2400 })
  } catch (error) {
    toast.add({ severity: 'error', summary: errorMessage(error), life: 3200 })
  }
}
</script>

<template>
  <section class="info-card account-address" aria-labelledby="account-address-title">
    <div class="account-address-head">
      <h2 id="account-address-title">Delivery address</h2>
      <ActionButton
        v-if="!editing && saved"
        kind="edit"
        compact
        aria-label="Edit delivery address"
        @click="editing = true"
      />
    </div>

    <!-- Loading: same lines as a saved address -->
    <address
      v-if="addressQuery.isPending.value && !editing"
      class="account-address-lines"
      aria-busy="true"
    >
      <strong><SkeletonText width="8rem" /></strong>
      <span><SkeletonText width="11rem" /></span>
      <span><SkeletonText width="7rem" /></span>
      <span><SkeletonText width="6rem" /></span>
    </address>

    <Form
      v-else-if="editing || !saved"
      :key="saved?.updatedAt ?? 'new'"
      class="account-address-form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="submit"
    >
      <p v-if="!saved && !editing" class="muted-copy account-address-empty">
        Save where your finished card should go, and checkout fills it in for you.
      </p>
      <template v-if="editing">
        <FormField v-slot="$field" name="fullName">
          <FloatLabel class="checkout-float-label" variant="in">
            <InputText
              id="address-name"
              v-bind="$field.props"
              autocomplete="name"
              :invalid="$field.invalid"
            />
            <label for="address-name">Full name</label>
          </FloatLabel>
          <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
            $field.error?.message
          }}</small>
        </FormField>
        <div class="account-address-phone">
          <FormField v-slot="$field" name="phoneCountry">
            <FloatLabel class="checkout-float-label" variant="in">
              <Select
                input-id="address-phone-country"
                v-bind="$field.props"
                :options="phoneCountryOptions"
                option-label="label"
                option-value="code"
                filter
                filter-placeholder="Search country or code"
                :invalid="$field.invalid"
              />
              <label for="address-phone-country">Calling code</label>
            </FloatLabel>
          </FormField>
          <FormField v-slot="$field" name="phone">
            <FloatLabel class="checkout-float-label" variant="in">
              <InputText
                id="address-phone"
                v-bind="$field.props"
                type="tel"
                inputmode="tel"
                autocomplete="tel-national"
                :invalid="$field.invalid"
              />
              <label for="address-phone">Phone number</label>
            </FloatLabel>
            <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
              $field.error?.message
            }}</small>
          </FormField>
        </div>
        <FormField v-slot="$field" name="address">
          <FloatLabel class="checkout-float-label" variant="in">
            <InputText
              id="address-line"
              v-bind="$field.props"
              autocomplete="street-address"
              :invalid="$field.invalid"
            />
            <label for="address-line">Address</label>
          </FloatLabel>
          <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
            $field.error?.message
          }}</small>
        </FormField>
        <div class="account-address-pair">
          <FormField v-slot="$field" name="city">
            <FloatLabel class="checkout-float-label" variant="in">
              <InputText
                id="address-city"
                v-bind="$field.props"
                autocomplete="address-level2"
                :invalid="$field.invalid"
              />
              <label for="address-city">City</label>
            </FloatLabel>
            <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
              $field.error?.message
            }}</small>
          </FormField>
          <FormField v-slot="$field" name="postcode">
            <FloatLabel class="checkout-float-label" variant="in">
              <InputText
                id="address-postcode"
                v-bind="$field.props"
                autocomplete="postal-code"
                :invalid="$field.invalid"
              />
              <label for="address-postcode">Postcode</label>
            </FloatLabel>
            <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
              $field.error?.message
            }}</small>
          </FormField>
        </div>
        <FormField v-slot="$field" name="country">
          <FloatLabel class="checkout-float-label" variant="in">
            <Select
              input-id="address-country"
              v-bind="$field.props"
              :options="deliveryCountryOptions"
              option-label="label"
              option-value="value"
              filter
              filter-placeholder="Search countries"
              :invalid="$field.invalid"
            />
            <label for="address-country">Country</label>
          </FloatLabel>
          <small v-if="$field.invalid" class="checkout-field-error" role="alert">{{
            $field.error?.message
          }}</small>
        </FormField>
        <p v-if="formError" class="upload-error" role="alert">
          <i class="pi pi-exclamation-circle" aria-hidden="true"></i><span>{{ formError }}</span>
        </p>
        <div class="account-address-actions">
          <ActionButton kind="cancel" compact @click="((editing = false), (formError = ''))" />
          <ActionButton
            kind="save"
            compact
            label="Save address"
            :loading="save.isPending.value"
          />
        </div>
      </template>
      <ActionButton
        v-else
        kind="edit"
        compact
        label="Add a delivery address"
        icon="pi pi-plus"
        @click="editing = true"
      />
    </Form>

    <template v-else-if="saved">
      <address class="account-address-lines">
        <strong>{{ saved.fullName }}</strong>
        <span v-for="line in addressLines(saved)" :key="line">{{ line }}</span>
        <span class="account-address-phone-line">
          <i class="pi pi-phone" aria-hidden="true"></i> {{ saved.phone.number }}
        </span>
      </address>
      <p class="settings-hint account-address-note">
        Checkout fills this in for you. Past orders keep their own address.
      </p>
      <ActionButton
        kind="delete"
        compact
        label="Remove"
        :loading="remove.isPending.value"
        @click="forget"
      />
    </template>
  </section>
</template>
