import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'

export const router = createRouter({
  history: createWebHistory(),
  // In-page anchors (e.g. policy sections) scroll to their target; everything else to the top.
  scrollBehavior: (to) => (to.hash ? { el: to.hash, top: 16 } : { top: 0 }),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    {
      path: '/collections',
      name: 'collections',
      component: () => import('./views/CollectionsView.vue'),
    },
    {
      path: '/collections/:finish',
      name: 'product',
      component: () => import('./views/ProductDetailsView.vue'),
    },
    {
      path: '/customise',
      name: 'customise',
      component: () => import('./views/CardCustomizationView.vue'),
    },
    {
      path: '/customise/monogram',
      name: 'monogram',
      component: () => import('./views/CardCustomizationView.vue'),
    },
    {
      path: '/compatibility',
      name: 'compatibility',
      component: () => import('./views/JourneyView.vue'),
    },
    {
      path: '/compatibility/result',
      name: 'compatibility-result',
      component: () => import('./views/JourneyView.vue'),
    },
    {
      path: '/manual-review',
      name: 'manual-review',
      component: () => import('./views/JourneyView.vue'),
    },
    { path: '/cart', name: 'cart', component: () => import('./views/JourneyView.vue') },
    { path: '/bag', redirect: '/cart' },
    { path: '/checkout', name: 'checkout', component: () => import('./views/JourneyView.vue') },
    {
      path: '/order/confirmed',
      name: 'confirmed',
      component: () => import('./views/JourneyView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/AuthView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('./views/AuthView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('./views/JourneyView.vue'),
      meta: { requiresAuth: true },
    },
    // Order page for everyone: signed-in owners, or guests who verify with reference + email.
    {
      path: '/account/orders/:id',
      name: 'tracking',
      component: () => import('./views/OrderDetailView.vue'),
    },
    {
      path: '/orders/find',
      name: 'order-lookup',
      component: () => import('./views/OrderLookupView.vue'),
    },
    {
      path: '/policies/refunds',
      name: 'refund-policy',
      component: () => import('./views/PolicyView.vue'),
    },
    {
      path: '/policies/privacy',
      name: 'privacy-policy',
      component: () => import('./views/PolicyView.vue'),
    },
    { path: '/policies', redirect: '/policies/refunds' },
    { path: '/help', name: 'help', component: () => import('./views/JourneyView.vue') },
    { path: '/ops', name: 'operations', component: () => import('./views/JourneyView.vue') },
    {
      path: '/ops/quality-check',
      name: 'quality-check',
      component: () => import('./views/JourneyView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// Accounts are optional: guest checkout and order tracking never require sign-in.
// Only the account dashboard does, and signed-in users skip the login/sign-up screens.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isSignedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isSignedIn) {
    return { name: 'account' }
  }
  return true
})
