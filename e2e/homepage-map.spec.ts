import { test, expect } from '@playwright/test'

test('Homepage map loads', async ({ page }) => {
  await page.goto('/')
  // Leaflet map container commonly rendered as .leaflet-container
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 5000 })
})
