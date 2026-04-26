import { describe, it, expect } from "vitest";
import { sanitizeUrl, getCountrySummaries } from "../../src/utils/data";
import type { Office } from "../../src/types";

describe("sanitizeUrl utility function", () => {
  it("returns undefined for undefined input", () => {
    expect(sanitizeUrl(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(sanitizeUrl("")).toBeUndefined();
  });

  it("sanitizes valid HTTPS URL", () => {
    const url = "https://example.com/path";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("sanitizes valid HTTP URL", () => {
    const url = "http://example.com/path";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("sanitizes URL with whitespace", () => {
    const url = "  https://example.com  ";
    expect(sanitizeUrl(url)).toBe("https://example.com/");
  });

  it("returns undefined for invalid protocol", () => {
    expect(sanitizeUrl("ftp://example.com")).toBeUndefined();
    expect(sanitizeUrl("javascript:alert('xss')")).toBeUndefined();
    expect(sanitizeUrl("file:///etc/passwd")).toBeUndefined();
  });

  it("returns undefined for malformed URL", () => {
    expect(sanitizeUrl("not a url")).toBeUndefined();
    expect(sanitizeUrl("example.com")).toBeUndefined();
  });

  it("preserves URL parameters and fragments", () => {
    const url = "https://example.com/path?query=value#fragment";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("handles URLs with ports", () => {
    const url = "https://example.com:8443/path";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("normalizes URLs correctly", () => {
    const url = "https://EXAMPLE.COM/Path";
    const sanitized = sanitizeUrl(url);
    expect(sanitized).toBeDefined();
    // URL normalization lowercases the domain
    expect(sanitized).toContain("example.com");
  });
});

describe("getCountrySummaries utility function", () => {
  const mockOffices: Office[] = [
    {
      id: "office-1",
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
    },
    {
      id: "office-2",
      companyId: "apple",
      country: "United States",
      countryCode: "US",
      region: "Americas",
      city: "Cupertino",
      address: "1 Apple Park Way",
      postalCode: "95014",
      officeType: "Headquarters",
      latitude: 37.3348,
      longitude: -122.0090,
    },
    {
      id: "office-3",
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
    },
    {
      id: "office-4",
      companyId: "meta",
      country: "United Kingdom",
      countryCode: "GB",
      region: "Europe",
      city: "London",
      address: "10 Downing Street",
      postalCode: "SW1A 2AA",
      officeType: "Office",
      latitude: 51.5034,
      longitude: -0.1276,
    },
  ];

  it("returns empty array for empty office list", () => {
    expect(getCountrySummaries([])).toEqual([]);
  });

  it("groups offices by country code", () => {
    const summaries = getCountrySummaries(mockOffices);
    expect(summaries).toHaveLength(2);
    expect(summaries[0].code).toBe("GB");
    expect(summaries[1].code).toBe("US");
  });

  it("counts offices per country correctly", () => {
    const summaries = getCountrySummaries(mockOffices);
    const us = summaries.find((s) => s.code === "US");
    const gb = summaries.find((s) => s.code === "GB");

    expect(us?.officeCount).toBe(2);
    expect(gb?.officeCount).toBe(2);
  });

  it("counts unique companies per country", () => {
    const summaries = getCountrySummaries(mockOffices);
    const us = summaries.find((s) => s.code === "US");
    const gb = summaries.find((s) => s.code === "GB");

    expect(us?.companyIds).toEqual(expect.arrayContaining(["google", "apple"]));
    expect(us?.companyIds).toHaveLength(2);

    expect(gb?.companyIds).toEqual(expect.arrayContaining(["google", "meta"]));
    expect(gb?.companyIds).toHaveLength(2);
  });

  it("preserves country metadata", () => {
    const summaries = getCountrySummaries(mockOffices);
    const us = summaries.find((s) => s.code === "US");

    expect(us?.name).toBe("United States");
    expect(us?.region).toBe("Americas");
  });

  it("sorts summaries by country name alphabetically", () => {
    const summaries = getCountrySummaries(mockOffices);

    for (let i = 0; i < summaries.length - 1; i++) {
      expect(summaries[i].name.localeCompare(summaries[i + 1].name)).toBeLessThanOrEqual(0);
    }
  });

  it("handles duplicate companies per country correctly", () => {
    const officesWithDuplicates: Office[] = [
      ...mockOffices,
      {
        id: "office-5",
        companyId: "google",
        country: "United States",
        countryCode: "US",
        region: "Americas",
        city: "New York",
        address: "111 8th Ave",
        postalCode: "10011",
        officeType: "Office",
        latitude: 40.7411,
        longitude: -74.0000,
      },
    ];

    const summaries = getCountrySummaries(officesWithDuplicates);
    const us = summaries.find((s) => s.code === "US");

    expect(us?.companyIds).toHaveLength(2); // Still 2 unique companies
    expect(us?.officeCount).toBe(3); // But 3 total offices
  });

  it("handles single office correctly", () => {
    const singleOffice: Office[] = [mockOffices[0]];
    const summaries = getCountrySummaries(singleOffice);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].code).toBe("US");
    expect(summaries[0].officeCount).toBe(1);
    expect(summaries[0].companyIds).toEqual(["google"]);
  });
});
