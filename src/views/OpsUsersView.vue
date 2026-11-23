<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { useCreateStaffUser, useStaffUserSummary, useStaffUsers } from '../queries/ops'
import { ApiError, errorMessage } from '../services/api/errors'
import type {
  StaffUserFilters,
  StaffUserRoleFilter,
  StaffUserSort,
} from '../services/api/endpoints/users'
import { useAuthStore } from '../stores/auth'
import type { UserRole } from '../types/api'
import { formatOrderDate } from '../utils/orderPolicy'
import { initialsOf, roleMeta } from '../utils/people'

/**
 * People (/ops/users): every account, searched, filtered, sorted and paged by the API.
 * Ops add customer accounts; administrators can also add staff. Who may change what is
 * enforced by Django; the page only mirrors it.
 */
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

type RoleTab = 'all' | StaffUserRoleFilter
const roleTabs: Array<{ key: RoleTab; label: string }> = [
  { key: 'all', label: 'Everyone' },
  { key: 'customer', label: 'Customers' },
  { key: 'staff', label: 'Staff' },
  { key: 'admin', label: 'Administrators' },
]
const roleTab = ref<RoleTab>('all')

type StatusKey = 'any' | 'active' | 'inactive' | 'unverified'
const statusOptions: Array<{ value: StatusKey; label: string }> = [
  { value: 'any', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Deactivated' },
  { value: 'unverified', label: 'Email not verified' },
]
const status = ref<StatusKey>('any')

const sortOptions: Array<{ value: StaffUserSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
]
const sort = ref<StaffUserSort>('newest')

const PAGE_SIZES = [10, 20, 50, 100] as const
type PageSize = (typeof PAGE_SIZES)[number]
const PAGE_SIZE_KEY = 'kedak-ops-page-size'
function storedPageSize(): PageSize {
  try {
    const value = Number(localStorage.getItem(PAGE_SIZE_KEY))
    return (PAGE_SIZES as readonly number[]).includes(value) ? (value as PageSize) : 10
  } catch {
    return 10
  }
}
const pageSize = ref<PageSize>(storedPageSize())
const pageSizeOptions = PAGE_SIZES.map((value) => ({ value, label: String(value) }))

const search = ref('')
const searchTerm = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (searchTerm.value = value.trim()), 300)
})
const isSearching = computed(() => search.value.trim() !== searchTerm.value)

const apiFilters = computed<Omit<StaffUserFilters, 'cursor'>>(() => ({
  limit: pageSize.value,
  sort: sort.value,
  q: searchTerm.value || undefined,
  role: roleTab.value === 'all' ? undefined : roleTab.value,
  status: status.value === 'active' || status.value === 'inactive' ? status.value : undefined,
  verified: status.value === 'unverified' ? false : undefined,
}))

const usersQuery = useStaffUsers(apiFilters)
const pageIndex = ref(0)
watch(apiFilters, () => (pageIndex.value = 0))
const loadedPages = computed(() => usersQuery.data.value?.pages ?? [])
const people = computed(() => loadedPages.value[pageIndex.value]?.data ?? [])
const hasNextPage = computed(
  () => pageIndex.value + 1 < loadedPages.value.length || Boolean(usersQuery.hasNextPage.value),
)
const pageRange = computed(() => {
  const start = pageIndex.value * pageSize.value
  return { from: people.value.length ? start + 1 : 0, to: start + people.value.length }
})
async function goToNextPage() {
  if (pageIndex.value + 1 >= loadedPages.value.length) {
    if (!usersQuery.hasNextPage.value) return
    await usersQuery.fetchNextPage()
  }
  if (pageIndex.value + 1 < loadedPages.value.length) pageIndex.value += 1
  document.getElementById('people-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const accessError = computed(() => {
  const error = usersQuery.error.value
  if (error instanceof ApiError && error.status === 403) {
    return 'Managing people needs the ops role. Ask an administrator for access.'
  }
  return error ? errorMessage(error, 'People couldn’t load.') : ''
})
// --- Summary cards (counts from GET /ops/users/summary; each one applies a filter) -------------
const summaryQuery = useStaffUserSummary()
type StatKey = 'all' | 'customer' | 'staff' | 'unverified' | 'inactive'
const activeStat = computed<StatKey | null>(() => {
  if (searchTerm.value) return null
  if (roleTab.value === 'all' && status.value === 'unverified') return 'unverified'
  if (roleTab.value === 'all' && status.value === 'inactive') return 'inactive'
  if (status.value !== 'any') return null
  if (roleTab.value === 'all') return 'all'
  return roleTab.value === 'customer' || roleTab.value === 'staff' ? roleTab.value : null
})
const stats = computed(() => {
  const summary = summaryQuery.data.value
  const n = (value: number | undefined) => value ?? 0
  return [
    {
      key: 'all' as const,
      label: 'All accounts',
      icon: 'pi pi-users',
      value: n(summary?.total),
      detail: summary ? `+${summary.joinedLast30Days} in the last 30 days` : '',
    },
    {
      key: 'customer' as const,
      label: 'Customers',
      icon: 'pi pi-user',
      value: n(summary?.customers),
      detail: '',
    },
    {
      key: 'staff' as const,
      label: 'Staff',
      icon: 'pi pi-briefcase',
      value: n(summary?.staff),
      detail: summary
        ? `${summary.admins} ${summary.admins === 1 ? 'administrator' : 'administrators'}`
        : '',
    },
    {
      key: 'unverified' as const,
      label: 'Unverified emails',
      icon: 'pi pi-envelope',
      value: n(summary?.unverified),
      detail: '',
    },
    {
      key: 'inactive' as const,
      label: 'Deactivated',
      icon: 'pi pi-ban',
      value: n(summary?.inactive),
      detail: '',
    },
  ]
})
function applyStat(key: StatKey) {
  search.value = ''
  searchTerm.value = ''
  roleTab.value = key === 'customer' || key === 'staff' ? key : 'all'
  status.value = key === 'unverified' || key === 'inactive' ? key : 'any'
}

