import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export function getFilterTrigger(page: Page, label: RegExp | string) {
  return page.getByLabel(label).first();
}

export async function expectFilterOptionCount(
  page: Page,
  label: RegExp | string,
  count: number,
) {
  const trigger = getFilterTrigger(page, label);
  await trigger.click();
  const listbox = page.getByRole('listbox', { name: label });
  await expect(listbox.getByRole('option')).toHaveCount(count);
  await page.keyboard.press('Escape');
}

export async function selectFilterOption(
  page: Page,
  label: RegExp | string,
  optionIndex: number,
) {
  const trigger = getFilterTrigger(page, label);
  await trigger.click();
  const listbox = page.getByRole('listbox', { name: label });
  await listbox.getByRole('button').nth(optionIndex).click();
  await page.waitForLoadState('networkidle');
}
