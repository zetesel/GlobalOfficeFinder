import { describe, expect, it } from "vitest";
import type { Office } from "../../src/types";
import offices from "../../data/offices.json";
import { filterPublishedOffices, isPublishedOffice } from "../../src/utils/officeVisibility";

const base: Office = {
  id: "x",
  companyId: "c",
  country: "United States",
  countryCode: "US",
  region: "Americas",
  city: "NYC",
  address: "1 St",
  postalCode: "10001",
  officeType: "Headquarters",
};

describe("isPublishedOffice", () => {
  it("returns false for undefined approved", () => {
    expect(isPublishedOffice(base)).toBe(false);
  });

  it("treats approved true as published", () => {
    expect(isPublishedOffice({ ...base, approved: true })).toBe(true);
  });

  it("treats approved false as unpublished", () => {
    expect(isPublishedOffice({ ...base, approved: false })).toBe(false);
  });
});

describe("filterPublishedOffices", () => {
  it("keeps only explicitly approved offices", () => {
    const list: Office[] = [base, { ...base, id: "y", approved: true }, { ...base, id: "z", approved: false }];
    expect(filterPublishedOffices(list)).toEqual([{ ...base, id: "y", approved: true }]);
  });

  it("does not publish Google or Shopify catalog offices by default", () => {
    const catalog = offices as Office[];
    const google = catalog.filter((o) => o.companyId === "google");
    const shopify = catalog.filter((o) => o.companyId === "shopify");
    expect(google.length).toBeGreaterThan(0);
    expect(shopify.length).toBeGreaterThan(0);
    expect(google.every((o) => !isPublishedOffice(o))).toBe(true);
    expect(shopify.every((o) => !isPublishedOffice(o))).toBe(true);
    expect(filterPublishedOffices(catalog).some((o) => o.companyId === "google")).toBe(false);
    expect(filterPublishedOffices(catalog).some((o) => o.companyId === "shopify")).toBe(false);
  });
});
