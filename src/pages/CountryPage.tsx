import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useNavigationType, useParams, useSearchParams } from "react-router";
import { useData } from "../hooks/useData";
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
  const [searchParams] = useSearchParams();
  const initialOfficeId = searchParams.get("office");
  const { publicOffices: allOffices, companyById } = useData();

  const offices = useMemo(
    () => allOffices.filter((o) => o.country === code),
    [allOffices, code],
  );

  const { companies, cities, officesByCompany } = useMemo(() => {
    const companyIds = new Set<string>();
    const cityNames = new Set<string>();
    const grouped: Record<string, typeof offices> = {};
    for (const o of offices) {
      companyIds.add(o.companyId);
      cityNames.add(o.city);
      if (!grouped[o.companyId]) grouped[o.companyId] = [];
      grouped[o.companyId].push(o);
    }
    return {
      companies: Array.from(companyIds),
      cities: cityNames,
      officesByCompany: grouped,
    };
  }, [offices]);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(initialOfficeId);
  const [focus, setFocus] = useState<MapFocus>(
    initialOfficeId ? { id: initialOfficeId } : { fit: true },
  );
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mapRef = useRef<HTMLDivElement | null>(null);

  // Scroll the targeted office card into view when arriving with ?office=…
  useEffect(() => {
    if (!initialOfficeId) return;
    const el = cardRefs.current[initialOfficeId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [initialOfficeId]);

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

  function selectOffice(officeId: string, shouldScroll = false) {
    setActiveId(officeId);
    setFocus({ id: officeId });
    if (shouldScroll) {
      mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

        <div
          ref={mapRef}
          className="gof-hero gof-hero-map-wrap gof-locmap"
          role="region"
          aria-label={`${code} offices map`}
        >
          <MapView
            offices={offices}
            companyById={companyById}
            activeId={activeId}
            hoverId={hoverId}
            onHover={setHoverId}
            onSelect={(o) => selectOffice(o.id, false)}
            onResetView={handleResetView}
            focus={focus}
            padding={[40, 40]}
            showPopup={false}
            maxFitZoom={18}
            focusZoom={16}
          />
          <div className="gof-hero-map-overlay">
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
        </div>

        <div className="gof-co-overview">
          <div className="gof-co-intro" />
          <div className="gof-statrow">
            <Stat n={offices.length} label={offices.length === 1 ? "office" : "offices"} />
            <Stat n={companies.length} label={companies.length === 1 ? "company" : "companies"} />
            <Stat n={cities.size} label={cities.size === 1 ? "city" : "cities"} />
          </div>
        </div>

        <h2 className="gof-section-h">
          Companies here <span>{companies.length}</span>
        </h2>

        <div className="gof-office-grid">
          {companies.map((cid) => {
            const co = companyById[cid];
            const list = officesByCompany[cid];
            if (!co || !list) return null;
            const isMulti = list.length > 1;
            const isCardActive = list.some((o) => o.id === activeId);
            const isCardHover = list.some((o) => o.id === hoverId);
            const primaryOffice = list.find((o) => o.id === activeId) || list[0];

            return (
              <div
                key={cid}
                ref={(el) => {
                  for (const o of list) {
                    cardRefs.current[o.id] = el;
                  }
                }}
                className={
                  "gof-officecard gof-co-card" +
                  (isMulti && list.length > 4 ? " gof-co-card--wide" : "") +
                  (isCardActive ? " is-active" : "") +
                  (isCardHover ? " is-hover" : "")
                }
                onMouseEnter={() => {
                  if (!isMulti && primaryOffice) setHoverId(primaryOffice.id);
                }}
                onMouseLeave={() => {
                  if (!isMulti) setHoverId(null);
                }}
                onClick={() => {
                  if (primaryOffice) selectOffice(primaryOffice.id, true);
                }}
                role="button"
                tabIndex={0}
                aria-selected={isCardActive}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (primaryOffice) selectOffice(primaryOffice.id, true);
                  }
                }}
              >
                <div className="gof-officecard-body">
                  <div className="gof-officecard-country-row">
                    <div className="gof-officecard-country-info">
                      <Monogram name={co.name} size={36} square />
                      <div style={{ minWidth: 0 }}>
                        <div className="gof-officecard-country-name" title={co.name}>
                          {co.name}
                        </div>
                        <div className="gof-crow-ind" title={co.industry}>
                          {co.industry}
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/company/${encodeURIComponent(cid)}`}
                      className="gof-officecard-country-btn"
                      title={`View ${co.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      View company
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        style={{ marginLeft: 3 }}
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

                  {!isMulti ? (
                    <>
                      <div className="gof-officecard-head">
                        <div className="gof-officecard-city">{primaryOffice.city}</div>
                        <span className={"gof-tag tag-" + primaryOffice.tag.tone}>
                          {primaryOffice.tag.short}
                        </span>
                      </div>
                      <div className="gof-officecard-addr">
                        {primaryOffice.address}
                        {primaryOffice.postalCode ? ` · ${primaryOffice.postalCode}` : ""}
                      </div>
                    </>
                  ) : (
                    <div className="gof-co-card-multi-wrap">
                      <div className="gof-co-card-multi-title">
                        {list.length} locations
                      </div>
                      <div className="gof-co-card-chips">
                        {list.map((o) => {
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
                              onMouseEnter={(e) => {
                                e.stopPropagation();
                                setHoverId(o.id);
                              }}
                              onMouseLeave={(e) => {
                                e.stopPropagation();
                                setHoverId(null);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectOffice(o.id, true);
                              }}
                            >
                              {o.city}{" "}
                              <span className={"gof-tag tag-" + o.tag.tone}>
                                {o.tag.short}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
