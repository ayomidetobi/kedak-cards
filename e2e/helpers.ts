import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8001/api/v1'
/** The seeded demo accounts' password: E2E_DEMO_PASSWORD (from .env.e2e.local, never committed). */
export const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? ''
if (!DEMO_PASSWORD) {
  throw new Error(
    'Set E2E_DEMO_PASSWORD (in .env.e2e.local) to the API DEMO_PASSWORD used by seed_demo_data.',
  )
}
export const DEMO_CUSTOMER = 'alex.morgan@example.com'
export const OPS_USER = 'ops.demo@example.com'

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e5)}@example.com`
}

export async function logIn(
  page: Page,
  email: string,
  password = DEMO_PASSWORD,
  redirect = '/account',
) {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
}

/** Picks a design in the customiser and adds the card to the cart. */
export async function addPresetCardToCart(page: Page, category = 'Cars') {
  await page.goto('/customise')
  await page.getByRole('tab', { name: category }).click()
  const design = page.getByRole('button', { name: /^Select .* design$/ }).nth(2)
  await expect(design).toBeVisible()
  await design.click()
  await expect(design).toHaveAttribute('aria-pressed', 'true')
  const add = page.getByRole('button', { name: 'Add to cart' }).first()
  await expect(add).toBeEnabled()
  await add.click()
  await expect(page).toHaveURL(/\/cart$/)
}

/** Fills the checkout form (PrimeVue Select for country uses its filter). */
export async function fillCheckout(page: Page, email: string) {
  await page.locator('#checkout-email').fill(email)
  await page.locator('#checkout-phone').fill('20 7946 0958')
  await page.locator('#checkout-name').fill('Taylor Guest')
  await page.locator('#checkout-address').fill('1 Test Street')
  await page.locator('#checkout-city').fill('London')
  await page.locator('#checkout-postcode').fill('SW1A 1AA')
  await page.locator('#checkout-country').click()
  await page.getByRole('searchbox').last().fill('United Kingdom')
  await page.getByRole('option', { name: 'United Kingdom', exact: true }).click()
  await page.locator('#order-ack').check({ force: true })
}

export function tinyPng(dir = mkdtempSync(join(tmpdir(), 'kedak-e2e-'))) {
  // 2×2 red PNG
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
    'base64',
  )
  const file = join(dir, 'artwork.png')
  writeFileSync(file, bytes)
  return file
}

export function fakeFile(name: string, sizeBytes: number) {
  const dir = mkdtempSync(join(tmpdir(), 'kedak-e2e-'))
  const file = join(dir, name)
  writeFileSync(file, Buffer.alloc(sizeBytes, 1))
  return file
}

/** Reads the newest link matching `pattern` from the API console-email log. */
export function latestEmailLink(pattern: RegExp): string | null {
  const log = process.env.E2E_BACKEND_LOG
  if (!log) return null
  const text = readFileSync(log, 'utf8').replace(/=\r?\n/g, '')
  const matches = [...text.matchAll(new RegExp(pattern.source, 'g'))]
  return matches.length ? matches[matches.length - 1]![0] : null
}

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password = DEMO_PASSWORD,
) {
  const response = await request.post(`${API_URL}/auth/login`, { data: { email, password } })
  expect(response.ok()).toBeTruthy()
  return response
}
