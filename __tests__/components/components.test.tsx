import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CompanyCard from "../../src/components/CompanyCard";
import OfficeCard from "../../src/components/OfficeCard";
import Header from "../../src/components/Header";
import Footer from "../../src/components/Footer";
import type { Company, Office } from "../../src/types";

describe("CompanyCard Component", () => {
  const mockCompany: Company = {
    id: "google",
    name: "Google",
    website: "https://google.com",
    industry: "Technology",
    description: "Search and advertising company",
    logo: "https://example.com/google-logo.png",
  };

  const mockOffices: Office[] = [
    {
      id: "google-us-mtv",
      companyId: "google",
      country: "United States",
      countryCode: "US",
      region: "Americas",
      city: "Mountain View",
      address: "1600 Amphitheatre Parkway",
      postalCode: "94043",
      officeType: "Headquarters",
      latitude: 37.4220,
      longitude: -122.0841,
      contactUrl: "https://about.google/locations/",
    },
    {
      id: "google-gb-lon",
      companyId: "google",
      country: "United Kingdom",
      countryCode: "GB",
      region: "Europe",
      city: "London",
      address: "6 Pancras Square",
      postalCode: "N1C 4AG",
      officeType: "Regional Office",
      latitude: 51.5357,
      longitude: -0.1235,
      contactUrl: "https://about.google/locations/",
    },
  ];

  it("renders company card with name and industry", () => {
    render(
      <BrowserRouter>
        <CompanyCard company={mockCompany} offices={mockOffices} />
      </BrowserRouter>
    );

    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("Technology")).toBeInTheDocument();
  });

  it("renders company logo image when available", () => {
    render(
      <BrowserRouter>
        <CompanyCard company={mockCompany} offices={mockOffices} />
      </BrowserRouter>
    );

    const logo = screen.getByAltText("Google logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "https://example.com/google-logo.png");
  });

  it("renders logo placeholder when logo is not available", () => {
    const companyWithoutLogo = { ...mockCompany, logo: undefined };
    render(
      <BrowserRouter>
        <CompanyCard
          company={companyWithoutLogo}
          offices={mockOffices}
        />
      </BrowserRouter>
    );

    expect(screen.getByText("G")).toBeInTheDocument();
  });

  it("displays office count with correct pluralization", () => {
    render(
      <BrowserRouter>
        <CompanyCard company={mockCompany} offices={mockOffices} />
      </BrowserRouter>
    );

    expect(screen.getByText("2 offices")).toBeInTheDocument();
  });

  it("displays country count with correct pluralization", () => {
    render(
      <BrowserRouter>
        <CompanyCard company={mockCompany} offices={mockOffices} />
      </BrowserRouter>
    );

    expect(screen.getByText("2 countries")).toBeInTheDocument();
  });

  it("displays countries separated by dots", () => {
    render(
      <BrowserRouter>
        <CompanyCard company={mockCompany} offices={mockOffices} />
      </BrowserRouter>
    );

    expect(screen.getByText(/United Kingdom · United States/)).toBeInTheDocument();
  });

  it("links to company detail page", () => {
    render(
      <BrowserRouter>
        <CompanyCard company={mockCompany} offices={mockOffices} />
      </BrowserRouter>
    );

    const link = screen.getByRole("link", { name: "Google" });
    expect(link).toHaveAttribute("href", "/company/google");
  });

  it("renders company description", () => {
    render(
      <BrowserRouter>
        <CompanyCard company={mockCompany} offices={mockOffices} />
      </BrowserRouter>
    );

    expect(screen.getByText("Search and advertising company")).toBeInTheDocument();
  });

  it("handles single office correctly", () => {
    render(
      <BrowserRouter>
        <CompanyCard
          company={mockCompany}
          offices={[mockOffices[0]]}
        />
      </BrowserRouter>
    );

    expect(screen.getByText("1 office")).toBeInTheDocument();
    expect(screen.getByText("1 country")).toBeInTheDocument();
  });
});

