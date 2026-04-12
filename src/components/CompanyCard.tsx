import { Link } from "react-router-dom";
import type { Company, Office } from "../types";

interface CompanyCardProps {
  company: Company;
  offices: Office[];
}

export default function CompanyCard({ company, offices }: CompanyCardProps) {
  const countries = [...new Set(offices.map((o) => o.country))].sort();
  return (
    <article className="company-card">
      <div className="company-card-header">
        {company.logo ? (
          <img
            src={company.logo}
            alt={`${company.name} logo`}
            className="company-logo"
            loading="lazy"
          />
        ) : (
          <div className="company-logo-placeholder" aria-hidden="true">
            {company.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="company-name">
            <Link to={`/company/${company.id}`}>{company.name}</Link>
          </h2>
          <p className="company-industry">{company.industry}</p>
        </div>
      </div>
      <p className="company-description">{company.description}</p>
      <div className="company-meta">
        <span className="meta-pill">{offices.length} office{offices.length !== 1 ? "s" : ""}</span>
        <span className="meta-pill">{countries.length} countr{countries.length !== 1 ? "ies" : "y"}</span>
      </div>
      {countries.length > 0 && (
        <p className="company-countries">{countries.join(" · ")}</p>
      )}
    </article>
  );
}
