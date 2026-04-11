import { useParams, Link } from "react-router-dom";
import offices from "../../data/offices.json";
import companies from "../../data/companies.json";
import type { Company, Office } from "../types";
import OfficeCard from "../components/OfficeCard";

const allOffices = offices as Office[];
const allCompanies = companies as Company[];

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function CountryPage() {
  const { code } = useParams<{ code: string }>();
  const countryOffices = allOffices.filter((o) => o.countryCode === code);

  if (countryOffices.length === 0) {
    return (
      <div className="container page-error">
        <h1>Country not found</h1>
        <p>No offices found for country code "{code}".</p>
        <Link to="/" className="btn-primary">
          ← Back to search
        </Link>
      </div>
    );
  }

  const countryName = countryOffices[0].country;
  const region = countryOffices[0].region;

  // Group offices by company
  const byCompany = new Map<string, Office[]>();
  for (const office of countryOffices) {
    if (!byCompany.has(office.companyId)) byCompany.set(office.companyId, []);
    byCompany.get(office.companyId)!.push(office);
  }

  const companiesHere = [...byCompany.keys()]
    .map((id) => allCompanies.find((c) => c.id === id))
    .filter(Boolean) as Company[];
  companiesHere.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="country-page container">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Home</Link> › <span>{countryName}</span>
      </nav>

      <header className="country-page-header">
        <h1>{countryName}</h1>
        <p className="country-region">{region}</p>
      </header>

      <section className="country-stats">
        <div className="stat-box">
          <span className="stat-number">{countryOffices.length}</span>
          <span className="stat-label">Offices</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{companiesHere.length}</span>
          <span className="stat-label">Companies</span>
        </div>
      </section>

      <section className="country-companies">
        <h2>Companies with offices in {countryName}</h2>
        {companiesHere.map((company) => {
          const cos = byCompany.get(company.id) ?? [];
          return (
            <div key={company.id} className="country-company-block">
              <h3>
                <Link to={`/company/${company.id}`}>{company.name}</Link>
                <span className="company-industry-tag">{company.industry}</span>
              </h3>
              <div className="office-grid">
                {cos.map((office) => (
                  <OfficeCard key={office.id} office={office} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Country",
            name: countryName,
            containsPlace: countryOffices.map((o) => ({
              "@type": "Place",
              name: `${allCompanies.find((c) => c.id === o.companyId)?.name ?? o.companyId} — ${o.city}`,
              address: {
                "@type": "PostalAddress",
                streetAddress: o.address,
                addressLocality: o.city,
                postalCode: o.postalCode,
                addressCountry: code,
              },
            })),
          }),
        }}
      />
    </div>
  );
}
