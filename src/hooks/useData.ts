import { useMemo } from "react";
import companiesJson from "../../data/companies.json";
import officesJson from "../../data/offices.json";
import type { Company, Office } from "../types";
import { typeTag } from "../utils/typeTag";

const COMPANIES = companiesJson as Company[];
const OFFICES_RAW = officesJson as unknown as Omit<Office, "tone" | "tag">[];

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
    for (const c of COMPANIES) {
      companyById[c.id] = c;
    }

    const offices: Office[] = [];
    const publicOffices: Office[] = [];

    for (const o_raw of OFFICES_RAW) {
      const tag = typeTag(o_raw.officeType);
      const o = { ...o_raw, tag, tone: tag.tone } as Office;
      offices.push(o);
      if (o.verification?.verdict !== "rejected") {
        publicOffices.push(o);
      }
    }

    return { companies: COMPANIES, offices, publicOffices, companyById };
  }, []);
}
