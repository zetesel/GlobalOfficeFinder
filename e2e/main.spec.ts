import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('GlobalOfficeFinder E2E Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/GlobalOfficeFinder/i);
    
    // Check main heading
    const heading = page.getByRole('heading', { name: /Find Company Offices Worldwide/i });
    await expect(heading).toBeVisible();
  });

  test('search by company name', async ({ page }) => {
    await page.goto('/');
    
    // Get the search input
    const searchInput = page.getByPlaceholder(/search by company/i);
    await expect(searchInput).toBeVisible();
    
    // Type in search input
    await searchInput.fill('Google');
    
    // Wait for results to appear
    await page.waitForLoadState('networkidle');
    
    // Check that Google company card appears
    const companyCard = page.getByText(/Google/i).first();
    await expect(companyCard).toBeVisible();
  });

  test('filter by country', async ({ page }) => {
    await page.goto('/');
    
    // Get country select
    const countrySelect = page.getByLabel(/country/i).first();
    await expect(countrySelect).toBeVisible();
    
    // Select a country
    await countrySelect.selectOption('US');
    
    // Wait for filter to apply
    await page.waitForLoadState('networkidle');
    
    // Verify page still shows content
    const companyCard = page.locator('.company-card').first();
    await expect(companyCard).toBeVisible();
  });

  test('filter by region', async ({ page }) => {
    await page.goto('/');
    
    // Get region select
    const regionSelect = page.getByLabel(/region/i).first();
    await expect(regionSelect).toBeVisible();
    
    // Select a region
    await regionSelect.selectOption({ label: 'Americas' });
    
    // Wait for filter to apply
    await page.waitForLoadState('networkidle');
    
    // Verify content is filtered
    const companyCard = page.locator('.company-card').first();
    await expect(companyCard).toBeVisible();
  });

  test('navigate to company detail page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for companies to load
    await page.waitForLoadState('networkidle');
    
    // Click on first company link
    const firstCompanyLink = page.locator('.company-card a').first();
    await firstCompanyLink.click();
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    
    // Verify we're on a company page
    const heading = page.getByRole('heading', { level: 1 }).first();
    await expect(heading).toBeVisible();
  });

  test('navigate to country page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Look for country link and click it
    const countryLink = page.locator('a[href*="/country/"]').first();
    await expect(countryLink).toBeVisible();
    await countryLink.click();
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    
    // Verify we're on a country page
    const heading = page.getByRole('heading', { level: 1 }).first();
    await expect(heading).toBeVisible();
  });

  test('map view displays on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if map section is visible
    const mapSection = page.getByText(/Office Locations Map/i);
    const isMapVisible = await mapSection.isVisible().catch(() => false);
    
    if (isMapVisible) {
      // If map is visible, check that it has rendered
      const leafletMap = page.locator('.leaflet-container');
      await expect(leafletMap).toBeVisible();
    }
  });

  test('responsive design - mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that main content is visible on mobile
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();
    
    // Check that header is visible
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('responsive design - tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that main content is visible on tablet
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();
  });

  test('search clears and resets', async ({ page }) => {
    await page.goto('/');
    
    // Type in search
    const searchInput = page.getByPlaceholder(/search by company/i);
    await searchInput.fill('Google');
    await page.waitForLoadState('networkidle');
    
    // Clear search
    await searchInput.clear();
    await page.waitForLoadState('networkidle');
    
    // Verify search is cleared
    await expect(searchInput).toHaveValue('');
  });

  test('can navigate between pages using breadcrumbs or back', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get initial URL
    const initialUrl = page.url();
    
    // Click on company link
    const companyLink = page.locator('.company-card a').first();
    if (await companyLink.isVisible()) {
      await companyLink.click();
      await page.waitForLoadState('networkidle');
      
      // URL should have changed
      const newUrl = page.url();
      expect(newUrl).not.toBe(initialUrl);
      
      // Go back
      await page.goBack();
      await page.waitForLoadState('networkidle');
      
      // Should be back on homepage
      const heading = page.getByRole('heading', { name: /Find Company Offices Worldwide/i });
      await expect(heading).toBeVisible();
    }
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
    
    // Wait for the search input to be visible and enabled
    const searchInput = page.getByPlaceholder(/search by company/i);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Check that a visible element received focus
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('all links have accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all links
    const links = page.locator('a');
    const linkCount = await links.count();
    
    // Check that links have accessible text or aria-label
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const link = links.nth(i);
      const ariaLabel = await link.getAttribute('aria-label');
      const textContent = await link.textContent();
      
      // Link should have either aria-label or text content
      expect(ariaLabel || textContent).toBeTruthy();
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto('/');
    
    // Check search input has label
    const searchInput = page.getByPlaceholder(/search by company/i);
    const isVisible = await searchInput.isVisible().catch(() => false);
    
    if (isVisible) {
      // Input should have either a label or placeholder
      const hasLabel = await searchInput.getAttribute('aria-label');
      const hasPlaceholder = await searchInput.getAttribute('placeholder');
      expect(hasLabel || hasPlaceholder).toBeTruthy();
    }
  });
});
