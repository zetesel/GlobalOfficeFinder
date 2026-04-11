import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import companies from "../../data/companies.json";
import offices from "../../data/offices.json";
import type { Company, Office } from "../types";
import CompanyCard from "../components/CompanyCard";
import { useCompanySearch } from "../hooks/useCompanySearch";

const allCompanies = companies as Company[];
const allOffices = offices as Office[];

const ALL_REGIONS = [...new Set(allOffices.map((o) => o.region))].sort();
const ALL_COUNTRIES = [
  ...new Map(allOffices.map((o) => [o.countryCode, o.country])).entries(),
].sort((a, b) => a[1].localeCompare(b[1]));

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");

  const { results: searchResults } = useCompanySearch(allCompanies, query);

  const filteredCompanies = useMemo(() => {
    if (!region && !country) return searchResults;
    const matchingCompanyIds = new Set(
      allOffices
        .filter(
          (o) =>
            (!region || o.region === region) &&
            (!country || o.countryCode === country)
        )
        .map((o) => o.companyId)
    );
    return searchResults.filter((c) => matchingCompanyIds.has(c.id));
  }, [searchResults, region, country]);

  function getOfficesForCompany(companyId: string) {
    return allOffices.filter((o) => o.companyId === companyId);
  }

  const countryOptions = useMemo(() => {
    if (!region) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(([code]) => {
      const officeInRegion = allOffices.find(
        (o) => o.countryCode === code && o.region === region
      );
      return !!officeInRegion;
    });
  }, [region]);

  function handleRegionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setRegion(e.target.value);
    setCountry("");
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
            onChange={(e) => setQuery(e.target.value)}
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
              {ALL_REGIONS.map((r) => (
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
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">All countries</option>
              {countryOptions.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          {(query || region || country) && (
            <button
              className="btn-clear"
              onClick={() => {
                setQuery("");
                setRegion("");
                setCountry("");
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
          {ALL_COUNTRIES.slice(0, 12).map(([code, name]) => (
            <Link key={code} to={`/country/${code}`} className="chip">
              {name}
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Company results" className="results-section">
        <p className="results-count">
          {filteredCompanies.length} compan
          {filteredCompanies.length !== 1 ? "ies" : "y"} found
        </p>
        {filteredCompanies.length === 0 ? (
          <p className="no-results">No companies match your search. Try different filters.</p>
        ) : (
          <div className="company-grid">
            {filteredCompanies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                offices={getOfficesForCompany(company.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
