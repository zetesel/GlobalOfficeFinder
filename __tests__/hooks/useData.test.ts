import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useData } from "../../src/hooks/useData";

vi.mock("../../data/companies.json", () => ({
  default: [
    {
      id: "acme",
      name: "Acme Corp",
      website: "https://acme.com",
      industry: "Tech",
      description: "Acme description",
    },
    {
      id: "globex",
      name: "Globex",
      website: "https://globex.com",
      industry: "Energy",
      description: "Globex description",
    },
  ],
}));

vi.mock("../../data/offices.json", () => ({
  default: [
    {
      id: "1",
      companyId: "acme",
      country: "United States",
      countryCode: "US",
      region: "Americas",
      city: "NYC",
      address: "123 Broadway",
      postalCode: "10001",
      officeType: "Headquarters",
    },
    {
      id: "2",
      companyId: "acme",
      country: "Canada",
      countryCode: "CA",
      region: "Americas",
      city: "Toronto",
      address: "456 Main St",
      postalCode: "M5H 2N2",
      officeType: "Branch",
      verification: { verdict: "rejected" },
    },
    {
      id: "3",
      companyId: "globex",
      country: "United States",
      countryCode: "US",
      region: "Americas",
      city: "San Francisco",
      address: "789 Market St",
      postalCode: "94103",
      officeType: "Regional Office",
      verification: { verdict: "approved" },
    },
  ],
}));

describe("useData hook", () => {
  it("returns all companies from the data source", () => {
    const { result } = renderHook(() => useData());
    const { companies } = result.current;
    expect(companies).toHaveLength(2);
    expect(companies[0].id).toBe("acme");
    expect(companies[1].id).toBe("globex");
  });

  it("returns all offices enriched with tags and tones", () => {
    const { result } = renderHook(() => useData());
    const { offices } = result.current;
    expect(offices).toHaveLength(3);

    // HQ office
    const hq = offices.find((o) => o.id === "1");
    expect(hq?.tag).toEqual({ short: "HQ", tone: "hq" });
    expect(hq?.tone).toBe("hq");

    // Regional office
    const reg = offices.find((o) => o.id === "3");
    expect(reg?.tag.tone).toBe("reg");
    expect(reg?.tone).toBe("reg");
  });

  it("filters publicOffices to exclude rejected ones", () => {
    const { result } = renderHook(() => useData());
    const { publicOffices, offices } = result.current;
    // Total 3 offices, 1 is rejected (id: "2")
    expect(offices).toHaveLength(3);
    expect(publicOffices).toHaveLength(2);
    expect(publicOffices.find((o) => o.id === "2")).toBeUndefined();
  });

  it("provides a companyById mapping", () => {
    const { result } = renderHook(() => useData());
    const { companyById } = result.current;
    expect(companyById["acme"]).toBeDefined();
    expect(companyById["acme"].name).toBe("Acme Corp");
    expect(companyById["globex"]).toBeDefined();
    expect(companyById["globex"].name).toBe("Globex");
  });

  it("returns stable data on multiple calls", () => {
    const { result, rerender } = renderHook(() => useData());
    const data1 = result.current;
    rerender();
    const data2 = result.current;
    expect(data1).toBe(data2);
  });
});
