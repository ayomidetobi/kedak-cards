<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TextLink from '../components/TextLink.vue'
import { legal } from '../data/legal'
import { policies } from '../data/policies'

// Serves /policies/refunds and /policies/privacy from the content in src/data/policies.ts.
const route = useRoute()
const policy = computed(() =>
  route.name === 'privacy-policy' ? policies.privacy : policies.refunds,
)
const otherPolicies = [
  { to: '/policies/refunds', label: 'Refund & cancellation', slug: 'refunds' },
  { to: '/policies/privacy', label: 'Privacy', slug: 'privacy' },
] as const
</script>

<template>
  <main class="journey-main policy-main">
    <TextLink to="/" direction="back">Back to home</TextLink>

    <header class="policy-header">
      <p class="eyebrow">{{ policy.eyebrow }}</p>
      <h1 class="page-title">{{ policy.title }}</h1>
      <p class="intro-copy">{{ policy.summary }}</p>
      <p class="policy-updated">Last updated {{ legal.lastUpdated }}</p>
    </header>

    <p v-if="legal.isDraft" class="checkout-account-note policy-draft" role="note">
      <i class="pi pi-info-circle" aria-hidden="true"></i>
      <span>
        Draft policy: company details in brackets still need to be filled in, and the wording should
        be reviewed before launch.
      </span>
    </p>

    <div class="policy-layout">
      <nav class="policy-nav" aria-label="Policies">
        <p class="eyebrow">POLICIES</p>
        <ul class="policy-switch">
          <li v-for="item in otherPolicies" :key="item.slug">
            <RouterLink
              :to="item.to"
              :class="{ 'is-active': policy.slug === item.slug }"
              :aria-current="policy.slug === item.slug ? 'page' : undefined"
            >
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
        <p class="eyebrow policy-toc-label">ON THIS PAGE</p>
        <ul class="policy-toc">
          <li v-for="section in policy.sections" :key="section.id">
            <a :href="`#${section.id}`">{{ section.heading }}</a>
          </li>
        </ul>
      </nav>

      <article class="info-card policy-content">
        <section
          v-for="section in policy.sections"
          :id="section.id"
          :key="section.id"
          class="policy-section"
        >
          <h2>{{ section.heading }}</h2>
          <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
          <ul v-if="section.bullets?.length">
            <li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li>
          </ul>
        </section>
      </article>
    </div>
  </main>
</template>
