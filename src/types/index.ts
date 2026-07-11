export interface CompanyPhoto {
  /** Direct image URL (e.g. an upload.wikimedia.org thumbnail). */
  url: string;
  /** Canonical source page for the photo (e.g. the Commons File: page). */
  sourceUrl: string;
  /** Author / photographer / uploader credit string. */
  author: string;
  /** Short license code, e.g. "CC0", "PD", "CC-BY-4.0", "CC-BY-SA-3.0". */
  license: string;
  /** Canonical license deed URL. */
  licenseUrl: string;
  /** Original file title from the source, when known. */
  title?: string;
}

export interface Company {
  id: string;
  name: string;
  website: string;
  industry: string;
  description: string;
  logo?: string;
  photo?: CompanyPhoto;
}

export interface OfficeVerification {
  verdict: "approved" | "rejected" | "unverified";
  reason?: string;
  confidence?: number;
  grounded?: boolean;
  checkedAt?: string;
  model?: string;
}

export interface Office {
  id: string;
  companyId: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  address: string;
  postalCode: string;
  officeType: string;
  latitude?: number;
  longitude?: number;
  contactUrl?: string;
  verification?: OfficeVerification;
  /** Precomputed short label for the office type. */
  short: string;
  /** Precomputed tone for styling based on office type. */
  tone: import("../utils/typeTag").OfficeTone;
}
