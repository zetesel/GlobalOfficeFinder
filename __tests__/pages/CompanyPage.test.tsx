import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CompanyPage from "../../src/pages/CompanyPage";

vi.mock("../../data/companies.json", () => ({
  default: [
    {
      id: "acme",
      name: "Acme Corp",
      website: "https://acme.com",
      industry: "Tech",
      description: "Acme description",
    },
    {
      id: "empty-corp",
      name: "Empty Corp",
      website: "https://empty.com",
      industry: "Finance",
      description: "No offices company",
    },
    {
      id: "single-corp",
      name: "Single Corp",
      website: "https://single.com",
      industry: "Design",
      description: "Single office company",
    },
    {
      id: "euro-corp",
      name: "Euro Corp",
      website: "https://euro.com",
      industry: "Logistics",
      description: "Single region multi country company",
    },
  ],
}));

vi.mock("../../data/offices.json", () => ({
  default: [
    {
      id: "off-us",
      companyId: "acme",
      country: "United States",
      countryCode: "US",
      region: "Americas",
      city: "New York",
      address: "123 Broadway",
      postalCode: "10001",
      officeType: "Headquarters",
      latitude: 40.7,
      longitude: -74.0,
      tag: { tone: "purple", short: "HQ" },
    },
    {
      id: "off-uk",
      companyId: "acme",
      country: "United Kingdom",
      countryCode: "GB",
      region: "Europe",
      city: "London",
      address: "10 Oxford St",
      postalCode: "W1D 1BS",
      officeType: "Regional Office",
      latitude: 51.5,
      longitude: -0.1,
      tag: { tone: "blue", short: "Regional" },
    },
    {
      id: "off-de",
      companyId: "acme",
      country: "Germany",
      countryCode: "DE",
      region: "Europe",
      city: "Berlin",
      address: "Friedrichstraße 50",
      postalCode: "10117",
      officeType: "R&D Center",
      latitude: 52.5,
      longitude: 13.4,
      tag: { tone: "teal", short: "R&D" },
    },
    {
      id: "off-single",
      companyId: "single-corp",
      country: "United States",
      countryCode: "US",
      region: "Americas",
      city: "San Francisco",
      address: "1 Market St",
      postalCode: "94105",
      officeType: "Branch",
      latitude: 37.7,
      longitude: -122.4,
      tag: { tone: "slate", short: "Branch" },
    },
    {
      id: "off-fr",
      companyId: "euro-corp",
      country: "France",
      countryCode: "FR",
      region: "Europe",
      city: "Paris",
      address: "10 Rue de la Paix",
      postalCode: "75002",
      officeType: "Regional Office",
      latitude: 48.8,
      longitude: 2.3,
      tag: { tone: "blue", short: "Regional" },
    },
    {
      id: "off-euro-de",
      companyId: "euro-corp",
      country: "Germany",
      countryCode: "DE",
      region: "Europe",
      city: "Munich",
      address: "Marienplatz 1",
      postalCode: "80331",
      officeType: "Headquarters",
      latitude: 48.1,
      longitude: 11.5,
      tag: { tone: "purple", short: "HQ" },
    },
    {
      id: "off-euro-uk",
      companyId: "euro-corp",
      country: "United Kingdom",
      countryCode: "GB",
      region: "Europe",
      city: "Manchester",
      address: "1 Piccadilly",
      postalCode: "M1 1BG",
      officeType: "Sales Office",
      latitude: 53.4,
      longitude: -2.2,
      tag: { tone: "slate", short: "Sales" },
    },
  ],
}));

