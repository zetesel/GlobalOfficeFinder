import companiesJson from "../../data/companies.json";
import officesJson from "../../data/offices.json";
import type { Company, Office } from "../types";

const COMPANIES = companiesJson as Company[];
const OFFICES = officesJson as Office[];

const COMPANY_BY_ID: Record<string, Company> = {};
for (const c of COMPANIES) COMPANY_BY_ID[c.id] = c;

const PUBLIC_OFFICES = OFFICES.filter(
  (o) => o.verification?.verdict !== "rejected",
);

export interface CatalogData {
  companies: Company[];
  /** All offices — used by ReviewPage (includes rejected). */
  offices: Office[];
  /** Public offices — excludes any office with verdict "rejected". */
  publicOffices: Office[];
  companyById: Record<string, Company>;
}

const DATA: CatalogData = {
  companies: COMPANIES,
  offices: OFFICES,
  publicOffices: PUBLIC_OFFICES,
  companyById: COMPANY_BY_ID,
};

export function useData(): CatalogData {
  return DATA;
}
