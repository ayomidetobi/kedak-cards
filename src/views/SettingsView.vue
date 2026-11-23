<script setup lang="ts">
import ActionButton from '../components/ActionButton.vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { useTheme, type ThemePreference } from '../composables/useTheme'
import { changePassword, resendVerificationEmail } from '../services/api/endpoints/auth'
import { ApiError, errorMessage } from '../services/api/errors'
import { useAuthStore } from '../stores/auth'
import type { UserRole } from '../types/api'

/**
 * Settings for every signed-in user (/settings). Everyone gets profile, sign-in and appearance;
 * staff also see their role and workbench preferences; administrators see what they can manage.
 * What is shown is presentation only: the API authorises every action.
 */
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const { preference, setTheme } = useTheme()

const user = computed(() => auth.user)
const roleInfo: Record<UserRole, { label: string; summary: string; icon: string }> = {
  customer: {
    label: 'Customer',
    summary: 'Manage your profile, sign-in and how the site looks.',
    icon: 'pi pi-user',
  },
  production: {
    label: 'Production team',
    summary: 'You can see orders and move them through production.',
    icon: 'pi pi-cog',
  },
  ops: {
    label: 'Operations team',
    summary: 'You can manage orders, decide refunds and read company information.',
    icon: 'pi pi-briefcase',
  },
  admin: {
    label: 'Administrator',
    summary: 'Full access, including company information, policies and store settings.',
    icon: 'pi pi-shield',
  },
}
const role = computed(() => roleInfo[auth.role])

// --- Profile -----------------------------------------------------------------------------------
const name = ref(user.value?.name ?? '')
watch(
  () => user.value?.name,
  (value) => {
    if (value !== undefined) name.value = value
  },
)
const nameError = ref('')
const savingName = ref(false)
const nameChanged = computed(() => name.value.trim() !== (user.value?.name ?? '').trim())
async function saveName() {
  nameError.value = ''
  if (name.value.trim().length < 2) {
    nameError.value = 'Enter at least 2 characters.'
    return
  }
  savingName.value = true
  try {
    await auth.updateName(name.value.trim())
    toast.add({ severity: 'success', summary: 'Name updated', life: 2400 })
  } catch (error) {
    nameError.value =
      error instanceof ApiError
        ? (error.fieldError('/name') ?? errorMessage(error))
        : errorMessage(error)
  } finally {
    savingName.value = false
  }
}

const resending = ref(false)
const resent = ref(false)
async function resendVerification() {
  if (!user.value || resending.value) return
  resending.value = true
  try {
    await resendVerificationEmail(user.value.email)
    resent.value = true
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: errorMessage(error, 'Couldn’t send the email.'),
      life: 3200,
    })
  } finally {
    resending.value = false
  }
}

// --- Password ----------------------------------------------------------------------------------
const currentPassword = ref('')
const newPassword = ref('')
const passwordError = ref('')
const savingPassword = ref(false)
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
async function savePassword() {
  passwordError.value = ''
  if (!currentPassword.value) {
    passwordError.value = 'Enter your current password.'
    return
  }
  if (!PASSWORD_RULE.test(newPassword.value)) {
    passwordError.value = 'Use at least 8 characters, including a letter and a number.'
    return
  }
  savingPassword.value = true
  try {
    await changePassword({ oldPassword: currentPassword.value, newPassword: newPassword.value })
    currentPassword.value = ''
    newPassword.value = ''
    toast.add({ severity: 'success', summary: 'Password changed', life: 2400 })
  } catch (error) {
    passwordError.value = errorMessage(error, 'Your password couldn’t be changed.')
  } finally {
    savingPassword.value = false
  }
}

// --- Appearance --------------------------------------------------------------------------------
const themes: Array<{ value: ThemePreference; label: string; icon: string }> = [
  { value: 'light', label: 'Light', icon: 'pi pi-sun' },
  { value: 'dark', label: 'Dark', icon: 'pi pi-moon' },
  { value: 'system', label: 'Match device', icon: 'pi pi-desktop' },
]

