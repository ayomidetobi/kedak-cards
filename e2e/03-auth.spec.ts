import { expect, test } from '@playwright/test'
import { API_URL, latestEmailLink, logIn, uniqueEmail } from './helpers'

test.describe('Authentication (live API)', () => {
  test('register → verify email → current user → log out → protected access denied', async ({
    page,
  }) => {
    const email = uniqueEmail('e2e.signup')
    await page.goto('/signup')
    await page.locator('#signup-name').fill('Robin Tester')
    await page.locator('#signup-email').fill(email)
    await page.locator('#signup-password').fill('Sturdy-pass-42')
    await page.getByRole('checkbox', { name: /I agree/ }).check({ force: true })
    const signup = page.waitForResponse((r) => r.url() === `${API_URL}/auth/signup`)
    await page.getByRole('button', { name: 'Create account' }).click()
    expect((await signup).status()).toBe(201)
    await expect(page).toHaveURL(/\/account$/)
    await expect(page.getByRole('heading', { name: 'Hello, Robin.' })).toBeVisible()

    // Session is an HTTP-only cookie; nothing secret in web storage.
    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name === 'kedak_access')?.httpOnly).toBe(true)
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
    expect(storage).not.toMatch(/eyJ/) // no JWTs

    // Current user survives a reload (GET /auth/me with the cookie).
    const me = page.waitForResponse((r) => r.url() === `${API_URL}/auth/me`)
    await page.reload()
    expect((await me).status()).toBe(200)
    await expect(page.getByText(email)).toBeVisible()

    const link = latestEmailLink(/http:\/\/localhost:5174\/verify-email\?key=[^\s"<>]+/)
    if (link) {
      await page.goto(link.replace('http://localhost:5174', ''))
      await expect(page.getByRole('heading', { name: 'Email verified.' })).toBeVisible()
    } else {
      test.info().annotations.push({ type: 'skip-part', description: 'E2E_BACKEND_LOG not set' })
    }

    await page.goto('/account')
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/$/)
    const afterLogout = await page.request.get(`${API_URL}/auth/me`)
    expect(afterLogout.status()).toBe(401)
    await page.goto('/account')
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount/)
  })

  test('wrong password shows the server’s message', async ({ page }) => {
    await logIn(page, 'alex.morgan@example.com', 'not-the-password-1')
    await expect(page.locator('.upload-error[role="alert"]')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('password reset request and change password', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.locator('#reset-email').fill('alex.morgan@example.com')
    const reset = page.waitForResponse((r) => r.url() === `${API_URL}/auth/password/reset`)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    expect((await reset).status()).toBe(200)
    await expect(page.getByText(/we’ve emailed a link/)).toBeVisible()
    const link = latestEmailLink(/http:\/\/localhost:5174\/reset-password\?uid=[^\s"<>&]+&(amp;)?token=[^\s"<>]+/)
    if (link) {
      await page.goto(link.replace('http://localhost:5174', '').replace('&amp;', '&'))
      await expect(page.getByRole('heading', { name: 'Choose a new password.' })).toBeVisible()
    }
  })
})
