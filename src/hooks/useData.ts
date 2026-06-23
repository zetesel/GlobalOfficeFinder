import { useMemo } from "react";
import companiesJson from "../../data/companies.json";
import officesJson from "../../data/offices.json";
import type { Company, Office } from "../types";

const COMPANIES = companiesJson as Company[];
const OFFICES = officesJson as Office[];

const COMPANY_BY_ID: Record<string, Company> = {};
for (const c of COMPANIES) COMPANY_BY_ID[c.id] = c;

export interface CatalogData {
  companies: Company[];
  offices: Office[];
  companyById: Record<string, Company>;
}

export function useData(): CatalogData {
  return useMemo<CatalogData>(
    () => ({
      companies: COMPANIES,
      offices: OFFICES,
      companyById: COMPANY_BY_ID,
    }),
    [],
  );
}
