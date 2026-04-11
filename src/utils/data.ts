import type { Office, CountrySummary } from "../types";

export function getCountrySummaries(offices: Office[]): CountrySummary[] {
  const map = new Map<string, CountrySummary>();

  for (const office of offices) {
    const key = office.countryCode;
    if (!map.has(key)) {
      map.set(key, {
        code: office.countryCode,
        name: office.country,
        region: office.region,
        officeCount: 0,
        companyIds: [],
      });
    }
    const summary = map.get(key)!;
    summary.officeCount += 1;
    if (!summary.companyIds.includes(office.companyId)) {
      summary.companyIds.push(office.companyId);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return undefined;
}
