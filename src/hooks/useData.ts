import { useMemo } from "react";
import companiesJson from "../../data/companies.json";
import officesJson from "../../data/offices.json";
import type { Company, Office } from "../types";
import { typeTag } from "../utils/typeTag";

const COMPANIES = companiesJson as Company[];

type RawOffice = Omit<Office, "tone" | "tag">;
const OFFICES = (officesJson as unknown as RawOffice[]).map((o) => {
  const tag = typeTag(o.officeType);
  return {
    ...o,
    tag,
    tone: tag.tone,
  } as Office;
});

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
