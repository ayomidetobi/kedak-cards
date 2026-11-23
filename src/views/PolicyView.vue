<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TextLink from '../components/TextLink.vue'
import SkeletonRows from '../components/skeletons/parts/SkeletonRows.vue'
import SkeletonText from '../components/skeletons/parts/SkeletonText.vue'
import { legal } from '../data/legal'
import { usePolicyQuery } from '../queries/catalog'
import { errorMessage } from '../services/api/errors'
import type { Policy } from '../types/api'

// Serves /policies/refunds and /policies/privacy from GET /policies/{slug}. The API builds the
// refund policy from the same rules it enforces, so the published policy can't drift from them.
const route = useRoute()
const slug = computed<Policy['slug']>(() =>
  route.name === 'privacy-policy' ? 'privacy' : 'refunds',
)
const policyQuery = usePolicyQuery(slug)
const policy = computed(() => policyQuery.data.value ?? null)
const otherPolicies = [
  { to: '/policies/refunds', label: 'Refund & cancellation', slug: 'refunds' },
  { to: '/policies/privacy', label: 'Privacy', slug: 'privacy' },
] as const

function formatPolicyDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <main class="journey-main policy-main">
    <TextLink to="/" direction="back">Back to home</TextLink>

    <section
      v-if="!policyQuery.isPending.value && (policyQuery.isError.value || !policy)"
      class="info-card"
      role="alert"
    >
      <p class="api-state is-error">
        {{ errorMessage(policyQuery.error.value, 'This policy couldn’t load.') }}
        <button type="button" class="api-retry" @click="policyQuery.refetch()">Try again</button>
      </p>
    </section>

    <template v-else>
      <header class="policy-header">
        <p class="eyebrow">POLICIES / {{ slug.toUpperCase() }}</p>
        <h1 class="page-title">
          <SkeletonText v-if="!policy" width="18rem" /><template v-else>{{
            policy.title
          }}</template>
        </h1>
        <p class="intro-copy">
          <SkeletonText v-if="!policy" width="34rem" /><template v-else>{{
            policy.summary
          }}</template>
        </p>
        <p class="policy-updated">
          Last updated <SkeletonText v-if="!policy" width="6rem" /><template v-else>{{
            formatPolicyDate(policy.lastUpdated)
          }}</template>
        </p>
      </header>
      <span v-if="!policy" class="visually-hidden" role="status">Loading policy…</span>

      <p v-if="policy && legal.isDraft" class="checkout-account-note policy-draft" role="note">
        <i class="pi pi-info-circle" aria-hidden="true"></i>
        <span>
          Draft policy: company details in brackets still need to be filled in, and the wording
          should be reviewed before launch.
        </span>
      </p>

      <div class="policy-layout">
        <nav class="policy-nav" aria-label="Policies">
          <p class="eyebrow">POLICIES</p>
          <ul class="policy-switch">
            <li v-for="item in otherPolicies" :key="item.slug">
              <RouterLink
                :to="item.to"
                :class="{ 'is-active': slug === item.slug }"
                :aria-current="slug === item.slug ? 'page' : undefined"
              >
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
          <p class="eyebrow policy-toc-label">ON THIS PAGE</p>
          <ul class="policy-toc">
            <SkeletonRows v-if="!policy" :rows="5" label="Loading contents">
              <template #default="{ index }">
                <li aria-hidden="true">
                  <a><SkeletonText :width="index % 2 ? '9rem' : '7rem'" /></a>
                </li>
              </template>
            </SkeletonRows>
            <li v-for="section in policy?.sections ?? []" :key="section.id">
              <a :href="`#${section.id}`">{{ section.heading }}</a>
            </li>
          </ul>
        </nav>

        <article class="info-card policy-content">
          <template v-if="!policy">
            <section v-for="index in 3" :key="index" class="policy-section" aria-hidden="true">
              <h2><SkeletonText :width="index === 2 ? '10rem' : '13rem'" /></h2>
              <p>
                <SkeletonText width="100%" /><br /><SkeletonText width="100%" /><br /><SkeletonText
                  width="70%"
                />
              </p>
              <ul v-if="index === 2">
                <li><SkeletonText width="60%" /></li>
                <li><SkeletonText width="45%" /></li>
              </ul>
            </section>
          </template>
          <section
            v-for="section in policy?.sections ?? []"
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
    </template>
  </main>
</template>
