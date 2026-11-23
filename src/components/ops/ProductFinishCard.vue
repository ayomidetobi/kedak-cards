<script setup lang="ts">
import ActionButton from '../ActionButton.vue'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import { finishSwatches } from '../../queries/catalog'
import type { StaffFinish } from '../../services/api/endpoints/products'
import { formatMoney } from '../../utils/money'
import { formatOrderDate } from '../../utils/orderPolicy'

/**
 * A finish on the Products page. View mode shows price, stock, description, figures and
 * actions; while `editing`, the page's edit form is shown through the default slot. With
 * `loading` it renders the same card with placeholders shaped like the real content (swatch,
 * text lines, stock pill, buttons); labels stay real.
 */
const props = defineProps<{
  finish?: StaffFinish
  loading?: boolean
  editing?: boolean
  busy?: boolean
}>()
defineEmits<{ edit: []; 'toggle-stock': []; remove: [] }>()
</script>

<template>
  <article
    v-if="props.loading || !props.finish"
    class="info-card products-finish is-skeleton"
    aria-hidden="true"
  >
    <Skeleton width="100%" height="auto" class="products-swatch products-swatch-skeleton" />
    <div class="products-finish-head">
      <div>
        <h2><SkeletonText width="5rem" /></h2>
        <p class="products-price"><SkeletonText width="3.5rem" /></p>
      </div>
      <span class="settings-badge is-skeleton"><SkeletonText width="4.5rem" /></span>
    </div>
    <p class="products-description"><SkeletonText width="13rem" /></p>
    <dl class="products-facts">
      <div>
        <dt>Orders</dt>
        <dd><SkeletonText width="1.5rem" /></dd>
      </div>
      <div>
        <dt>Display order</dt>
        <dd><SkeletonText width="1rem" /></dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd><SkeletonText width="5.5rem" /></dd>
      </div>
    </dl>
    <div class="products-actions">
      <Skeleton width="5.5rem" height="44px" border-radius="8px" />
      <Skeleton height="44px" border-radius="8px" class="products-action-skeleton" />
      <Skeleton width="100%" height="44px" border-radius="8px" />
    </div>
    <p class="settings-hint products-hint">
      <SkeletonText width="100%" /><br /><SkeletonText width="60%" />
    </p>
  </article>

  <article v-else class="info-card products-finish" :class="{ 'is-editing': props.editing }">
    <div
      class="products-swatch"
      :style="{
        background: finishSwatches[props.finish.name]?.color,
        color: finishSwatches[props.finish.name]?.foreground,
      }"
    >
      <span>{{ props.finish.name }}</span>
      <small>KEDAK METAL</small>
    </div>

    <slot v-if="props.editing" />
    <template v-else>
      <div class="products-finish-head">
        <div>
          <h2>{{ props.finish.name }}</h2>
          <p class="products-price">{{ formatMoney(props.finish.price) }}</p>
        </div>
        <span class="settings-badge" :class="props.finish.inStock ? 'is-ok' : 'is-warn'">
          <i
            :class="props.finish.inStock ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'"
            aria-hidden="true"
          ></i>
          {{ props.finish.inStock ? 'In stock' : 'Out of stock' }}
        </span>
      </div>
      <p class="products-description">
        {{ props.finish.description || 'No description yet.' }}
      </p>
      <dl class="products-facts">
        <div>
          <dt>Orders</dt>
          <dd>{{ props.finish.orderCount }}</dd>
        </div>
        <div>
          <dt>Display order</dt>
          <dd>{{ props.finish.displayOrder }}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{{ props.finish.updatedAt ? formatOrderDate(props.finish.updatedAt) : '—' }}</dd>
        </div>
      </dl>
      <div class="products-actions">
        <ActionButton kind="edit" @click="$emit('edit')" />
        <Button
          size="small"
          class="kedak-outline-action"
          severity="secondary"
          outlined
          :icon="props.finish.inStock ? 'pi pi-ban' : 'pi pi-check'"
          :label="props.finish.inStock ? 'Mark out of stock' : 'Mark in stock'"
          :disabled="props.busy"
          @click="$emit('toggle-stock')"
        />
        <Button
          size="small"
          class="kedak-outline-action person-danger-soft"
          severity="secondary"
          outlined
          icon="pi pi-trash"
          label="Delete"
          :disabled="!props.finish.canDelete"
          :title="
            props.finish.canDelete
              ? 'Remove this finish from the store'
              : 'Ordered before, so it can’t be deleted. Mark it out of stock instead.'
          "
          @click="$emit('remove')"
        />
      </div>
      <p v-if="!props.finish.canDelete" class="settings-hint products-hint">
        Already ordered, so it can’t be deleted. Mark it out of stock to stop sales.
      </p>
    </template>
  </article>
</template>
