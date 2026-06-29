import { describe, it, expect } from "vitest";
import { sanitizeOffices } from "../../../api/_lib/sanitizer";

describe("sanitizeOffices", () => {
  it("returns an empty array for an empty input", () => {
    expect(sanitizeOffices([])).toEqual([]);
  });

  it("skips non-object elements", () => {
    const input = [null, undefined, 123, "string", []];
    expect(sanitizeOffices(input as any)).toEqual([]);
  });

  it("skips elements missing city or country", () => {
    const input = [
      { city: "Berlin" },
      { country: "Germany" },
      { city: "", country: "Germany" },
      { city: "Berlin", country: "" },
      { city: "  ", country: "Germany" },
    ];
    expect(sanitizeOffices(input as any)).toEqual([]);
  });

  it("trims city and country names", () => {
    const input = [{ city: "  Berlin  ", country: "  Germany  " }];
    const result = sanitizeOffices(input as any);
    expect(result[0].city).toBe("Berlin");
    expect(result[0].country).toBe("Germany");
  });

  it("normalizes countryCode to uppercase", () => {
    const input = [{ city: "Berlin", country: "Germany", countryCode: "de" }];
    const result = sanitizeOffices(input as any);
    expect(result[0].countryCode).toBe("DE");
  });

  it("ignores invalid countryCode", () => {
    const input = [
      { city: "Berlin", country: "Germany", countryCode: "GER" },
      { city: "Paris", country: "France", countryCode: "1" },
    ];
    const result = sanitizeOffices(input as any);
    expect(result[0].countryCode).toBe("");
    expect(result[1].countryCode).toBe("");
  });

  it("validates region against allowed set", () => {
    const input = [
      { city: "Berlin", country: "Germany", region: "Europe" },
      { city: "New York", country: "USA", region: "Mars" },
      { city: "Tokyo", country: "Japan", region: "Asia-Pacific" },
    ];
    const result = sanitizeOffices(input as any);
    expect(result[0].region).toBe("Europe");
    expect(result[1].region).toBe("");
    expect(result[2].region).toBe("Asia-Pacific");
  });

  it("validates officeType against allowed set, defaulting to branch", () => {
    const input = [
      { city: "Berlin", country: "Germany", officeType: "hq" },
      { city: "London", country: "UK", officeType: "regional" },
      { city: "Paris", country: "France", officeType: "branch" },
      { city: "Dublin", country: "Ireland", officeType: "coffee-shop" },
      { city: "Sydney", country: "Australia" },
    ];
    const result = sanitizeOffices(input as any);
    expect(result[0].officeType).toBe("hq");
    expect(result[1].officeType).toBe("regional");
    expect(result[2].officeType).toBe("branch");
    expect(result[3].officeType).toBe("branch");
    expect(result[4].officeType).toBe("branch");
  });

  it("handles optional fields address, latitude, and longitude", () => {
    const input = [
      {
        city: "Berlin",
        country: "Germany",
        address: "Mauerstrasse 1",
        latitude: 52.52,
        longitude: 13.405,
      },
    ];
    const result = sanitizeOffices(input as any);
    expect(result[0]).toEqual({
      city: "Berlin",
      country: "Germany",
      countryCode: "",
      region: "",
      address: "Mauerstrasse 1",
      officeType: "branch",
      latitude: 52.52,
      longitude: 13.405,
    });
  });

  it("trims address if present", () => {
    const input = [{ city: "Berlin", country: "Germany", address: "  Street 1  " }];
    const result = sanitizeOffices(input as any);
    expect(result[0].address).toBe("Street 1");
  });

  it("ignores non-numeric latitude or longitude", () => {
    const input = [
      {
        city: "Berlin",
        country: "Germany",
        latitude: "52.52",
        longitude: [13.405],
      },
    ];
    const result = sanitizeOffices(input as any);
    expect(result[0].latitude).toBeUndefined();
    expect(result[0].longitude).toBeUndefined();
  });

  it("deduplicates based on lowercase city and country/countryCode", () => {
    const input = [
      { city: "Berlin", country: "Germany" },
      { city: "berlin", country: "GERMANY" },
      { city: "Berlin", country: "Germany", countryCode: "DE" },
      { city: "Paris", country: "France" },
      { city: "PARIS", country: "France", countryCode: "FR" },
    ];
    const result = sanitizeOffices(input as any);
    // Logic: key = `${city.toLowerCase()}|${countryCode || country.toLowerCase()}`;
    // 1st: "berlin|germany"
    // 2nd: "berlin|germany" (seen)
    // 3rd: "berlin|de" (new)
    // 4th: "paris|france"
    // 5th: "paris|fr" (new)
    expect(result).toHaveLength(4);
    expect(result[0].city).toBe("Berlin");
    expect(result[1].city).toBe("Berlin");
    expect(result[1].countryCode).toBe("DE");
    expect(result[2].city).toBe("Paris");
    expect(result[3].city).toBe("PARIS");
    expect(result[3].countryCode).toBe("FR");
  });
});
