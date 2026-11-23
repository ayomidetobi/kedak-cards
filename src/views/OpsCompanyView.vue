<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import {
  useOpsCompany,
  useOpsPolicies,
  useOpsPolicy,
  useUpdateOpsCompany,
  useUpdateOpsPolicy,
} from '../queries/ops'
import type { Company, PolicySlug } from '../services/api/endpoints/company'
import { ApiError, errorMessage } from '../services/api/errors'

/**
 * Company information and policies (/ops/company). Ops and production staff can read
 * everything; only superusers see the edit controls, and the API enforces it (403).
 */
type Tab = 'company' | PolicySlug
const route = useRoute()
const router = useRouter()
const toast = useToast()

const tabs: Array<{ key: Tab; label: string; icon: string }> = [
  { key: 'company', label: 'Company information', icon: 'pi pi-building' },
  { key: 'refunds', label: 'Refund policy', icon: 'pi pi-replay' },
  { key: 'privacy', label: 'Privacy policy', icon: 'pi pi-shield' },
]
const activeTab = computed<Tab>(() => {
  const tab = route.query.tab
  return tab === 'refunds' || tab === 'privacy' ? tab : 'company'
})

const companyQuery = useOpsCompany()
const policiesQuery = useOpsPolicies()
const policyQuery = useOpsPolicy(() => (activeTab.value === 'company' ? null : activeTab.value))
const company = computed(() => companyQuery.data.value ?? null)
const policy = computed(() => policyQuery.data.value ?? null)
const canEdit = computed(() => company.value?.canEdit ?? policiesQuery.data.value?.canEdit ?? false)
const accessError = computed(() => {
  const error = companyQuery.error.value
  if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
    return 'Your account doesn’t have staff access. Ask an administrator to add you to the ops or production team.'
  }
  return error ? errorMessage(error, 'Company information couldn’t load.') : ''
})

const editing = ref(false)
const dirty = ref(false)
function selectTab(tab: Tab) {
  if (tab === activeTab.value) return
  if (editing.value && dirty.value && !window.confirm('Discard your unsaved changes?')) return
  editing.value = false
  void router.replace({ query: tab === 'company' ? {} : { tab } })
}

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

// --- Company -----------------------------------------------------------------------------------
const companyFields: Array<{
  key: keyof Company
  label: string
  type?: string
  multiline?: boolean
}> = [
  { key: 'companyName', label: 'Registered company name' },
  { key: 'companyNumber', label: 'Company number' },
  { key: 'registeredAddress', label: 'Registered address', multiline: true },
  { key: 'contactEmail', label: 'Support email', type: 'email' },
  { key: 'privacyEmail', label: 'Privacy email', type: 'email' },
  { key: 'phone', label: 'Phone (optional)', type: 'tel' },
]
const companyForm = reactive<Company>({
  companyName: '',
  companyNumber: '',
  registeredAddress: '',
  contactEmail: '',
  privacyEmail: '',
  phone: '',
})
const companyErrors = ref<Partial<Record<keyof Company, string>>>({})
const formError = ref('')
const saveCompany = useUpdateOpsCompany()

function startEditCompany() {
  if (!company.value) return
  for (const field of companyFields) companyForm[field.key] = company.value[field.key] ?? ''
  companyErrors.value = {}
  formError.value = ''
  dirty.value = false
  editing.value = true
}

async function submitCompany() {
  companyErrors.value = {}
  formError.value = ''
  try {
    await saveCompany.mutateAsync({ ...companyForm })
    editing.value = false
    toast.add({ severity: 'success', summary: 'Company information saved', life: 2600 })
  } catch (error) {
    if (error instanceof ApiError && error.fieldErrors.length) {
      for (const field of companyFields) {
        const message = error.fieldError(`/${field.key}`)
        if (message) companyErrors.value[field.key] = message
      }
    }
    formError.value =
      error instanceof ApiError && error.status === 403
        ? 'Only an administrator can change company information.'
        : errorMessage(error, 'Company information couldn’t be saved.')
  }
}

// --- Policy ------------------------------------------------------------------------------------
interface SectionDraft {
  key: number
  id: string
  heading: string
  paragraphs: string
  bullets: string
}
let nextKey = 1
const policyForm = reactive<{ title: string; summary: string; sections: SectionDraft[] }>({
  title: '',
  summary: '',
  sections: [],
})
const savePolicy = useUpdateOpsPolicy()

function startEditPolicy() {
  if (!policy.value) return
  policyForm.title = policy.value.title
  policyForm.summary = policy.value.summary
  policyForm.sections = policy.value.sections.map((section) => ({
    key: nextKey++,
    id: section.id,
    heading: section.heading,
    paragraphs: (section.paragraphs ?? []).join('\n\n'),
    bullets: (section.bullets ?? []).join('\n'),
  }))
  formError.value = ''
  dirty.value = false
  editing.value = true
}

