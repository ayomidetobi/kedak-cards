import { expect, test } from '@playwright/test'
import { API_URL, addPresetCardToCart } from './helpers'

test.describe('Artwork and catalogue (live API)', () => {
  test('storefront loads finishes, prices and stock from Django', async ({ page }) => {
    const finishes = page.waitForResponse((r) => r.url() === `${API_URL}/finishes`)
    await page.goto('/collections/gold')
    expect((await finishes).status()).toBe(200)
    await expect(page.locator('.product-price')).toHaveText('£179')
    await expect(page.locator('.stock-badge')).toHaveText(/In stock/)
    await page.getByRole('button', { name: 'Signature (out of stock)' }).click()
    await expect(page.locator('.product-price')).toHaveText('£219')
    await expect(page.getByRole('button', { name: 'Out of stock', exact: true })).toBeDisabled()
  })

  test('categories → designs → selection appears in the customiser preview', async ({ page }) => {
    const categories = page.waitForResponse((r) => r.url() === `${API_URL}/artwork/categories`)
    await page.goto('/customise')
    expect((await categories).status()).toBe(200)

    const tabs = page.getByRole('tab')
    await expect(tabs).toHaveText(['Sport', 'Cars', 'Anime', 'Love', 'Nature'])

    const designsRequest = page.waitForResponse((r) => r.url().includes('/artwork?category=Nature'))
    await page.getByRole('tab', { name: 'Nature' }).click()
    expect((await designsRequest).status()).toBe(200)
    const designs = page.getByRole('button', { name: /^Select .* design$/ })
    await expect(designs).toHaveCount(10)
    await expect(page.locator('.design-carousel-count')).toHaveText('10 designs')

    // Thumbnails are the API's artworkUrl, not bundled assets.
    const src = await page.locator('.design-thumbnail img').first().getAttribute('src')
    expect(src).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):8001\/media\/catalogue\/|cloudinary/)

    const selectedSrc = await designs.nth(4).locator('img').getAttribute('src')
    await designs.nth(4).click()
    await expect(designs.nth(4)).toHaveAttribute('aria-pressed', 'true')
    const style = await page.locator('[style*="--card-artwork"]').first().getAttribute('style')
    expect(style).toContain(selectedSrc!)
  })

  test('a preset card is validated and priced by the server in the cart', async ({ page }) => {
    const validation = page.waitForResponse((r) => r.url() === `${API_URL}/cart/validate`)
    await addPresetCardToCart(page)
    const response = await validation
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.canCheckout).toBe(true)
    await expect(page.locator('.cart-total-row')).toContainText('£157')
    await expect(page.getByRole('button', { name: 'Checkout' }).first()).toBeEnabled()
  })
})
