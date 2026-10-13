import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import CountryPage from "../../src/pages/CountryPage";

vi.mock("../../data/companies.json", () => ({
  default: [
    {
      id: "acme",
      name: "Acme Corp",
      website: "https://acme.com",
      industry: "Technology",
      description: "Acme description",
    },
    {
      id: "beta",
      name: "Beta Inc",
      website: "https://beta.com",
      industry: "Healthcare",
      description: "Beta description",
    },
  ],
}));

vi.mock("../../data/offices.json", () => ({
  default: [
    {
      id: "off-ny",
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
      id: "off-sf",
      companyId: "acme",
      country: "United States",
      countryCode: "US",
      region: "Americas",
      city: "San Francisco",
      address: "1 Market St",
      postalCode: "94105",
      officeType: "Regional Office",
      latitude: 37.7,
      longitude: -122.4,
      tag: { tone: "blue", short: "Regional" },
    },
    {
      id: "off-beta-chicago",
      companyId: "beta",
      country: "United States",
      countryCode: "US",
      region: "Americas",
      city: "Chicago",
      address: "200 Michigan Ave",
      postalCode: "60601",
      officeType: "Headquarters",
      latitude: 41.8,
      longitude: -87.6,
      tag: { tone: "purple", short: "HQ" },
    },
  ],
}));

describe("CountryPage", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders country hero map overlay and overview stats", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/country/United%20States"]}>
        <Routes>
          <Route path="/country/:code" element={<CountryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("region", { name: "United States offices map" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "United States" })).toBeInTheDocument();
    expect(screen.getByText("Americas")).toBeInTheDocument();

    const stats = container.querySelectorAll(".gof-stat");
    expect(stats).toHaveLength(3);
    expect(stats[0].textContent).toContain("3");
    expect(stats[0].textContent).toContain("offices");
    expect(stats[1].textContent).toContain("2");
    expect(stats[1].textContent).toContain("companies");
    expect(stats[2].textContent).toContain("3");
    expect(stats[2].textContent).toContain("cities");
  });

  it("renders company cards with 'View company' button and office details", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/country/United%20States"]}>
        <Routes>
          <Route path="/country/:code" element={<CountryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Section title
    expect(screen.getByText("Companies here")).toBeInTheDocument();

    // Acme Corp has multiple offices (NY and SF)
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("2 locations")).toBeInTheDocument();
    const chips = container.querySelectorAll(".gof-chip-office");
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toContain("New York");
    expect(chips[1].textContent).toContain("San Francisco");

    // Beta Inc has single office (Chicago)
    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    expect(screen.getByText("Chicago")).toBeInTheDocument();
    expect(screen.getByText(/200 Michigan Ave/)).toBeInTheDocument();

    // Both cards have 'View company' link buttons
    const viewCompanyLinks = container.querySelectorAll(".gof-officecard-country-btn");
    expect(viewCompanyLinks).toHaveLength(2);
    expect(viewCompanyLinks[0]).toHaveAttribute("href", "/company/acme");
    expect(viewCompanyLinks[1]).toHaveAttribute("href", "/company/beta");
  });

  it("selects active office and highlights full tile when clicked", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/country/United%20States"]}>
        <Routes>
          <Route path="/country/:code" element={<CountryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const cards = container.querySelectorAll(".gof-co-card");
    expect(cards).toHaveLength(2);

    // Click single office card (Beta Inc)
    fireEvent.click(cards[1]);

    // Entire card should now have is-active
    expect(cards[1]).toHaveClass("is-active");
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("renders not found state when country has no offices", () => {
    render(
      <MemoryRouter initialEntries={["/country/Atlantis"]}>
        <Routes>
          <Route path="/country/:code" element={<CountryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/No offices in this country/)).toBeInTheDocument();
  });
});
