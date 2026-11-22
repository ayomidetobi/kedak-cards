<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import Button from 'primevue/button'
import TextLink from '../components/TextLink.vue'
import { verifyEmail } from '../services/api/endpoints/auth'
import { errorMessage } from '../services/api/errors'
import { useAuthStore } from '../stores/auth'

/** /verify-email?key=…: the link from the verification email (POST /auth/email/verify). */
const route = useRoute()
const auth = useAuthStore()
const key = computed(() => (typeof route.query.key === 'string' ? route.query.key : ''))

const verification = useMutation({ mutationFn: (value: string) => verifyEmail(value) })

onMounted(() => {
  if (key.value) verification.mutate(key.value)
})
</script>

<template>
  <main class="journey-main auth-main">
    <TextLink to="/" direction="back">Back to home</TextLink>
    <div class="auth-layout">
      <section class="info-card auth-card" aria-labelledby="verify-title" aria-live="polite">
        <p class="eyebrow">ACCOUNT</p>
        <template v-if="!key">
          <h1 id="verify-title" class="auth-title">Verification link incomplete.</h1>
          <p class="auth-intro">
            Open the link from your verification email again, or request a new one from your
            account.
          </p>
        </template>
        <template v-else-if="verification.isSuccess.value">
          <h1 id="verify-title" class="auth-title">Email verified.</h1>
          <p class="auth-intro">
            Thanks for confirming your email. Guest orders placed with this address now appear in
            your account.
          </p>
          <RouterLink :to="auth.isSignedIn ? '/account' : '/login?redirect=/account'">
            <Button class="kedak-action auth-submit" label="Go to my account" />
          </RouterLink>
        </template>
        <template v-else-if="verification.isError.value">
          <h1 id="verify-title" class="auth-title">We couldn’t verify that link.</h1>
          <p class="upload-error" role="alert">
            <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
            <span>{{
              errorMessage(
                verification.error.value,
                'The link may have expired or already been used.',
              )
            }}</span>
          </p>
          <p class="auth-intro">
            Request a new verification email from your account page.
          </p>
        </template>
        <template v-else>
          <h1 id="verify-title" class="auth-title">Verifying your email…</h1>
          <p class="api-state" aria-busy="true">
            <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> One moment.
          </p>
        </template>
      </section>
    </div>
  </main>
</template>
