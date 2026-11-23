<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import SkeletonText from '../skeletons/parts/SkeletonText.vue'
import type { StaffUser } from '../../services/api/endpoints/users'
import { formatOrderDate } from '../../utils/orderPolicy'
import { formatRelativeDate, initialsOf, roleMeta } from '../../utils/people'

/**
 * One account in the People table. With `loading` it renders the same row structure with
 * placeholders sized to the real content (avatar, name and email lines, role pill, status
 * lines, figures), so the table doesn't shift when data arrives.
 */
const props = defineProps<{ person?: StaffUser; loading?: boolean; isSelf?: boolean }>()
</script>

<template>
  <div v-if="props.loading || !props.person" class="people-item is-skeleton" aria-hidden="true">
    <span class="people-person">
      <Skeleton shape="circle" size="40px" class="people-avatar-skeleton" />
      <span class="people-ident">
        <strong><SkeletonText width="8.5rem" /></strong>
        <small><SkeletonText width="11.5rem" /></small>
      </span>
    </span>
    <span class="people-cell people-cell-role">
      <span class="people-role is-skeleton">
        <SkeletonText width="5.2rem" />
      </span>
    </span>
    <span class="people-cell people-cell-email">
      <span class="people-state"><SkeletonText width="4.6rem" /></span>
      <span class="people-provider">
        <SkeletonText width="4rem" />
      </span>
    </span>
    <span class="people-cell people-col-num">
      <strong><SkeletonText width="1.4ch" /></strong>
      <small class="people-mobile-label">orders</small>
    </span>
    <span class="people-cell people-col-seen">
      <small class="people-mobile-label">Last sign-in</small>
      <span><SkeletonText width="4.5rem" /></span>
    </span>
    <span class="people-cell people-col-joined">
      <small class="people-mobile-label">Joined</small>
      <span><SkeletonText width="5.2rem" /></span>
    </span>
    <i class="pi pi-chevron-right people-chevron" aria-hidden="true"></i>
  </div>

  <RouterLink
    v-else
    :to="{ name: 'ops-user', params: { id: props.person.id } }"
    class="people-item"
    :class="{ 'is-inactive': !props.person.isActive }"
    role="row"
    :aria-label="`Open ${props.person.name || props.person.email}`"
  >
    <span class="people-person" role="cell">
      <span class="people-avatar" :class="`is-${props.person.role}`" aria-hidden="true">{{
        initialsOf(props.person)
      }}</span>
      <span class="people-ident">
        <strong>
          {{ props.person.name || '—' }}
          <span v-if="props.isSelf" class="people-you">You</span>
        </strong>
        <small :title="props.person.email">{{ props.person.email }}</small>
      </span>
    </span>
    <span class="people-cell people-cell-role" role="cell">
      <span class="people-role" :class="`is-${props.person.role}`">
        <i :class="roleMeta[props.person.role].icon" aria-hidden="true"></i>
        {{ roleMeta[props.person.role].label }}
      </span>
      <span v-if="!props.person.isActive" class="people-state is-off">
        <i class="pi pi-ban" aria-hidden="true"></i> Deactivated
      </span>
    </span>
    <span class="people-cell people-cell-email" role="cell">
      <span v-if="props.person.emailVerified" class="people-state is-ok">
        <i class="pi pi-check-circle" aria-hidden="true"></i> Verified
      </span>
      <span v-else class="people-state is-warn">
        <i class="pi pi-exclamation-circle" aria-hidden="true"></i> Unverified
      </span>
      <span class="people-provider">
        <i
          :class="props.person.provider === 'google' ? 'pi pi-google' : 'pi pi-envelope'"
          aria-hidden="true"
        ></i>
        {{ props.person.provider === 'google' ? 'Google' : 'Password' }}
      </span>
    </span>
    <span class="people-cell people-col-num" role="cell">
      <strong>{{ props.person.orderCount }}</strong>
      <small class="people-mobile-label">{{
        props.person.orderCount === 1 ? 'order' : 'orders'
      }}</small>
    </span>
    <span class="people-cell people-col-seen" role="cell">
      <small class="people-mobile-label">Last sign-in</small>
      <span>{{
        props.person.lastLogin
          ? formatRelativeDate(props.person.lastLogin, formatOrderDate)
          : 'Never'
      }}</span>
    </span>
    <span class="people-cell people-col-joined" role="cell">
      <small class="people-mobile-label">Joined</small>
      <span>{{ formatOrderDate(props.person.dateJoined) }}</span>
    </span>
    <i class="pi pi-chevron-right people-chevron" aria-hidden="true"></i>
  </RouterLink>
</template>
