/**
 * Skeleton loaders.
 *
 *   SkeletonScreen.vue  Accessible wrapper (role="status", "Loading…" for screen readers).
 *   parts/              Reusable building blocks (page header, product card, cart item, …).
 *   pages/              One skeleton per page, mirroring that page's real layout classes so
 *                       columns and breakpoints line up with the loaded page.
 *
 * Where they are used today
 *   App.vue shows `skeletonForRoute(route)` while a page is being loaded (its code chunk on
 *   first visit), only if loading takes longer than a short delay, so fast loads don't flash.
 *
 * API data: only the data pulses (static content renders immediately)
 *   SkeletonValue  one value (a number, a fact) while its request is pending.
 *   SkeletonRows   placeholder rows inside a list/table/grid that is already on screen.
 *   Never replace a whole page or card with a skeleton just because part of it is loading.
 *
 * Whole-page skeletons (legacy usage)
 *   Render the page's skeleton while its request is pending, then swap in the real content:
 *
 *     const { data: cart, isLoading } = useCartQuery()   // your data layer
 *
 *     <CartSkeleton v-if="isLoading" />
 *     <main v-else class="journey-main cart-main">…</main>
 *
 *   Size a skeleton to what you expect where you can (e.g. `<CartSkeleton :items="lastKnownCount" />`).
 *   Styling lives in main.css under "Skeleton loaders"; colours follow the theme tokens.
 */
import type { Component } from 'vue'
import type { RouteRecordNameGeneric } from 'vue-router'
import AccountSkeleton from './pages/AccountSkeleton.vue'
import CartSkeleton from './pages/CartSkeleton.vue'
import CheckoutSkeleton from './pages/CheckoutSkeleton.vue'
import CollectionsSkeleton from './pages/CollectionsSkeleton.vue'
import HomeSkeleton from './pages/HomeSkeleton.vue'
import OrderTrackingSkeleton from './pages/OrderTrackingSkeleton.vue'
import PageSkeleton from './pages/PageSkeleton.vue'
import ProductDetailsSkeleton from './pages/ProductDetailsSkeleton.vue'

export { default as SkeletonScreen } from './SkeletonScreen.vue'
export { default as CartItemSkeleton } from './parts/CartItemSkeleton.vue'
export { default as FormSectionSkeleton } from './parts/FormSectionSkeleton.vue'
export { default as OrderSummarySkeleton } from './parts/OrderSummarySkeleton.vue'
export { default as PageHeaderSkeleton } from './parts/PageHeaderSkeleton.vue'
export { default as ProductCardSkeleton } from './parts/ProductCardSkeleton.vue'
export { default as SkeletonRows } from './parts/SkeletonRows.vue'
export { default as SkeletonValue } from './parts/SkeletonValue.vue'
export {
  AccountSkeleton,
  CartSkeleton,
  CheckoutSkeleton,
  CollectionsSkeleton,
  HomeSkeleton,
  OrderTrackingSkeleton,
  PageSkeleton,
  ProductDetailsSkeleton,
}

/** Route name → skeleton. Routes not listed fall back to the generic PageSkeleton. */
export const routeSkeletons: Partial<Record<string, Component>> = {
  home: HomeSkeleton,
  collections: CollectionsSkeleton,
  customise: CollectionsSkeleton,
  monogram: CollectionsSkeleton,
  product: ProductDetailsSkeleton,
  cart: CartSkeleton,
  checkout: CheckoutSkeleton,
  account: AccountSkeleton,
  tracking: OrderTrackingSkeleton,
}

export function skeletonForRoute(name: RouteRecordNameGeneric | null | undefined): Component {
  return (typeof name === 'string' && routeSkeletons[name]) || PageSkeleton
}
