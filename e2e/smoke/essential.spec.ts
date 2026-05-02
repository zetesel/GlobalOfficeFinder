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
  // Small delay to allow results to render
  await page.waitForTimeout(500);
  // Verify that Google appears in results
  await expect(page.locator('text=Google')).toBeVisible();
});
