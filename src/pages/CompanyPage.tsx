import { useParams, Link } from "react-router-dom";
import companies from "../../data/companies.json";
import offices from "../../data/offices.json";
import type { Company, Office } from "../types";
import OfficeCard from "../components/OfficeCard";
import { sanitizeUrl } from "../utils/data";

const allCompanies = companies as Company[];
const allOffices = offices as Office[];

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
  const countries = [...new Set(companyOffices.map((o) => o.country))].sort();
  const regions = [...new Set(companyOffices.map((o) => o.region))].sort();

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
