import { describe, expect, it } from "vitest";
import {
  extractCityBase,
  extractStreetLine,
  geocodeCityLabel,
  geocodeQueryVariants,
  resolveCoordinatesFromCatalog,
} from "../../src/utils/resolveOfficeCoordinates";

describe("resolveCoordinatesFromCatalog", () => {
  it("returns inline coordinates when present", () => {
    expect(
      resolveCoordinatesFromCatalog({
        latitude: 1,
        longitude: 2,
      }),
    ).toEqual({ latitude: 1, longitude: 2, source: "inline", matchKind: "inline" });
  });

  it("matches queue office to catalog by company and address overlap", () => {
    const result = resolveCoordinatesFromCatalog({
      companyId: "atlassian",
      city: "San Francisco",
      address: "350 Bush Street, Floor 13",
      countryCode: "US",
      postalCode: "94104",
    });
    expect(result?.source).toBe("catalog");
    expect(result?.latitude).toBeCloseTo(37.7913454, 3);
  });

  it("does not map every US google office to Mountain View headquarters", () => {
    const atlanta = resolveCoordinatesFromCatalog({
      companyId: "google",
      city: "Atlanta",
      address: "1105 W Peachtree St NW",
      countryCode: "US",
      postalCode: "30309",
    });
    const austin = resolveCoordinatesFromCatalog({
      companyId: "google",
      city: "Austin",
      address: "500 W 2nd St",
      countryCode: "US",
      postalCode: "78701",
    });
    expect(atlanta).toBeUndefined();
    expect(austin).toBeUndefined();
  });

  it("picks distinct NYC catalog matches when postal code is shared", () => {
    const chelsea = resolveCoordinatesFromCatalog({
      companyId: "google",
      city: "New York",
      address: "Google NYC - Chelsea Market 75 9th Ave",
      countryCode: "US",
      postalCode: "10011",
    });
    const eighthAve = resolveCoordinatesFromCatalog({
      companyId: "google",
      city: "New York",
      address: "Google NYC - 9th Avenue 111 8th Ave",
      countryCode: "US",
      postalCode: "10011",
    });
    expect(chelsea?.latitude).toBeCloseTo(40.7484, 3);
    expect(eighthAve?.latitude).toBeCloseTo(40.7411, 3);
    expect(chelsea?.latitude).not.toBeCloseTo(eighthAve!.latitude!, 3);
  });

  it("matches distinct London offices by postal code", () => {
    const pancras = resolveCoordinatesFromCatalog({
      companyId: "google",
      city: "London N1C 4AG",
      address: "Google London - Pancras Square 6 Pancras Square",
      countryCode: "GB",
      postalCode: "N1C 4AG",
    });
    const stGiles = resolveCoordinatesFromCatalog({
      companyId: "google",
      city: "London WC2H 8AG",
      address: "Google London - Central Saint Giles 1 St Giles High St",
      countryCode: "GB",
      postalCode: "WC2H 8AG",
    });
    expect(pancras?.latitude).toBeCloseTo(51.5357, 3);
    expect(stGiles?.latitude).toBeCloseTo(51.5154, 3);
    expect(pancras?.latitude).not.toBeCloseTo(stGiles!.latitude!, 3);
  });

  it("extracts city base from postal suffixed labels", () => {
    expect(extractCityBase("London WC2H 8AG")).toBe("london");
    expect(extractCityBase("Pier 57, New York")).toBe("new york");
  });
});

describe("geocode address normalization", () => {
  it("extracts street lines from scraper-prefixed addresses", () => {
    expect(extractStreetLine("North America Ann Arbor 2300 Traverwood Dr", "Ann Arbor")).toBe(
      "2300 Traverwood Dr",
    );
    expect(extractStreetLine("Google Chicago - Carpenter St 210 N Carpenter St", "Chicago")).toBe(
      "210 N Carpenter St",
    );
    expect(extractStreetLine("Google San Francisco - 121 Spear 121 Spear St", "San Francisco")).toBe(
      "121 Spear St",
    );
  });

  it("normalizes city labels for geocoding", () => {
    expect(geocodeCityLabel("London N1C 4AG")).toBe("London");
    expect(geocodeCityLabel("1 Market St, San Francisco")).toBe("San Francisco");
  });

  it("builds fallback geocode query variants", () => {
    const variants = geocodeQueryVariants({
      city: "Chicago",
      address: "Google Chicago - Fulton Market 320 N Morgan St Suite 600",
      postalCode: "60607",
      country: "United States",
    });
    expect(variants[0]).toContain("320 N Morgan St");
    expect(variants.some((query) => query.includes("60607"))).toBe(true);
    expect(new Set(variants).size).toBe(variants.length);
  });

  it("uses precomputed queue geocodes when catalog has no match", () => {
    const result = resolveCoordinatesFromCatalog({
      companyId: "google",
      city: "Atlanta",
      address: "1105 W Peachtree St NW",
      postalCode: "30309",
      country: "United States",
      countryCode: "US",
    });
    expect(result?.matchKind).toBe("precomputed");
    expect(result?.latitude).toBeCloseTo(33.785, 2);
  });
});
