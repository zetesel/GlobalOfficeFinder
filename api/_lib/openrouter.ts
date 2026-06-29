import { Office } from "../../src/types";

export type DiscoveredOffice = Omit<Office, "id" | "companyId" | "verification">;

/** Server-side validation — never trust the LLM output shape blindly. */
export function sanitizeOffices(arr: unknown[]): DiscoveredOffice[] {
  const out: DiscoveredOffice[] = [];
  const seen = new Set<string>();
  for (const raw of arr) {
    if (!raw || typeof raw !== "object" || raw === null) continue;
    const o = raw as Record<string, unknown>;

    const country = typeof o.country === "string" ? o.country.trim() : "";
    const countryCode = typeof o.countryCode === "string" ? o.countryCode.trim().toUpperCase() : "";
    const region = typeof o.region === "string" ? o.region.trim() : "";
    const city = typeof o.city === "string" ? o.city.trim() : "";
    const address = typeof o.address === "string" ? o.address.trim() : "";
    const postalCode = typeof o.postalCode === "string" ? o.postalCode.trim() : "";
    const officeType = typeof o.officeType === "string" ? o.officeType.trim() : "Office";

    if (!country || !city || !address) continue;

    const key = `${country}-${city}-${address}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const office: DiscoveredOffice = {
      country,
      countryCode,
      region,
      city,
      address,
      postalCode,
      officeType,
    };

    if (typeof o.latitude === "number" && Number.isFinite(o.latitude)) office.latitude = o.latitude;
    if (typeof o.longitude === "number" && Number.isFinite(o.longitude)) office.longitude = o.longitude;
    if (typeof o.contactUrl === "string") office.contactUrl = o.contactUrl.trim();

    out.push(office);
  }
  return out;
}
