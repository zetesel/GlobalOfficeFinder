import { useParams, Link } from "react-router-dom";
import companies from "../../data/companies.json";
import offices from "../../data/offices.json";
import type { Company, Office } from "../types";
import OfficeCard from "../components/OfficeCard";
import { MapView } from "../components/MapView";
import { sanitizeUrl } from "../utils/data";

const allCompanies = companies as Company[];
const allOffices = offices as Office[];
const DEFAULT_WORLD_CENTER: [number, number] = [20, 0]; // Leaflet [lat, lng] tuple: 20°N latitude, 0° longitude (Prime Meridian)
const SINGLE_OFFICE_ZOOM = 10;
const MULTI_OFFICE_ZOOM = 3;

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const company = allCompanies.find((c) => c.id === id);

  if (!company) {
    return (
      <div className="container page-error">
        <h1>Company not found</h1>
        <p>No company with the identifier "{id}" exists in our database.</p>
        <Link to="/" className="btn-primary">
          ← Back to search
        </Link>
      </div>
    );
  }

  const companyOffices = allOffices.filter((o) => o.companyId === company.id);
  const mapOffices = companyOffices.filter(
    (office): office is Office & { latitude: number; longitude: number } =>
      office.latitude !== undefined && office.longitude !== undefined
  );
  const countries = [...new Set(companyOffices.map((o) => o.country))].sort();
  const regions = [...new Set(companyOffices.map((o) => o.region))].sort();
  const mapCenter: [number, number] =
    mapOffices.length > 0
      ? (() => {
          const { latSum, lonSum } = mapOffices.reduce(
            (acc, office) => {
              acc.latSum += office.latitude;
              acc.lonSum += office.longitude;
              return acc;
            },
            { latSum: 0, lonSum: 0 }
          );
          return [latSum / mapOffices.length, lonSum / mapOffices.length] as [number, number];
        })()
      : DEFAULT_WORLD_CENTER;
  const mapZoom = mapOffices.length === 1 ? SINGLE_OFFICE_ZOOM : MULTI_OFFICE_ZOOM;

  const safeWebsite = sanitizeUrl(company.website);

  // Group offices by region then country for display
  const grouped = new Map<string, Map<string, Office[]>>();
  for (const office of companyOffices) {
    if (!grouped.has(office.region)) grouped.set(office.region, new Map());
    const byCountry = grouped.get(office.region)!;
    if (!byCountry.has(office.country)) byCountry.set(office.country, []);
    byCountry.get(office.country)!.push(office);
  }

  return (
    <div className="company-page container">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Home</Link> › <span>{company.name}</span>
      </nav>

      <header className="company-page-header">
        {company.logo ? (
          <img
            src={company.logo}
            alt={`${company.name} logo`}
            className="company-logo-large"
          />
        ) : (
          <div className="company-logo-large-placeholder" aria-hidden="true">
            {company.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1>{company.name}</h1>
          <p className="company-industry-tag">{company.industry}</p>
          {safeWebsite && (
            <a
              href={safeWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="company-website-link"
            >
              {safeWebsite} ↗
            </a>
          )}
        </div>
      </header>

      <section className="company-description-section">
        <p>{company.description}</p>
      </section>

      <section className="company-stats">
        <div className="stat-box">
          <span className="stat-number">{companyOffices.length}</span>
          <span className="stat-label">Offices</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{countries.length}</span>
          <span className="stat-label">Countries</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{regions.length}</span>
          <span className="stat-label">Regions</span>
        </div>
      </section>

      <section className="offices-section">
        <h2>Office Locations</h2>
        <div className="company-offices-layout">
          <div className="company-offices-list">
            {[...grouped.entries()].sort().map(([region, byCountry]) => (
              <div key={region} className="region-group">
                <h3 className="region-heading">{region}</h3>
                {[...byCountry.entries()].sort().map(([country, countryOffices]) => {
                  const countryCode = countryOffices[0].countryCode;
                  return (
                    <div key={country} className="country-group">
                      <h4 className="country-heading">
                        <Link to={`/country/${countryCode}`}>{country}</Link>
                      </h4>
                      <div className="office-grid">
                        {countryOffices.map((office) => (
                          <OfficeCard key={office.id} office={office} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <aside className="company-map-panel" aria-label="Company offices map">
            <h3>Map</h3>
            {mapOffices.length > 0 ? (
              <MapView
                offices={mapOffices}
                center={mapCenter}
                zoom={mapZoom}
                height="520px"
                autoFit
              />
            ) : (
              <p className="no-results">
                Map unavailable: office coordinates are not yet available for this company.
              </p>
            )}
          </aside>
        </div>
      </section>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: company.name,
            url: safeWebsite ?? undefined,
            description: company.description,
            location: companyOffices.map((o) => ({
              "@type": "Place",
              name: `${company.name} — ${o.city}`,
              address: {
                "@type": "PostalAddress",
                streetAddress: o.address,
                addressLocality: o.city,
                postalCode: o.postalCode,
                addressCountry: o.countryCode,
              },
            })),
          }),
        }}
      />
    </div>
  );
}
