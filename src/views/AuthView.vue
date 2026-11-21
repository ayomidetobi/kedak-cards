<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { Form, FormField, type FormSubmitEvent } from '@primevue/forms'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import { useToast } from 'primevue/usetoast'
import CardPreview from '../components/card/CardPreview.vue'
import { useAuthStore } from '../stores/auth'
import { designs } from '../stores/cardCustomization'
import { loginSchema, passwordRules, signupSchema } from '../types/forms'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuthStore()

const isSignup = computed(() => route.name === 'signup')
const pending = ref<'email' | 'google' | null>(null)
const formError = ref('')

const loginResolver = zodResolver(loginSchema)
const signupResolver = zodResolver(signupSchema)
const loginInitial = { email: '', password: '' }
const signupInitial = { fullName: '', email: '', password: '', acceptTerms: false }
const previewDesign = designs.Anime[0]!

// Only follow same-site paths, so ?redirect= can't send people to another website.
const redirectTarget = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/account'
})

const switchLink = computed(() => ({
  name: isSignup.value ? 'login' : 'signup',
  query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

const benefits = [
  {
    icon: 'pi pi-map',
    title: 'Track every step',
    text: 'Follow your card from send-in to tracked return.',
  },
  {
    icon: 'pi pi-box',
    title: 'Your send-in guide',
    text: 'Packing and tracking instructions, saved in one place.',
  },
  {
    icon: 'pi pi-comments',
    title: 'Help when you need it',
    text: 'Questions answered with just your order reference.',
  },
]

async function run(kind: 'email' | 'google', action: () => Promise<void>, welcome: string) {
  pending.value = kind
  formError.value = ''
  try {
    await action()
    toast.add({ severity: 'success', summary: welcome, life: 2600 })
    await router.replace(redirectTarget.value)
  } catch (error) {
    formError.value =
      error instanceof Error && error.message
        ? error.message
        : 'Something went wrong. Please try again.'
  } finally {
    pending.value = null
  }
}

function continueWithGoogle() {
  void run('google', () => auth.signInWithGoogle(), 'Signed in with Google')
}

function submitLogin(event: FormSubmitEvent) {
  if (!event.valid) return
  const values = loginSchema.parse(event.values)
  void run('email', () => auth.signIn(values), 'Welcome back')
}

function submitSignup(event: FormSubmitEvent) {
  if (!event.valid) return
  const values = signupSchema.parse(event.values)
  void run('email', () => auth.signUp(values), 'Your account is ready')
}

function passwordValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}
</script>

<template>
  <main class="journey-main auth-main">
    <div class="auth-layout">
      <section class="info-card auth-card" aria-labelledby="auth-title">
        <p class="eyebrow">{{ isSignup ? 'CREATE ACCOUNT' : 'WELCOME BACK' }}</p>
        <h1 id="auth-title" class="auth-title">
          {{ isSignup ? 'Create your account.' : 'Log in to Kedak.' }}
        </h1>
        <p class="auth-intro">
          {{
            isSignup
              ? 'Keep track of your conversion and your send-in guide in one place.'
              : 'See your order progress, send-in guide and return tracking.'
          }}
        </p>

        <button
          type="button"
          class="auth-google-button"
          :disabled="pending !== null"
          :aria-busy="pending === 'google'"
          @click="continueWithGoogle"
        >
          <i v-if="pending === 'google'" class="pi pi-spin pi-spinner" aria-hidden="true"></i>
          <svg v-else width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div class="auth-divider"><span>or use your email</span></div>

        <p v-if="formError" class="upload-error" role="alert">
          <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
          <span>{{ formError }}</span>
        </p>

        <Form
          v-if="isSignup"
          key="signup"
          class="auth-form"
          :initial-values="signupInitial"
          :resolver="signupResolver"
          @submit="submitSignup"
        >
          <FormField v-slot="$field" name="fullName">
            <FloatLabel class="auth-float-label" variant="in">
              <InputText
                id="signup-name"
                v-bind="$field.props"
                autocomplete="name"
                :invalid="$field.invalid"
              />
              <label for="signup-name">Full name</label>
            </FloatLabel>
            <small v-if="$field.invalid" class="auth-field-error" role="alert">
              {{ $field.error?.message }}
            </small>
          </FormField>
          <FormField v-slot="$field" name="email">
            <FloatLabel class="auth-float-label" variant="in">
              <InputText
                id="signup-email"
                v-bind="$field.props"
                type="email"
                autocomplete="email"
                :invalid="$field.invalid"
              />
              <label for="signup-email">Email address</label>
            </FloatLabel>
            <small v-if="$field.invalid" class="auth-field-error" role="alert">
              {{ $field.error?.message }}
            </small>
          </FormField>
          <FormField v-slot="$field" name="password">
            <FloatLabel class="auth-float-label" variant="in">
              <Password
                v-bind="$field.props"
                input-id="signup-password"
                :feedback="false"
                toggle-mask
                :invalid="$field.invalid"
                :input-props="{
                  autocomplete: 'new-password',
                  'aria-describedby': 'signup-password-rules',
                }"
              />
              <label for="signup-password">Create a password</label>
            </FloatLabel>
            <ul id="signup-password-rules" class="auth-password-rules">
              <li
                v-for="rule in passwordRules"
                :key="rule.id"
                :class="{ 'is-met': rule.test(passwordValue($field.value)) }"
              >
                <i
                  :class="
                    rule.test(passwordValue($field.value)) ? 'pi pi-check-circle' : 'pi pi-circle'
                  "
                  aria-hidden="true"
                ></i>
                {{ rule.label }}
              </li>
            </ul>
          </FormField>
          <FormField v-slot="$field" name="acceptTerms">
            <label class="checkbox-row auth-terms" for="signup-terms">
              <Checkbox v-bind="$field.props" input-id="signup-terms" :binary="true" />
              <span>I agree to Kedak’s terms of service and privacy policy.</span>
            </label>
            <small v-if="$field.invalid" class="auth-field-error" role="alert">
              {{ $field.error?.message }}
            </small>
            <small class="auth-policy-link">
              Read our <RouterLink to="/policies/privacy">privacy policy</RouterLink>.
            </small>
          </FormField>
          <Button
            type="submit"
            class="kedak-action auth-submit"
            label="Create account"
            :loading="pending === 'email'"
            :disabled="pending !== null"
          />
        </Form>

        <Form
          v-else
          key="login"
          class="auth-form"
          :initial-values="loginInitial"
          :resolver="loginResolver"
          @submit="submitLogin"
        >
          <FormField v-slot="$field" name="email">
            <FloatLabel class="auth-float-label" variant="in">
              <InputText
                id="login-email"
                v-bind="$field.props"
                type="email"
                autocomplete="email"
                :invalid="$field.invalid"
              />
              <label for="login-email">Email address</label>
            </FloatLabel>
            <small v-if="$field.invalid" class="auth-field-error" role="alert">
              {{ $field.error?.message }}
            </small>
          </FormField>
          <FormField v-slot="$field" name="password">
            <FloatLabel class="auth-float-label" variant="in">
              <Password
                v-bind="$field.props"
                input-id="login-password"
                :feedback="false"
                toggle-mask
                :invalid="$field.invalid"
                :input-props="{ autocomplete: 'current-password' }"
              />
              <label for="login-password">Password</label>
            </FloatLabel>
            <small v-if="$field.invalid" class="auth-field-error" role="alert">
              {{ $field.error?.message }}
            </small>
          </FormField>
          <Button
            type="submit"
            class="kedak-action auth-submit"
            label="Log in"
            :loading="pending === 'email'"
            :disabled="pending !== null"
          />
        </Form>

        <p class="auth-switch">
          {{ isSignup ? 'Already have an account?' : 'New to Kedak?' }}
          <RouterLink :to="switchLink">{{ isSignup ? 'Log in' : 'Create an account' }}</RouterLink>
        </p>

        <p class="auth-guest-note">
          <i class="pi pi-shopping-bag" aria-hidden="true"></i>
          <span>
            An account is optional. You can always
            <RouterLink to="/cart">check out as a guest</RouterLink>. Already ordered as a guest?
            <RouterLink to="/orders/find">Find your order</RouterLink>.
          </span>
        </p>

        <p class="muted-copy auth-preview-note">
          Preview: sign-in isn’t connected to a server yet. Your session stays on this device only
          and no password is stored.
        </p>
      </section>

      <aside class="auth-aside" aria-labelledby="auth-aside-title">
        <div class="auth-aside-card" aria-hidden="true">
          <CardPreview
            :design="previewDesign"
            finish="Black"
            engraving-style="name"
            holder-name="ALEX MORGAN"
            :uploaded-artwork="null"
            :show-design-mark="false"
          />
        </div>
        <h2 id="auth-aside-title" class="auth-aside-title">Everything in one place.</h2>
        <ul class="auth-benefits">
          <li v-for="benefit in benefits" :key="benefit.title">
            <span class="icon-tile icon-tile--small" aria-hidden="true">
              <i :class="benefit.icon"></i>
            </span>
            <span>
              <strong>{{ benefit.title }}</strong>
              <small>{{ benefit.text }}</small>
            </span>
          </li>
        </ul>
        <p class="auth-security">
          <i class="pi pi-lock" aria-hidden="true"></i>
          <span>
            Your Kedak account is separate from your bank. We never ask for your PIN, CVV or full
            card number.
          </span>
        </p>
      </aside>
    </div>
  </main>
</template>
