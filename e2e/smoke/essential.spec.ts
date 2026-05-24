import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText(/Find Company Offices Worldwide/);
});

test('search by company name shows no public results without approval', async ({ page }) => {
  await page.goto('/');
  const search = page.locator('#search-input');
  await search.fill('Google');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.results-count')).toContainText('0 companies found');
  await expect(page.locator('a[href="/company/google"]')).toHaveCount(0);
});