function addSection() {
  policyForm.sections.push({ key: nextKey++, id: '', heading: '', paragraphs: '', bullets: '' })
  dirty.value = true
}
function removeSection(index: number) {
  policyForm.sections.splice(index, 1)
  dirty.value = true
}
function moveSection(index: number, step: -1 | 1) {
  const target = index + step
  if (target < 0 || target >= policyForm.sections.length) return
  const [section] = policyForm.sections.splice(index, 1)
  policyForm.sections.splice(target, 0, section!)
  dirty.value = true
}

async function submitPolicy() {
  if (activeTab.value === 'company') return
  formError.value = ''
  const empty = policyForm.sections.findIndex(
    (section) => !section.heading.trim() || (!section.paragraphs.trim() && !section.bullets.trim()),
  )
  if (empty >= 0) {
    formError.value = `Section ${empty + 1} needs a heading and at least one paragraph or bullet.`
    return
  }
  try {
    await savePolicy.mutateAsync({
      slug: activeTab.value,
      payload: {
        title: policyForm.title,
        summary: policyForm.summary,
        sections: policyForm.sections.map((section) => ({
          id: section.id || undefined,
          heading: section.heading,
          paragraphs: section.paragraphs
            .split(/\n\s*\n/)
            .map((text) => text.replace(/\s*\n\s*/g, ' ').trim())
            .filter(Boolean),
          bullets: section.bullets
            .split('\n')
            .map((text) => text.replace(/^[-•*]\s*/, '').trim())
            .filter(Boolean),
        })),
      },
    })
    editing.value = false
    toast.add({
      severity: 'success',
      summary: 'Policy published',
      detail: 'Customers see it now.',
      life: 2600,
    })
  } catch (error) {
    formError.value =
      error instanceof ApiError && error.status === 403
        ? 'Only an administrator can change policies.'
        : errorMessage(error, 'The policy couldn’t be saved.')
  }
}

function cancelEdit() {
  if (dirty.value && !window.confirm('Discard your unsaved changes?')) return
  editing.value = false
}
watch(activeTab, () => {
  editing.value = false
})

/** Splits text into plain and {token} parts so tokens can be highlighted in the preview. */
function withTokens(text: string) {
  return text
    .split(/(\{[a-z_]+\})/g)
    .filter(Boolean)
    .map((part) => ({
      text: part,
      token: /^\{[a-z_]+\}$/.test(part),
    }))
}
const copied = ref('')
async function copyToken(token: string) {
  try {
    await navigator.clipboard.writeText(token)
    copied.value = token
    setTimeout(() => (copied.value = ''), 1500)
  } catch {
    copied.value = ''
  }
}
</script>

