import { describe, it, expect } from "vitest";
import { sanitizeOffices } from "../../../api/_lib/openrouter";

describe("sanitizeOffices", () => {
  it("returns an empty array when given an empty array", () => {
    expect(sanitizeOffices([])).toEqual([]);
  });

  it("filters out non-object entries", () => {
    const input = [null, undefined, 123, "string", []];
    expect(sanitizeOffices(input)).toEqual([]);
  });

  it("sanitizes a valid office object", () => {
    const input = [
      {
        country: "Germany",
        countryCode: "de",
        region: "Bavaria",
        city: "Munich",
        address: "Marienplatz 1",
        postalCode: "80331",
        officeType: "Headquarters",
        latitude: 48.137,
        longitude: 11.575,
        contactUrl: "https://example.com/contact ",
      },
    ];
    const expected = [
      {
        country: "Germany",
        countryCode: "DE",
        region: "Bavaria",
        city: "Munich",
        address: "Marienplatz 1",
        postalCode: "80331",
        officeType: "Headquarters",
        latitude: 48.137,
        longitude: 11.575,
        contactUrl: "https://example.com/contact",
      },
    ];
    expect(sanitizeOffices(input)).toEqual(expected);
  });

  it("skips offices missing mandatory fields", () => {
    const input = [
      { country: "Germany", city: "Munich" }, // missing address
      { country: "Germany", address: "Marienplatz 1" }, // missing city
      { city: "Munich", address: "Marienplatz 1" }, // missing country
    ];
    expect(sanitizeOffices(input)).toEqual([]);
  });

  it("trims whitespace from string fields", () => {
    const input = [
      {
        country: "  Germany  ",
        city: "  Munich  ",
        address: "  Marienplatz 1  ",
      },
    ];
    const output = sanitizeOffices(input);
    expect(output[0].country).toBe("Germany");
    expect(output[0].city).toBe("Munich");
    expect(output[0].address).toBe("Marienplatz 1");
  });

  it("deduplicates offices based on country, city, and address", () => {
    const input = [
      { country: "Germany", city: "Munich", address: "Marienplatz 1" },
      { country: "germany", city: "munich", address: "marienplatz 1" }, // Duplicate (case-insensitive check)
      { country: "Germany", city: "Munich", address: "Other St 2" }, // Different address
    ];
    const output = sanitizeOffices(input);
    expect(output).toHaveLength(2);
    expect(output[0].address).toBe("Marienplatz 1");
    expect(output[1].address).toBe("Other St 2");
  });

  it("provides default value for officeType if missing", () => {
    const input = [{ country: "USA", city: "NY", address: "5th Ave" }];
    const output = sanitizeOffices(input);
    expect(output[0].officeType).toBe("Office");
  });

  it("handles malformed latitude and longitude by omitting them", () => {
    const input = [
      {
        country: "USA",
        city: "NY",
        address: "5th Ave",
        latitude: "40.7128", // string instead of number
        longitude: NaN,
      },
    ];
    const output = sanitizeOffices(input);
    expect(output[0].latitude).toBeUndefined();
    expect(output[0].longitude).toBeUndefined();
  });
});
