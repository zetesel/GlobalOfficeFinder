import { describe, it, expect } from "vitest";
import { sanitizeOffices } from "../../../api/_lib/sanitizer";
import type { DiscoveredOffice } from "../../../api/_lib/types";

describe("sanitizeOffices", () => {
  it("should return an empty array for an empty input array", () => {
    expect(sanitizeOffices([])).toEqual([]);
  });

  it("should filter out non-object entries", () => {
    const input = [null, undefined, 42, "string", []];
    expect(sanitizeOffices(input as unknown as unknown[])).toEqual([]);
  });

  it("should correctly sanitize a valid office object", () => {
    const input = [
      {
        country: "Ireland ",
        countryCode: "ie",
        region: " Europe",
        city: "Dublin",
        address: "70 Sir John Rogerson's Quay",
        officeType: "hq",
        latitude: 53.3448,
        longitude: -6.236,
        contactUrl: " https://google.com ",
      },
    ];
    const expected: DiscoveredOffice[] = [
      {
        country: "Ireland",
        countryCode: "IE",
        region: "Europe",
        city: "Dublin",
        address: "70 Sir John Rogerson's Quay",
        officeType: "hq",
        latitude: 53.3448,
        longitude: -6.236,
        contactUrl: "https://google.com",
      },
    ];
    expect(sanitizeOffices(input as unknown as unknown[])).toEqual(expected);
  });

  it("should skip entries missing mandatory fields (country, city)", () => {
    const input = [
      { country: "Ireland" }, // Missing city
      { city: "Dublin" }, // Missing country
      { country: "Ireland", city: "Dublin", address: "St" }, // Valid
    ];
    const result = sanitizeOffices(input as unknown as unknown[]);
    expect(result).toHaveLength(1);
    expect(result[0].city).toBe("Dublin");
  });

  it("should default officeType to 'branch' if missing or invalid", () => {
    const input = [
      { country: "A", city: "B" }, // Missing officeType
      { country: "C", city: "D", officeType: "invalid" },
      { country: "E", city: "F", officeType: "regional" },
    ];
    const result = sanitizeOffices(input as unknown as unknown[]);
    expect(result[0].officeType).toBe("branch");
    expect(result[1].officeType).toBe("branch");
    expect(result[2].officeType).toBe("regional");
  });

  it("should deduplicate offices based on country, city, and address", () => {
    const input = [
      { country: "Ireland", city: "Dublin", address: "Street 1" },
      { country: "ireland", city: "DUBLIN", address: " STREET 1 " }, // Duplicate
      { country: "Ireland", city: "Dublin", address: "Street 2" }, // Unique
    ];
    const result = sanitizeOffices(input as unknown as unknown[]);
    expect(result).toHaveLength(2);
    expect(result[0].address).toBe("Street 1");
    expect(result[1].address).toBe("Street 2");
  });

  it("should handle malformed or missing numeric fields (latitude, longitude)", () => {
    const input = [
      {
        country: "A",
        city: "B",
        latitude: "not a number",
        longitude: NaN,
      },
      {
        country: "C",
        city: "D",
        latitude: Infinity,
        longitude: 0,
      },
    ];
    const result = sanitizeOffices(input as unknown as unknown[]);
    expect(result[0].latitude).toBeUndefined();
    expect(result[0].longitude).toBeUndefined();
    expect(result[1].latitude).toBeUndefined();
    expect(result[1].longitude).toBe(0);
  });

  it("should trim all string fields", () => {
    const input = [
      {
        country: " Ireland ",
        countryCode: " IE ",
        region: " Europe ",
        city: " Dublin ",
        address: " Street ",
        postalCode: " 123 ",
        contactUrl: " http://url.com ",
      },
    ];
    const result = sanitizeOffices(input as unknown as unknown[]);
    expect(result[0]).toEqual({
      country: "Ireland",
      countryCode: "IE",
      region: "Europe",
      city: "Dublin",
      address: "Street",
      postalCode: "123",
      officeType: "branch",
      contactUrl: "http://url.com",
    });
  });
});
