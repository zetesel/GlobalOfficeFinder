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
  const codesSet = new Set<string>();
  const countries = new Set<string>();
  let hq: Office | undefined;

  for (const o of offices) {
    codesSet.add(o.countryCode);
    countries.add(o.country);
    if (!hq && /headquarters/i.test(o.officeType)) {
      hq = o;
    }
  }

  if (!hq && offices.length > 0) {
    hq = offices[0];
  }

  const codes = Array.from(codesSet);

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
          {codes.length > 3 && <span className="gof-card-flagmore">+{codes.length - 3}</span>}
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
            <b>{offices.length}</b> {offices.length === 1 ? "office" : "offices"}
          </span>
          <span className="gof-dot">·</span>
          <span>
            <b>{countries.size}</b> {countries.size === 1 ? "country" : "countries"}
          </span>
        </div>
      </div>
    </Link>
  );
}
