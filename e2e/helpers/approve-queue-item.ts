import type { Page } from '@playwright/test';

/** Approve the first pending scraper item on the review queue page. */
export async function approveFirstPendingQueueItem(page: Page) {
  await page.goto('/review-queue');
  await page.locator('[aria-label="Pending review"] .btn-approve').first().click();
}
