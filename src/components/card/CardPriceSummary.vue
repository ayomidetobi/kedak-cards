<script setup lang="ts">
import Button from 'primevue/button'
import { formatMoney } from '../../utils/money'
defineProps<{ price: number }>()
const emit = defineEmits<{ continue: [] }>()
</script>

<template>
  <div class="price-summary">
    <div>
      <span class="price-label">Card conversion</span>
      <strong>{{ formatMoney(price * 100) }}</strong>
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
