<script setup lang="ts">
import Breadcrumb from 'primevue/breadcrumb'
import Button from 'primevue/button'
import type { MenuItem } from 'primevue/menuitem'
import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import FinishCard from '../components/FinishCard.vue'
import StockBadge from '../components/StockBadge.vue'
import { finishes, isFinishInStock } from '../stores/cardCustomization'
import { useCardCustomizationStore } from '../stores/cardCustomization'
import type { CardFinish } from '../types/card'

const route = useRoute()
const router = useRouter()
const store = useCardCustomizationStore()
const finish = computed<CardFinish>(() => {
  const found = finishes.find(
    (item) => item.name.toLowerCase() === String(route.params.finish).toLowerCase(),
  )
  return found?.name ?? 'Black'
})
const price = computed(() => finishes.find((item) => item.name === finish.value)!.price)
const inStock = computed(() => isFinishInStock(finish.value))

type BreadcrumbItem = MenuItem & { route?: RouteLocationRaw }

// Parent link is the collections route; the current item is the finish resolved from the route param.
const breadcrumbItems = computed<BreadcrumbItem[]>(() => [
  { label: 'Collections', route: '/collections' },
  { label: finish.value },
])

function chooseFinish(value: CardFinish) {
  store.setFinish(value)
  void router.replace(`/collections/${value.toLowerCase()}`)
}

function personalise() {
  if (!inStock.value) return
  store.setFinish(finish.value)
  void router.push('/customise')
}
</script>

<template>
  <main class="journey-main product-main" data-node-id="6:62">
    <p class="eyebrow">COLLECTION / METAL CONVERSION</p>
    <section class="product-split">
      <div class="product-visual">
        <FinishCard :finish="finish" />
        <small>Personalised engraving included · Front shown</small>
      </div>
      <div class="product-information">
        <Breadcrumb class="product-breadcrumb" :model="breadcrumbItems" aria-label="Breadcrumb">
          <template #item="{ item, label }">
            <RouterLink v-if="item.route" :to="item.route" class="product-breadcrumb-link">
              {{ label }}
            </RouterLink>
            <span v-else class="product-breadcrumb-current" aria-current="page">{{ label }}</span>
          </template>
          <template #separator>
            <span aria-hidden="true">/</span>
          </template>
        </Breadcrumb>
        <h1 class="page-title">{{ finish }}</h1>
        <p class="product-subtitle">The metal conversion</p>
        <div class="product-price-row">
          <strong class="product-price">£{{ price }}</strong>
          <StockBadge :finish="finish" />
        </div>
        <p class="intro-copy">
          A beautifully weighted metal body, personalised to you. We convert your eligible existing
          plastic payment card—not open a new account.
        </p>
        <div class="finish-picker" aria-label="Choose finish">
          <button
            v-for="item in finishes"
            :key="item.name"
            type="button"
            :class="{ active: finish === item.name, 'is-out-of-stock': !item.inStock }"
            :aria-label="item.inStock ? undefined : `${item.name} (out of stock)`"
            @click="chooseFinish(item.name)"
          >
            {{ item.name }}
          </button>
        </div>
        <Button
          size="small"
          class="kedak-action"
          :label="inStock ? 'Personalise this card' : 'Out of stock'"
          :icon="inStock ? 'pi pi-arrow-up-right' : 'pi pi-ban'"
          icon-pos="right"
          :disabled="!inStock"
          @click="personalise"
        />
        <p v-if="!inStock" class="stock-note">
          <i class="pi pi-ban" aria-hidden="true"></i>
          <span
            >This finish is out of stock and can’t be ordered. Choose another finish above.</span
          >
        </p>
        <Button
          size="small"
          class="kedak-outline-action"
          severity="secondary"
          outlined
          label="Check compatibility first"
          @click="router.push('/compatibility')"
        />
        <article class="info-card included-card">
          <strong>Considered in every detail.</strong>
          <p><span class="checkmark">✓</span> &nbsp; Personalised laser engraving</p>
          <p><span class="checkmark">✓</span> &nbsp; Chip transfer, subject to assessment</p>
          <p><span class="checkmark">✓</span> &nbsp; Tracked production updates</p>
        </article>
      </div>
    </section>
    <article class="notice-card">
      <h2>Before you make it metal</h2>
      <p>
        Your original card must be sent to us. Issuer terms may restrict modifications. Tap-to-pay
        and ATM functionality are not guaranteed; retain a backup payment method.
      </p>
      <Button
        size="small"
        class="kedak-outline-action"
        severity="secondary"
        outlined
        label="Read compatibility guidance"
        @click="router.push('/help')"
      />
    </article>
  </main>
</template>
