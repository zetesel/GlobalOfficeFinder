/**
 * Client for POST /api/discover. Maps the server's id-less payload onto the
 * app's Company / Office shapes, minting `temp-…` ids so discovered results
 * never collide with the curated catalogue and vanish on navigation away.
 */
import type { Company, Office, CompanyPhoto } from "../types";
import { typeTag } from "../utils/typeTag";
import { slugify } from "./slug";

export type DiscoveryStage =
  | "search"
  | "select"
  | "locations"
  | "structure"
  | "photo"
  | "done";

export interface DiscoveryResult {
  company: Company;
  offices: Office[];
  /** True when the company couldn't be matched to a Wikidata entity. */
  notFound: boolean;
  /** True when the company matched but no usable offices were found. */
  noOffices: boolean;
  /** True when the LLM structuring step failed — distinct from "no offices". */
  llmInvalid: boolean;
}

interface ApiOffice {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  address?: string;
  officeType: "hq" | "regional" | "branch";
  latitude?: number;
  longitude?: number;
}

interface ApiResponse {
  company: { name: string; description: string; website?: string; wikidataId?: string };
  offices: ApiOffice[];
  photo?: CompanyPhoto;
  error?: "NOT_FOUND" | "LLM_INVALID" | "NO_OFFICES";
}

const OFFICE_TYPE_LABEL: Record<ApiOffice["officeType"], string> = {
  hq: "Headquarters",
  regional: "Regional Office",
  branch: "Branch Office",
};

export async function fetchDiscovery(companyName: string): Promise<DiscoveryResult> {
  const res = await fetch("/api/discover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ companyName }),
  });
  if (!res.ok) {
    throw new Error(`Discovery request failed (${res.status})`);
  }
  const data = (await res.json()) as ApiResponse;

  const companyId = `temp-${slugify(data.company.name) || slugify(companyName) || "company"}`;
  const company: Company = {
    id: companyId,
    name: data.company.name,
    website: data.company.website ?? "",
    industry: "",
    description: data.company.description ?? "",
    photo: data.photo,
  };

  const offices: Office[] = (data.offices ?? []).map((o, i) => {
    const officeType = OFFICE_TYPE_LABEL[o.officeType];
    const tag = typeTag(officeType);
    return {
      id: `${companyId}-${slugify(o.city) || "loc"}-${i}`,
      companyId,
      country: o.country,
      countryCode: o.countryCode,
      region: o.region,
      city: o.city,
      address: o.address ?? "",
      postalCode: "",
      officeType,
      latitude: o.latitude,
      longitude: o.longitude,
      tag,
      tone: tag.tone,
    };
  });

  const notFound = data.error === "NOT_FOUND";
  const llmInvalid = data.error === "LLM_INVALID";
  return {
    company,
    offices,
    notFound,
    llmInvalid,
    noOffices:
      data.error === "NO_OFFICES" ||
      (!notFound && !llmInvalid && offices.length === 0),
  };
}
