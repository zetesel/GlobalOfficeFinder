import { describe, expect, it } from "vitest";
import type { Company, Office } from "../../src/types";
import { getFilteredHomeData } from "../../src/utils/filters";
import { filterPublishedOffices } from "../../src/utils/officeVisibility";

/** Mirrors HomePage: only published offices feed the home filters and map. */
describe("home listing respects office approval", () => {
  const companies: Company[] = [
    {
      id: "solo",
      name: "Solo Co",
      website: "https://solo.example",
      industry: "Technology",
      description: "d",
      logo: "",
    },
  ];

  const offices: Office[] = [
    {
      id: "solo-us",
      companyId: "solo",
      country: "United States",
      countryCode: "US",
      region: "Americas",
      city: "Austin",
      address: "1 Rd",
      postalCode: "78701",
      officeType: "Headquarters",
      approved: false,
      latitude: 30,
      longitude: -97,
    },
  ];

  it("excludes unapproved offices when data is pre-filtered like HomePage", () => {
    const published = filterPublishedOffices(offices);
    const result = getFilteredHomeData(companies, published, {
      region: "",
      country: "",
      industry: "",
      officeType: "",
    });
    expect(result.filteredCompanies).toHaveLength(0);
    expect(result.mapOffices).toHaveLength(0);
  });
});
