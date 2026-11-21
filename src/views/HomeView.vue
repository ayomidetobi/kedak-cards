<script setup lang="ts">
import Button from 'primevue/button'
import { useRouter } from 'vue-router'
import CardPreview from '../components/card/CardPreview.vue'
import CollectionProductCard from '../components/CollectionProductCard.vue'
import TextLink from '../components/TextLink.vue'
import { collectionProducts } from '../data/collectionProducts'
import { finishes } from '../stores/cardCustomization'
import type { CardDesign, CardFinish } from '../types/card'

const router = useRouter()
const featured = collectionProducts.slice(0, 2)

const heroFinish: CardFinish = 'Black'
const heroBackFinish: CardFinish = 'Silver'
const heroPrice = finishes.find((item) => item.name === heroFinish)!.price
const lowestPrice = Math.min(...finishes.map((item) => item.price))
const previewDesign: CardDesign = {
  id: 'preview',
  name: 'Preview',
  category: 'Anime',
  number: '01',
}

const valuePoints = ['Laser engraving', 'Chip transfer', 'Tracked updates']
const steps = [
  {
    icon: 'pi pi-pencil',
    title: 'Make it yours',
    description: 'Choose your finish and personalise the engraving.',
  },
  {
    icon: 'pi pi-send',
    title: 'Check & send',
    description: 'Check eligibility, then follow your secure send-in instructions.',
  },
  {
    icon: 'pi pi-check-circle',
    title: 'Recrafted & returned',
    description: 'We assess your card, convert it and return it with tracking.',
  },
]
</script>

<template>
  <main class="journey-main home-main" data-node-id="6:54">
    <section class="home-hero">
      <div class="hero-copy">
        <p class="eyebrow">YOUR EVERYDAY. RECRAFTED.</p>
        <h1 class="hero-title">
          Same card.<br />Different <span class="hero-title-accent">calibre.</span>
        </h1>
        <p class="hero-intro">
          Turn your existing plastic bank card into a personalised metal payment card.
        </p>
        <div class="hero-actions">
          <Button
            class="kedak-action kedak-cta"
            label="Create your metal card"
            icon="pi pi-arrow-right"
            icon-pos="right"
            @click="router.push('/collections')"
          />
          <TextLink to="/help">See how it works</TextLink>
        </div>
        <small class="hero-note">Not a new bank account. A new way to carry yours.</small>
        <ul class="value-points">
          <li v-for="point in valuePoints" :key="point">
            <i class="pi pi-check checkmark" aria-hidden="true"></i>{{ point }}
          </li>
        </ul>
      </div>
      <div class="hero-product">
        <div class="hero-card-stack">
          <div class="hero-card-back" aria-hidden="true">
            <CardPreview
              :design="previewDesign"
              :finish="heroBackFinish"
              engraving-style="monogram"
              holder-name=""
              :uploaded-artwork="null"
              :show-design-mark="false"
            />
          </div>
          <div class="hero-card-front">
            <CardPreview
              :design="previewDesign"
              :finish="heroFinish"
              engraving-style="name"
              holder-name="ALEX MORGAN"
              :uploaded-artwork="null"
              :show-design-mark="false"
            />
          </div>
        </div>
        <div class="hero-product-caption">
          <strong>{{ heroFinish }}</strong>
          <span class="price-text">£{{ heroPrice }}</span>
        </div>
        <div class="product-footnote">
          <span>01 / The {{ heroFinish }} Collection</span>
          <span>From £{{ lowestPrice }}</span>
        </div>
      </div>
    </section>

    <section class="home-section">
      <p class="eyebrow">FOUR FINISHES. ONE ORIGINAL.</p>
      <h2 class="section-title">Made to feel<br />like you.</h2>
      <div class="featured-finishes">
        <CollectionProductCard v-for="product in featured" :key="product.finish" v-bind="product" />
      </div>
      <div class="section-link">
        <TextLink to="/collections">View all four collections</TextLink>
      </div>
    </section>

    <section class="home-section process-section">
      <p class="eyebrow">A DIFFERENT MATERIAL. THE SAME YOU.</p>
      <h2 class="section-title">From plastic<br />to personal.</h2>
      <div class="process-list">
        <article v-for="step in steps" :key="step.title" class="info-card process-step">
          <span class="icon-tile" aria-hidden="true"><i :class="step.icon"></i></span>
          <div>
            <strong>{{ step.title }}</strong>
            <p>{{ step.description }}</p>
          </div>
        </article>
      </div>
      <div class="section-link">
        <TextLink to="/help">See how it works</TextLink>
      </div>
    </section>

    <section class="notice-card home-notice">
      <h2>A considered upgrade.</h2>
      <p>
        Not every card is suitable. Contactless, ATM use and issuer terms can be affected. Check
        compatibility before sending your card.
      </p>
      <Button
        class="kedak-action kedak-cta"
        label="Check my card"
        icon="pi pi-arrow-right"
        icon-pos="right"
        @click="router.push('/compatibility')"
      />
    </section>
  </main>
</template>
