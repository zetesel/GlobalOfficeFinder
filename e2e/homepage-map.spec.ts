import { test, expect } from '@playwright/test';

test('Homepage map is hidden without published offices', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
});
