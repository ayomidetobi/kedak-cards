<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useRoute, useRouter } from 'vue-router'
import BrandMark from './BrandMark.vue'
import CartQuickView from './CartQuickView.vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()
const { isDark, toggleTheme } = useTheme()
const isMenuOpen = ref(false)
const router = useRouter()
const signingOut = ref(false)

async function signOut() {
  if (signingOut.value) return
  signingOut.value = true
  try {
    await auth.signOut()
    await router.push('/login')
  } finally {
    signingOut.value = false
  }
}

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
        <BrandMark :size="30" />
        <span>{{ route.path.startsWith('/ops') ? 'Kedak / Ops' : 'Kedak Card' }}</span>
      </RouterLink>
      <nav
        id="primary-nav"
        class="primary-nav"
        :class="{ 'is-open': isMenuOpen }"
        aria-label="Primary navigation"
        @click="isMenuOpen = false"
      >
        <template v-if="route.path.startsWith('/ops')">
          <RouterLink to="/ops">Workbench</RouterLink>
          <RouterLink to="/ops/quality-check">Quality check</RouterLink>
          <RouterLink
            v-if="auth.role === 'ops' || auth.isAdmin"
            to="/ops/users"
            :class="{ 'router-link-active': route.path.startsWith('/ops/users/') }"
            >People</RouterLink
          >
          <RouterLink v-if="auth.role === 'ops' || auth.isAdmin" to="/ops/products"
            >Products</RouterLink
          >
          <RouterLink to="/ops/company">Company & policies</RouterLink>
          <!-- Back to the storefront and the staff member's own account -->
          <span class="nav-divider" aria-hidden="true"></span>
          <RouterLink to="/" class="nav-switch" aria-label="Shop" title="Back to the shop">
            <i class="pi pi-shop" aria-hidden="true"></i><span class="nav-switch-label">Shop</span>
          </RouterLink>
          <RouterLink
            to="/account"
            class="nav-switch"
            aria-label="Your account"
            title="Your account"
          >
            <i class="pi pi-user" aria-hidden="true"></i
            ><span class="nav-switch-label">Account</span>
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/collections">Collections</RouterLink>
          <RouterLink to="/help">How it works</RouterLink>
          <RouterLink v-if="auth.isSignedIn" to="/account">Account</RouterLink>
          <RouterLink v-else to="/login">Log in</RouterLink>
          <!-- Staff (production, ops, admin): jump to the ops workspace -->
          <template v-if="auth.isStaff">
            <span class="nav-divider" aria-hidden="true"></span>
            <RouterLink to="/ops" class="nav-switch">
              <i class="pi pi-briefcase" aria-hidden="true"></i> Ops
            </RouterLink>
          </template>
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
        <RouterLink
          v-if="auth.isSignedIn"
          to="/settings"
          class="theme-toggle header-icon-link"
          aria-label="Settings"
          title="Settings"
        >
          <i class="pi pi-cog" aria-hidden="true"></i>
        </RouterLink>
        <button
          v-if="route.path.startsWith('/ops') && auth.isSignedIn"
          type="button"
          class="header-signout"
          :class="{ 'is-loading': signingOut }"
          :disabled="signingOut"
          @click="signOut"
        >
          <i class="pi pi-sign-out" aria-hidden="true"></i>
          <span>Sign out</span>
        </button>
        <CartQuickView v-else-if="!route.path.startsWith('/ops')" variant="header" />
      </div>
    </div>
  </header>
</template>
