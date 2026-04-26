import { describe, expect, it } from "vitest";
import type { Company, Office } from "../../src/types";
import { getFilteredHomeData } from "../../src/utils/filters";

const companies: Company[] = [
  {
    id: "alpha",
    name: "Alpha Corp",
    website: "https://alpha.example",
    industry: "Technology",
    description: "Alpha technology company",
    logo: "",
  },
  {
    id: "beta",
    name: "Beta Finance",
    website: "https://beta.example",
    industry: "Banking / Finance",
    description: "Beta finance company",
    logo: "",
  },
];

const offices: Office[] = [
  {
    id: "alpha-us-hq",
    companyId: "alpha",
    country: "United States",
    countryCode: "US",
    region: "Americas",
    city: "New York",
    address: "1 Main St",
    postalCode: "10001",
    officeType: "Headquarters",
    contactUrl: "https://alpha.example/contact",
    latitude: 1,
    longitude: 1,
  },
  {
    id: "alpha-gb",
    companyId: "alpha",
    country: "United Kingdom",
    countryCode: "GB",
    region: "Europe",
    city: "London",
    address: "2 Main St",
    postalCode: "EC1A",
    officeType: "Regional Office",
    latitude: 2,
    longitude: 2,
  },
  {
    id: "beta-de",
    companyId: "beta",
    country: "Germany",
    countryCode: "DE",
    region: "Europe",
    city: "Berlin",
    address: "3 Main St",
    postalCode: "10115",
    officeType: "Regional Office",
    contactUrl: "https://beta.example/contact",
    latitude: 3,
    longitude: 3,
  },
];

describe("getFilteredHomeData", () => {
  it("returns all search results when no advanced filters are set", () => {
    const result = getFilteredHomeData(companies, offices, {
      region: "",
      country: "",
      industry: "",
      officeType: "",
      hasHq: false,
      hasContactUrl: false,
    });

    expect(result.filteredCompanies.map((c) => c.id).sort()).toEqual(["alpha", "beta"]);
    expect(result.mapOffices).toHaveLength(3);
  });

  it("filters by industry", () => {
    const result = getFilteredHomeData(companies, offices, {
      region: "",
      country: "",
      industry: "Technology",
      officeType: "",
      hasHq: false,
      hasContactUrl: false,
    });

    expect(result.filteredCompanies.map((c) => c.id)).toEqual(["alpha"]);
  });

  it("filters by office type and region together", () => {
    const result = getFilteredHomeData(companies, offices, {
      region: "Europe",
      country: "",
      industry: "",
      officeType: "Regional Office",
      hasHq: false,
      hasContactUrl: false,
    });

    expect(result.filteredCompanies.map((c) => c.id).sort()).toEqual(["alpha", "beta"]);
    expect(result.mapOffices.every((office) => office.region === "Europe")).toBe(true);
  });

  it("supports has headquarters company-level filter", () => {
    const result = getFilteredHomeData(companies, offices, {
      region: "",
      country: "",
      industry: "",
      officeType: "",
      hasHq: true,
      hasContactUrl: false,
    });

    expect(result.filteredCompanies.map((c) => c.id)).toEqual(["alpha"]);
  });

  it("supports has contact URL office-level filter", () => {
    const result = getFilteredHomeData(companies, offices, {
      region: "",
      country: "",
      industry: "",
      officeType: "",
      hasHq: false,
      hasContactUrl: true,
    });

    expect(result.mapOffices.map((office) => office.id).sort()).toEqual([
      "alpha-us-hq",
      "beta-de",
    ]);
  });
});
