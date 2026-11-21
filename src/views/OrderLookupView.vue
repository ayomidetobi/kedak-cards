<script setup lang="ts">
import { useRouter } from 'vue-router'
import TextLink from '../components/TextLink.vue'
import OrderLookupForm from '../components/orders/OrderLookupForm.vue'
import { useAuthStore } from '../stores/auth'
import type { Order } from '../types/order'
import { REFUND_WINDOW_DAYS } from '../utils/orderPolicy'

// Guest entry point for managing an order (track, cancel, refund) without an account.
const router = useRouter()
const auth = useAuthStore()

function openOrder(order: Order) {
  void router.push(`/account/orders/${order.id}`)
}
</script>

<template>
  <main class="journey-main order-main">
    <TextLink to="/" direction="back">Back to home</TextLink>
    <div class="auth-layout order-lookup-layout">
      <section class="info-card auth-card" aria-labelledby="lookup-title">
        <p class="eyebrow">ORDERS</p>
        <h1 id="lookup-title" class="auth-title">Find your order.</h1>
        <p class="auth-intro">
          Checked out as a guest? Enter your order reference and email to track it, cancel it or
          request a refund.
        </p>
        <OrderLookupForm @found="openOrder" />
        <p v-if="!auth.isSignedIn" class="auth-switch">
          Have an account? <RouterLink to="/login?redirect=/account">Log in</RouterLink>
        </p>
      </section>
      <aside class="auth-aside" aria-labelledby="lookup-aside-title">
        <h2 id="lookup-aside-title" class="auth-aside-title">What you can do</h2>
        <ul class="auth-benefits">
          <li>
            <span class="icon-tile icon-tile--small" aria-hidden="true"
              ><i class="pi pi-map"></i
            ></span>
            <span>
              <strong>Track progress</strong>
              <small>See every step from send-in to tracked return.</small>
            </span>
          </li>
          <li>
            <span class="icon-tile icon-tile--small" aria-hidden="true"
              ><i class="pi pi-times-circle"></i
            ></span>
            <span>
              <strong>Cancel before conversion</strong>
              <small>Full refund until we start converting your card.</small>
            </span>
          </li>
          <li>
            <span class="icon-tile icon-tile--small" aria-hidden="true"
              ><i class="pi pi-replay"></i
            ></span>
            <span>
              <strong>Request a refund</strong>
              <small
                >Within {{ REFUND_WINDOW_DAYS }} days of delivery if something isn’t right.</small
              >
            </span>
          </li>
        </ul>
        <p class="auth-security">
          <i class="pi pi-lock" aria-hidden="true"></i>
          <span>Your reference is in your confirmation email. We never ask for card details.</span>
        </p>
      </aside>
    </div>
  </main>
</template>
