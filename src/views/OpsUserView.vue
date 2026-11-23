<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.vue'
import {
  useChangeStaffUserRole,
  useDeleteStaffUser,
  useSendStaffUserEmail,
  useStaffUser,
  useUpdateStaffUser,
} from '../queries/ops'
import { ApiError, errorMessage } from '../services/api/errors'
import type { StaffUserActivity } from '../services/api/endpoints/users'
import { useAuthStore } from '../stores/auth'
import type { UserRole } from '../types/api'
import { formatMoney } from '../utils/money'
import { formatOrderDate } from '../utils/orderPolicy'
import { initialsOf, roleMeta } from '../utils/people'

/**
 * One account (/ops/users/:id). What the buttons allow comes from the API's `permissions`
 * (ops: customers only; administrators: everyone except themselves), and the API enforces it.
 */
const route = useRoute()
const router = useRouter()
const toast = useToast()

const userId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const detailQuery = useStaffUser(userId)
const detail = computed(() => detailQuery.data.value ?? null)
const person = computed(() => detail.value?.user ?? null)
const can = computed(() => detail.value?.permissions)
const auth = useAuthStore()
const isSelf = computed(() => Boolean(person.value && auth.user?.id === person.value.id))

const loadError = computed(() => {
  const error = detailQuery.error.value
  if (error instanceof ApiError && error.status === 403) {
    return 'Managing people needs the ops role. Ask an administrator for access.'
  }
  if (error instanceof ApiError && error.status === 404) return 'This account no longer exists.'
  return error ? errorMessage(error, 'This account couldn’t load.') : ''
})

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// --- Details -----------------------------------------------------------------------------------
const editing = ref(false)
const name = ref('')
const email = ref('')
const detailErrors = ref<{ name?: string; email?: string; form?: string }>({})
const update = useUpdateStaffUser()

function startEditing() {
  if (!person.value) return
  name.value = person.value.name
  email.value = person.value.email
  detailErrors.value = {}
  editing.value = true
}
watch(userId, () => (editing.value = false))

const emailChanged = computed(
  () => email.value.trim().toLowerCase() !== (person.value?.email ?? '').toLowerCase(),
)

async function saveDetails() {
  if (!person.value) return
  detailErrors.value = {}
  if (name.value.trim().length < 2) detailErrors.value.name = 'Enter at least 2 characters.'
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    detailErrors.value.email = 'Enter a valid email address.'
  }
  if (detailErrors.value.name || detailErrors.value.email) return
  if (
    emailChanged.value &&
    !window.confirm(
      `Change the sign-in email to ${email.value.trim()}? The new address will need verifying.`,
    )
  ) {
    return
  }
  try {
    await update.mutateAsync({
      id: person.value.id,
      payload: { name: name.value.trim(), email: email.value.trim() },
    })
    editing.value = false
    toast.add({ severity: 'success', summary: 'Details saved', life: 2400 })
  } catch (error) {
    if (error instanceof ApiError) {
      detailErrors.value = {
        name: error.fieldError('/name'),
        email: error.fieldError('/email') ?? (error.status === 409 ? error.message : undefined),
      }
      if (!detailErrors.value.name && !detailErrors.value.email) {
        detailErrors.value.form = error.message
      }
    } else {
      detailErrors.value.form = errorMessage(error)
    }
  }
}

// --- Emails ------------------------------------------------------------------------------------
const sendEmail = useSendStaffUserEmail()
const sendingKind = ref<'verification' | 'password-reset' | null>(null)
const emailNotice = ref('')
const emailError = ref('')
watch(userId, () => {
  emailNotice.value = ''
  emailError.value = ''
})

async function send(kind: 'verification' | 'password-reset') {
  if (!person.value || sendEmail.isPending.value) return
  emailNotice.value = ''
  emailError.value = ''
  sendingKind.value = kind
  try {
    const result = await sendEmail.mutateAsync({ id: person.value.id, kind })
    emailNotice.value =
      kind === 'verification'
        ? `Verification link sent to ${result.email}.`
        : `Password reset link sent to ${result.email}.`
  } catch (error) {
    emailError.value = errorMessage(error, 'The email couldn’t be sent.')
  } finally {
    sendingKind.value = null
  }
}

const resetBlocked = computed(() => {
  if (!person.value) return ''
  if (!person.value.isActive) return 'Reactivate the account first.'
  if (person.value.provider === 'google') return 'Signs in with Google: no password to reset.'
  return ''
})

