<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'

/**
 * Uniform secondary actions. One look per kind, everywhere:
 *
 *   save    — save icon, subtle info-blue          (submits its form by default)
 *   edit    — pencil icon, subtle info-blue        (also "Customise")
 *   cancel  — × icon, subtle neutral background
 *   delete  — trash icon, subtle red background
 *
 * The page's main call to action stays the solid `kedak-action` button. Other attributes and
 * listeners (@click, class, aria-*) pass through to PrimeVue's Button.
 */
type Kind = 'save' | 'edit' | 'cancel' | 'delete'
const props = withDefaults(
  defineProps<{
    kind: Kind
    label?: string
    icon?: string
    loading?: boolean
    disabled?: boolean
    type?: 'submit' | 'button'
    /** Stretch to the container width (stacked layouts, side panels). */
    full?: boolean
    /** Shorter height for dense places (cart rows, quick view). */
    compact?: boolean
  }>(),
  {
    label: undefined,
    icon: undefined,
    loading: false,
    disabled: false,
    type: undefined,
    full: false,
    compact: false,
  },
)

const DEFAULTS: Record<
  Kind,
  { label: string; icon: string; tone: string; type: 'submit' | 'button' }
> = {
  save: { label: 'Save', icon: 'pi pi-save', tone: 'is-info', type: 'submit' },
  edit: { label: 'Edit', icon: 'pi pi-pencil', tone: 'is-info', type: 'button' },
  cancel: { label: 'Cancel', icon: 'pi pi-times', tone: 'is-neutral', type: 'button' },
  delete: { label: 'Delete', icon: 'pi pi-trash', tone: 'is-danger', type: 'button' },
}
const preset = computed(() => DEFAULTS[props.kind])
</script>

<template>
  <Button
    :type="props.type ?? preset.type"
    class="kedak-action-button"
    :class="[preset.tone, { 'is-full': props.full, 'is-compact': props.compact }]"
    :icon="props.icon ?? preset.icon"
    :label="props.label ?? preset.label"
    :loading="props.loading"
    :disabled="props.disabled"
  />
</template>
