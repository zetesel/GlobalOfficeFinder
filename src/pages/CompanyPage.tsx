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
import { REGION_ORDER } from "../utils/typeTag";

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

  const { countries, regions, hq } = useMemo(() => {
    const countries = new Set<string>();
    const regions = new Set<string>();
    let hqOffice = undefined;

    for (const o of offices) {
      countries.add(o.country);
      regions.add(o.region);
      if (!hqOffice && /headquarters/i.test(o.officeType)) {
        hqOffice = o;
      }
    }

    return {
      countries,
      regions,
      hq: hqOffice || offices[0],
    };
  }, [offices]);

  const groupedOffices = useMemo(() => {
    const regionMap = new Map<
      string,
      Map<string, { countryCode: string; offices: typeof offices }>
    >();

    for (const o of offices) {
      const region = o.region || "Other";
      let countryMap = regionMap.get(region);
      if (!countryMap) {
        countryMap = new Map();
        regionMap.set(region, countryMap);
      }
      let countryData = countryMap.get(o.country);
      if (!countryData) {
        countryData = { countryCode: o.countryCode, offices: [] };
        countryMap.set(o.country, countryData);
      }
      countryData.offices.push(o);
    }

    const sortedRegions = Array.from(regionMap.keys()).sort((a, b) => {
      const idxA = REGION_ORDER.indexOf(a);
      const idxB = REGION_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedRegions.map((region) => {
      const countryMap = regionMap.get(region)!;
      const countries = Array.from(countryMap.keys()).sort((a, b) =>
        a.localeCompare(b)
      );
      const countryGroups = countries.map((country) => {
        const data = countryMap.get(country)!;
        return {
          country,
          countryCode: data.countryCode,
          offices: data.offices,
        };
      });
      const totalOffices = countryGroups.reduce(
        (acc, c) => acc + c.offices.length,
        0
      );
      return {
        region,
        totalOffices,
        countryGroups,
      };
    });
  }, [offices]);

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

  const website = sanitizeUrl(company.website);

  function selectOffice(officeId: string) {
    setActiveId(officeId);
    setFocus({ id: officeId });
  }

  function handleResetView() {
    setActiveId(null);
    setFocus({ fit: true });
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
            <div className="gof-hero-body">
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
            <div className="gof-grouped-offices">
              {groupedOffices.map((rGroup) => (
                <section key={rGroup.region} className="gof-region-block">
                  <h3 className="gof-region-h">
                    {rGroup.region} <span>{rGroup.totalOffices}</span>
                  </h3>
                  {rGroup.countryGroups.map((cGroup) => (
                    <div key={cGroup.country} className="gof-country-block">
                      <div className="gof-country-h-row">
                        <h4 className="gof-country-h">
                          <FlagChip code={cGroup.countryCode} /> <span>{cGroup.country}</span>{" "}
                          <span className="gof-badge-count">{cGroup.offices.length}</span>
                        </h4>
                        <Link
                          to={`/country/${encodeURIComponent(cGroup.country)}`}
                          className="gof-country-link"
                          title={`View all offices in ${cGroup.country}`}
                        >
                          View country
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            style={{ marginLeft: 4 }}
                            aria-hidden="true"
                          >
                            <path
                              d="M4.5 2.5L8 6L4.5 9.5"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Link>
                      </div>
                      <div className="gof-office-grid">
                        {cGroup.offices.map((o) => {
                          const tag = o.tag;
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
                              aria-selected={isActive}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  selectOffice(o.id);
                                }
                              }}
                            >
                              <div className="gof-officecard-body">
                                <div className="gof-officecard-head">
                                  <div className="gof-officecard-city">{o.city}</div>
                                  <span className={"gof-tag tag-" + tag.tone}>{tag.short}</span>
                                </div>
                                <div className="gof-officecard-addr">
                                  {o.address}
                                  {o.postalCode ? ` · ${o.postalCode}` : ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
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
                  onResetView={handleResetView}
                  focus={focus}
                  padding={[24, 24]}
                  showPopup={false}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
