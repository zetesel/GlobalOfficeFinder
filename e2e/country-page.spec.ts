import { test, expect } from '@playwright/test'

test('Country page smoke test from homepage', async ({ page }) => {
  await page.goto('/')
  const chips = page.locator('.country-chips .chip')
  const count = await chips.count()
  if (count > 0) {
    await chips.first().click()
    // country page wrapper should appear
    await expect(page.locator('.country-page')).toBeVisible({ timeout: 5000 })
  } else {
    // No country chips; skip this check gracefully
    test.skip()
  }
})
