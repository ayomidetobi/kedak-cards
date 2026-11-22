import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against a REAL frontend + Django API (no mocks).
 *
 * Start both first, e.g.
 *   API:      python manage.py runserver 127.0.0.1:8001   (seeded: migrate, import_artwork, seed_demo_data)
 *   Frontend: VITE_API_BASE_URL=http://localhost:8001/api/v1 npx vite --port 5174
 * Then: E2E_BASE_URL=http://localhost:5174 E2E_API_URL=http://localhost:8001/api/v1 npm run test:e2e
 *
 * E2E_BACKEND_LOG (optional) points at the API's console log so the email-verification test can
 * read the link from the console email backend.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
