import { renderHook, act } from "@testing-library/react";
import { useCompanySearch } from "../../src/hooks/useCompanySearch";
import type { Company } from "../src/types";
import companies from "../../data/companies.json";

// A small, stable fixture used by tests that rely on predictable search counts.
// This decouples those tests from the growing data/companies.json dataset.
const FIXTURE_COMPANIES: Company[] = [
  { id: "google", name: "Google", industry: "Technology", description: "Google LLC is an American multinational technology company.", logo: "" },
  { id: "microsoft", name: "Microsoft", industry: "Technology", description: "Microsoft Corporation is an American multinational technology company.", logo: "" },
  { id: "ibm", name: "IBM", industry: "Technology / Consulting", description: "IBM is an American multinational technology company.", logo: "" },
  { id: "meta", name: "Meta", industry: "Technology / Social Media", description: "Meta is an American technology company.", logo: "" },
  { id: "siemens", name: "Siemens", industry: "Industrial / Technology", description: "Siemens AG is a German multinational conglomerate.", logo: "" },
  { id: "amazon", name: "Amazon", industry: "E-Commerce / Cloud", description: "Amazon.com, Inc. is an American e-commerce company.", logo: "" },
  { id: "salesforce", name: "Salesforce", industry: "Enterprise Software", description: "Salesforce is a cloud-based software company.", logo: "" },
  { id: "toyota", name: "Toyota", industry: "Automotive", description: "Toyota Motor Corporation is a Japanese automotive manufacturer.", logo: "" },
  { id: "hsbc", name: "HSBC", industry: "Banking / Finance", description: "HSBC Holdings plc is a British universal bank.", logo: "" },
  { id: "unilever", name: "Unilever", industry: "Consumer Goods", description: "Unilever plc is a British consumer goods company.", logo: "" },
];

describe("useCompanySearch", () => {
  const testCompanies: Company[] = companies as Company[];

  it("should return all companies when query is empty", () => {
    const { result } = renderHook(() => useCompanySearch(testCompanies, ""));

    expect(result.current.results).toHaveLength(testCompanies.length);
    expect(result.current.results).toEqual(testCompanies);
  });

  it("should return matching companies for exact name match", () => {
    const { result } = renderHook(() =>
      useCompanySearch(testCompanies, "Google"),
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("google");
  });

  it("should return matching companies for partial match", () => {
    const { result } = renderHook(() =>
      useCompanySearch(FIXTURE_COMPANIES, "Micro"),
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("microsoft");
  });

  it("should search in description field", () => {
    const { result } = renderHook(() =>
      useCompanySearch(FIXTURE_COMPANIES, "technology"),
    );

    // Should find companies with technology in any field (name, industry, or description)
    // Based on FIXTURE_COMPANIES with Fuse.js threshold 0.2:
    // - Google: industry + description (perfect match)
    // - Microsoft: industry + description (perfect match)
    // - IBM: industry + description (good match)
    // - Meta: industry + description (good match)
    // - Siemens: industry (Industrial / Technology) (fair match)
    // - Amazon: no "technology" in fixture fields (not included)
    // - Salesforce, Toyota, HSBC, Unilever: none
    expect(result.current.results.length).toBe(5);

    // Check that each result actually contains "technology" in at least one field
    result.current.results.forEach((company) => {
      const lowerName = company.name.toLowerCase();
      const lowerIndustry = company.industry.toLowerCase();
      const lowerDescription = company.description.toLowerCase();
      expect(
        lowerName.includes("technology") ||
          lowerIndustry.includes("technology") ||
          lowerDescription.includes("technology"),
      ).toBe(true);
    });
  });

  it("should search in industry field", () => {
    const { result } = renderHook(() =>
      useCompanySearch(FIXTURE_COMPANIES, "Technology"),
    );

    // Based on FIXTURE_COMPANIES: Google, Microsoft, Meta, IBM, Siemens have "Technology" in industry
    expect(result.current.results.length).toBe(5);
  });

  it("should be case insensitive", () => {
    const { result } = renderHook(() =>
      useCompanySearch(testCompanies, "GOOGLE"),
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("google");
  });

  it("should handle special characters in query", () => {
    const { result } = renderHook(() => useCompanySearch(testCompanies, "&"));

    // Should not crash and should return reasonable results
    expect(Array.isArray(result.current.results)).toBe(true);
  });

  it("should update results when companies change", () => {
    const googleOnly = FIXTURE_COMPANIES.filter((company) => company.id === "google");

    const { result, rerender } = renderHook(
      ({ companies }) => useCompanySearch(companies, "Goo"),
      { initialProps: { companies: googleOnly } }, // Only Google initially
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("google");

    // Update to include all fixture companies
    act(() => {
      rerender({ companies: FIXTURE_COMPANIES });
    });

    // With all fixture companies, both Google and Unilever match "Goo"
    // (Google in name/description, Unilever in industry/description via "Consumer Goods")
    expect(result.current.results).toHaveLength(2);
    const ids = result.current.results.map((r) => r.id).sort();
    expect(ids).toEqual(["google", "unilever"]);
  });

  it("should update results when query changes", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useCompanySearch(FIXTURE_COMPANIES, query),
      { initialProps: { query: "Mic" } },
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("microsoft");

    // Change query to search for Google
    act(() => {
      rerender({ query: "Goo" });
    });

    // With query "Goo", both Google and Unilever match
    // (Google in name/description, Unilever in industry/description via "Consumer Goods")
    expect(result.current.results).toHaveLength(2);
    const ids = result.current.results.map((r) => r.id).sort();
    expect(ids).toEqual(["google", "unilever"]);
  });
});
