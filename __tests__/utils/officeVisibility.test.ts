import { describe, expect, it } from "vitest";
import type { Office } from "../../src/types";
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
});
