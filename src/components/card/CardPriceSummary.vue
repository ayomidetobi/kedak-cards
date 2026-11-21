<script setup lang="ts">
import Button from 'primevue/button'
defineProps<{ price: number }>()
const emit = defineEmits<{ continue: [] }>()
</script>

<template>
  <div class="price-summary">
    <div>
      <span class="price-label">Card conversion</span>
      <strong>£{{ price }}</strong>
    </div>
    <Button
      size="small"
      class="kedak-action"
      label="Continue"
      icon="pi pi-arrow-up-right"
      icon-pos="right"
      @click="emit('continue')"
    />
  </div>
</template>
