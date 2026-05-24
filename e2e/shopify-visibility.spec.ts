import { test, expect } from '@playwright/test'

test('Shopify is hidden on homepage until offices are approved', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.company-card', { hasText: 'Shopify' })).toHaveCount(0)
  await page.locator('#search-input').fill('Shopify')
  await expect(page.locator('.results-count')).toHaveText(/0 companies found/)
})
