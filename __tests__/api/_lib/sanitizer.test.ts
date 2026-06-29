import { describe, it, expect } from "vitest";
import { sanitizeOffices } from "../../../api/_lib/sanitizer";

describe("sanitizeOffices", () => {
  it("returns an empty array when input is empty", () => {
    expect(sanitizeOffices([])).toEqual([]);
  });

  it("skips non-object elements", () => {
    const input = [null, undefined, 123, "string", []] as unknown as unknown[];
    expect(sanitizeOffices(input)).toEqual([]);
  });

  it("sanitizes a valid office object", () => {
    const input = [
      {
        country: " Poland ",
        countryCode: "pl",
        region: "Europe",
        city: " Warsaw ",
        address: " Aleje Jerozolimskie ",
        officeType: "hq",
        latitude: 52.2297,
        longitude: 21.0122,
      },
    ];
    const result = sanitizeOffices(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      country: "Poland",
      countryCode: "PL",
      region: "Europe",
      city: "Warsaw",
      address: "Aleje Jerozolimskie",
      officeType: "hq",
      latitude: 52.2297,
      longitude: 21.0122,
    });
  });

  it("skips objects missing country or city", () => {
    const input = [
      { city: "Warsaw" }, // missing country
      { country: "Poland" }, // missing city
      { country: " ", city: "Warsaw" }, // empty country
      { country: "Poland", city: "" }, // empty city
    ];
    expect(sanitizeOffices(input)).toEqual([]);
  });

  it("defaults officeType to 'branch' if invalid or missing", () => {
    const input = [
      { country: "Poland", city: "Warsaw", officeType: "invalid" },
      { country: "USA", city: "New York" },
    ];
    const result = sanitizeOffices(input);
    expect(result[0].officeType).toBe("branch");
    expect(result[1].officeType).toBe("branch");
  });

  it("handles missing optional fields", () => {
    const input = [
      {
        country: "Poland",
        city: "Warsaw",
      },
    ];
    const result = sanitizeOffices(input);
    expect(result[0]).toEqual({
      country: "Poland",
      countryCode: "",
      region: "",
      city: "Warsaw",
      address: undefined,
      officeType: "branch",
      latitude: undefined,
      longitude: undefined,
    });
  });

  it("resets region if not in the allowed list", () => {
    const input = [
      {
        country: "Poland",
        city: "Warsaw",
        region: "EMEA", // Not in ALLOWED_REGIONS
      },
    ];
    const result = sanitizeOffices(input);
    expect(result[0].region).toBe("");
  });

  it("validates and normalizes countryCode", () => {
    const input = [
      { country: "Poland", city: "Warsaw", countryCode: "pl" },
      { country: "USA", city: "New York", countryCode: "USA" }, // Invalid (3 chars)
      { country: "Germany", city: "Berlin", countryCode: "12" }, // Invalid (numbers)
    ];
    const result = sanitizeOffices(input);
    expect(result[0].countryCode).toBe("PL");
    expect(result[1].countryCode).toBe("");
    expect(result[2].countryCode).toBe("");
  });

  it("deduplicates offices by city and country/countryCode", () => {
    const input = [
      { country: "Poland", city: "Warsaw", countryCode: "PL" },
      { country: "Poland", city: "Warsaw", countryCode: "pl" }, // Duplicate
      { country: "Poland", city: "Warsaw" }, // Duplicate (will have empty countryCode, but same country)
      { country: "poland", city: "warsaw" }, // Duplicate (case insensitive)
      { country: "USA", city: "Warsaw" }, // Different country
      { country: "Poland", city: "Krakow" }, // Different city
    ];
    const result = sanitizeOffices(input);
    // 1: Warsaw/PL
    // 2: Warsaw/poland (because countryCode is empty in the 3rd and 4th items, key becomes warsaw|poland)
    // 3: Warsaw/USA
    // 4: Krakow/poland
    expect(result).toHaveLength(4);
    expect(result[0].city).toBe("Warsaw");
    expect(result[0].countryCode).toBe("PL");
    expect(result[1].city).toBe("Warsaw");
    expect(result[1].country).toBe("Poland");
    expect(result[1].countryCode).toBe("");
    expect(result[2].country).toBe("USA");
    expect(result[3].city).toBe("Krakow");
  });
});