// --- Role (administrators) ----------------------------------------------------------------------
const roles = Object.keys(roleMeta) as UserRole[]
const selectedRole = ref<UserRole>('customer')
watch(
  () => person.value?.role,
  (role) => {
    if (role) selectedRole.value = role
  },
  { immediate: true },
)
const changeRole = useChangeStaffUserRole()
const roleError = ref('')

async function saveRole() {
  if (!person.value || selectedRole.value === person.value.role) return
  roleError.value = ''
  const label = roleMeta[selectedRole.value].label
  const warning =
    selectedRole.value === 'admin'
      ? `Make ${person.value.name} an administrator? They will get full access, including roles, deletion and store settings.`
      : `Change ${person.value.name}'s role to ${label}?`
  if (!window.confirm(warning)) return
  try {
    await changeRole.mutateAsync({ id: person.value.id, role: selectedRole.value })
    toast.add({ severity: 'success', summary: `Role changed to ${label}`, life: 2400 })
  } catch (error) {
    roleError.value = errorMessage(error, 'The role couldn’t be changed.')
  }
}

// --- Status --------------------------------------------------------------------------------------
const statusError = ref('')
async function toggleActive() {
  if (!person.value) return
  statusError.value = ''
  const deactivating = person.value.isActive
  if (
    deactivating &&
    !window.confirm(
      `Deactivate ${person.value.name}? They will be signed out and can't sign in until reactivated. Their orders are kept.`,
    )
  ) {
    return
  }
  try {
    await update.mutateAsync({ id: person.value.id, payload: { isActive: !deactivating } })
    toast.add({
      severity: 'success',
      summary: deactivating ? 'Account deactivated' : 'Account reactivated',
      life: 2400,
    })
  } catch (error) {
    statusError.value = errorMessage(error, 'The account status couldn’t be changed.')
  }
}

// --- Delete (administrators) ---------------------------------------------------------------------
const confirmingDelete = ref(false)
const deleteConfirmation = ref('')
const deleteError = ref('')
const remove = useDeleteStaffUser()
const deleteMatches = computed(
  () => deleteConfirmation.value.trim().toLowerCase() === (person.value?.email ?? '').toLowerCase(),
)

async function deleteAccount() {
  if (!person.value || !deleteMatches.value) return
  deleteError.value = ''
  const label = person.value.name || person.value.email
  try {
    await remove.mutateAsync(person.value.id)
    toast.add({ severity: 'success', summary: `${label} deleted`, life: 2600 })
    void router.push({ name: 'ops-users' })
  } catch (error) {
    deleteError.value = errorMessage(error, 'The account couldn’t be deleted.')
  }
}

// --- Activity ------------------------------------------------------------------------------------
function describeChange(entry: StaffUserActivity) {
  const changes = entry.changes ?? {}
  const parts: string[] = []
  const pair = (key: string) => changes[key] as [unknown, unknown] | undefined
  const role = pair('role')
  if (entry.action === 'user.role_changed' && Array.isArray(role)) {
    const [from, to] = role as [UserRole, UserRole]
    parts.push(`${roleMeta[from]?.label ?? from} → ${roleMeta[to]?.label ?? to}`)
  }
  const nameChange = pair('name')
  if (entry.action === 'user.updated' && Array.isArray(nameChange)) {
    parts.push(`Name: ${String(nameChange[1])}`)
  }
  const emailChange = pair('email')
  if (entry.action === 'user.updated' && Array.isArray(emailChange)) {
    parts.push(`Email: ${String(emailChange[1])}`)
  }
  if (entry.action === 'user.created' && typeof changes.role === 'string') {
    parts.push(`As ${roleMeta[changes.role as UserRole]?.label ?? changes.role}`)
    if (changes.invited) parts.push('invite emailed')
  }
  return parts.join(' · ')
}
</script>

