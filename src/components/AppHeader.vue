<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useRoute } from 'vue-router'
import CartQuickView from './CartQuickView.vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()
const { isDark, toggleTheme } = useTheme()
const isMenuOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    isMenuOpen.value = false
  },
)
</script>

<template>
  <header class="site-header" :class="{ 'ops-header': route.path.startsWith('/ops') }">
    <div class="header-row">
      <RouterLink class="brand" :to="route.path.startsWith('/ops') ? '/ops' : '/'">
        {{ route.path.startsWith('/ops') ? 'Kedak / Ops' : 'Kedak Card' }}
      </RouterLink>
      <nav
        id="primary-nav"
        class="primary-nav"
        :class="{ 'is-open': isMenuOpen }"
        aria-label="Primary navigation"
        @click="isMenuOpen = false"
      >
        <template v-if="route.path.startsWith('/ops')">
          <RouterLink to="/ops">Orders</RouterLink>
          <RouterLink to="/ops">Production</RouterLink>
          <RouterLink to="/ops/quality-check">Quality check</RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/collections">Collections</RouterLink>
          <RouterLink to="/help">How it works</RouterLink>
          <RouterLink v-if="auth.isSignedIn" to="/account">Account</RouterLink>
          <RouterLink v-else to="/login">Log in</RouterLink>
        </template>
      </nav>
      <div class="header-actions">
        <button
          type="button"
          class="menu-toggle"
          :aria-label="isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'"
          aria-controls="primary-nav"
          :aria-expanded="isMenuOpen"
          @click="isMenuOpen = !isMenuOpen"
        >
          <i :class="isMenuOpen ? 'pi pi-times' : 'pi pi-bars'" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="theme-toggle"
          :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="toggleTheme"
        >
          <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" aria-hidden="true"></i>
        </button>
        <RouterLink v-if="route.path.startsWith('/ops')" to="/ops">Staff</RouterLink>
        <CartQuickView v-else variant="header" />
      </div>
    </div>
  </header>
</template>