<template>
  <main class="journey-main ops-main ops-company">
    <header class="order-header">
      <div>
        <p class="eyebrow">KEDAK / OPERATIONS / COMPANY</p>
        <h1 class="page-title">Company & policies.</h1>
        <p class="intro-copy">
          The legal details and policies customers see on the site, in emails and at checkout.
        </p>
      </div>
      <span v-if="!accessError && company" class="ops-role-chip" :class="{ 'is-admin': canEdit }">
        <i :class="canEdit ? 'pi pi-pencil' : 'pi pi-eye'" aria-hidden="true"></i>
        {{ canEdit ? 'Administrator · can edit' : 'View only' }}
      </span>
    </header>

    <p v-if="accessError" class="api-state is-error" role="alert">{{ accessError }}</p>

    <template v-else>
      <div class="ops-tabs" role="tablist" aria-label="Company and policies">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="ops-tab"
          :class="{ 'is-active': activeTab === tab.key }"
          :aria-selected="activeTab === tab.key"
          @click="selectTab(tab.key)"
        >
          <i :class="tab.icon" aria-hidden="true"></i>
          {{ tab.label }}
        </button>
      </div>

      <p v-if="!canEdit && company" class="checkout-account-note ops-view-note">
        <i class="pi pi-info-circle" aria-hidden="true"></i>
        <span>You can read this information. Only an administrator can change it.</span>
      </p>

      <!-- Company ---------------------------------------------------------------------------->
      <div v-if="activeTab === 'company'" class="order-layout">
        <div class="order-primary">
          <p v-if="companyQuery.isPending.value" class="api-state" aria-busy="true">
            <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading…
          </p>
          <section v-else-if="company && !editing" class="info-card ops-panel">
            <div class="ops-panel-head">
              <h2>Company information</h2>
              <Button
                v-if="canEdit"
                size="small"
                class="kedak-outline-action ops-edit-button"
                severity="secondary"
                outlined
                icon="pi pi-pencil"
                label="Edit"
                @click="startEditCompany"
              />
            </div>
            <dl class="ops-facts ops-company-facts">
              <div v-for="field in companyFields" :key="field.key">
                <dt>{{ field.label.replace(' (optional)', '') }}</dt>
                <dd :class="{ 'is-missing': !company[field.key] }">
                  {{ company[field.key] || 'Not set' }}
                </dd>
              </div>
            </dl>
            <p class="ops-panel-meta">
              Last changed {{ formatDate(company.updatedAt, true) }}
              <template v-if="company.updatedBy"> by {{ company.updatedBy }}</template>
            </p>
          </section>

          <form
            v-else-if="company && editing"
            class="info-card ops-panel ops-form"
            novalidate
            @submit.prevent="submitCompany"
            @input="dirty = true"
          >
            <h2>Edit company information</h2>
            <div v-for="field in companyFields" :key="field.key" class="ops-field">
              <FloatLabel class="checkout-float-label" variant="in">
                <Textarea
                  v-if="field.multiline"
                  :id="`company-${field.key}`"
                  v-model="companyForm[field.key]"
                  rows="2"
                  auto-resize
                  :invalid="Boolean(companyErrors[field.key])"
                />
                <InputText
                  v-else
                  :id="`company-${field.key}`"
                  v-model="companyForm[field.key]"
                  :type="field.type ?? 'text'"
                  :invalid="Boolean(companyErrors[field.key])"
                />
                <label :for="`company-${field.key}`">{{ field.label }}</label>
              </FloatLabel>
              <small v-if="companyErrors[field.key]" class="ops-field-error">{{
                companyErrors[field.key]
              }}</small>
            </div>
            <p v-if="formError" class="upload-error" role="alert">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i
              ><span>{{ formError }}</span>
            </p>
            <div class="ops-form-actions">
              <Button
                type="submit"
                class="kedak-action"
                label="Save changes"
                :loading="saveCompany.isPending.value"
              />
              <Button
                type="button"
                class="kedak-outline-action"
                severity="secondary"
                outlined
                label="Cancel"
                :disabled="saveCompany.isPending.value"
                @click="cancelEdit"
              />
            </div>
          </form>
        </div>
        <aside class="order-secondary">
          <section class="notice-card">
            <h2><i class="pi pi-link" aria-hidden="true"></i> Where this appears</h2>
            <p>
              These details fill the company placeholders in the refund and privacy policies, so
              both update as soon as you save.
            </p>
          </section>
        </aside>
      </div>

      <!-- Policy ----------------------------------------------------------------------------->
      <div v-else class="order-layout">
        <div class="order-primary">
          <p v-if="policyQuery.isPending.value" class="api-state" aria-busy="true">
            <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading policy…
          </p>
          <p v-else-if="policyQuery.isError.value" class="api-state is-error" role="alert">
            {{ errorMessage(policyQuery.error.value, 'This policy couldn’t load.') }}
          </p>

          <section v-else-if="policy && !editing" class="info-card ops-panel ops-policy-preview">
            <div class="ops-panel-head">
              <div>
                <p class="ops-card-kicker">
                  {{ policy.customised ? 'Published' : 'Default text' }}
                </p>
                <h2>{{ policy.title }}</h2>
              </div>
              <Button
                v-if="canEdit"
                size="small"
                class="kedak-outline-action ops-edit-button"
                severity="secondary"
                outlined
                icon="pi pi-pencil"
                label="Edit"
                @click="startEditPolicy"
              />
            </div>
            <p class="ops-policy-summary">
              <template v-for="(part, i) in withTokens(policy.summary)" :key="i">
                <span v-if="part.token" class="ops-token">{{ part.text }}</span><template v-else>{{
                  part.text
                }}</template>
              </template>
            </p>
            <section
              v-for="section in policy.sections"
              :key="section.id"
              class="ops-policy-section"
            >
              <h3>{{ section.heading }}</h3>
              <p v-for="(paragraph, p) in section.paragraphs ?? []" :key="p">
                <template v-for="(part, i) in withTokens(paragraph)" :key="i">
                  <span v-if="part.token" class="ops-token">{{ part.text }}</span><template
                    v-else
                    >{{ part.text }}</template
                  >
                </template>
              </p>
              <ul v-if="section.bullets?.length">
                <li v-for="(bullet, b) in section.bullets" :key="b">
                  <template v-for="(part, i) in withTokens(bullet)" :key="i">
                    <span v-if="part.token" class="ops-token">{{ part.text }}</span><template
                      v-else
                      >{{ part.text }}</template
                    >
                  </template>
                </li>
              </ul>
            </section>
          </section>

          <form
            v-else-if="policy && editing"
            class="info-card ops-panel ops-form"
            novalidate
            @submit.prevent="submitPolicy"
            @input="dirty = true"
          >
            <h2>Edit {{ policy.title.toLowerCase() }}</h2>
            <FloatLabel class="checkout-float-label" variant="in">
              <InputText id="policy-title" v-model="policyForm.title" maxlength="200" />
              <label for="policy-title">Title</label>
            </FloatLabel>
            <FloatLabel class="checkout-float-label" variant="in">
              <Textarea
                id="policy-summary"
                v-model="policyForm.summary"
                rows="3"
                auto-resize
                maxlength="1000"
              />
              <label for="policy-summary">Summary (shown at the top)</label>
            </FloatLabel>

            <div
              v-for="(section, index) in policyForm.sections"
              :key="section.key"
              class="ops-section-editor"
            >
              <div class="ops-section-editor-head">
                <span class="ops-section-number">Section {{ index + 1 }}</span>
                <div class="ops-section-tools">
                  <button
                    type="button"
                    :disabled="index === 0"
                    aria-label="Move section up"
                    @click="moveSection(index, -1)"
                  >
                    <i class="pi pi-arrow-up" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    :disabled="index === policyForm.sections.length - 1"
                    aria-label="Move section down"
                    @click="moveSection(index, 1)"
                  >
                    <i class="pi pi-arrow-down" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    class="is-danger"
                    :disabled="policyForm.sections.length === 1"
                    aria-label="Remove section"
                    @click="removeSection(index)"
                  >
                    <i class="pi pi-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
              <FloatLabel class="checkout-float-label" variant="in">
                <InputText
                  :id="`section-heading-${section.key}`"
                  v-model="section.heading"
                  maxlength="200"
                />
                <label :for="`section-heading-${section.key}`">Heading</label>
              </FloatLabel>
              <FloatLabel class="checkout-float-label" variant="in">
                <Textarea
                  :id="`section-paragraphs-${section.key}`"
                  v-model="section.paragraphs"
                  rows="3"
                  auto-resize
                />
                <label :for="`section-paragraphs-${section.key}`"
                  >Paragraphs (blank line between paragraphs)</label
                >
              </FloatLabel>
              <FloatLabel class="checkout-float-label" variant="in">
                <Textarea
                  :id="`section-bullets-${section.key}`"
                  v-model="section.bullets"
                  rows="2"
                  auto-resize
                />
                <label :for="`section-bullets-${section.key}`"
                  >Bullet points (one per line, optional)</label
                >
              </FloatLabel>
            </div>

            <Button
              type="button"
              class="kedak-outline-action ops-add-section"
              severity="secondary"
              outlined
              icon="pi pi-plus"
              label="Add section"
              @click="addSection"
            />
            <p v-if="formError" class="upload-error" role="alert">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i
              ><span>{{ formError }}</span>
            </p>
            <div class="ops-form-actions">
              <Button
                type="submit"
                class="kedak-action"
                label="Publish changes"
                :loading="savePolicy.isPending.value"
              />
              <Button
                type="button"
                class="kedak-outline-action"
                severity="secondary"
                outlined
                label="Cancel"
                :disabled="savePolicy.isPending.value"
                @click="cancelEdit"
              />
            </div>
          </form>
        </div>

        <aside class="order-secondary">
          <section v-if="policy" class="info-card ops-panel">
            <h2>Details</h2>
            <div class="summary-row">
              <span>Status</span><strong>{{ policy.customised ? 'Edited' : 'Default' }}</strong>
            </div>
            <div class="summary-row">
              <span>Last updated</span><strong>{{ formatDate(policy.lastUpdated) }}</strong>
            </div>
            <div class="summary-row">
              <span>Updated by</span><strong>{{ policy.updatedBy ?? '—' }}</strong>
            </div>
            <RouterLink
              :to="`/policies/${policy.slug}`"
              class="text-link ops-public-link"
              target="_blank"
            >
              View the public page <i class="pi pi-external-link" aria-hidden="true"></i>
            </RouterLink>
          </section>
          <section v-if="policy" class="notice-card ops-tokens">
            <h2><i class="pi pi-building" aria-hidden="true"></i> Company placeholders</h2>
            <p>These are replaced with the company information when the policy is published.</p>
            <ul>
              <li v-for="item in policy.tokens" :key="item.token">
                <button
                  type="button"
                  class="ops-token"
                  :title="`Copy ${item.token}`"
                  @click="copyToken(item.token)"
                >
                  {{ copied === item.token ? 'Copied' : item.token }}
                </button>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>