<template>
  <main class="journey-main ops-main ops-person">
    <RouterLink to="/ops/users" class="text-link ops-back">
      <i class="pi pi-arrow-left" aria-hidden="true"></i> People
    </RouterLink>

    <p v-if="detailQuery.isPending.value" class="api-state" aria-busy="true">
      <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading account…
    </p>
    <p v-else-if="loadError" class="api-state is-error" role="alert">{{ loadError }}</p>

    <template v-else-if="person && can">
      <header class="order-header person-header">
        <div class="person-title">
          <span class="people-avatar is-large" aria-hidden="true">{{ initialsOf(person) }}</span>
          <div>
            <p class="eyebrow">
              ACCOUNT · JOINED {{ formatOrderDate(person.dateJoined).toUpperCase() }}
            </p>
            <h1 class="page-title">{{ person.name || person.email }}</h1>
            <p class="person-badges">
              <span class="people-role" :class="`is-${person.role}`">
                <i :class="roleMeta[person.role].icon" aria-hidden="true"></i>
                {{ roleMeta[person.role].label }}
              </span>
              <span v-if="person.isActive" class="settings-badge is-ok">
                <i class="pi pi-check-circle" aria-hidden="true"></i> Active
              </span>
              <span v-else class="settings-badge is-warn">
                <i class="pi pi-ban" aria-hidden="true"></i> Deactivated
              </span>
            </p>
          </div>
        </div>
      </header>

      <div class="ops-stats person-summary">
        <div class="ops-stat is-static">
          <span class="icon-tile icon-tile--small" aria-hidden="true"
            ><i class="pi pi-box"></i
          ></span>
          <span class="ops-stat-copy">
            <strong>{{ person.orderCount }}</strong>
            <small>{{ person.orderCount === 1 ? 'Order' : 'Orders' }} placed</small>
          </span>
        </div>
        <div class="ops-stat is-static">
          <span class="icon-tile icon-tile--small" aria-hidden="true"
            ><i :class="person.emailVerified ? 'pi pi-verified' : 'pi pi-envelope'"></i
          ></span>
          <span class="ops-stat-copy">
            <strong class="person-summary-text">{{
              person.emailVerified ? 'Verified' : 'Unverified'
            }}</strong>
            <small>Email address</small>
          </span>
        </div>
        <div class="ops-stat is-static">
          <span class="icon-tile icon-tile--small" aria-hidden="true"
            ><i :class="person.provider === 'google' ? 'pi pi-google' : 'pi pi-key'"></i
          ></span>
          <span class="ops-stat-copy">
            <strong class="person-summary-text">{{
              person.provider === 'google' ? 'Google' : 'Password'
            }}</strong>
            <small>Sign-in method</small>
          </span>
        </div>
        <div class="ops-stat is-static">
          <span class="icon-tile icon-tile--small" aria-hidden="true"
            ><i class="pi pi-clock"></i
          ></span>
          <span class="ops-stat-copy">
            <strong class="person-summary-text">{{
              person.lastLogin ? formatOrderDate(person.lastLogin) : 'Never'
            }}</strong>
            <small>Last sign-in</small>
          </span>
        </div>
      </div>

      <div class="order-layout">
        <div class="order-primary">
          <!-- Details -->
          <section class="info-card ops-panel" aria-labelledby="person-details">
            <div class="person-card-head">
              <h2 id="person-details">Details</h2>
              <Button
                v-if="can.canEdit && !editing"
                size="small"
                class="kedak-outline-action"
                severity="secondary"
                outlined
                icon="pi pi-pencil"
                label="Edit"
                @click="startEditing"
              />
            </div>

            <form
              v-if="editing"
              class="ops-form person-form"
              novalidate
              @submit.prevent="saveDetails"
            >
              <div class="people-field">
                <FloatLabel class="checkout-float-label" variant="in">
                  <InputText
                    id="person-name"
                    v-model="name"
                    maxlength="150"
                    autocomplete="off"
                    :invalid="Boolean(detailErrors.name)"
                  />
                  <label for="person-name">Full name</label>
                </FloatLabel>
                <small v-if="detailErrors.name" class="ops-field-error">{{
                  detailErrors.name
                }}</small>
              </div>
              <div class="people-field">
                <FloatLabel class="checkout-float-label" variant="in">
                  <InputText
                    id="person-email"
                    v-model="email"
                    type="email"
                    autocomplete="off"
                    :disabled="person.provider === 'google'"
                    :invalid="Boolean(detailErrors.email)"
                  />
                  <label for="person-email">Email</label>
                </FloatLabel>
                <small v-if="detailErrors.email" class="ops-field-error">{{
                  detailErrors.email
                }}</small>
                <small v-else-if="person.provider === 'google'" class="settings-hint">
                  This account signs in with Google, so its email comes from Google.
                </small>
                <small v-else-if="emailChanged" class="settings-hint">
                  The new address will show as unverified until its owner confirms it.
                </small>
              </div>
              <p v-if="detailErrors.form" class="upload-error" role="alert">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i
                ><span>{{ detailErrors.form }}</span>
              </p>
              <div class="people-add-actions">
                <Button
                  type="button"
                  class="kedak-outline-action"
                  severity="secondary"
                  outlined
                  label="Cancel"
                  @click="editing = false"
                />
                <Button
                  type="submit"
                  class="kedak-action"
                  icon="pi pi-check"
                  label="Save details"
                  :loading="update.isPending.value"
                />
              </div>
            </form>

            <dl v-else class="ops-facts settings-facts">
              <div>
                <dt>Full name</dt>
                <dd>{{ person.name || '—' }}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  {{ person.email }}
                  <span v-if="person.emailVerified" class="settings-badge is-ok">
                    <i class="pi pi-check-circle" aria-hidden="true"></i> Verified
                  </span>
                  <span v-else class="settings-badge is-warn">
                    <i class="pi pi-exclamation-circle" aria-hidden="true"></i> Not verified
                  </span>
                </dd>
              </div>
              <div>
                <dt>Sign-in method</dt>
                <dd>{{ person.provider === 'google' ? 'Google' : 'Email and password' }}</dd>
              </div>
              <div>
                <dt>Last sign-in</dt>
                <dd>{{ person.lastLogin ? formatDateTime(person.lastLogin) : 'Not recorded' }}</dd>
              </div>
              <div>
                <dt>Account ID</dt>
                <dd class="person-id">{{ person.id }}</dd>
              </div>
            </dl>
            <p v-if="!can.canEdit" class="settings-note">
              <i class="pi pi-lock" aria-hidden="true"></i>
              Only an administrator can change a staff or administrator account.
            </p>
          </section>

          <!-- Orders -->
          <section class="info-card ops-panel" aria-labelledby="person-orders">
            <div class="person-card-head">
              <h2 id="person-orders">Orders</h2>
              <span class="muted-copy">{{ person.orderCount }} in total</span>
            </div>
            <p v-if="!detail?.recentOrders.length" class="muted-copy">
              No orders placed while signed in to this account.
            </p>
            <ul v-else class="ops-rows person-orders">
              <li v-for="order in detail.recentOrders" :key="order.id">
                <RouterLink
                  :to="{ name: 'quality-check', query: { order: order.id } }"
                  class="ops-row person-order-row"
                >
                  <span class="ops-row-main">
                    <strong>{{ order.id }}</strong>
                    <small>{{ order.itemsSummary }}</small>
                  </span>
                  <OrderStatusBadge :status="order.status" />
                  <span class="ops-row-meta">
                    <strong>{{ formatMoney(order.total) }}</strong>
                    <small>{{ formatOrderDate(order.placedAt) }}</small>
                  </span>
                  <i class="pi pi-chevron-right ops-row-chevron" aria-hidden="true"></i>
                </RouterLink>
              </li>
            </ul>
            <p v-if="person.orderCount > (detail?.recentOrders.length ?? 0)" class="settings-hint">
              Showing the latest {{ detail?.recentOrders.length }}. Search the workbench by email
              for the rest.
            </p>
          </section>

          <!-- Activity -->
          <section class="info-card ops-history-card" aria-labelledby="person-activity">
            <h2 id="person-activity">Activity</h2>
            <p v-if="!detail?.activity.length" class="muted-copy">
              No staff changes recorded for this account yet.
            </p>
            <ol v-else class="ops-timeline">
              <li v-for="(entry, index) in detail.activity" :key="`${entry.createdAt}-${index}`">
                <span class="ops-timeline-dot" aria-hidden="true"></span>
                <div>
                  <p class="ops-timeline-title">{{ entry.label }}</p>
                  <p class="ops-timeline-meta">
                    {{ formatDateTime(entry.createdAt) }}
                    <template v-if="entry.actor"> · {{ entry.actor }}</template>
                  </p>
                  <p v-if="describeChange(entry)" class="ops-timeline-note">
                    {{ describeChange(entry) }}
                  </p>
                </div>
              </li>
            </ol>
          </section>
        </div>

        <aside class="order-secondary">
          <!-- Emails -->
          <section class="info-card ops-panel" aria-labelledby="person-emails">
            <h2 id="person-emails">Account emails</h2>
            <div class="person-actions">
              <button
                type="button"
                class="person-action"
                :disabled="person.emailVerified || sendEmail.isPending.value"
                @click="send('verification')"
              >
                <i
                  :class="
                    sendingKind === 'verification' ? 'pi pi-spin pi-spinner' : 'pi pi-envelope'
                  "
                  aria-hidden="true"
                ></i>
                <span>
                  <strong>Send verification email</strong>
                  <small>{{
                    person.emailVerified
                      ? 'Email already verified.'
                      : 'A link to confirm they own this address.'
                  }}</small>
                </span>
              </button>
              <button
                type="button"
                class="person-action"
                :disabled="Boolean(resetBlocked) || sendEmail.isPending.value"
                @click="send('password-reset')"
              >
                <i
                  :class="sendingKind === 'password-reset' ? 'pi pi-spin pi-spinner' : 'pi pi-key'"
                  aria-hidden="true"
                ></i>
                <span>
                  <strong>Send password reset</strong>
                  <small>{{ resetBlocked || 'A link to choose a new password.' }}</small>
                </span>
              </button>
            </div>
            <p v-if="emailNotice" class="settings-note person-sent" role="status">
              <i class="pi pi-check-circle" aria-hidden="true"></i> {{ emailNotice }}
            </p>
            <p v-if="emailError" class="upload-error" role="alert">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i
              ><span>{{ emailError }}</span>
            </p>
          </section>

          <!-- Role -->
          <section class="info-card ops-panel" aria-labelledby="person-role">
            <h2 id="person-role">Role & permissions</h2>
            <template v-if="can.canChangeRole">
              <div class="person-roles" role="radiogroup" aria-label="Role">
                <label
                  v-for="role in roles"
                  :key="role"
                  class="person-role-option"
                  :class="{ 'is-active': selectedRole === role }"
                >
                  <input v-model="selectedRole" type="radio" name="person-role" :value="role" />
                  <i :class="roleMeta[role].icon" aria-hidden="true"></i>
                  <span>
                    <strong>{{ roleMeta[role].label }}</strong>
                    <small>{{ roleMeta[role].description }}</small>
                  </span>
                </label>
              </div>
              <p v-if="roleError" class="upload-error" role="alert">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i
                ><span>{{ roleError }}</span>
              </p>
              <Button
                class="kedak-action person-full"
                icon="pi pi-shield"
                label="Save role"
                :disabled="selectedRole === person.role"
                :loading="changeRole.isPending.value"
                @click="saveRole"
              />
            </template>
            <template v-else>
              <p class="person-role-current">
                <i :class="roleMeta[person.role].icon" aria-hidden="true"></i>
                <span>
                  <strong>{{ roleMeta[person.role].label }}</strong>
                  <small>{{ roleMeta[person.role].description }}</small>
                </span>
              </p>
              <p class="settings-note">
                <i class="pi pi-lock" aria-hidden="true"></i>
                {{
                  isSelf
                    ? 'This is your account. Another administrator has to change your role.'
                    : 'Only an administrator can change roles.'
                }}
              </p>
            </template>
          </section>

          <!-- Status -->
          <section
            v-if="can.canDeactivate"
            class="info-card ops-panel"
            aria-labelledby="person-status"
          >
            <h2 id="person-status">Account status</h2>
            <p class="settings-hint person-copy">
              {{
                person.isActive
                  ? 'Deactivating signs them out and blocks sign-in. Orders and history are kept, and you can reactivate at any time.'
                  : 'This account can’t sign in. Reactivate it to restore access.'
              }}
            </p>
            <p v-if="statusError" class="upload-error" role="alert">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i
              ><span>{{ statusError }}</span>
            </p>
            <Button
              class="kedak-outline-action person-full"
              :class="{ 'person-danger-soft': person.isActive }"
              severity="secondary"
              outlined
              :icon="person.isActive ? 'pi pi-ban' : 'pi pi-replay'"
              :label="person.isActive ? 'Deactivate account' : 'Reactivate account'"
              :loading="update.isPending.value && !editing"
              @click="toggleActive"
            />
          </section>

          <!-- Delete (administrators) -->
          <section
            v-if="can.canDelete"
            class="info-card ops-panel person-danger"
            aria-labelledby="person-delete"
          >
            <h2 id="person-delete">Delete account</h2>
            <p class="settings-hint person-copy">
              Permanently removes this account. Their orders stay, under the checkout name and
              email. This can’t be undone, so consider deactivating instead.
            </p>
            <template v-if="confirmingDelete">
              <FloatLabel class="checkout-float-label" variant="in">
                <InputText
                  id="person-delete-confirm"
                  v-model="deleteConfirmation"
                  autocomplete="off"
                />
                <label for="person-delete-confirm">Type {{ person.email }} to confirm</label>
              </FloatLabel>
              <p v-if="deleteError" class="upload-error" role="alert">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i
                ><span>{{ deleteError }}</span>
              </p>
              <div class="people-add-actions">
                <Button
                  class="kedak-outline-action"
                  severity="secondary"
                  outlined
                  label="Cancel"
                  @click="((confirmingDelete = false), (deleteConfirmation = ''))"
                />
                <Button
                  class="person-danger-soft person-delete-button"
                  icon="pi pi-trash"
                  label="Delete forever"
                  :disabled="!deleteMatches"
                  :loading="remove.isPending.value"
                  @click="deleteAccount"
                />
              </div>
            </template>
            <Button
              v-else
              class="kedak-outline-action person-full person-danger-soft"
              severity="secondary"
              outlined
              icon="pi pi-trash"
              label="Delete account…"
              @click="confirmingDelete = true"
            />
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>
