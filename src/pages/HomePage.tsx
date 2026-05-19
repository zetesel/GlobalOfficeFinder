import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import companies from "../../data/companies.json";
import offices from "../../data/offices.json";
import type { Company, Office } from "../types";
import CompanyCard from "../components/CompanyCard";
import { useCompanySearch } from "../hooks/useCompanySearch";
import { MapView } from "../components/MapView";
import { getFilteredHomeData } from "../utils/filters";
import { filterPublishedOffices } from "../utils/officeVisibility";

const allCompanies = companies as Company[];
const ALL_INDUSTRIES = [...new Set(allCompanies.map((c) => c.industry))].sort();
const ALL_COMPANY_NAMES_BY_ID = Object.fromEntries(
  allCompanies.map((company) => [company.id, company.name])
);

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const region = searchParams.get("region") ?? "";
  const country = searchParams.get("country") ?? "";
  const industry = searchParams.get("industry") ?? "";
  const officeType = searchParams.get("officeType") ?? "";
  const hasHq = searchParams.get("hasHq") === "1";
  const hasContactUrl = searchParams.get("hasContactUrl") === "1";

  const { results: searchResults } = useCompanySearch(allCompanies, query);

  const publishedOffices = useMemo(() => filterPublishedOffices(offices as Office[]), []);

  const allRegions = useMemo(() => [...new Set(publishedOffices.map((o) => o.region))].sort(), [publishedOffices]);
  const allOfficeTypes = useMemo(() => [...new Set(publishedOffices.map((o) => o.officeType))].sort(), [publishedOffices]);
  const allCountries = useMemo(() => [
    ...new Map(publishedOffices.map((o) => [o.countryCode, o.country])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1])), [publishedOffices]);

  const { filteredCompanies, filteredOfficesByCompany, mapOffices } = useMemo(
    () =>
      getFilteredHomeData(searchResults, publishedOffices, {
        region,
        country,
        industry,
        officeType,
        hasHq,
        hasContactUrl,
      }),
    [searchResults, publishedOffices, region, country, industry, officeType, hasHq, hasContactUrl],
  );

  function getOfficesForCompany(companyId: string) {
    return filteredOfficesByCompany.get(companyId) ?? [];
  }

  const countryOptions = useMemo(() => {
    if (!region) return allCountries;
    return allCountries.filter(([code]) => {
      const officeInRegion = publishedOffices.find(
        (o) => o.countryCode === code && o.region === region
      );
      return !!officeInRegion;
    });
  }, [region, allCountries, publishedOffices]);

  function setFilterParam(name: string, value: string | boolean) {
    const next = new URLSearchParams(searchParams);
    const normalizedValue = typeof value === "boolean" ? (value ? "1" : "") : value;
    if (normalizedValue) next.set(name, normalizedValue);
    else next.delete(name);
    setSearchParams(next);
  }

  function handleRegionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams);
    const value = e.target.value;
    if (value) next.set("region", value);
    else next.delete("region");
    next.delete("country");
    setSearchParams(next);
  }

  return (
    <div className="home-page container">
      <section className="hero-section">
        <h1>Find Company Offices Worldwide</h1>
        <p className="hero-subtitle">
          Search for companies and discover where they operate across the globe.
        </p>
      </section>

      <section className="search-section" aria-label="Search and filter">
        <div className="search-bar">
          <label htmlFor="search-input" className="sr-only">
            Search companies
          </label>
          <input
            id="search-input"
            type="search"
            placeholder="Search by company name or industry…"
            value={query}
            onChange={(e) => setFilterParam("q", e.target.value)}
            className="search-input"
            autoComplete="off"
          />
        </div>
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="region-filter">Region</label>
            <select
              id="region-filter"
              value={region}
              onChange={handleRegionChange}
            >
              <option value="">All regions</option>
              {allRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="country-filter">Country</label>
            <select
                id="country-filter"
                value={country}
                onChange={(e) => setFilterParam("country", e.target.value)}
              >
                <option value="">All countries</option>
                {countryOptions.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          <div className="filter-group">
            <label htmlFor="industry-filter">Industry</label>
            <select
              id="industry-filter"
              value={industry}
              onChange={(e) => setFilterParam("industry", e.target.value)}
            >
              <option value="">All industries</option>
              {ALL_INDUSTRIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="office-type-filter">Office type</label>
            <select
              id="office-type-filter"
              value={officeType}
              onChange={(e) => setFilterParam("officeType", e.target.value)}
            >
              <option value="">All office types</option>
              {allOfficeTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="filter-flags">
            <legend>Advanced</legend>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasHq}
                onChange={(e) => setFilterParam("hasHq", e.target.checked)}
              />
              Has headquarters
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasContactUrl}
                onChange={(e) => setFilterParam("hasContactUrl", e.target.checked)}
              />
              Has contact URL
            </label>
          </fieldset>
          {(query ||
            region ||
            country ||
            industry ||
            officeType ||
            hasHq ||
            hasContactUrl) && (
            <button
              className="btn-clear"
              onClick={() => {
                setSearchParams(new URLSearchParams());
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      <section aria-label="Countries quick-nav" className="country-chips">
        <p className="chips-label">Browse by country:</p>
        <div className="chips">
          {allCountries.slice(0, 12).map(([code, name]) => (
            <Link key={code} to={`/country/${code}`} className="chip">
              {name}
            </Link>
          ))}
        </div>
      </section>

       <section aria-label="Company results" className="results-section">
         <p className="results-count">
           {filteredCompanies.length}{" "}
           {filteredCompanies.length !== 1 ? "companies" : "company"} found
         </p>
          {filteredCompanies.length === 0 ? (
            <p className="no-results">No companies match your search. Try different filters.</p>
          ) : (
            <>
              <div className="company-grid">
               {filteredCompanies.map((company) => (
                 <CompanyCard
                   key={company.id}
                   company={company}
                   offices={getOfficesForCompany(company.id)}
                 />
               ))}
             </div>
             <div className="map-section">
               <h2>Office Locations Map</h2>
                <MapView
                  offices={mapOffices}
                  center={[20, 0]}
                  zoom={2}
                  companyNamesById={ALL_COMPANY_NAMES_BY_ID}
                />
              </div>
            </>
          )}
       </section>
    </div>
  );
}
