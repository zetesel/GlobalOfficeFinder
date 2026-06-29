import type { DiscoveredOffice } from "./types";

const OFFICE_TYPES = new Set(["hq", "regional", "branch"]);
const ALLOWED_REGIONS = new Set([
  "Americas",
  "Europe",
  "Asia-Pacific",
  "Middle East & Africa",
]);

/** Server-side validation — never trust the LLM output shape blindly. */
export function sanitizeOffices(arr: unknown[]): DiscoveredOffice[] {
  const out: DiscoveredOffice[] = [];
  const seen = new Set<string>();
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const country = typeof o.country === "string" ? o.country.trim() : "";
    const city = typeof o.city === "string" ? o.city.trim() : "";
    if (!country || !city) continue;

    const countryCode =
      typeof o.countryCode === "string" && /^[A-Za-z]{2}$/.test(o.countryCode)
        ? o.countryCode.toUpperCase()
        : "";
    // Drop off-list values (e.g. "EMEA", "APAC") so fillRegion() in the
    // handler can derive a canonical region from the country code instead.
    const rawRegion = typeof o.region === "string" ? o.region.trim() : "";
    const region = ALLOWED_REGIONS.has(rawRegion) ? rawRegion : "";
    const officeType =
      typeof o.officeType === "string" && OFFICE_TYPES.has(o.officeType)
        ? (o.officeType as DiscoveredOffice["officeType"])
        : "branch";
    const address =
      typeof o.address === "string" && o.address.trim() ? o.address.trim() : undefined;
    const latitude = typeof o.latitude === "number" ? o.latitude : undefined;
    const longitude = typeof o.longitude === "number" ? o.longitude : undefined;

    const key = `${city.toLowerCase()}|${countryCode || country.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      country,
      countryCode,
      region,
      city,
      address,
      officeType,
      latitude,
      longitude,
    });
  }
  return out;
}
