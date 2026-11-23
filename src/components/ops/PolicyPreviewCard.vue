<script setup lang="ts">
import ActionButton from '../ActionButton.vue'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import type { OpsPolicy } from '../../services/api/endpoints/company'
import { withTokens } from '../../utils/policyTokens'

/**
 * Read-only preview of a policy on Company & policies (tokens such as {company_name}
 * highlighted). With `loading` it renders the same card with placeholders in the real
 * elements: kicker, title, summary, and three sections of heading, paragraph and bullets.
 */
const props = defineProps<{ policy?: OpsPolicy | null; loading?: boolean; canEdit?: boolean }>()
defineEmits<{ edit: [] }>()
</script>

<template>
  <section
    v-if="props.loading || !props.policy"
    class="info-card ops-panel ops-policy-preview is-skeleton"
    aria-hidden="true"
  >
    <div class="ops-panel-head">
      <div>
        <p class="ops-card-kicker"><SkeletonText width="5rem" /></p>
        <h2><SkeletonText width="14rem" /></h2>
      </div>
    </div>
    <p class="ops-policy-summary">
      <SkeletonText width="100%" /><br /><SkeletonText width="70%" />
    </p>
    <section v-for="section in 3" :key="section" class="ops-policy-section">
      <h3><SkeletonText :width="section === 2 ? '9rem' : '12rem'" /></h3>
      <p><SkeletonText width="100%" /><br /><SkeletonText width="85%" /></p>
      <ul v-if="section === 2">
        <li><SkeletonText width="60%" /></li>
        <li><SkeletonText width="50%" /></li>
      </ul>
    </section>
  </section>
  <section v-else class="info-card ops-panel ops-policy-preview">
    <div class="ops-panel-head">
      <div>
        <p class="ops-card-kicker">
          {{ props.policy.customised ? 'Published' : 'Default text' }}
        </p>
        <h2>{{ props.policy.title }}</h2>
      </div>
      <ActionButton kind="edit" v-if="props.canEdit" compact @click="$emit('edit')" />
    </div>
    <p class="ops-policy-summary">
      <template v-for="(part, i) in withTokens(props.policy.summary)" :key="i">
        <span v-if="part.token" class="ops-token">{{ part.text }}</span><template v-else>{{
          part.text
        }}</template>
      </template>
    </p>
    <section v-for="section in props.policy.sections" :key="section.id" class="ops-policy-section">
      <h3>{{ section.heading }}</h3>
      <p v-for="(paragraph, p) in section.paragraphs ?? []" :key="p">
        <template v-for="(part, i) in withTokens(paragraph)" :key="i">
          <span v-if="part.token" class="ops-token">{{ part.text }}</span><template v-else>{{
            part.text
          }}</template>
        </template>
      </p>
      <ul v-if="section.bullets?.length">
        <li v-for="(bullet, b) in section.bullets" :key="b">
          <template v-for="(part, i) in withTokens(bullet)" :key="i">
            <span v-if="part.token" class="ops-token">{{ part.text }}</span><template v-else>{{
              part.text
            }}</template>
          </template>
        </li>
      </ul>
    </section>
  </section>
</template>
