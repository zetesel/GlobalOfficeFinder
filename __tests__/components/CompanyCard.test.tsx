import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CompanyCard from "../../src/components/CompanyCard";
import type { Company, Office } from "../../src/types";

const company: Company = {
  id: "acme",
  name: "Acme Corp",
  website: "https://acme.example",
  industry: "Manufacturing",
  description: "Acme makes things.",
};

const offices: Office[] = [
  {
    id: "acme-us-nyc",
    companyId: "acme",
    country: "United States",
    countryCode: "US",
    region: "Americas",
    city: "New York",
    address: "1 Acme Plaza",
    postalCode: "10001",
    officeType: "Headquarters",
    latitude: 40.7,
    longitude: -74,
  },
];

describe("CompanyCard", () => {
  it("renders company name, industry and office count", () => {
    render(
      <MemoryRouter>
        <CompanyCard company={company} offices={offices} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Manufacturing")).toBeInTheDocument();
    expect(screen.getByText("office")).toBeInTheDocument();
    expect(screen.getByText("country")).toBeInTheDocument();
  });

  it("links to the company detail page", () => {
    render(
      <MemoryRouter>
        <CompanyCard company={company} offices={offices} />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /view acme corp offices/i });
    expect(link).toHaveAttribute("href", "/company/acme");
  });
});
