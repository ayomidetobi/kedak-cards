<script setup lang="ts">
import { nextTick, ref } from 'vue'
import Checkbox from 'primevue/checkbox'
import FloatLabel from 'primevue/floatlabel'
import Textarea from 'primevue/textarea'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import { MAX_NOTES_LENGTH } from '../../types/card'
import type { Money } from '../../types/api'
import { formatMoney } from '../../utils/money'

/**
 * Optional extras in the customiser: contactless payment (on by default, priced per card by
 * the server) and a free-text note for the production team.
 */
defineProps<{
  /** Per-card contactless price; null while it loads. */
  price: Money | null
}>()
const contactless = defineModel<boolean>('contactless', { required: true })
const notes = defineModel<string>('notes', { required: true })

/** The note box stays tucked away until asked for (or when a saved note exists). */
const showNotes = ref(notes.value.length > 0)
async function openNotes() {
  showNotes.value = true
  await nextTick()
  document.getElementById('card-notes')?.focus()
}
function removeNotes() {
  notes.value = ''
  showNotes.value = false
}
</script>

<template>
  <section class="card-extras" aria-labelledby="card-extras-title">
    <h2 id="card-extras-title" class="control-heading">Extras</h2>
    <label
      for="card-contactless"
      class="customization-mode-option card-extra-option"
      :class="{ 'is-active': contactless }"
    >
      <span class="icon-tile" aria-hidden="true"><i class="pi pi-wifi card-extra-wave"></i></span>
      <span class="customization-mode-option-copy">
        <strong>
          Contactless payment
          <span class="card-extra-price">
            +<SkeletonText v-if="!price" width="3rem" /><template v-else>{{
              formatMoney(price)
            }}</template>
            per card
          </span>
        </strong>
        <small>Recommended. Untick if you only insert your card.</small>
      </span>
      <Checkbox v-model="contactless" input-id="card-contactless" :binary="true" />
    </label>
    <p class="settings-note card-extra-note">
      <i class="pi pi-info-circle" aria-hidden="true"></i>
      <span>Pay by tapping your card on the reader. Works if your bank card is contactless.</span>
    </p>

    <button
      v-if="!showNotes"
      type="button"
      class="card-extra-add-note"
      aria-controls="card-notes"
      :aria-expanded="false"
      @click="openNotes"
    >
      <i class="pi pi-plus" aria-hidden="true"></i> Add a note for our team
    </button>
    <div v-else class="card-extra-notes">
      <FloatLabel class="checkout-float-label" variant="in">
        <Textarea
          id="card-notes"
          v-model="notes"
          :maxlength="MAX_NOTES_LENGTH"
          rows="3"
          auto-resize
          aria-describedby="card-notes-help"
        />
        <label for="card-notes">Anything else we should know? (optional)</label>
      </FloatLabel>
      <div class="cardholder-name-meta">
        <small id="card-notes-help"
          >For example, where to place the name, or a colour preference.</small
        >
        <span>{{ notes.length }}/{{ MAX_NOTES_LENGTH }}</span>
      </div>
      <button type="button" class="card-extra-add-note is-remove" @click="removeNotes">
        <i class="pi pi-times" aria-hidden="true"></i> Remove note
      </button>
    </div>
  </section>
</template>
