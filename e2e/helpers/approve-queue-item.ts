import type { Page } from '@playwright/test';

/** Approve the first pending scraper item on the review queue page. */
export async function approveFirstPendingQueueItem(page: Page) {
  await page.goto('/review-queue');
  await page.locator('.company-review-tile').first().click();
  await page.locator('.office-review-row .btn-approve').first().click();
}
