import { useMemo } from "react";
import companiesJson from "../../data/companies.json";
import officesJson from "../../data/offices.json";
import type { Company, Office } from "../types";
import { typeTag } from "../utils/typeTag";

const COMPANIES = companiesJson as Company[];

export interface CatalogData {
  companies: Company[];
  offices: Office[];
  companyById: Record<string, Company>;
}

export function useData(): CatalogData {
  return useMemo<CatalogData>(() => {
    const companyById: Record<string, Company> = {};
    for (const c of COMPANIES) companyById[c.id] = c;

    const offices = (officesJson as any[]).map((o) => {
      const tag = typeTag(o.officeType);
      return {
        ...o,
        tag,
        tone: tag.tone,
      } as Office;
    });

    return { companies: COMPANIES, offices, companyById };
  }, []);
}
