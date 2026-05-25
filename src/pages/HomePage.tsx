import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import companies from "../../data/companies.json";
import type { Company } from "../types";
import CompanyCard from "../components/CompanyCard";
import Select from "../components/Select";
import { useCompanySearch } from "../hooks/useCompanySearch";
import { MapView } from "../components/MapView";
import { getFilteredHomeData } from "../utils/filters";
import { usePublishedOffices } from "../hooks/usePublishedOffices";
import { useLocallyApprovedCount } from "../hooks/useLocallyApprovedCount";
import { revokeAllLocalApprovals } from "../utils/revokeLocalApprovals";

const allCompanies = companies as Company[];
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
  const [revoking, setRevoking] = useState(false);

  const { results: searchResults } = useCompanySearch(allCompanies, query);

  const publishedOffices = usePublishedOffices();
  const locallyApprovedCount = useLocallyApprovedCount();

  function handleRevokeApprovals() {
    const confirmed = window.confirm(
      "Revoke all local approvals?\n\nThis clears approve/reject decisions, catalog approvals, office corrections, and cached map geocodes. Offices will return to waiting for approval on this browser. Data in data/offices.json is not changed.",
    );
    if (!confirmed) return;
    setRevoking(true);
    setTimeout(() => revokeAllLocalApprovals(), 250);
  }

  const allRegions = useMemo(() => [...new Set(publishedOffices.map((o) => o.region))].sort(), [publishedOffices]);
  const allOfficeTypes = useMemo(() => [...new Set(publishedOffices.map((o) => o.officeType))].sort(), [publishedOffices]);
  const allIndustries = useMemo(() => {
    const companyIds = new Set(publishedOffices.map((o) => o.companyId));
    return [...new Set(allCompanies.filter((c) => companyIds.has(c.id)).map((c) => c.industry))].sort();
  }, [publishedOffices]);
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
      }),
    [searchResults, publishedOffices, region, country, industry, officeType],
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

  const hasActiveFilters = Boolean(
    query || region || country || industry || officeType,
  );
  const isEmptyCatalog = publishedOffices.length === 0 && !hasActiveFilters;

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
          <div className="filter-row">
            <div className="filter-group">
              <Select
                label="Region"
                value={region}
                options={[
                  { value: "", label: "All regions" },
                  ...allRegions.map((r) => ({ value: r, label: r })),
                ]}
                onChange={(value) => {
                  const next = new URLSearchParams(searchParams);
                  if (value) next.set("region", value);
                  else next.delete("region");
                  next.delete("country");
                  setSearchParams(next);
                }}
              />
            </div>
            <div className="filter-group">
              <Select
                label="Country"
                value={country}
                options={[
                  { value: "", label: "All countries" },
                  ...countryOptions.map(([code, name]) => ({ value: code, label: name })),
                ]}
                onChange={(value) => setFilterParam("country", value)}
              />
            </div>
            <div className="filter-group">
              <Select
                label="Industry"
                value={industry}
                options={[
                  { value: "", label: "All industries" },
                  ...allIndustries.map((value) => ({ value, label: value })),
                ]}
                onChange={(value) => setFilterParam("industry", value)}
              />
            </div>
            <div className="filter-group">
              <Select
                label="Office type"
                value={officeType}
                options={[
                  { value: "", label: "All office types" },
                  ...allOfficeTypes.map((value) => ({ value, label: value })),
                ]}
                onChange={(value) => setFilterParam("officeType", value)}
              />
            </div>
            {(query || region || country || industry || officeType) && (
              <button
                className="btn-clear-filter"
                onClick={() => {
                  setSearchParams(new URLSearchParams());
                }}
                title="Clear filters"
              >
                <span className="btn-clear-filter__icon">✕</span>
                <span className="btn-clear-filter__label">
                  <span className="btn-clear-filter__text">Clear filters</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {allCountries.length > 0 && (
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
      )}

       <section aria-label="Company results" className="results-section">
          {locallyApprovedCount > 0 ? (
            <div className={`info-card revoke-approvals-bar${revoking ? " exiting" : ""}`} data-testid="revoke-approvals-bar">
              <p className="muted">
                {locallyApprovedCount} office{locallyApprovedCount !== 1 ? "s" : ""} approved locally
                on this browser. Revoke to send them back to the Review Queue.
              </p>
              <button type="button" className="btn-clear" onClick={handleRevokeApprovals}>
                Revoke approvals
              </button>
            </div>
          ) : null}
         <p className="results-count">
           {filteredCompanies.length}{" "}
           {filteredCompanies.length !== 1 ? "companies" : "company"} found
         </p>
          {filteredCompanies.length === 0 ? (
            isEmptyCatalog ? (
              <div className="info-card empty-catalog" data-testid="empty-catalog">
                <h2>No offices published yet</h2>
                <p className="muted">
                  Offices must be approved in the Review Queue before they appear on the homepage.
                  Check Recent Changes for the latest scraper run, then approve and export offices
                  for merge into the catalog.
                </p>
                <div className="empty-catalog-links">
                  <Link to="/review-queue" className="btn-primary">
                    Open Review Queue
                  </Link>
                  <Link to="/recent-changes" className="chip">
                    View Recent Changes
                  </Link>
                </div>
              </div>
            ) : (
              <p className="no-results">No companies match your search. Try different filters.</p>
            )
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
