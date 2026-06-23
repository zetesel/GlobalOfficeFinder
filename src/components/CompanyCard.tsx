import { Link } from "react-router-dom";
import type { Company, Office } from "../types";
import Photo from "./Photo";
import Monogram from "./Monogram";
import FlagChip from "./FlagChip";

interface CompanyCardProps {
  company: Company;
  offices: Office[];
}

export default function CompanyCard({ company, offices }: CompanyCardProps) {
  const codeSet = new Set<string>();
  const countrySet = new Set<string>();
  offices.forEach((o) => {
    codeSet.add(o.countryCode);
    countrySet.add(o.country);
  });

  const codes = [...codeSet];
  const hq =
    offices.find((o) => /headquarters/i.test(o.officeType)) || offices[0];
  return (
    <Link
      to={`/company/${encodeURIComponent(company.id)}`}
      className="gof-card"
      aria-label={`View ${company.name} offices`}
    >
      <Photo
        seed={company.id}
        w={640}
        h={360}
        className="gof-card-photo"
        photo={company.photo}
        subject={company.name}
      >
        <span className="gof-card-flags">
          {codes.slice(0, 3).map((c) => (
            <FlagChip key={c} code={c} />
          ))}
          {codes.length > 3 && (
            <span className="gof-card-flagmore">+{codes.length - 3}</span>
          )}
        </span>
        {hq && <span className="gof-card-hq">{hq.city}</span>}
      </Photo>
      <div className="gof-card-body">
        <div className="gof-card-top">
          <Monogram name={company.name} size={40} square />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="gof-card-name">{company.name}</div>
            <div className="gof-card-ind">{company.industry}</div>
          </div>
        </div>
        <div className="gof-card-meta">
          <span>
            <b>{offices.length}</b>{" "}
            {offices.length === 1 ? "office" : "offices"}
          </span>
          <span className="gof-dot">·</span>
          <span>
            <b>{countrySet.size}</b>{" "}
            {countrySet.size === 1 ? "country" : "countries"}
          </span>
        </div>
      </div>
    </Link>
  );
}
