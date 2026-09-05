import { test, expect } from "@playwright/test";

test("tooltip stays open on hover and map click, buttons work and navigate", async ({ page }) => {
  await page.goto("/country/United%20States");
  await expect(page.locator(".leaflet-container").first()).toBeVisible();

  // Click on the first pin
  await page.locator(".gof-pin").first().dispatchEvent("click");

  // Wait for tooltip to open
  const tooltip = page.locator(".gof-tip");
  await expect(tooltip).toBeVisible();

  // Check buttons inside tooltip
  const viewCoBtn = tooltip.locator(".gof-tip-btn--primary");
  await expect(viewCoBtn).toBeVisible();
  await expect(viewCoBtn).toContainText("View company");

  // Rapidly move mouse across the tooltip (flicker/blink check)
  const box = await tooltip.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    for (let x = box.x + 5; x < box.x + box.width - 5; x += 8) {
      await page.mouse.move(x, box.y + box.height / 2);
      await page.waitForTimeout(10);
    }
  }

  // Tooltip must still be visible and fully intact
  await expect(tooltip).toBeVisible();

  // Click outside on map canvas
  const mapContainer = page.locator(".leaflet-container").first();
  const mapBox = await mapContainer.boundingBox();
  if (mapBox) {
    await page.mouse.click(mapBox.x + 25, mapBox.y + 25);
  }

  // Tooltip must still remain visible because office is active
  await expect(tooltip).toBeVisible();

  // Test "View company" navigation
  await viewCoBtn.click();
  await expect(page).toHaveURL(/\/company\//);

  // Go back to country page
  await page.goBack();
  await expect(page.locator(".leaflet-container").first()).toBeVisible();

  // Click an office chip from list
  const chips = page.locator(".gof-chip-office, .gof-officecard");
  if (await chips.count() > 0) {
    await chips.first().click();
    await expect(page.locator(".gof-tip")).toBeVisible();
  }

  // Reset view closes tooltip
  const resetBtn = page.getByRole("button", { name: /reset map view/i });
  await resetBtn.click();
  await expect(page.locator(".gof-tip")).toHaveCount(0);
});

test("company page tooltip displays View country instead of View company", async ({ page }) => {
  await page.goto("/company/intel");
  await expect(page.locator(".leaflet-container").first()).toBeVisible();

  // Click on the pin
  await page.locator(".gof-pin").first().dispatchEvent("click");

  const tooltip = page.locator(".gof-tip");
  await expect(tooltip).toBeVisible();

  // Should NOT have "View company"
  const viewCoBtn = tooltip.locator(".gof-tip-btn:has-text(\"View company\")");
  await expect(viewCoBtn).toHaveCount(0);

  // Should have "View country"
  const viewCountryBtn = tooltip.locator(".gof-tip-btn--primary");
  await expect(viewCountryBtn).toBeVisible();
  await expect(viewCountryBtn).toContainText("View country");

  // Clicking View country navigates to country page
  await viewCountryBtn.click();
  await expect(page).toHaveURL(/\/country\/United%20States/);
});
