/**
 * Shared types for the runtime discovery endpoint. These intentionally mirror
 * the client types in src/types/index.ts, but the API returns offices WITHOUT
 * `id` / `companyId` — the client mints `temp-<uuid>` ids on receipt so the
 * results never collide with the curated catalogue.
 */

export interface DiscoveredPhoto {
  url: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  title?: string;
}

export interface DiscoveredOffice {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  address?: string;
  postalCode?: string;
  officeType: "hq" | "regional" | "branch";
  latitude?: number;
  longitude?: number;
  contactUrl?: string;
}

export interface DiscoveredCompany {
  name: string;
  description: string;
  website?: string;
  wikidataId?: string;
}

export interface DiscoverResponse {
  company: DiscoveredCompany;
  offices: DiscoveredOffice[];
  photo?: DiscoveredPhoto;
  /** Present only on soft failures so the client can show a tailored message. */
  error?: "NOT_FOUND" | "LLM_INVALID" | "NO_OFFICES";
}
