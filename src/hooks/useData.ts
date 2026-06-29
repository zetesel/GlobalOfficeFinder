import { useMemo } from "react";
import companiesJson from "../../data/companies.json";
import officesJson from "../../data/offices.json";
import type { Company, Office } from "../types";
import { typeTag } from "../utils/typeTag";

const COMPANIES = companiesJson as Company[];
const OFFICES = (officesJson as unknown[]).map((o) => {
  const office = o as Office;
  const tag = typeTag(office.officeType);
  return { ...office, tag, tone: tag.tone };
}) as Office[];

export interface CatalogData {
  companies: Company[];
  /** All offices — used by ReviewPage (includes rejected). */
  offices: Office[];
  /** Public offices — excludes any office with verdict "rejected". */
  publicOffices: Office[];
  companyById: Record<string, Company>;
}

export function useData(): CatalogData {
  return useMemo<CatalogData>(() => {
    const companyById: Record<string, Company> = {};
    for (const c of COMPANIES) companyById[c.id] = c;
    const publicOffices = OFFICES.filter(
      (o) => o.verification?.verdict !== "rejected",
    );
    return { companies: COMPANIES, offices: OFFICES, publicOffices, companyById };
  }, []);
}
