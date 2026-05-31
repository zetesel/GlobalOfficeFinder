import { test, expect } from "@playwright/test";

test("homepage shows companies in directory grid", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/GlobalOfficeFinder/i);
  await expect(page.locator(".gof-card").first()).toBeVisible();
});

test("search filters company list", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder(/search companies/i).fill("zzz-no-match");
  await expect(page.getByTestId("empty-state")).toBeVisible();
});

test("no-match search offers live discovery and navigates to /discover", async ({
  page,
}) => {
  // Mock the serverless endpoint so the test never calls OpenRouter.
  await page.route("**/api/discover", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        company: {
          name: "NoSuchCompanyXYZ",
          description: "A fictional company used for testing discovery.",
          website: "https://example.com",
          wikidataId: "Q1",
        },
        offices: [
          {
            country: "United States",
            countryCode: "US",
            region: "Americas",
            city: "San Francisco",
            officeType: "hq",
            latitude: 37.7749,
            longitude: -122.4194,
          },
        ],
      }),
    });
  });

  await page.goto("/");
  await page.getByPlaceholder(/search companies/i).fill("NoSuchCompanyXYZ");
  // Modal appears after the debounce (~700ms).
  const discoverBtn = page.getByRole("button", { name: /discover offices/i });
  await expect(discoverBtn).toBeVisible({ timeout: 3000 });
  await discoverBtn.click();

  await expect(page).toHaveURL(/\/discover\/nosuchcompanyxyz/);
  // The discovery map + its bar title render once results resolve.
  await expect(page.locator(".leaflet-container").first()).toBeVisible();
  await expect(page.getByText("NoSuchCompanyXYZ").first()).toBeVisible();

  // Ending the search confirms and returns home.
  await page.getByRole("button", { name: /end search/i }).click();
  await page.getByRole("button", { name: /yes, end search/i }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("navigates to a company page via direct URL", async ({ page }) => {
  await page.goto("/");
  const firstCard = page.locator(".gof-card").first();
  await expect(firstCard).toBeVisible();
  const href = await firstCard.getAttribute("href");
  expect(href).toMatch(/\/company\//);
  await firstCard.click();
  await expect(page.locator("h1.gof-hero-name").first()).toBeVisible();
});

test("map view toggle renders Leaflet map", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /map/i }).click();
  await expect(page.locator(".leaflet-container").first()).toBeVisible();
});

test("photo badges render and About-photos page is reachable", async ({ page }) => {
  await page.goto("/");
  // Each company card has a photo badge (real or sample).
  const badge = page.locator(".gof-card .gof-photo-badge").first();
  await expect(badge).toBeVisible();
  // Header link goes to /about/photos.
  await page.getByRole("link", { name: /about photos/i }).click();
  await expect(page).toHaveURL(/\/about\/photos$/);
  await expect(page.getByRole("heading", { name: /about the photos/i })).toBeVisible();
  // The credited table renders at least one entry.
  await expect(page.locator(".gof-about-table li").first()).toBeVisible();
});

test("unknown routes redirect to home", async ({ page }) => {
  await page.goto("/no-such-route");
  await expect(page).toHaveURL(/\/$/);
});

test("reset view clears the selected office and hides the tile", async ({ page }) => {
  await page.goto("/?view=map");
  await expect(page.locator(".leaflet-container").first()).toBeVisible();
  await page.locator(".gof-pin").first().dispatchEvent("click");
  await expect(page.locator(".gof-mapcard")).toBeVisible();
  await expect(page).toHaveURL(/office=/);
  await page.getByRole("button", { name: /reset map view/i }).click();
  await expect(page.locator(".gof-mapcard")).toHaveCount(0);
  await expect(page).not.toHaveURL(/office=/);
});

test("closing the tile does not refit the map", async ({ page }, testInfo) => {
  // The reset-view button overlaps the close button's screen coordinates on
  // narrow mobile viewports; covered by the 3 desktop browser projects.
  test.skip(
    /mobile/.test(testInfo.project.name),
    "map close-button coordinates collide with reset-view on small viewports",
  );
  await page.goto("/?view=map");
  await expect(page.locator(".leaflet-container").first()).toBeVisible();
  await page.locator(".gof-pin").first().dispatchEvent("click");
  const tile = page.locator(".gof-mapcard");
  await expect(tile).toBeVisible();
  // Wait for the flyTo animation to settle, then sample the map state.
  await page.waitForTimeout(900);
  const before = await page.evaluate(() => ({
    transform: document.querySelector(".leaflet-map-pane")?.getAttribute("style") ?? "",
  }));
  await tile.getByRole("button", { name: /close office details/i }).click();
  await expect(tile).toHaveCount(0);
  // Map pane transform should be unchanged (no refit animation).
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    transform: document.querySelector(".leaflet-map-pane")?.getAttribute("style") ?? "",
  }));
  expect(after.transform).toBe(before.transform);
});

test("clicking blank map space closes the tile", async ({ page }, testInfo) => {
  // With 135 globally-spread pins on a 390px viewport, the canonical "blank"
  // top-left coordinate can land on a clustered pin; this is reliable on
  // desktop browsers and not worth the flakiness on touch projects.
  test.skip(
    /mobile/.test(testInfo.project.name),
    "no reliably blank coordinate on narrow viewports",
  );
  await page.goto("/?view=map");
  await expect(page.locator(".leaflet-container").first()).toBeVisible();
  await page.locator(".gof-pin").first().dispatchEvent("click");
  await expect(page.locator(".gof-mapcard")).toBeVisible();
  // Click near top-left corner of the map, away from any pin.
  const map = page.locator(".gof-map");
  const box = await map.boundingBox();
  if (!box) throw new Error("map not measured");
  await page.mouse.click(box.x + 40, box.y + 40);
  await expect(page.locator(".gof-mapcard")).toHaveCount(0);
  await expect(page).not.toHaveURL(/office=/);
});

test("read more navigates to company page; back returns to map with selection", async ({ page }) => {
  await page.goto("/?view=map");
  await page.locator(".gof-pin").first().dispatchEvent("click");
  const tile = page.locator(".gof-mapcard");
  await expect(tile).toBeVisible();
  const name = (await tile.locator(".gof-mapcard-name").textContent())?.trim();
  expect(name).toBeTruthy();
  await tile.getByRole("button", { name: /read more/i }).click();
  await expect(page).toHaveURL(/\/company\/[^?]+\?office=/);
  // The matching office card should be highlighted on the company page.
  await expect(page.locator(".gof-officecard.is-active")).toHaveCount(1);
  await page.getByRole("button", { name: /directory/i }).click();
  await expect(page).toHaveURL(/view=map/);
  await expect(page).toHaveURL(/office=/);
  await expect(page.locator(".gof-mapcard-name")).toHaveText(name ?? "");
});