/** "3 days ago" for recent dates; older ones show the date. */
const relative = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' })
function relativeTime(value: string) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return relative.format(days, 'day')
  return formatOrderDate(value)
}

const filtered = computed(
  () => Boolean(searchTerm.value) || roleTab.value !== 'all' || status.value !== 'any',
)

// --- Add a person ------------------------------------------------------------------------------
const adding = ref(false)
const newName = ref('')
const newEmail = ref('')
const newRole = ref<UserRole>('customer')
const sendInvite = ref(true)
const createError = ref('')
const fieldErrors = ref<{ name?: string; email?: string }>({})
const roleOptions = computed(() =>
  (Object.keys(roleMeta) as UserRole[])
    .filter((role) => auth.isAdmin || role === 'customer')
    .map((role) => ({ value: role, label: roleMeta[role].label })),
)
const create = useCreateStaffUser()

function openAddForm() {
  adding.value = true
  createError.value = ''
  fieldErrors.value = {}
}
function closeAddForm() {
  adding.value = false
  newName.value = ''
  newEmail.value = ''
  newRole.value = 'customer'
  sendInvite.value = true
}

async function addPerson() {
  createError.value = ''
  fieldErrors.value = {}
  if (newName.value.trim().length < 2) fieldErrors.value.name = 'Enter their full name.'
  if (!/^\S+@\S+\.\S+$/.test(newEmail.value.trim())) {
    fieldErrors.value.email = 'Enter a valid email address.'
  }
  if (fieldErrors.value.name || fieldErrors.value.email) return
  try {
    const detail = await create.mutateAsync({
      name: newName.value.trim(),
      email: newEmail.value.trim(),
      role: newRole.value,
      sendInvite: sendInvite.value,
    })
    toast.add({
      severity: 'success',
      summary: `${detail.user.name} added`,
      detail: sendInvite.value ? `We emailed ${detail.user.email} a link to set a password.` : '',
      life: 3200,
    })
    closeAddForm()
    void router.push({ name: 'ops-user', params: { id: detail.user.id } })
  } catch (error) {
    if (error instanceof ApiError) {
      fieldErrors.value = {
        name: error.fieldError('/name'),
        email: error.fieldError('/email') ?? (error.status === 409 ? error.message : undefined),
      }
      if (!fieldErrors.value.name && !fieldErrors.value.email) createError.value = error.message
    } else {
      createError.value = errorMessage(error)
    }
  }
}
</script>

