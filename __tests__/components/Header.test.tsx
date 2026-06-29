import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Header from "../../src/components/Header";
import { useData, type CatalogData } from "../../src/hooks/useData";
import type { Company, Office } from "../../src/types";

// Mock the useData hook
vi.mock("../../src/hooks/useData", () => ({
  useData: vi.fn(),
}));

const mockCompanies: Company[] = [
  {
    id: "acme",
    name: "Acme Corp",
    website: "https://acme.com",
    industry: "Tech",
    description: "Acme description"
  },
  {
    id: "globex",
    name: "Globex",
    website: "https://globex.com",
    industry: "Energy",
    description: "Globex description"
  },
];

const mockOffices: Office[] = [
  {
    id: "1",
    companyId: "acme",
    country: "United States",
    countryCode: "US",
    region: "Americas",
    city: "NYC",
    address: "123 Broadway",
    postalCode: "10001",
    officeType: "HQ"
  },
  {
    id: "2",
    companyId: "acme",
    country: "Canada",
    countryCode: "CA",
    region: "Americas",
    city: "Toronto",
    address: "456 Main St",
    postalCode: "M5H 2N2",
    officeType: "Branch"
  },
  {
    id: "3",
    companyId: "globex",
    country: "United States",
    countryCode: "US",
    region: "Americas",
    city: "San Francisco",
    address: "789 Market St",
    postalCode: "94103",
    officeType: "HQ"
  },
];

const mockData: CatalogData = {
  companies: mockCompanies,
  offices: mockOffices,
  publicOffices: mockOffices,
  companyById: {
    acme: mockCompanies[0],
    globex: mockCompanies[1],
  },
};

describe("Header", () => {
  it("renders brand name and link to home", () => {
    vi.mocked(useData).mockReturnValue(mockData);
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
    vi.mocked(useData).mockReturnValue(mockData);
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

      // 2 countries (United States and Canada)
      expect(within(metaSection).getByText("2", { selector: "span:nth-child(5) b" })).toBeInTheDocument();
      expect(within(metaSection).getByText(/countries/i)).toBeInTheDocument();
    }
  });

  it("renders About photos link", () => {
    vi.mocked(useData).mockReturnValue(mockData);
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const photosLink = screen.getByRole("link", { name: /About photos/i });
    expect(photosLink).toHaveAttribute("href", "/about/photos");
  });

  it("renders no breadcrumbs on home route", () => {
    vi.mocked(useData).mockReturnValue(mockData);
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>,
    );

    const breadcrumbNav = screen.getByRole("navigation", { name: /Breadcrumb/i });
    expect(breadcrumbNav).toBeEmptyDOMElement();
  });

  it("renders company breadcrumb on company route", () => {
    vi.mocked(useData).mockReturnValue(mockData);
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
    vi.mocked(useData).mockReturnValue(mockData);
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
    // Our mockData offices have country: "United States" and countryCode: "US".
    // Since o.country === code is used for matching, and code is "US", it matches nothing if o.country is "United States".
    // Thus it renders code ("US").
    expect(within(breadcrumbNav).getByText("US")).toBeInTheDocument();
  });

  it("renders country name in breadcrumb when country is found", () => {
    vi.mocked(useData).mockReturnValue(mockData);
    render(
      <MemoryRouter initialEntries={["/country/Canada"]}>
        <Routes>
          <Route path="/country/:code" element={<Header />} />
        </Routes>
      </MemoryRouter>,
    );

    const breadcrumbNav = screen.getByRole("navigation", { name: /Breadcrumb/i });
    expect(within(breadcrumbNav).getByText("Canada")).toBeInTheDocument();
  });

  it("renders review breadcrumb on review route", () => {
    vi.mocked(useData).mockReturnValue(mockData);
    render(
      <MemoryRouter initialEntries={["/review"]}>
        <Header />
      </MemoryRouter>,
    );

    const breadcrumbNav = screen.getByRole("navigation", { name: /Breadcrumb/i });
    expect(within(breadcrumbNav).getByText("Offices")).toHaveAttribute("href", "/");
    expect(within(breadcrumbNav).getByText("Review")).toBeInTheDocument();
  });

  it("renders company ID as fallback in breadcrumb when company name is not found", () => {
    vi.mocked(useData).mockReturnValue(mockData);
    render(
      <MemoryRouter initialEntries={["/company/unknown"]}>
        <Routes>
          <Route path="/company/:id" element={<Header />} />
        </Routes>
      </MemoryRouter>,
    );

    const breadcrumbNav = screen.getByRole("navigation", { name: /Breadcrumb/i });
    expect(within(breadcrumbNav).getByText("unknown")).toBeInTheDocument();
  });

  it("renders Review link in meta section", () => {
    vi.mocked(useData).mockReturnValue(mockData);
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const reviewLink = screen.getByRole("link", { name: /^Review$/ });
    expect(reviewLink).toHaveAttribute("href", "/review");
    expect(reviewLink).toHaveClass("gof-header-link");
  });
});
