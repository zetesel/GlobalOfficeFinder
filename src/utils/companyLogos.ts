import companyLogosData from "../../data/company-logos.json";

export type LogoLicense =
  | "brand-guidelines"
  | "permission-granted"
  | "public-domain"
  | "cc0"
  | "cc-by-4.0"
  | "cc-by-sa-4.0";

export type LogoStatus = "approved" | "pending-review" | "rejected";

export interface CompanyLogoEntry {
  companyId: string;
  file: string;
  format: string;
  license: LogoLicense;
  sourceUrl: string;
  attribution?: string | null;
  usageNote?: string | null;
  status: LogoStatus;
  verifiedAt?: string;
}

interface CompanyLogosFile {
  logos: CompanyLogoEntry[];
}

const registry = companyLogosData as CompanyLogosFile;

const approvedByCompanyId = new Map<string, CompanyLogoEntry>(
  registry.logos
    .filter((entry) => entry.status === "approved")
    .map((entry) => [entry.companyId, entry]),
);

export function getApprovedLogo(companyId: string): CompanyLogoEntry | undefined {
  return approvedByCompanyId.get(companyId);
}

export function getAllApprovedLogos(): CompanyLogoEntry[] {
  return registry.logos.filter((entry) => entry.status === "approved");
}

export function requiresAttribution(license: LogoLicense): boolean {
  return license === "cc-by-4.0" || license === "cc-by-sa-4.0";
}
