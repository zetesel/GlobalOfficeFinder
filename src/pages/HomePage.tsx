import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Dropdown from "../components/Dropdown";
import CompanyCard from "../components/CompanyCard";
import MapView, { type MapFocus } from "../components/MapView";
import Monogram from "../components/Monogram";
import FlagChip from "../components/FlagChip";
import Photo from "../components/Photo";
import { REGION_ORDER, truncate } from "../utils/typeTag";
import { useData } from "../hooks/useData";

type View = "grid" | "map";

interface Filters {
  q: string;
  region: string;
  industry: string;
  otype: string;
}

const INITIAL_FILTERS: Filters = { q: "", region: "", industry: "", otype: "" };

export default function HomePage() {
  const { publicOffices: offices, companyById, companies } = useData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const view: View = searchParams.get("view") === "map" ? "map" : "grid";
  const activeId = searchParams.get("office");

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // committedQ drives matchOffices; updated only when the user presses Search or Enter.
  const [committedQ, setCommittedQ] = useState("");
  const [focus, setFocus] = useState<MapFocus>(() =>
    activeId ? { id: activeId } : { fit: true },
  );

  // Detect external activeId changes (e.g., browser back from CompanyPage)
  // and re-issue a focus signal. Closing the tile (activeId → null) is
  // intentionally left alone so the map stays put.
  const [lastActiveId, setLastActiveId] = useState<string | null>(activeId);
  if (lastActiveId !== activeId) {
    setLastActiveId(activeId);
    if (activeId) setFocus({ id: activeId });
  }

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  function updateParams(patch: { view?: View | null; office?: string | null }) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if ("view" in patch) {
          if (patch.view && patch.view !== "grid") next.set("view", patch.view);
          else next.delete("view");
        }
        if ("office" in patch) {
          if (patch.office) next.set("office", patch.office);
          else next.delete("office");
        }
        return next;
      },
      { replace: true },
    );
  }

  const industries = useMemo(() => {
    const m: Record<string, number> = {};
    companies.forEach((c) => {
      m[c.industry] = (m[c.industry] || 0) + 1;
    });
    return Object.keys(m)
      .sort()
      .map((k) => ({ value: k, label: k, count: m[k] }));
  }, [companies]);

  const { q, region, industry, otype } = filters;

  const matchOffices = useMemo(() => {
    const needle = committedQ.toLowerCase();
    return offices.filter((o) => {
      const co = companyById[o.companyId];
      if (!co) return false;
      if (region && o.region !== region) return false;
      if (otype && o.tone !== otype) return false;
      if (industry && co.industry !== industry) return false;
      if (needle) {
        const s = (
          co.name +
          " " +
          co.industry +
          " " +
          o.city +
          " " +
          o.country
        ).toLowerCase();
        if (!s.includes(needle)) return false;
      }
      return true;
    });
  }, [offices, companyById, committedQ, region, industry, otype]);

  const companyList = useMemo(() => {
    const byCo: Record<string, typeof matchOffices> = {};
    matchOffices.forEach((o) => {
      (byCo[o.companyId] = byCo[o.companyId] || []).push(o);
    });
    return Object.keys(byCo)
      .map((id) => ({ company: companyById[id], offices: byCo[id] }))
      .filter((x) => x.company)
      .sort((a, b) => a.company.name.localeCompare(b.company.name));
  }, [matchOffices, companyById]);

  const stats = {
    companies: companyList.length,
    offices: matchOffices.length,
    countries: new Set(matchOffices.map((o) => o.country)).size,
  };
  const filtered = Boolean(region || industry || otype || committedQ);

  function runSearch() {
    const term = q.trim();
    setCommittedQ(term);
    // Local filtering via committedQ — matchOffices re-renders automatically.
    // When there is no local match the empty-state UI is shown; no navigation.
  }

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCommittedQ("");
  };

  function handleResetView() {
    updateParams({ office: null });
    // Force a new focus identity so the effect refits even if the previous
    // focus was already { fit: true }.
    setFocus({ fit: true });
  }

  function handleBackgroundClick() {
    if (activeId) updateParams({ office: null });
  }

  const activeOffice = activeId ? matchOffices.find((x) => x.id === activeId) ?? null : null;
  const activeCompany = activeOffice ? companyById[activeOffice.companyId] : null;

  return (
    <div className="gof-browse">
      <div className="gof-toolbar">
        <div className="gof-toolbar-row">
          <div className="gof-searchwrap">
            <svg width="18" height="18" viewBox="0 0 18 18" className="gof-searchic" aria-hidden="true">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
              <path
                d="M12.5 12.5L16 16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              className="gof-search"
              aria-label="Search companies, cities, countries"
              placeholder="Search companies, cities, countries…"
              value={q}
              onChange={(e) => setFilter("q", e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
            />
            {q && (
              <button
                type="button"
                className="gof-clear"
                aria-label="Clear search"
                onClick={() => { setFilter("q", ""); setCommittedQ(""); }}
              >
                ✕
              </button>
            )}
          </div>
          <button type="button" className="gof-btn gof-search-go" onClick={runSearch}>
            Search
          </button>
          <div className="gof-viewtoggle" role="tablist" aria-label="View toggle">
            <button
              type="button"
              role="tab"
              aria-selected={view !== "map"}
              className={view !== "map" ? "is-active" : ""}
              onClick={() => updateParams({ view: "grid", office: null })}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
                <rect x="1" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
                <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
                <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
                <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
              </svg>
              Directory
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "map"}
              className={view === "map" ? "is-active" : ""}
              onClick={() => updateParams({ view: "map" })}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
                <path
                  d="M1 4L5.5 2L9.5 4L14 2V11L9.5 13L5.5 11L1 13V4Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  fill="none"
                  strokeLinejoin="round"
                />
                <path d="M5.5 2V11M9.5 4V13" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              Map
            </button>
          </div>
        </div>
        <div className="gof-toolbar-row">
          <div className="gof-filters">
            <Dropdown
              label="Region"
              value={region}
              width={130}
              options={[
                { value: "", label: "All regions" },
                ...REGION_ORDER.map((r) => ({ value: r, label: r })),
              ]}
              onChange={(v) => setFilter("region", v)}
            />
            <Dropdown
              label="Industry"
              value={industry}
              width={150}
              options={[{ value: "", label: "All industries" }, ...industries]}
              onChange={(v) => setFilter("industry", v)}
            />
            <Dropdown
              label="Type"
              value={otype}
              width={120}
              options={[
                { value: "", label: "All types" },
                { value: "hq", label: "Headquarters" },
                { value: "reg", label: "Regional" },
                { value: "rnd", label: "R&D" },
              ]}
              onChange={(v) => setFilter("otype", v)}
            />
            {filtered && (
              <button type="button" className="gof-reset" onClick={resetFilters}>
                Clear all
              </button>
            )}
          </div>
          <div className="gof-count" aria-live="polite">
            <b>{stats.companies}</b> companies<span className="gof-dot">·</span>
            <b>{stats.offices}</b> offices<span className="gof-dot">·</span>
            <b>{stats.countries}</b> countries
          </div>
        </div>
      </div>

      {view === "map" ? (
        <div className="gof-mapwrap">
          <MapView
            offices={matchOffices}
            companyById={companyById}
            activeId={activeId}
            hoverId={hoverId}
            onHover={setHoverId}
            onSelect={(o) => {
              updateParams({ office: o.id });
              setFocus({ id: o.id });
            }}
            onResetView={handleResetView}
            onBackgroundClick={handleBackgroundClick}
            focus={focus}
            padding={[70, 70]}
          />
          {activeOffice && activeCompany && (
            <OfficeTile
              office={activeOffice}
              company={activeCompany}
              onClose={() => updateParams({ office: null })}
              onReadMore={() =>
                navigate(
                  `/company/${encodeURIComponent(activeCompany.id)}?office=${encodeURIComponent(activeOffice.id)}`,
                )
              }
            />
          )}
        </div>
      ) : (
        <div className="gof-grid-scroll">
          {companyList.length === 0 ? (
            <div className="gof-empty" data-testid="empty-state">
              <div className="gof-empty-ic" aria-hidden="true">
                ⊘
              </div>
              No companies match these filters.
              <button type="button" className="gof-link" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
          ) : (
            <div className="gof-grid">
              {companyList.map(({ company, offices }) => (
                <CompanyCard key={company.id} company={company} offices={offices} />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

interface OfficeTileProps {
  office: import("../types").Office;
  company: import("../types").Company;
  onClose: () => void;
  onReadMore: () => void;
}

function OfficeTile({ office, company, onClose, onReadMore }: OfficeTileProps) {
  const summary = truncate(company.description, 160);
  return (
    <div className="gof-mapcard" role="dialog" aria-label={`${company.name} — ${office.city}`}>
      <Photo
        seed={office.id}
        w={560}
        h={200}
        className="gof-mapcard-photo"
        photo={company.photo}
        subject={company.name}
      >
        <span className={"gof-tag tag-" + office.tone + " gof-mapcard-tag"}>{office.short}</span>
        <button
          type="button"
          className="gof-mapcard-close"
          aria-label="Close office details"
          onClick={onClose}
        >
          ✕
        </button>
      </Photo>
      <div className="gof-mapcard-body">
        <div className="gof-mapcard-head">
          <Monogram name={company.name} size={42} square />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="gof-mapcard-name">{company.name}</div>
            <div className="gof-mapcard-loc">
              <FlagChip code={office.countryCode} />
              <span>
                {office.city}, {office.country}
              </span>
            </div>
          </div>
        </div>
        {summary && <p className="gof-mapcard-desc">{summary}</p>}
        <div className="gof-mapcard-actions">
          <button type="button" className="gof-btn" onClick={onReadMore}>
            Read more
          </button>
          <Link
            to={`/country/${encodeURIComponent(office.country)}`}
            className="gof-mapcard-country"
          >
            View country
          </Link>
        </div>
      </div>
    </div>
  );
}
