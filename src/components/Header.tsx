import { Link, useLocation, useParams } from "react-router-dom";
import { useData } from "../hooks/useData";

function HomeBreadcrumb() {
  return null;
}

function CompanyBreadcrumb() {
  const { id = "" } = useParams<{ id: string }>();
  const { companyById } = useData();
  const co = companyById[id];
  return (
    <>
      <Link to="/">Offices</Link>
      <span>/</span>
      <b>{co ? co.name : id}</b>
    </>
  );
}

function CountryBreadcrumb() {
  const { code = "" } = useParams<{ code: string }>();
  const { offices } = useData();
  const sample = offices.find((o) => o.country === code);
  return (
    <>
      <Link to="/">Offices</Link>
      <span>/</span>
      <b>{sample ? sample.country : code}</b>
    </>
  );
}

function Breadcrumb() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/company/")) return <CompanyBreadcrumb />;
  if (pathname.startsWith("/country/")) return <CountryBreadcrumb />;
  return <HomeBreadcrumb />;
}

export default function Header() {
  const { companies, offices } = useData();
  const countrySet = new Set<string>();
  offices.forEach((o) => countrySet.add(o.country));
  const countries = countrySet.size;
  return (
    <header className="gof-header">
      <Link to="/" className="gof-brand" aria-label="GlobalOfficeFinder home">
        <span className="gof-brand-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 22 22">
            <circle
              cx="11"
              cy="11"
              r="9"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <ellipse
              cx="11"
              cy="11"
              rx="4"
              ry="9"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M2 11H20M3.5 6.5H18.5M3.5 15.5H18.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </span>
        <span className="gof-brand-name">
          GlobalOffice<b>Finder</b>
        </span>
      </Link>

      <nav className="gof-breadcrumb" aria-label="Breadcrumb">
        <Breadcrumb />
      </nav>

      <div className="gof-header-meta">
        <span>
          <b>{companies.length}</b> companies
        </span>
        <span className="gof-dot">·</span>
        <span>
          <b>{offices.length}</b> offices
        </span>
        <span className="gof-dot">·</span>
        <span>
          <b>{countries}</b> countries
        </span>
        <span className="gof-dot">·</span>
        <Link to="/about/photos" className="gof-header-link">
          About photos
        </Link>
      </div>
    </header>
  );
}
