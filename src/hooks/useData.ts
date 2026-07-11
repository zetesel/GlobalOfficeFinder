import { useMemo } from "react";
import companiesJson from "../../data/companies.json";
import officesJson from "../../data/offices.json";
import type { Company, Office } from "../types";
import { typeTag } from "../utils/typeTag";

const COMPANIES = companiesJson as Company[];

const COMPANY_BY_ID: Record<string, Company> = {};
for (const c of COMPANIES) {
  COMPANY_BY_ID[c.id] = c;
}

const ENRICHED_OFFICES: Office[] = (officesJson as unknown as unknown[]).map(
  (o) => {
    const office = o as Office;
    const tag = typeTag(office.officeType);
    return {
      ...office,
      short: tag.short,
      tone: tag.tone,
    };
  },
);

const PUBLIC_OFFICES = ENRICHED_OFFICES.filter(
  (o) => o.verification?.verdict !== "rejected",
);

const DATA_SINGLETON: CatalogData = {
  companies: COMPANIES,
  offices: ENRICHED_OFFICES,
  publicOffices: PUBLIC_OFFICES,
  companyById: COMPANY_BY_ID,
};

export interface CatalogData {
  companies: Company[];
  /** All offices — used by ReviewPage (includes rejected). */
  offices: Office[];
  /** Public offices — excludes any office with verdict "rejected". */
  publicOffices: Office[];
  companyById: Record<string, Company>;
}

export function useData(): CatalogData {
  return useMemo<CatalogData>(() => DATA_SINGLETON, []);
}
