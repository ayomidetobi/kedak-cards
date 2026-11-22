# Kedak Card

Vue 3 storefront (Composition API, TypeScript, Vite, PrimeVue 4, Tailwind CSS 4) for the
Kedak Card Django REST API (`../kedak-bank-api`).

## Getting started

Requires Node.js 20.19+ or 22.12+ and a running API.

```sh
npm install
cp .env.example .env.local      # set VITE_API_BASE_URL (and VITE_GOOGLE_CLIENT_ID)
npm run dev
```

`.env.development` points at `http://localhost:8000/api/v1`. Production builds fail unless
`VITE_API_BASE_URL` is set. The API must list this site's origin in `CORS_ALLOWED_ORIGINS`
and `CSRF_TRUSTED_ORIGINS`.

## Architecture

| Concern | Where |
|---|---|
| HTTP (single Axios client, CSRF, session refresh, RFC 9457 errors) | `src/services/api/` |
| Endpoint functions per area | `src/services/api/endpoints/` |
| Server state (TanStack Vue Query hooks, key factory) | `src/queries/` |
| Client state (Pinia: customiser draft, cart lines, compatibility answers) | `src/stores/` |
| Contract types (generated) | `src/types/api/` (`npm run api:types`) |

- **Auth:** JWTs are HTTP-only cookies set by Django; the SPA never stores tokens. Unsafe
  requests carry `X-CSRFToken` from `GET /auth/csrf`. A 401 triggers one refresh via
  `POST /auth/token/refresh`; login/logout drop all user-scoped caches.
- **Prices, stock and checkout readiness** always come from the API (`/finishes`,
  `/cart/validate`); the client never treats its own numbers as authoritative.
- **Guest order tokens** (`X-Order-Access-Token`) live in memory only: after a reload, guests
  verify again with reference + email.
- **Writes** (orders, cancellations, refunds) send an `Idempotency-Key` and are never retried
  automatically.

## Checks

```sh
npm test              # unit/component tests (Vitest, API mocked at the Axios layer)
npm run build
npm run test:e2e      # Playwright against a real API + dev server (see playwright.config.ts)
```
