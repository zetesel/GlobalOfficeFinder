import { test, expect } from '@playwright/test';
import { approveFirstPendingQueueItem } from './helpers/approve-queue-item';

test('Country page smoke test from homepage after queue approval', async ({ page }) => {
  await approveFirstPendingQueueItem(page);
  await page.goto('/');

  const chips = page.locator('.country-chips .chip');
  await expect(chips.first()).toBeVisible();
  await chips.first().click();

  await expect(page.locator('.country-page')).toBeVisible({ timeout: 5000 });
});

test('Review queue lists unpublished catalog offices', async ({ page }) => {
  await page.goto('/review-queue');

  await expect(page.getByRole('heading', { name: /Unpublished in catalog/i })).toBeVisible();
  await expect(page.locator('.held-back-catalog-list li').first()).toBeVisible();
});
