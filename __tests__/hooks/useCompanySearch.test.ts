import { renderHook, act } from "@testing-library/react";
import { useCompanySearch } from "../src/hooks/useCompanySearch";
import type { Company } from "../src/types";

const mockCompanies: Company[] = [
  {
    id: "google",
    name: "Google",
    website: "https://about.google",
    industry: "Technology",
    description: "Google LLC is an American multinational technology company",
    logo: "",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    website: "https://www.microsoft.com",
    industry: "Technology",
    description:
      "Microsoft Corporation is an American multinational technology corporation",
    logo: "",
  },
];

describe("useCompanySearch", () => {
  it("should return all companies when query is empty", () => {
    const { result } = renderHook(() => useCompanySearch(mockCompanies, ""));

    expect(result.current.results).toHaveLength(2);
    expect(result.current.results).toEqual(mockCompanies);
  });

  it("should return matching companies for exact name match", () => {
    const { result } = renderHook(() =>
      useCompanySearch(mockCompanies, "Google"),
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("google");
  });

  it("should return matching companies for partial match", () => {
    const { result } = renderHook(() =>
      useCompanySearch(mockCompanies, "Micro"),
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("microsoft");
  });

  it("should search in description field", () => {
    const { result } = renderHook(() =>
      useCompanySearch(mockCompanies, "multinational"),
    );

    expect(result.current.results).toHaveLength(2); // Both companies have 'multinational' in description
  });

  it("should search in industry field", () => {
    const { result } = renderHook(() =>
      useCompanySearch(mockCompanies, "Technology"),
    );

    expect(result.current.results).toHaveLength(2); // Both companies have 'Technology' in industry
  });

  it("should be case insensitive", () => {
    const { result } = renderHook(() =>
      useCompanySearch(mockCompanies, "GOOGLE"),
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("google");
  });

  it("should handle special characters in query", () => {
    const { result } = renderHook(() => useCompanySearch(mockCompanies, "&"));

    // Should not crash and should return reasonable results
    expect(Array.isArray(result.current.results)).toBe(true);
  });

  it("should update results when companies change", () => {
    const { result, rerender } = renderHook(
      ({ companies }) => useCompanySearch(companies, "Goo"),
      { initialProps: { companies: mockCompanies.slice(0, 1) } }, // Only Google initially
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("google");

    // Update to include all companies
    act(() => {
      rerender({ companies: mockCompanies });
    });

    expect(result.current.results).toHaveLength(1); // Still only Google matches 'Goo'
    expect(result.current.results[0].id).toBe("google");
  });

  it("should update results when query changes", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useCompanySearch(mockCompanies, query),
      { initialProps: { query: "Mic" } },
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("microsoft");

    // Change query to search for Google
    act(() => {
      rerender({ query: "Goo" });
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe("google");
  });
});
