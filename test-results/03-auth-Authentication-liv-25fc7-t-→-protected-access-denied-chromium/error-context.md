# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-auth.spec.ts >> Authentication (live API) >> register → verify email → current user → log out → protected access denied
- Location: e2e\03-auth.spec.ts:5:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Email verified.' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Email verified.' }) with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Email verified.' })

```

```yaml
- banner:
  - link "Kedak Card":
    - /url: /
  - navigation "Primary navigation":
    - link "Collections":
      - /url: /collections
    - link "How it works":
      - /url: /help
    - link "Account":
      - /url: /account
  - button "Switch to dark theme"
  - button "Cart, 0 items": Cart
- main:
  - link "Back to home":
    - /url: /
  - region "We couldn’t verify that link.":
    - paragraph: ACCOUNT
    - heading "We couldn’t verify that link." [level=1]
    - alert: Not found.
    - paragraph: Request a new verification email from your account page.
- contentinfo:
  - strong: Kedak Card
  - paragraph: Your card. Recrafted in metal.
  - navigation "Support navigation":
    - link "Card compatibility":
      - /url: /compatibility
    - link "Help & FAQ":
      - /url: /help
    - link "Find your order":
      - /url: /orders/find
    - link "Refund policy":
      - /url: /policies/refunds
    - link "Privacy policy":
      - /url: /policies/privacy
  - paragraph: A card conversion service, not a bank.
  - paragraph: Never share your PIN, CVV or full card number.
- button "Open cart preview, 0 items": Cart
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | import { API_URL, latestEmailLink, logIn, uniqueEmail } from './helpers'
  3  | 
  4  | test.describe('Authentication (live API)', () => {
  5  |   test('register → verify email → current user → log out → protected access denied', async ({
  6  |     page,
  7  |   }) => {
  8  |     const email = uniqueEmail('e2e.signup')
  9  |     await page.goto('/signup')
  10 |     await page.locator('#signup-name').fill('Robin Tester')
  11 |     await page.locator('#signup-email').fill(email)
  12 |     await page.locator('#signup-password').fill('Sturdy-pass-42')
  13 |     await page.getByRole('checkbox', { name: /I agree/ }).check({ force: true })
  14 |     const signup = page.waitForResponse((r) => r.url() === `${API_URL}/auth/signup`)
  15 |     await page.getByRole('button', { name: 'Create account' }).click()
  16 |     expect((await signup).status()).toBe(201)
  17 |     await expect(page).toHaveURL(/\/account$/)
  18 |     await expect(page.getByRole('heading', { name: 'Hello, Robin.' })).toBeVisible()
  19 | 
  20 |     // Session is an HTTP-only cookie; nothing secret in web storage.
  21 |     const cookies = await page.context().cookies()
  22 |     expect(cookies.find((c) => c.name === 'kedak_access')?.httpOnly).toBe(true)
  23 |     const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  24 |     expect(storage).not.toMatch(/eyJ/) // no JWTs
  25 | 
  26 |     // Current user survives a reload (GET /auth/me with the cookie).
  27 |     const me = page.waitForResponse((r) => r.url() === `${API_URL}/auth/me`)
  28 |     await page.reload()
  29 |     expect((await me).status()).toBe(200)
  30 |     await expect(page.getByText(email)).toBeVisible()
  31 | 
  32 |     const link = latestEmailLink(/http:\/\/localhost:5174\/verify-email\?key=[^\s"<>]+/)
  33 |     if (link) {
  34 |       await page.goto(link.replace('http://localhost:5174', ''))
> 35 |       await expect(page.getByRole('heading', { name: 'Email verified.' })).toBeVisible()
     |                                                                            ^ Error: expect(locator).toBeVisible() failed
  36 |     } else {
  37 |       test.info().annotations.push({ type: 'skip-part', description: 'E2E_BACKEND_LOG not set' })
  38 |     }
  39 | 
  40 |     await page.goto('/account')
  41 |     await page.getByRole('button', { name: 'Log out' }).click()
  42 |     await expect(page).toHaveURL(/\/$/)
  43 |     const afterLogout = await page.request.get(`${API_URL}/auth/me`)
  44 |     expect(afterLogout.status()).toBe(401)
  45 |     await page.goto('/account')
  46 |     await expect(page).toHaveURL(/\/login\?redirect=%2Faccount/)
  47 |   })
  48 | 
  49 |   test('wrong password shows the server’s message', async ({ page }) => {
  50 |     await logIn(page, 'alex.morgan@example.com', 'not-the-password-1')
  51 |     await expect(page.locator('.upload-error[role="alert"]')).toBeVisible()
  52 |     await expect(page).toHaveURL(/\/login/)
  53 |   })
  54 | 
  55 |   test('password reset request and change password', async ({ page }) => {
  56 |     await page.goto('/forgot-password')
  57 |     await page.locator('#reset-email').fill('alex.morgan@example.com')
  58 |     const reset = page.waitForResponse((r) => r.url() === `${API_URL}/auth/password/reset`)
  59 |     await page.getByRole('button', { name: 'Send reset link' }).click()
  60 |     expect((await reset).status()).toBe(200)
  61 |     await expect(page.getByText(/we’ve emailed a link/)).toBeVisible()
  62 |     const link = latestEmailLink(/http:\/\/localhost:5174\/reset-password\?uid=[^\s"<>&]+&(amp;)?token=[^\s"<>]+/)
  63 |     if (link) {
  64 |       await page.goto(link.replace('http://localhost:5174', '').replace('&amp;', '&'))
  65 |       await expect(page.getByRole('heading', { name: 'Choose a new password.' })).toBeVisible()
  66 |     }
  67 |   })
  68 | })
  69 | 
```