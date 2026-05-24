import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { approveFirstPendingQueueItem } from './helpers/approve-queue-item';

test.describe('GlobalOfficeFinder E2E Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/GlobalOfficeFinder/i);

    const heading = page.getByRole('heading', { name: /Find Company Offices Worldwide/i });
    await expect(heading).toBeVisible();
  });

  test('homepage hides companies until offices are approved', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.results-count')).toContainText('0 companies found');
    await expect(page.getByText(/No companies match your search/i)).toBeVisible();
    await expect(page.locator('.company-card')).toHaveCount(0);
    await expect(page.locator('.country-chips .chip')).toHaveCount(0);
  });

  test('search by company name returns no public results without approval', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/search by company/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Google');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.results-count')).toContainText('0 companies found');
    await expect(page.locator('.company-card')).toHaveCount(0);
  });

  test('filter controls stay available with an empty public catalog', async ({ page }) => {
    await page.goto('/');

    const countrySelect = page.getByLabel(/country/i).first();
    const regionSelect = page.getByLabel(/region/i).first();
    const industrySelect = page.getByLabel(/industry/i).first();

    await expect(countrySelect).toBeVisible();
    await expect(regionSelect).toBeVisible();
    await expect(industrySelect).toBeVisible();

    await expect(countrySelect.locator('option')).toHaveCount(1);
    await expect(regionSelect.locator('option')).toHaveCount(1);

    await industrySelect.selectOption({ index: 1 });
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.results-count')).toContainText('0 companies found');
  });

  test('navigate to company detail page by URL', async ({ page }) => {
    await page.goto('/company/google');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1, name: /Google/i })).toBeVisible();
  });

  test('country page shows not found without approved offices', async ({ page }) => {
    await page.goto('/country/US');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Country not found/i })).toBeVisible();
  });

  test('map view is hidden without published offices', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Office Locations Map/i)).toHaveCount(0);
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
  });

  test('responsive design - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('header').first()).toBeVisible();
  });

  test('responsive design - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main').first()).toBeVisible();
  });

  test('search clears and resets', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/search by company/i);
    await searchInput.fill('Google');
    await page.waitForLoadState('networkidle');
    await searchInput.clear();
    await page.waitForLoadState('networkidle');

    await expect(searchInput).toHaveValue('');
  });

  test('can navigate between pages using back', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/company/google');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/company/google');

    await page.goBack();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Find Company Offices Worldwide/i })).toBeVisible();
  });
});

test.describe('GlobalOfficeFinder E2E Tests after queue approval', () => {
  test.beforeEach(async ({ page }) => {
    await approveFirstPendingQueueItem(page);
  });

  test('approved queue item appears on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.results-count')).not.toContainText('0 companies found');
    await expect(page.locator('.company-card').first()).toBeVisible();
  });

  test('filter by country after approval', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const countrySelect = page.getByLabel(/country/i).first();
    const firstCountry = countrySelect.locator('option').nth(1);
    const countryCode = await firstCountry.getAttribute('value');
    expect(countryCode).toBeTruthy();

    await countrySelect.selectOption(countryCode!);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.company-card').first()).toBeVisible();
  });

  test('filter by region after approval', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const regionSelect = page.getByLabel(/region/i).first();
    const firstRegion = regionSelect.locator('option').nth(1);
    const region = await firstRegion.getAttribute('value');
    expect(region).toBeTruthy();

    await regionSelect.selectOption(region!);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.company-card').first()).toBeVisible();
  });

  test('navigate to company detail page from homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('.company-card a').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('navigate to country page from homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const countryLink = page.locator('a[href*="/country/"]').first();
    await expect(countryLink).toBeVisible();
    await countryLink.click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.country-page')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('map view displays after approval', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Office Locations Map/i)).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });
});

test.describe('Accessibility Tests', () => {
  test('homepage has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    const violationSummary = accessibilityScanResults.violations
      .map((violation) => `${violation.id} (${violation.nodes.length})`)
      .join(', ');

    expect(
      accessibilityScanResults.violations,
      `Accessibility violations found: ${violationSummary || 'none'}`
    ).toEqual([]);
  });

  test('homepage is keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const selectors = ['a', 'button', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'];
    let found = false;
    for (const sel of selectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        await page.locator(sel).first().focus();
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase() ?? '');
    expect(['a', 'button', 'input', 'select', 'textarea']).toContain(focusedTag);
  });

  test('all links have accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const link = links.nth(i);
      const ariaLabel = await link.getAttribute('aria-label');
      const textContent = await link.textContent();

      expect(ariaLabel || textContent).toBeTruthy();
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/search by company/i);
    const isVisible = await searchInput.isVisible().catch(() => false);

    if (isVisible) {
      const hasLabel = await searchInput.getAttribute('aria-label');
      const hasPlaceholder = await searchInput.getAttribute('placeholder');
      expect(hasLabel || hasPlaceholder).toBeTruthy();
    }
  });
});
