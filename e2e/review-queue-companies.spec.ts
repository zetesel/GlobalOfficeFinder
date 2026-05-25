import { test, expect } from '@playwright/test';

test('review queue company tile opens drawer with offices', async ({ page }) => {
  await page.goto('/review-queue');

  const tile = page.locator('.company-review-tile').first();
  await expect(tile).toBeVisible();
  await tile.click();

  await expect(page.locator('.review-drawer')).toBeVisible();
  await expect(page.locator('.office-review-row').first()).toBeVisible();
});

test('approve office in drawer updates export link', async ({ page }) => {
  await page.goto('/review-queue');

  await page.locator('.company-review-tile').first().click();
  await page.locator('.office-review-row .btn-approve').first().click();

  const exportLink = page.getByRole('link', { name: /Download approved JSON/i });
  await expect(exportLink).not.toHaveAttribute('aria-disabled', 'true');
});

test('footer disclaimer is visible on homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer .footer-disclaimer')).toBeVisible();
});
