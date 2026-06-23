import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Header from "../../src/components/Header";
import { useData } from "../../src/hooks/useData";

// Mock the useData hook
vi.mock("../../src/hooks/useData", () => ({
  useData: vi.fn(),
}));

const mockData = {
  companies: [
    { id: "acme", name: "Acme Corp" },
    { id: "globex", name: "Globex" },
  ],
  offices: [
    { id: "1", companyId: "acme", country: "United States", countryCode: "US" },
    { id: "2", companyId: "acme", country: "Canada", countryCode: "CA" },
    { id: "3", companyId: "globex", country: "United States", countryCode: "US" },
  ],
  companyById: {
    acme: { id: "acme", name: "Acme Corp" },
    globex: { id: "globex", name: "Globex" },
  },
};

describe("Header", () => {
  it("renders brand name and link to home", () => {
    vi.mocked(useData).mockReturnValue(mockData as any);
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const brandLink = screen.getByRole("link", { name: /GlobalOfficeFinder home/i });
    expect(brandLink).toHaveAttribute("href", "/");
    expect(within(brandLink).getByText("GlobalOffice")).toBeInTheDocument();
    expect(within(brandLink).getByText("Finder")).toBeInTheDocument();
  });

  it("renders meta statistics correctly", () => {
    vi.mocked(useData).mockReturnValue(mockData as any);
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const metaSection = screen.getByText(/companies/i).closest("div");
    expect(metaSection).toBeInTheDocument();

    if (metaSection) {
      // 2 companies
      expect(within(metaSection).getByText("2", { selector: "span:nth-child(1) b" })).toBeInTheDocument();
      expect(within(metaSection).getByText(/companies/i)).toBeInTheDocument();

      // 3 offices
      expect(within(metaSection).getByText("3", { selector: "b" })).toBeInTheDocument();
      expect(within(metaSection).getByText(/offices/i)).toBeInTheDocument();

      // 2 countries (US and CA)
      expect(within(metaSection).getByText("2", { selector: "span:nth-child(5) b" })).toBeInTheDocument();
      expect(within(metaSection).getByText(/countries/i)).toBeInTheDocument();
    }
  });

  it("renders About photos link", () => {
    vi.mocked(useData).mockReturnValue(mockData as any);
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const photosLink = screen.getByRole("link", { name: /About photos/i });
    expect(photosLink).toHaveAttribute("href", "/about/photos");
  });

  it("renders no breadcrumbs on home route", () => {
    vi.mocked(useData).mockReturnValue(mockData as any);
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>,
    );

    const breadcrumbNav = screen.getByRole("navigation", { name: /Breadcrumb/i });
    expect(breadcrumbNav).toBeEmptyDOMElement();
  });

  it("renders company breadcrumb on company route", () => {
    vi.mocked(useData).mockReturnValue(mockData as any);
    render(
      <MemoryRouter initialEntries={["/company/acme"]}>
        <Routes>
          <Route path="/company/:id" element={<Header />} />
        </Routes>
      </MemoryRouter>,
    );

    const breadcrumbNav = screen.getByRole("navigation", { name: /Breadcrumb/i });
    expect(within(breadcrumbNav).getByText("Offices")).toHaveAttribute("href", "/");
    expect(within(breadcrumbNav).getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders country breadcrumb on country route", () => {
    // Note: CountryBreadcrumb uses useData().offices and finds the country name from there.
    // In our mockData, the offices have country: "United States" for code "US".
    vi.mocked(useData).mockReturnValue(mockData as any);
    render(
      <MemoryRouter initialEntries={["/country/US"]}>
        <Routes>
          <Route path="/country/:code" element={<Header />} />
        </Routes>
      </MemoryRouter>,
    );

    const breadcrumbNav = screen.getByRole("navigation", { name: /Breadcrumb/i });
    expect(within(breadcrumbNav).getByText("Offices")).toHaveAttribute("href", "/");

    // In CountryBreadcrumb:
    // const sample = offices.find((o) => o.country === code);
    // return ... <b>{sample ? sample.country : code}</b>
    // Our mockData offices have country: "United States" but the comparison is o.country === code (which is "US").
    // Since "United States" !== "US", sample will be undefined, and it will render code ("US").

    expect(within(breadcrumbNav).getByText("US")).toBeInTheDocument();
  });
});