<template>
  <main class="journey-main ops-main ops-people">
    <header class="order-header">
      <div>
        <p class="eyebrow">KEDAK / OPERATIONS / PEOPLE</p>
        <h1 class="page-title">People.</h1>
        <p class="intro-copy">
          Customer and staff accounts. Send verification or password emails, update details and
          {{ auth.isAdmin ? 'manage roles.' : 'deactivate accounts.' }}
        </p>
      </div>
      <Button
        v-if="!accessError && !adding"
        class="kedak-action ops-people-add"
        icon="pi pi-user-plus"
        label="Add person"
        @click="openAddForm"
      />
    </header>

    <p v-if="accessError" class="api-state is-error" role="alert">{{ accessError }}</p>

    <template v-else>
      <div class="ops-stats people-stats">
        <button
          v-for="stat in stats"
          :key="stat.key"
          type="button"
          class="ops-stat"
          :class="{ 'is-active': activeStat === stat.key }"
          :aria-pressed="activeStat === stat.key"
          @click="applyStat(stat.key)"
        >
          <span class="icon-tile icon-tile--small" aria-hidden="true"
            ><i :class="stat.icon"></i
          ></span>
          <span class="ops-stat-copy">
            <strong>{{ summaryQuery.isPending.value ? '–' : stat.value }}</strong>
            <small>{{ stat.label }}</small>
            <em v-if="stat.detail" class="people-stat-detail">{{ stat.detail }}</em>
          </span>
        </button>
      </div>

      <!-- Add a person -->
      <section v-if="adding" class="info-card ops-panel people-add" aria-labelledby="people-add">
        <div class="people-add-head">
          <h2 id="people-add">Add a person</h2>
          <button type="button" class="ops-icon-button" aria-label="Close" @click="closeAddForm">
            <i class="pi pi-times" aria-hidden="true"></i>
          </button>
        </div>
        <form class="people-add-form" novalidate @submit.prevent="addPerson">
          <div class="people-field">
            <FloatLabel class="checkout-float-label" variant="in">
              <InputText
                id="people-new-name"
                v-model="newName"
                autocomplete="off"
                maxlength="150"
                :invalid="Boolean(fieldErrors.name)"
              />
              <label for="people-new-name">Full name</label>
            </FloatLabel>
            <small v-if="fieldErrors.name" class="ops-field-error">{{ fieldErrors.name }}</small>
          </div>
          <div class="people-field">
            <FloatLabel class="checkout-float-label" variant="in">
              <InputText
                id="people-new-email"
                v-model="newEmail"
                type="email"
                autocomplete="off"
                :invalid="Boolean(fieldErrors.email)"
              />
              <label for="people-new-email">Email</label>
            </FloatLabel>
            <small v-if="fieldErrors.email" class="ops-field-error">{{ fieldErrors.email }}</small>
          </div>
          <div class="people-field">
            <label class="people-label" for="people-new-role">Role</label>
            <Select
              v-model="newRole"
              input-id="people-new-role"
              :options="roleOptions"
              option-label="label"
              option-value="value"
              class="kedak-select"
              :disabled="!auth.isAdmin"
            />
            <small v-if="!auth.isAdmin" class="settings-hint">
              Only an administrator can add staff accounts.
            </small>
          </div>
          <label class="people-check">
            <input v-model="sendInvite" type="checkbox" />
            <span>
              <strong>Email them a link to set their password</strong>
              <small>Without it, they can use “Forgot password” or you can send it later.</small>
            </span>
          </label>
          <p v-if="createError" class="upload-error people-span" role="alert">
            <i class="pi pi-exclamation-circle" aria-hidden="true"></i
            ><span>{{ createError }}</span>
          </p>
          <div class="people-add-actions people-span">
            <Button
              type="button"
              class="kedak-outline-action"
              severity="secondary"
              outlined
              label="Cancel"
              @click="closeAddForm"
            />
            <Button
              type="submit"
              class="kedak-action"
              icon="pi pi-check"
              label="Add person"
              :loading="create.isPending.value"
            />
          </div>
        </form>
      </section>

      <section class="info-card ops-queue" aria-labelledby="people-title">
        <div class="ops-queue-head people-head">
          <h2 id="people-title">Accounts</h2>
          <span class="ops-search">
            <i class="pi pi-search" aria-hidden="true"></i>
            <input
              v-model="search"
              type="search"
              placeholder="Name or email"
              aria-label="Search people"
              autocomplete="off"
            />
            <i
              v-if="isSearching || (usersQuery.isFetching.value && searchTerm)"
              class="pi pi-spin pi-spinner ops-search-busy"
              aria-hidden="true"
            ></i>
          </span>
          <Select
            v-model="status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            class="kedak-select ops-sort"
            aria-label="Filter by status"
          />
          <Select
            v-model="sort"
            :options="sortOptions"
            option-label="label"
            option-value="value"
            class="kedak-select ops-sort"
            aria-label="Sort people"
          />
        </div>

        <div class="ops-tabs ops-queue-tabs" role="tablist" aria-label="Filter by role">
          <button
            v-for="tab in roleTabs"
            :key="tab.key"
            type="button"
            role="tab"
            class="ops-tab"
            :class="{ 'is-active': roleTab === tab.key }"
            :aria-selected="roleTab === tab.key"
            @click="roleTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <p v-if="usersQuery.isPending.value" class="api-state" aria-busy="true">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading people…
        </p>
        <div v-else-if="!people.length" class="ops-empty">
          <span class="icon-tile" aria-hidden="true"><i class="pi pi-users"></i></span>
          <p>
            <strong>{{ filtered ? 'No matching accounts' : 'No accounts yet' }}</strong>
            <small>{{
              filtered ? 'Try another name, email or filter.' : 'New sign-ups appear here.'
            }}</small>
          </p>
        </div>
        <div v-else class="people-table" role="table" aria-label="Accounts">
          <div class="people-table-head" role="row">
            <span role="columnheader">Person</span>
            <span role="columnheader">Role</span>
            <span role="columnheader">Email</span>
            <span role="columnheader" class="people-col-num">Orders</span>
            <span role="columnheader" class="people-col-seen">Last sign-in</span>
            <span role="columnheader" class="people-col-joined">Joined</span>
            <span aria-hidden="true"></span>
          </div>
          <RouterLink
            v-for="person in people"
            :key="person.id"
            :to="{ name: 'ops-user', params: { id: person.id } }"
            class="people-item"
            :class="{ 'is-inactive': !person.isActive }"
            role="row"
            :aria-label="`Open ${person.name || person.email}`"
          >
            <span class="people-person" role="cell">
              <span class="people-avatar" :class="`is-${person.role}`" aria-hidden="true">{{
                initialsOf(person)
              }}</span>
              <span class="people-ident">
                <strong>
                  {{ person.name || '—' }}
                  <span v-if="person.id === auth.user?.id" class="people-you">You</span>
                </strong>
                <small :title="person.email">{{ person.email }}</small>
              </span>
            </span>
            <span class="people-cell people-cell-role" role="cell">
              <span class="people-role" :class="`is-${person.role}`">
                <i :class="roleMeta[person.role].icon" aria-hidden="true"></i>
                {{ roleMeta[person.role].label }}
              </span>
              <span v-if="!person.isActive" class="people-state is-off">
                <i class="pi pi-ban" aria-hidden="true"></i> Deactivated
              </span>
            </span>
            <span class="people-cell people-cell-email" role="cell">
              <span v-if="person.emailVerified" class="people-state is-ok">
                <i class="pi pi-check-circle" aria-hidden="true"></i> Verified
              </span>
              <span v-else class="people-state is-warn">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i> Unverified
              </span>
              <span class="people-provider">
                <i
                  :class="person.provider === 'google' ? 'pi pi-google' : 'pi pi-envelope'"
                  aria-hidden="true"
                ></i>
                {{ person.provider === 'google' ? 'Google' : 'Password' }}
              </span>
            </span>
            <span class="people-cell people-col-num" role="cell">
              <strong>{{ person.orderCount }}</strong>
              <small class="people-mobile-label">{{
                person.orderCount === 1 ? 'order' : 'orders'
              }}</small>
            </span>
            <span class="people-cell people-col-seen" role="cell">
              <small class="people-mobile-label">Last sign-in</small>
              <span>{{ person.lastLogin ? relativeTime(person.lastLogin) : 'Never' }}</span>
            </span>
            <span class="people-cell people-col-joined" role="cell">
              <small class="people-mobile-label">Joined</small>
              <span>{{ formatOrderDate(person.dateJoined) }}</span>
            </span>
            <i class="pi pi-chevron-right people-chevron" aria-hidden="true"></i>
          </RouterLink>
        </div>

        <nav
          v-if="!usersQuery.isPending.value && (people.length || pageIndex > 0)"
          class="ops-pagination"
          aria-label="People pages"
        >
          <div class="ops-page-size">
            <span>Show</span>
            <Select
              v-model="pageSize"
              :options="pageSizeOptions"
              option-label="label"
              option-value="value"
              class="kedak-select kedak-select--small"
              aria-label="People per page"
            />
            <span>per page</span>
          </div>
          <p class="ops-page-status" aria-live="polite">
            Page {{ pageIndex + 1 }} · {{ pageRange.from }}–{{ pageRange.to }}
          </p>
          <div class="ops-page-buttons">
            <button
              type="button"
              :disabled="pageIndex === 0"
              aria-label="Previous page"
              @click="pageIndex -= 1"
            >
              <i class="pi pi-chevron-left" aria-hidden="true"></i>
              <span>Previous</span>
            </button>
            <button
              type="button"
              :disabled="!hasNextPage || usersQuery.isFetchingNextPage.value"
              aria-label="Next page"
              @click="goToNextPage"
            >
              <span>Next</span>
              <i
                :class="
                  usersQuery.isFetchingNextPage.value
                    ? 'pi pi-spin pi-spinner'
                    : 'pi pi-chevron-right'
                "
                aria-hidden="true"
              ></i>
            </button>
          </div>
        </nav>
      </section>
    </template>
    <p class="legal-note">
      Every change here is recorded with your name. Passwords are never shown or set by staff.
    </p>
  </main>
</template>
