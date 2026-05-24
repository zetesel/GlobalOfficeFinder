import { test, expect } from '@playwright/test';

test('Shopify offices are hidden on homepage without approval', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('.company-card').filter({ hasText: 'Shopify' })).toHaveCount(0);
  await expect(page.locator('.results-count')).toContainText('0 companies found');
});
