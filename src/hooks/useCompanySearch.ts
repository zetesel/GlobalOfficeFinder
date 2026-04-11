import { useMemo } from "react";
import Fuse from "fuse.js";
import type { Company } from "../types";

interface UseSearchResult {
  results: Company[];
}

export function useCompanySearch(
  companies: Company[],
  query: string
): UseSearchResult {
  const fuse = useMemo(
    () =>
      new Fuse(companies, {
        keys: ["name", "industry", "description"],
        threshold: 0.35,
        includeScore: true,
      }),
    [companies]
  );

  const results = useMemo(() => {
    if (!query.trim()) return companies;
    return fuse.search(query).map((r) => r.item);
  }, [fuse, companies, query]);

  return { results };
}
