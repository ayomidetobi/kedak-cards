<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import { useToast } from 'primevue/usetoast'
import TextLink from '../components/TextLink.vue'
import { confirmPasswordReset, requestPasswordReset } from '../services/api/endpoints/auth'
import { ApiError, errorMessage } from '../services/api/errors'
import { passwordRules } from '../types/forms'

/**
 * /forgot-password: POST /auth/password/reset sends an email (always the same answer, so it
 * can't be used to discover accounts).
 * /reset-password?uid=…&token=…: the link from that email; POST /auth/password/reset/confirm.
 */
const route = useRoute()
const router = useRouter()
const toast = useToast()

const uid = computed(() => (typeof route.query.uid === 'string' ? route.query.uid : ''))
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const isConfirm = computed(() => route.name === 'reset-password')
const hasResetLink = computed(() => Boolean(uid.value && token.value))

const email = ref('')
const password = ref('')
const formError = ref('')
const requestSent = ref(false)

const passwordValid = computed(() => passwordRules.every((rule) => rule.test(password.value)))

const requestMutation = useMutation({
  mutationFn: (value: string) => requestPasswordReset(value),
  onSuccess: () => {
    requestSent.value = true
  },
})

const confirmMutation = useMutation({
  mutationFn: () =>
    confirmPasswordReset({ uid: uid.value, token: token.value, newPassword: password.value }),
  onSuccess: async () => {
    toast.add({
      severity: 'success',
      summary: 'Password updated',
      detail: 'Log in with your new password.',
      life: 3500,
    })
    await router.replace('/login')
  },
})

function submitRequest() {
  formError.value = ''
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    formError.value = 'Enter a valid email address.'
    return
  }
  requestMutation.mutate(email.value.trim(), {
    onError: (error) => {
      formError.value = errorMessage(error, 'We couldn’t send the email. Please try again.')
    },
  })
}

function submitConfirm() {
  formError.value = ''
  if (!passwordValid.value) {
    formError.value = 'Use at least 8 characters, including a letter and a number.'
    return
  }
  confirmMutation.mutate(undefined, {
    onError: (error) => {
      // An invalid or used link shows up as a uid/token validation error.
      const invalidLink =
        error instanceof ApiError &&
        error.fieldErrors.some((item) => item.pointer === '/uid' || item.pointer === '/token')
      formError.value = invalidLink
        ? 'This reset link is invalid or has expired. Request a new one.'
        : errorMessage(error, 'Your password couldn’t be reset.')
    },
  })
}
</script>

<template>
  <main class="journey-main auth-main">
    <TextLink to="/login" direction="back">Back to log in</TextLink>
    <div class="auth-layout">
      <section class="info-card auth-card" aria-labelledby="reset-title">
        <p class="eyebrow">ACCOUNT</p>

        <template v-if="isConfirm">
          <h1 id="reset-title" class="auth-title">Choose a new password.</h1>
          <template v-if="hasResetLink">
            <p class="auth-intro">Pick something you haven’t used here before.</p>
            <p v-if="formError" class="upload-error" role="alert">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
              <span>{{ formError }}</span>
            </p>
            <form class="auth-form" novalidate @submit.prevent="submitConfirm">
              <FloatLabel class="auth-float-label" variant="in">
                <Password
                  v-model="password"
                  input-id="reset-password"
                  :feedback="false"
                  toggle-mask
                  :invalid="Boolean(password) && !passwordValid"
                  :input-props="{
                    autocomplete: 'new-password',
                    'aria-describedby': 'reset-password-rules',
                  }"
                />
                <label for="reset-password">New password</label>
              </FloatLabel>
              <ul id="reset-password-rules" class="auth-password-rules">
                <li
                  v-for="rule in passwordRules"
                  :key="rule.id"
                  :class="{ 'is-met': rule.test(password) }"
                >
                  <i
                    :class="rule.test(password) ? 'pi pi-check-circle' : 'pi pi-circle'"
                    aria-hidden="true"
                  ></i>
                  {{ rule.label }}
                </li>
              </ul>
              <Button
                type="submit"
                class="kedak-action auth-submit"
                label="Update password"
                :loading="confirmMutation.isPending.value"
                :disabled="confirmMutation.isPending.value"
              />
            </form>
          </template>
          <template v-else>
            <p class="auth-intro">This reset link is incomplete. Request a new one below.</p>
            <Button
              class="kedak-action auth-submit"
              label="Request a new link"
              @click="router.replace('/forgot-password')"
            />
          </template>
        </template>

        <template v-else>
          <h1 id="reset-title" class="auth-title">Reset your password.</h1>
          <template v-if="requestSent">
            <p class="auth-intro" role="status">
              If an account exists for <strong>{{ email }}</strong>, we’ve emailed a link to reset
              your password. It may take a few minutes to arrive.
            </p>
          </template>
          <template v-else>
            <p class="auth-intro">Enter your account email and we’ll send you a reset link.</p>
            <p v-if="formError" class="upload-error" role="alert">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
              <span>{{ formError }}</span>
            </p>
            <form class="auth-form" novalidate @submit.prevent="submitRequest">
              <FloatLabel class="auth-float-label" variant="in">
                <InputText id="reset-email" v-model="email" type="email" autocomplete="email" />
                <label for="reset-email">Email address</label>
              </FloatLabel>
              <Button
                type="submit"
                class="kedak-action auth-submit"
                label="Send reset link"
                :loading="requestMutation.isPending.value"
                :disabled="requestMutation.isPending.value"
              />
            </form>
          </template>
        </template>
      </section>
    </div>
  </main>
</template>
