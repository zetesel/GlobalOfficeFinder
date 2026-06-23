import { describe, it, expect } from "vitest";
import { sanitizeOffices } from "../../api/_lib/openrouter";

describe("sanitizeOffices", () => {
  it("sanitizes a valid office array", () => {
    const input = [
      {
        country: "United States",
        countryCode: "us",
        region: "Americas",
        city: "San Francisco",
        address: "123 Market St",
        officeType: "hq",
        latitude: 37.7749,
        longitude: -122.4194,
      },
    ];
    const output = sanitizeOffices(input);
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      country: "United States",
      countryCode: "US",
      region: "Americas",
      city: "San Francisco",
      address: "123 Market St",
      officeType: "hq",
      latitude: 37.7749,
      longitude: -122.4194,
    });
  });

  it("skips items missing city or country", () => {
    const input = [
      { country: "United States" }, // missing city
      { city: "San Francisco" }, // missing country
      { country: "USA", city: "NYC" }, // valid
    ];
    const output = sanitizeOffices(input);
    expect(output).toHaveLength(1);
    expect(output[0].city).toBe("NYC");
  });

  it("normalizes countryCode to uppercase 2-letter string", () => {
    const input = [
      { country: "US", city: "SF", countryCode: "us" },
      { country: "UK", city: "London", countryCode: "GBR" }, // too long
      { country: "FR", city: "Paris", countryCode: "f" }, // too short
    ];
    const output = sanitizeOffices(input);
    expect(output[0].countryCode).toBe("US");
    expect(output[1].countryCode).toBe("");
    expect(output[2].countryCode).toBe("");
  });

  it("validates region against ALLOWED_REGIONS", () => {
    const input = [
      { country: "US", city: "SF", region: "Americas" },
      { country: "FR", city: "Paris", region: "Europe" },
      { country: "JP", city: "Tokyo", region: "Asia-Pacific" },
      { country: "ZA", city: "Cape Town", region: "Middle East & Africa" },
      { country: "??", city: "Nowhere", region: "Unknown" },
    ];
    const output = sanitizeOffices(input);
    expect(output[0].region).toBe("Americas");
    expect(output[1].region).toBe("Europe");
    expect(output[2].region).toBe("Asia-Pacific");
    expect(output[3].region).toBe("Middle East & Africa");
    expect(output[4].region).toBe("");
  });

  it("validates officeType and defaults to branch", () => {
    const input = [
      { country: "US", city: "SF", officeType: "hq" },
      { country: "US", city: "NY", officeType: "regional" },
      { country: "US", city: "LA", officeType: "branch" },
      { country: "US", city: "CH", officeType: "invalid" },
    ];
    const output = sanitizeOffices(input);
    expect(output[0].officeType).toBe("hq");
    expect(output[1].officeType).toBe("regional");
    expect(output[2].officeType).toBe("branch");
    expect(output[3].officeType).toBe("branch");
  });

  it("deduplicates offices by city and country/countryCode", () => {
    const input = [
      { country: "USA", city: "SF", countryCode: "US" },
      { country: "United States", city: "SF", countryCode: "US" }, // Duplicate (city + countryCode)
      { country: "France", city: "Paris" },
      { country: "france", city: "paris" }, // Duplicate (city + country case-insensitive)
    ];
    const output = sanitizeOffices(input);
    expect(output).toHaveLength(2);
    expect(output[0].city).toBe("SF");
    expect(output[1].city).toBe("Paris");
  });

  it("handles non-object or null items in the array", () => {
    const input = [
      { country: "USA", city: "SF" },
      null,
      undefined,
      "not an object",
      123,
      [],
    ];
    const output = sanitizeOffices(input as unknown[]);
    expect(output).toHaveLength(1);
    expect(output[0].city).toBe("SF");
  });

  it("trims strings for country, city, address", () => {
    const input = [
      {
        country: "  USA  ",
        city: "  SF  ",
        address: "  123 Market  ",
      },
    ];
    const output = sanitizeOffices(input);
    expect(output[0].country).toBe("USA");
    expect(output[0].city).toBe("SF");
    expect(output[0].address).toBe("123 Market");
  });

  it("handles optional latitude and longitude", () => {
    const input = [
      { country: "USA", city: "SF", latitude: 37, longitude: -122 },
      { country: "USA", city: "NY", latitude: "invalid", longitude: null },
    ];
    const output = sanitizeOffices(input as unknown[]);
    expect(output[0].latitude).toBe(37);
    expect(output[0].longitude).toBe(-122);
    expect(output[1].latitude).toBeUndefined();
    expect(output[1].longitude).toBeUndefined();
  });
});