// --- Staff preferences (same key the workbench reads) -------------------------------------------
const PAGE_SIZE_KEY = 'kedak-ops-page-size'
const pageSizes = [10, 20, 50, 100].map((value) => ({ value, label: `${value} orders` }))
function readPageSize() {
  try {
    const value = Number(localStorage.getItem(PAGE_SIZE_KEY))
    return [10, 20, 50, 100].includes(value) ? value : 10
  } catch {
    return 10
  }
}
const pageSize = ref(readPageSize())
watch(pageSize, (value) => {
  try {
    localStorage.setItem(PAGE_SIZE_KEY, String(value))
    toast.add({
      severity: 'success',
      summary: `Workbench shows ${value} orders per page`,
      life: 2000,
    })
  } catch {
    /* storage unavailable */
  }
})

// --- Sign out ----------------------------------------------------------------------------------
const signingOut = ref(false)
async function signOut() {
  signingOut.value = true
  try {
    await auth.signOut()
    await router.push('/login')
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <main v-if="user" class="journey-main settings-main">
    <header class="order-header">
      <div>
        <p class="eyebrow">ACCOUNT / SETTINGS</p>
        <h1 class="page-title">Settings.</h1>
        <p class="intro-copy">{{ role.summary }}</p>
      </div>
      <span class="ops-role-chip" :class="{ 'is-admin': auth.isStaff }">
        <i :class="role.icon" aria-hidden="true"></i> {{ role.label }}
      </span>
    </header>

    <div class="order-layout">
      <div class="order-primary">
        <!-- Profile -->
        <section class="info-card ops-panel" aria-labelledby="settings-profile">
          <h2 id="settings-profile">Profile</h2>
          <form class="settings-inline-form" novalidate @submit.prevent="saveName">
            <FloatLabel class="checkout-float-label" variant="in">
              <InputText
                id="settings-name"
                v-model="name"
                autocomplete="name"
                maxlength="150"
                :invalid="Boolean(nameError)"
              />
              <label for="settings-name">Full name</label>
            </FloatLabel>
            <ActionButton kind="save" :loading="savingName" :disabled="!nameChanged" />
          </form>
          <small v-if="nameError" class="ops-field-error">{{ nameError }}</small>

          <dl class="ops-facts settings-facts">
            <div>
              <dt>Email</dt>
              <dd>
                {{ user.email }}
                <span v-if="user.emailVerified" class="settings-badge is-ok">
                  <i class="pi pi-check-circle" aria-hidden="true"></i> Verified
                </span>
                <span v-else class="settings-badge is-warn">
                  <i class="pi pi-exclamation-circle" aria-hidden="true"></i> Not verified
                </span>
              </dd>
            </div>
            <div>
              <dt>Sign-in method</dt>
              <dd>{{ user.provider === 'google' ? 'Google' : 'Email and password' }}</dd>
            </div>
          </dl>
          <p v-if="user.emailVerified === false" class="settings-note">
            <template v-if="resent">Check your inbox for the verification link.</template>
            <template v-else>
              Verify your email so orders placed with it appear in your account.
              <button
                type="button"
                class="settings-link"
                :disabled="resending"
                @click="resendVerification"
              >
                {{ resending ? 'Sending…' : 'Resend verification email' }}
              </button>
            </template>
          </p>
        </section>

        <!-- Sign-in & security -->
        <section class="info-card ops-panel" aria-labelledby="settings-security">
          <h2 id="settings-security">Sign-in & security</h2>
          <form
            v-if="user.provider !== 'google'"
            class="ops-form settings-password"
            novalidate
            @submit.prevent="savePassword"
          >
            <FloatLabel class="checkout-float-label" variant="in">
              <Password
                v-model="currentPassword"
                input-id="settings-current-password"
                :feedback="false"
                toggle-mask
                autocomplete="current-password"
              />
              <label for="settings-current-password">Current password</label>
            </FloatLabel>
            <FloatLabel class="checkout-float-label" variant="in">
              <Password
                v-model="newPassword"
                input-id="settings-new-password"
                :feedback="false"
                toggle-mask
                autocomplete="new-password"
              />
              <label for="settings-new-password">New password</label>
            </FloatLabel>
            <small class="settings-hint"
              >At least 8 characters, including a letter and a number.</small
            >
            <p v-if="passwordError" class="upload-error" role="alert">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i
              ><span>{{ passwordError }}</span>
            </p>
            <ActionButton kind="save" label="Change password" :loading="savingPassword" full />
          </form>
          <p v-else class="settings-note">
            <i class="pi pi-google" aria-hidden="true"></i>
            You sign in with Google, so your password and security are managed in your Google
            account.
          </p>
          <p v-if="auth.isAdmin" class="settings-note">
            <i class="pi pi-lock" aria-hidden="true"></i>
            The admin console always asks for a code from your authenticator app.
          </p>
        </section>

        <!-- Staff: workbench -->
        <section
          v-if="auth.isStaff"
          class="info-card ops-panel"
          aria-labelledby="settings-workbench"
        >
          <h2 id="settings-workbench">Workbench</h2>
          <div class="settings-row">
            <div>
              <strong>Orders per page</strong>
              <small>How many orders the workbench queue shows at once on this device.</small>
            </div>
            <Select
              v-model="pageSize"
              :options="pageSizes"
              option-label="label"
              option-value="value"
              class="kedak-select"
              aria-label="Orders per page"
            />
          </div>
          <div class="settings-shortcuts">
            <RouterLink to="/ops" class="settings-shortcut">
              <i class="pi pi-inbox" aria-hidden="true"></i> Workbench
            </RouterLink>
            <RouterLink to="/ops/quality-check" class="settings-shortcut">
              <i class="pi pi-check-square" aria-hidden="true"></i> Quality check
            </RouterLink>
            <RouterLink
              v-if="auth.role === 'ops' || auth.isAdmin"
              to="/ops/users"
              class="settings-shortcut"
            >
              <i class="pi pi-users" aria-hidden="true"></i> People
            </RouterLink>
            <RouterLink
              v-if="auth.role === 'ops' || auth.isAdmin"
              to="/ops/products"
              class="settings-shortcut"
            >
              <i class="pi pi-tags" aria-hidden="true"></i> Products
            </RouterLink>
            <RouterLink to="/ops/company" class="settings-shortcut">
              <i class="pi pi-building" aria-hidden="true"></i> Company & policies
            </RouterLink>
          </div>
        </section>

        <!-- Admin -->
        <section v-if="auth.isAdmin" class="info-card ops-panel" aria-labelledby="settings-admin">
          <h2 id="settings-admin">Administration</h2>
          <ul class="settings-list">
            <li>
              <i class="pi pi-building" aria-hidden="true"></i>
              <span>
                Edit company information and policies on
                <RouterLink to="/ops/company">Company & policies</RouterLink>.
              </span>
            </li>
            <li>
              <i class="pi pi-users" aria-hidden="true"></i>
              <span>
                Give staff roles, edit staff accounts and delete accounts on
                <RouterLink to="/ops/users">People</RouterLink>.
              </span>
            </li>
            <li>
              <i class="pi pi-sliders-h" aria-hidden="true"></i>
              <span>
                Store currency, delivery fee, prices, users and roles are in the secure admin
                console (use your bookmarked address; it isn’t linked from the site).
              </span>
            </li>
          </ul>
        </section>
      </div>

      <aside class="order-secondary">
        <section class="info-card ops-panel" aria-labelledby="settings-appearance">
          <h2 id="settings-appearance">Appearance</h2>
          <div class="settings-theme" role="radiogroup" aria-label="Theme">
            <button
              v-for="theme in themes"
              :key="theme.value"
              type="button"
              role="radio"
              :aria-checked="preference === theme.value"
              :class="{ 'is-active': preference === theme.value }"
              @click="setTheme(theme.value)"
            >
              <i :class="theme.icon" aria-hidden="true"></i>
              <span>{{ theme.label }}</span>
            </button>
          </div>
        </section>

        <section v-if="!auth.isStaff" class="info-card ops-panel" aria-labelledby="settings-orders">
          <h2 id="settings-orders">Orders</h2>
          <RouterLink to="/account" class="settings-shortcut">
            <i class="pi pi-box" aria-hidden="true"></i> Your orders
          </RouterLink>
          <RouterLink to="/orders/find" class="settings-shortcut">
            <i class="pi pi-search" aria-hidden="true"></i> Find a guest order
          </RouterLink>
        </section>

        <section class="info-card ops-panel" aria-labelledby="settings-signout">
          <h2 id="settings-signout">Sign out</h2>
          <p class="settings-hint">Sign out of Kedak on this device.</p>
          <Button
            class="kedak-outline-action"
            severity="secondary"
            outlined
            icon="pi pi-sign-out"
            label="Sign out"
            :loading="signingOut"
            @click="signOut"
          />
        </section>
      </aside>
    </div>
  </main>
</template>
