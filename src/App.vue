<script setup lang="ts">
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalized } from 'vue-router'
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import CartQuickView from './components/CartQuickView.vue'
import { skeletonForRoute } from './components/skeletons'
import Toast from 'primevue/toast'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()

// Show the destination page's skeleton while a navigation is slow (e.g. its code chunk is
// downloading). The short delay stops fast navigations from flashing a placeholder.
const SKELETON_DELAY_MS = 150
const pendingRoute = shallowRef<RouteLocationNormalized | null>(null)
let skeletonTimer: ReturnType<typeof setTimeout> | undefined

function settleNavigation() {
  clearTimeout(skeletonTimer)
  pendingRoute.value = null
}

const stopBeforeEach = router.beforeEach((to, from) => {
  clearTimeout(skeletonTimer)
  if (to.path !== from.path) {
    skeletonTimer = setTimeout(() => {
      pendingRoute.value = to
    }, SKELETON_DELAY_MS)
  }
})
const stopAfterEach = router.afterEach(settleNavigation)
const stopOnError = router.onError(settleNavigation)

onBeforeUnmount(() => {
  settleNavigation()
  stopBeforeEach()
  stopAfterEach()
  stopOnError()
})

// If the session ends (expired, revoked, logged out elsewhere) on a page that needs it,
// send the customer to log in and bring them back afterwards.
const auth = useAuthStore()
watch(
  () => auth.isSignedIn,
  (signedIn, wasSignedIn) => {
    if (wasSignedIn && !signedIn && route.meta.requiresAuth) {
      void router.replace({ name: 'login', query: { redirect: route.fullPath } })
    }
  },
)

// Before the first page has loaded, use the skeleton for the URL being opened.
const initialSkeleton = skeletonForRoute(router.resolve(window.location.pathname).name)
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <RouterView v-slot="{ Component }">
      <component :is="skeletonForRoute(pendingRoute.name)" v-if="pendingRoute" />
      <component :is="Component" v-else-if="Component" />
      <component :is="initialSkeleton" v-else />
    </RouterView>
    <AppFooter />
    <CartQuickView v-if="!route.path.startsWith('/ops')" variant="floating" />
    <Toast position="top-right" class="kedak-toast" />
  </div>
</template>
