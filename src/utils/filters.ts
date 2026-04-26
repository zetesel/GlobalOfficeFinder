import type { Company, Office } from "../types";

export interface HomeFilters {
  region: string;
  country: string;
  industry: string;
  officeType: string;
  hasHq: boolean;
  hasContactUrl: boolean;
}

export interface FilteredHomeData {
  filteredCompanies: Company[];
  filteredOfficesByCompany: Map<string, Office[]>;
  mapOffices: Office[];
}

function isHeadquarters(officeType: string): boolean {
  return officeType.toLowerCase().includes("headquarters");
}

export function getFilteredHomeData(
  searchResults: Company[],
  allOffices: Office[],
  filters: HomeFilters,
): FilteredHomeData {
  const officesByCompany = new Map<string, Office[]>();
  for (const office of allOffices) {
    if (!officesByCompany.has(office.companyId)) officesByCompany.set(office.companyId, []);
    officesByCompany.get(office.companyId)!.push(office);
  }

  const filteredCompanies: Company[] = [];
  const filteredOfficesByCompany = new Map<string, Office[]>();

  for (const company of searchResults) {
    if (filters.industry && company.industry !== filters.industry) {
      continue;
    }

    const companyOffices = officesByCompany.get(company.id) ?? [];
    if (
      filters.hasHq &&
      !companyOffices.some((office) => isHeadquarters(office.officeType))
    ) {
      continue;
    }

    const matchingOffices = companyOffices.filter(
      (office) =>
        (!filters.region || office.region === filters.region) &&
        (!filters.country || office.countryCode === filters.country) &&
        (!filters.officeType || office.officeType === filters.officeType) &&
        (!filters.hasContactUrl || Boolean(office.contactUrl)),
    );

    if (matchingOffices.length === 0) {
      continue;
    }

    filteredCompanies.push(company);
    filteredOfficesByCompany.set(company.id, matchingOffices);
  }

  return {
    filteredCompanies,
    filteredOfficesByCompany,
    mapOffices: filteredCompanies.flatMap(
      (company) => filteredOfficesByCompany.get(company.id) ?? [],
    ),
  };
}
