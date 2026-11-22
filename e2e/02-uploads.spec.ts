import { expect, test } from '@playwright/test'
import { API_URL, fakeFile, tinyPng } from './helpers'

async function openUploadMode(page: import('@playwright/test').Page) {
  await page.goto('/customise')
  await page.locator('label[for="customization-mode-custom"]').click()
  await expect(page.getByText('Drag and drop your artwork here')).toBeVisible()
}

test.describe('Custom artwork uploads (live API)', () => {
  test('uploads a PNG through the API and previews the stored image', async ({ page }) => {
    await openUploadMode(page)
    const upload = page.waitForResponse(
      (r) => r.url() === `${API_URL}/uploads/artwork` && r.request().method() === 'POST',
    )
    await page.locator('input[type="file"]').setInputFiles(tinyPng())
    const response = await upload
    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body).toMatchObject({ name: 'artwork.png', type: 'image/png' })
    expect(body.id).toBeTruthy()
    // Multipart with a browser-generated boundary, never a hand-set content type.
    expect(response.request().headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/)

    await expect(page.getByRole('button', { name: /Preview artwork 1: artwork\.png/ })).toBeVisible()
    // The returned URL serves the re-encoded image.
    const served = await page.request.get(new URL(body.url, API_URL).toString())
    expect(served.status()).toBe(200)
    expect(served.headers()['content-type']).toMatch(/image\/png/)

    const add = page.getByRole('button', { name: 'Add to cart' }).first()
    await expect(add).toBeEnabled()
    const validation = page.waitForResponse((r) => r.url() === `${API_URL}/cart/validate`)
    await add.click()
    const sent = JSON.parse((await validation).request().postData()!)
    expect(sent.items[0].customization).toMatchObject({
      customizationMode: 'custom',
      uploadedArtworkIds: [body.id],
    })
  })

  test('rejects wrong types and oversized files before uploading', async ({ page }) => {
    await openUploadMode(page)
    let uploads = 0
    page.on('request', (r) => {
      if (r.url().endsWith('/uploads/artwork')) uploads += 1
    })
    await page.locator('input[type="file"]').setInputFiles(fakeFile('notes.txt', 100))
    await expect(page.getByText(/Choose a PNG, JPEG or WebP image/).first()).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles(fakeFile('huge.png', 6 * 1024 * 1024))
    await expect(page.getByText(/5 MB or smaller/).first()).toBeVisible()
    expect(uploads).toBe(0)
  })

  test('shows the server’s rejection for a file that only looks like a PNG', async ({ page }) => {
    await openUploadMode(page)
    const upload = page.waitForResponse((r) => r.url() === `${API_URL}/uploads/artwork`)
    await page.locator('input[type="file"]').setInputFiles(fakeFile('fake.png', 2048))
    const response = await upload
    expect([415, 422]).toContain(response.status())
    await expect(page.locator('.upload-error[role="alert"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /Preview artwork/ })).toHaveCount(0)
  })
})