describe("OfficeCard Component", () => {
  const mockOffice: Office = {
    id: "google-us-mtv",
    companyId: "google",
    country: "United States",
    countryCode: "US",
    region: "Americas",
    city: "Mountain View",
    address: "1600 Amphitheatre Parkway",
    postalCode: "94043",
    officeType: "Headquarters",
    latitude: 37.4220,
    longitude: -122.0841,
    contactUrl: "https://about.google/locations/",
  };

  it("renders office location details", () => {
    render(
      <BrowserRouter>
        <OfficeCard office={mockOffice} />
      </BrowserRouter>
    );

    expect(screen.getByText("Mountain View, United States")).toBeInTheDocument();
    expect(screen.getByText("1600 Amphitheatre Parkway")).toBeInTheDocument();
  });

  it("displays office type", () => {
    render(
      <BrowserRouter>
        <OfficeCard office={mockOffice} />
      </BrowserRouter>
    );

    expect(screen.getByText("Headquarters")).toBeInTheDocument();
  });

  it("displays country code", () => {
    render(
      <BrowserRouter>
        <OfficeCard office={mockOffice} />
      </BrowserRouter>
    );

    expect(screen.getByText("US")).toBeInTheDocument();
  });

  it("renders contact link when available", () => {
    render(
      <BrowserRouter>
        <OfficeCard office={mockOffice} />
      </BrowserRouter>
    );

    const link = screen.getByRole("link", { name: /Contact \/ More info/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://about.google/locations/");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("does not render contact link when unavailable", () => {
    const officeWithoutContact = { ...mockOffice, contactUrl: undefined };
    render(
      <BrowserRouter>
        <OfficeCard office={officeWithoutContact} />
      </BrowserRouter>
    );

    const link = screen.queryByRole("link", { name: /Contact \/ More info/i });
    expect(link).not.toBeInTheDocument();
  });

  it("displays postal code", () => {
    render(
      <BrowserRouter>
        <OfficeCard office={mockOffice} />
      </BrowserRouter>
    );

    expect(screen.getByText("94043")).toBeInTheDocument();
  });

  it("does not display postal code when not available", () => {
    const officeWithoutPostal = { ...mockOffice, postalCode: undefined };
    render(
      <BrowserRouter>
        <OfficeCard office={officeWithoutPostal} />
      </BrowserRouter>
    );

    expect(screen.queryByText("94043")).not.toBeInTheDocument();
  });
});

describe("Header Component", () => {
  it("renders header with logo and title", () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    expect(screen.getByText("🌐 GlobalOfficeFinder")).toBeInTheDocument();
  });

  it("renders navigation link to home", () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    const homeLink = screen.getByRole("link", { name: /GlobalOfficeFinder/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("renders search link", () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    const searchLink = screen.getByRole("link", { name: "Search" });
    expect(searchLink).toHaveAttribute("href", "/");
  });

  it("renders recent changes and review queue links", () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    const recentChangesLink = screen.getByRole("link", { name: "Recent Changes" });
    const reviewQueueLink = screen.getByRole("link", { name: "Review Queue" });
    expect(recentChangesLink).toHaveAttribute("href", "/recent-changes");
    expect(reviewQueueLink).toHaveAttribute("href", "/review-queue");
  });
});

describe("Footer Component", () => {
  it("renders footer with main description", () => {
    render(<Footer />);

    expect(screen.getByText(/GlobalOfficeFinder — open source directory/i)).toBeInTheDocument();
  });

  it("renders footer GitHub link", () => {
    render(<Footer />);

    const githubLink = screen.getByRole("link", { name: "GitHub" });
    expect(githubLink).toHaveAttribute("href", "https://github.com/zetesel/GlobalOfficeFinder");
    expect(githubLink).toHaveAttribute("target", "_blank");
  });

  it("renders footer with copyright symbol", () => {
    render(<Footer />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toContain("©");
  });
});
