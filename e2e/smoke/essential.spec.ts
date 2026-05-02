import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  // Expect the hero title to be visible
  await expect(page.locator('h1')).toHaveText(/Find Company Offices Worldwide/);
});

test('search by company name loads results', async ({ page }) => {
  await page.goto('/');
  const search = page.locator('#search-input');
  await search.fill('Google');
  // Wait for the Google company link to appear in results
  await page.waitForSelector('a[href="/company/google"]', { state: 'attached' });
  await expect(page.locator('a[href="/company/google"]')).toBeVisible();
});
