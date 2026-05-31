import { useMemo } from "react";
import companiesJson from "../../data/companies.json";
import officesJson from "../../data/offices.json";
import type { Company, Office } from "../types";

const COMPANIES = companiesJson as Company[];
const OFFICES = officesJson as Office[];

export interface CatalogData {
  companies: Company[];
  offices: Office[];
  companyById: Record<string, Company>;
}

export function useData(): CatalogData {
  return useMemo<CatalogData>(() => {
    const companyById: Record<string, Company> = {};
    for (const c of COMPANIES) companyById[c.id] = c;
    return { companies: COMPANIES, offices: OFFICES, companyById };
  }, []);
}
