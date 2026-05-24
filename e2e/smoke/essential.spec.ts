import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  // Expect the hero title to be visible
  await expect(page.locator('h1')).toHaveText(/Find Company Offices Worldwide/);
});

test('search by company name shows no results when offices are unapproved', async ({ page }) => {
  await page.goto('/');
  const search = page.locator('#search-input');
  await search.fill('Google');
  await expect(page.locator('.results-count')).toHaveText(/0 companies found/);
  await expect(page.locator('a[href="/company/google"]')).toHaveCount(0);
});
