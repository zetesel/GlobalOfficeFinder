import { useNavigate } from "react-router-dom";
import type { Company, Office } from "../types";
import CompanyLogo from "./CompanyLogo";

interface CompanyCardProps {
  company: Company;
  offices: Office[];
}

export default function CompanyCard({ company, offices }: CompanyCardProps) {
  const navigate = useNavigate();
  const countries = [...new Set(offices.map((o) => o.country))].sort();

  function handleClick() {
    navigate(`/company/${company.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/company/${company.id}`);
    }
  }

  return (
    <article
      className="company-card"
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`View ${company.name} offices`}
    >
      <div className="company-card-header">
        <CompanyLogo companyId={company.id} companyName={company.name} />
        <div>
          <h2 className="company-name">{company.name}</h2>
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
