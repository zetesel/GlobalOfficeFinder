import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useNavigationType,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useData } from "../hooks/useData";
import Photo from "../components/Photo";
import Monogram from "../components/Monogram";
import FlagChip from "../components/FlagChip";
import MapView, { type MapFocus } from "../components/MapView";
import { sanitizeUrl } from "../utils/sanitizeUrl";

interface StatProps {
  n: number;
  label: string;
}
function Stat({ n, label }: StatProps) {
  return (
    <div className="gof-stat">
      <div className="gof-stat-n">{n}</div>
      <div className="gof-stat-l">{label}</div>
    </div>
  );
}

export default function CompanyPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const goBack = () => {
    if (navType === "PUSH" && window.history.length > 1) navigate(-1);
    else navigate("/");
  };
  const [searchParams] = useSearchParams();
  const initialOfficeId = searchParams.get("office");
  const { publicOffices: allOffices, companyById } = useData();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(initialOfficeId);
  const [focus, setFocus] = useState<MapFocus>(
    initialOfficeId ? { id: initialOfficeId } : { fit: true },
  );
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const company = companyById[id];

  const offices = useMemo(
    () => allOffices.filter((o) => o.companyId === id),
    [allOffices, id],
  );

  // Scroll the targeted office card into view when arriving with ?office=…
  useEffect(() => {
    if (!initialOfficeId) return;
    const el = cardRefs.current[initialOfficeId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [initialOfficeId]);

  if (!company) {
    return (
      <div className="gof-notfound">
        Company not found.{" "}
        <Link to="/" className="gof-link">
          Back to directory
        </Link>
      </div>
    );
  }

  const countries = new Set(offices.map((o) => o.country));
  const regions = new Set(offices.map((o) => o.region));
  const hq = offices.find((o) => /headquarters/i.test(o.officeType)) || offices[0];
  const website = sanitizeUrl(company.website);

  function selectOffice(officeId: string) {
    setActiveId(officeId);
    setFocus({ id: officeId });
  }

  return (
    <div className="gof-page">
      <div className="gof-page-inner">
        <button type="button" className="gof-back" onClick={goBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M8.5 3L4.5 7L8.5 11"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Directory
        </button>

        <Photo
          seed={company.id}
          w={1400}
          h={620}
          className="gof-hero"
          photo={company.photo}
          subject={company.name}
        >
          <div className="gof-hero-overlay">
            <Monogram name={company.name} size={62} square />
            <div style={{ minWidth: 0 }}>
              <h1 className="gof-hero-name">{company.name}</h1>
              <div className="gof-hero-ind">
                {company.industry}
                {hq ? ` · HQ in ${hq.city}` : ""}
              </div>
            </div>
          </div>
        </Photo>

        <div className="gof-page-grid">
          <div className="gof-page-main">
            {company.description && <p className="gof-co-desc">{company.description}</p>}
            {website && (
              <a
                className="gof-co-link"
                href={website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit website
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  style={{ marginLeft: 6 }}
                  aria-hidden="true"
                >
                  <path
                    d="M4 9L9 4M9 4H5M9 4V8"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            )}

            <h2 className="gof-section-h">
              Offices <span>{offices.length}</span>
            </h2>
            <div className="gof-office-grid">
              {offices.map((o) => {
                const isActive = activeId === o.id;
                const isHover = hoverId === o.id;
                return (
                  <div
                    key={o.id}
                    ref={(el) => {
                      cardRefs.current[o.id] = el;
                    }}
                    className={
                      "gof-officecard" +
                      (isActive ? " is-active" : "") +
                      (isHover ? " is-hover" : "")
                    }
                    onMouseEnter={() => setHoverId(o.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => selectOffice(o.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectOffice(o.id);
                      }
                    }}
                  >
                    <Photo
                      seed={o.id}
                      w={520}
                      h={300}
                      className="gof-officecard-photo"
                      photo={o.tone === "hq" ? company.photo : undefined}
                      subject={company.name}
                    >
                      <span className={"gof-tag tag-" + o.tone + " gof-officecard-tag"}>
                        {o.short}
                      </span>
                    </Photo>
                    <div className="gof-officecard-body">
                      <div className="gof-officecard-city">{o.city}</div>
                      <div className="gof-officecard-addr">
                        {o.address}
                        {o.postalCode ? ` · ${o.postalCode}` : ""}
                      </div>
                      <Link
                        to={`/country/${encodeURIComponent(o.country)}`}
                        className="gof-officecard-country"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FlagChip code={o.countryCode} /> {o.country}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="gof-page-side">
            <div className="gof-statrow">
              <Stat n={offices.length} label={offices.length === 1 ? "office" : "offices"} />
              <Stat n={countries.size} label={countries.size === 1 ? "country" : "countries"} />
              <Stat n={regions.size} label={regions.size === 1 ? "region" : "regions"} />
            </div>
            <div className="gof-locmap">
              <div className="gof-locmap-head">Locations</div>
              <div className="gof-locmap-canvas">
                <MapView
                  offices={offices}
                  companyById={companyById}
                  activeId={activeId}
                  hoverId={hoverId}
                  onHover={setHoverId}
                  onSelect={(o) => selectOffice(o.id)}
                  focus={focus}
                  padding={[50, 50]}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
