<script setup lang="ts">
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function update(event: Event) {
  const value = (event.target as HTMLInputElement).value.slice(0, 22)
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="field-block cardholder-name-block">
    <FloatLabel class="cardholder-name-field" variant="in">
      <InputText
        id="cardholder-name"
        :value="modelValue"
        maxlength="22"
        autocomplete="cc-name"
        placeholder="YOUR NAME"
        aria-describedby="cardholder-help"
        @input="update"
      />
      <label for="cardholder-name">Cardholder name</label>
    </FloatLabel>
    <div class="cardholder-name-meta">
      <small id="cardholder-help">Preview updates as you type.</small>
      <span>{{ modelValue.length }}/22</span>
    </div>
  </div>
</template>
