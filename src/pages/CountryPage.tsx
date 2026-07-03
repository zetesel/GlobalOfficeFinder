import { useMemo, useState } from "react";
import { Link, useNavigate, useNavigationType, useParams } from "react-router-dom";
import { useData } from "../hooks/useData";
import Photo from "../components/Photo";
import Monogram from "../components/Monogram";
import FlagChip from "../components/FlagChip";
import MapView, { type MapFocus } from "../components/MapView";

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

export default function CountryPage() {
  const { code = "" } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const goBack = () => {
    if (navType === "PUSH" && window.history.length > 1) navigate(-1);
    else navigate("/");
  };
  const { publicOffices: allOffices, companyById } = useData();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus>({ fit: true });

  const offices = useMemo(
    () => allOffices.filter((o) => o.country === code),
    [allOffices, code],
  );

  if (!offices.length) {
    return (
      <div className="gof-notfound">
        No offices in this country.{" "}
        <Link to="/" className="gof-link">
          Back to directory
        </Link>
      </div>
    );
  }

  const countryCode = offices[0].countryCode;
  const region = offices[0].region;
  const companies = [...new Set(offices.map((o) => o.companyId))];
  const cities = new Set(offices.map((o) => o.city));

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

        <Photo seed={"country-" + code} w={1400} h={520} className="gof-hero" subject={code}>
          <div className="gof-hero-overlay">
            <div
              style={{
                transform: "scale(1.5)",
                transformOrigin: "left center",
                marginRight: 16,
              }}
            >
              <FlagChip code={countryCode} />
            </div>
            <div className="gof-hero-body">
              <h1 className="gof-hero-name">{code}</h1>
              <div className="gof-hero-ind">{region}</div>
            </div>
          </div>
        </Photo>

        <div className="gof-page-grid">
          <div className="gof-page-main">
            <h2 className="gof-section-h">
              Companies here <span>{companies.length}</span>
            </h2>
            {companies.map((cid) => {
              const co = companyById[cid];
              if (!co) return null;
              const list = offices.filter((o) => o.companyId === cid);
              return (
                <div
                  key={cid}
                  className={
                    "gof-crow" + (list.some((o) => o.id === activeId) ? " is-active" : "")
                  }
                >
                  <Link
                    to={`/company/${encodeURIComponent(cid)}`}
                    className="gof-crow-head"
                  >
                    <Monogram name={co.name} size={42} square />
                    <div className="gof-flex-body">
                      <div className="gof-crow-name">{co.name}</div>
                      <div className="gof-crow-ind">{co.industry}</div>
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      style={{ opacity: 0.4 }}
                      aria-hidden="true"
                    >
                      <path
                        d="M5.5 3L9.5 7L5.5 11"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                  <div className="gof-crow-offices">
                    {list.map((o) => {
                      const tag = o.tag;
                      const isActive = activeId === o.id;
                      const isHover = hoverId === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className={
                            "gof-chip-office" +
                            (isActive ? " is-active" : "") +
                            (isHover ? " is-hover" : "")
                          }
                          onMouseEnter={() => setHoverId(o.id)}
                          onMouseLeave={() => setHoverId(null)}
                          onClick={() => selectOffice(o.id)}
                        >
                          {o.city} <span className={"gof-tag tag-" + tag.tone}>{tag.short}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="gof-page-side">
            <div className="gof-statrow">
              <Stat n={offices.length} label={offices.length === 1 ? "office" : "offices"} />
              <Stat n={companies.length} label={companies.length === 1 ? "company" : "companies"} />
              <Stat n={cities.size} label={cities.size === 1 ? "city" : "cities"} />
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