describe("CompanyPage", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders company header and grouped offices by region and country", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/company/acme"]}>
        <Routes>
          <Route path="/company/:id" element={<CompanyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();

    // Main level 1 offices header
    const mainHeader = container.querySelector(".gof-section-h");
    expect(mainHeader).toBeInTheDocument();
    expect(mainHeader?.textContent).toContain("Offices 3");

    // Level 2 region blocks (Americas & Europe)
    const regionBlocks = container.querySelectorAll(".gof-region-block");
    expect(regionBlocks).toHaveLength(2);

    const regionHeaders = container.querySelectorAll(".gof-region-h");
    expect(regionHeaders[0].textContent).toContain("Americas 1");
    expect(regionHeaders[1].textContent).toContain("Europe 2");

    // Level 3 country blocks
    const countryBlocks = container.querySelectorAll(".gof-country-block");
    expect(countryBlocks).toHaveLength(3);

    const countryHeaders = container.querySelectorAll(".gof-country-h");
    expect(countryHeaders[0].textContent).toContain("United States 1");
    expect(countryHeaders[1].textContent).toContain("Germany 1");
    expect(countryHeaders[2].textContent).toContain("United Kingdom 1");
  });

  it("renders office cards without stock photos or sample images", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/company/acme"]}>
        <Routes>
          <Route path="/company/:id" element={<CompanyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const cards = container.querySelectorAll(".gof-officecard");
    expect(cards).toHaveLength(3);

    // No stock photos or static maps on office cards
    const photos = container.querySelectorAll(".gof-officecard .gof-photo");
    expect(photos).toHaveLength(0);
    const staticMaps = container.querySelectorAll(".gof-officecard .gof-static-map");
    expect(staticMaps).toHaveLength(0);

    // Tag badges preserved in head
    expect(screen.getByText("HQ")).toBeInTheDocument();
    expect(screen.getByText("Regional")).toBeInTheDocument();
    expect(screen.getByText("R&D")).toBeInTheDocument();
  });

  it("maintains map sync attributes and interactive card properties", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/company/acme?office=off-us"]}>
        <Routes>
          <Route path="/company/:id" element={<CompanyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const activeCard = container.querySelector(".gof-officecard.is-active");
    expect(activeCard).toBeInTheDocument();
    expect(activeCard).toHaveAttribute("role", "button");
    expect(activeCard).toHaveAttribute("tabIndex", "0");
    expect(activeCard).toHaveAttribute("aria-selected", "true");
  });

  it("renders company not found state for invalid company ID", () => {
    render(
      <MemoryRouter initialEntries={["/company/nonexistent"]}>
        <Routes>
          <Route path="/company/:id" element={<CompanyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Company not found/i)).toBeInTheDocument();
  });

  /* ADVERSARIAL EDGE CASE STRESS TESTS */

  describe("Edge Case 1: Empty Office List", () => {
    it("handles zero offices gracefully without crashing or throwing", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/company/empty-corp"]}>
          <Routes>
            <Route path="/company/:id" element={<CompanyPage />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText("Empty Corp")).toBeInTheDocument();

      const mainHeader = container.querySelector(".gof-section-h");
      expect(mainHeader?.textContent).toContain("Offices 0");

      const regionBlocks = container.querySelectorAll(".gof-region-block");
      expect(regionBlocks).toHaveLength(0);

      // Verify plural stat labels for 0 items
      const stats = container.querySelectorAll(".gof-stat");
      expect(stats[0].textContent).toBe("0offices");
      expect(stats[1].textContent).toBe("0countries");
      expect(stats[2].textContent).toBe("0regions");

      // Verify hero subtext does not display undefined HQ
      const heroInd = container.querySelector(".gof-hero-ind");
      expect(heroInd?.textContent).toBe("Finance");
    });
  });

  describe("Edge Case 2: Single-Office Companies", () => {
    it("renders singular stat labels and HQ fallback for single-office company", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/company/single-corp"]}>
          <Routes>
            <Route path="/company/:id" element={<CompanyPage />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText("Single Corp")).toBeInTheDocument();

      // Singular stat labels
      const stats = container.querySelectorAll(".gof-stat");
      expect(stats[0].textContent).toBe("1office");
      expect(stats[1].textContent).toBe("1country");
      expect(stats[2].textContent).toBe("1region");

      // HQ subtext falls back to single office city even if officeType is not Headquarters
      const heroInd = container.querySelector(".gof-hero-ind");
      expect(heroInd?.textContent).toContain("HQ in San Francisco");

      const cards = container.querySelectorAll(".gof-officecard");
      expect(cards).toHaveLength(1);
    });
  });

  describe("Edge Case 3: Single-Region & Multi-Country Companies", () => {
    it("groups offices in a single region across multiple countries in alphabetical order", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/company/euro-corp"]}>
          <Routes>
            <Route path="/company/:id" element={<CompanyPage />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText("Euro Corp")).toBeInTheDocument();

      // Stats: 3 offices, 3 countries, 1 region
      const stats = container.querySelectorAll(".gof-stat");
      expect(stats[0].textContent).toBe("3offices");
      expect(stats[1].textContent).toBe("3countries");
      expect(stats[2].textContent).toBe("1region");

      // 1 region block for Europe with total count 3
      const regionHeaders = container.querySelectorAll(".gof-region-h");
      expect(regionHeaders).toHaveLength(1);
      expect(regionHeaders[0].textContent).toContain("Europe 3");

      // 3 country blocks sorted alphabetically: France, Germany, United Kingdom
      const countryHeaders = container.querySelectorAll(".gof-country-h");
      expect(countryHeaders).toHaveLength(3);
      expect(countryHeaders[0].textContent).toContain("France 1");
      expect(countryHeaders[1].textContent).toContain("Germany 1");
      expect(countryHeaders[2].textContent).toContain("United Kingdom 1");
    });
  });

  describe("Edge Case 4: Deep Link Resolution & Map Sync", () => {
    it("resolves ?office=:officeId by highlighting card and scrolling it into view", () => {
      const scrollSpy = vi.spyOn(window.HTMLElement.prototype, "scrollIntoView");

      const { container } = render(
        <MemoryRouter initialEntries={["/company/acme?office=off-uk"]}>
          <Routes>
            <Route path="/company/:id" element={<CompanyPage />} />
          </Routes>
        </MemoryRouter>,
      );

      // Active card corresponds to off-uk (London)
      const activeCard = container.querySelector(".gof-officecard.is-active");
      expect(activeCard).toBeInTheDocument();
      expect(activeCard?.textContent).toContain("London");

      // scrollIntoView should have been called on the active card element
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    });

    it("handles invalid/nonexistent ?office= query param gracefully", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/company/acme?office=nonexistent-id"]}>
          <Routes>
            <Route path="/company/:id" element={<CompanyPage />} />
          </Routes>
        </MemoryRouter>,
      );

      // No card should be marked active
      const activeCards = container.querySelectorAll(".gof-officecard.is-active");
      expect(activeCards).toHaveLength(0);
    });
  });

  describe("Edge Case 5: Interactive Card Selection & Keyboard Navigation", () => {
    it("selects card on click and updates active state", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/company/acme"]}>
          <Routes>
            <Route path="/company/:id" element={<CompanyPage />} />
          </Routes>
        </MemoryRouter>,
      );

      const cards = container.querySelectorAll(".gof-officecard");
      expect(container.querySelector(".gof-officecard.is-active")).toBeNull();

      fireEvent.click(cards[1]); // Click UK card
      expect(cards[1].classList.contains("is-active")).toBe(true);
    });

    it("supports keyboard selection via Enter and Space keys", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/company/acme"]}>
          <Routes>
            <Route path="/company/:id" element={<CompanyPage />} />
          </Routes>
        </MemoryRouter>,
      );

      const cards = container.querySelectorAll(".gof-officecard");

      fireEvent.keyDown(cards[2], { key: "Enter" }); // Select DE card via Enter
      expect(cards[2].classList.contains("is-active")).toBe(true);

      fireEvent.keyDown(cards[0], { key: " " }); // Select US card via Space
      expect(cards[0].classList.contains("is-active")).toBe(true);
    });
  });
});

