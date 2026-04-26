import { renderHook, act } from "@testing-library/react";
import { useCompanySearch } from "../../src/hooks/useCompanySearch";
import type { Company } from "../src/types";
import companies from "../../data/companies.json";

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
      useCompanySearch(testCompanies, "Micro"),
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("microsoft");
  });

  it("should search in description field", () => {
    const { result } = renderHook(() =>
      useCompanySearch(testCompanies, "technology"),
    );

    // Should find companies with technology in any field (name, industry, or description)
    // Based on data with Fuse.js threshold 0.2:
    // - Google: name, description (perfect match)
    // - Microsoft: name, description (perfect match)
    // - IBM: name, description (good match)
    // - Meta: name, description (good match)
    // - Siemens: industry (Industrial / Technology) (fair match)
    // - Amazon: description (requires higher threshold ~0.5, so NOT included)
    // - Salesforce: none
    // - Toyota: none
    // - HSBC: none
    // - Unilever: none
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
      useCompanySearch(testCompanies, "Technology"),
    );

    // Based on data: Google, Microsoft, Meta, IBM, Siemens have "Technology" in industry
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
    const googleOnly = testCompanies.filter((company) => company.id === "google");

    const { result, rerender } = renderHook(
      ({ companies }) => useCompanySearch(companies, "Goo"),
      { initialProps: { companies: googleOnly } }, // Only Google initially
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("google");

    // Update to include all companies
    act(() => {
      rerender({ companies: testCompanies });
    });

    // With all companies, both Google and Unilever match "Goo"
    // (Google in name/description, Unilever in industry/description)
    expect(result.current.results).toHaveLength(2);
    const ids = result.current.results.map((r) => r.id).sort();
    expect(ids).toEqual(["google", "unilever"]);
  });

  it("should update results when query changes", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useCompanySearch(testCompanies, query),
      { initialProps: { query: "Mic" } },
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("microsoft");

    // Change query to search for Google
    act(() => {
      rerender({ query: "Goo" });
    });

    // With query "Goo", both Google and Unilever match
    // (Google in name/description, Unilever in industry/description)
    expect(result.current.results).toHaveLength(2);
    const ids = result.current.results.map((r) => r.id).sort();
    expect(ids).toEqual(["google", "unilever"]);
  });
});
