/**
 * Full-screen, header-less discovery view at /discover/:slug.
 *
 * On mount it calls POST /api/discover, shows staged loading feedback, then
 * renders the existing MapView with the temporary offices plus a DiscoverTile.
 * Results live only in component state — navigating away discards them.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import MapView, { type MapFocus } from "../components/MapView";
import DiscoverTile from "../components/DiscoverTile";
import EndSearchModal from "../components/EndSearchModal";
import Monogram from "../components/Monogram";
import { fetchDiscovery, type DiscoveryResult } from "../lib/discoverClient";
import { deslugify } from "../lib/slug";

type Status = "loading" | "success" | "notfound" | "error";

const STAGES = [
  "Searching Wikidata for the company…",
  "Picking the right entity with AI…",
  "Fetching office locations…",
  "Structuring & verifying results…",
  "Loading licensed photos…",
];

export default function DiscoverPage() {
  const { slug = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const rawQuery =
    (location.state as { rawQuery?: string } | null)?.rawQuery?.trim() ||
    deslugify(slug);

  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus>({ fit: true });
  const [stageIdx, setStageIdx] = useState(0);
  const [showEnd, setShowEnd] = useState(false);
  const startedRef = useRef(false);

  // Kick off discovery once. StrictMode double-mount guarded by startedRef —
  // no `cancelled` flag because the first mount's cleanup would otherwise
  // suppress the in-flight fetch's state update (the second mount returns
  // early via the ref, leaving no second closure to take over).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const data = await fetchDiscovery(rawQuery);
        if (data.notFound) {
          setStatus("notfound");
        } else {
          setResult(data);
          setStatus("success");
          setFocus({ fit: true });
        }
      } catch {
        setStatus("error");
      }
    })();
  }, [rawQuery]);

  // Advance the loading-stage labels on a timer (cosmetic progress).
  useEffect(() => {
    if (status !== "loading") return;
    const t = window.setInterval(() => {
      setStageIdx((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, 2200);
    return () => window.clearInterval(t);
  }, [status]);

  const goHome = () => navigate("/");

  const activeOffice = activeId
    ? result?.offices.find((o) => o.id === activeId) ?? null
    : null;

  return (
    <div className="gof-discover">
      <header className="gof-discover-bar">
        <button
          type="button"
          className="gof-discover-end"
          onClick={() => setShowEnd(true)}
        >
          ← End search
        </button>
        <div className="gof-discover-bar-title">
          {result ? (
            <>
              <Monogram name={result.company.name} size={26} square />
              <span>{result.company.name}</span>
            </>
          ) : (
            <span>Discovering “{rawQuery}”…</span>
          )}
        </div>
        <span className="gof-discover-badge" aria-label="Live, unverified results">
          Live · unverified
        </span>
      </header>

      <div className="gof-discover-stage">
        {status === "loading" && (
          <div className="gof-discover-loading" role="status" aria-live="polite">
            <div className="gof-spinner" aria-hidden="true" />
            <p className="gof-discover-loading-text">{STAGES[stageIdx]}</p>
            <p className="gof-discover-loading-sub">
              Searching public sources for “{rawQuery}”. This can take a few
              seconds.
            </p>
          </div>
        )}

        {status === "notfound" && (
          <EmptyState
            title="No match found"
            body={`We couldn’t find a company called “${rawQuery}” in public data. Check the spelling or try the full legal name.`}
            onHome={goHome}
          />
        )}

        {status === "error" && (
          <EmptyState
            title="Discovery failed"
            body="Something went wrong while searching the web. Please try again in a moment."
            onHome={goHome}
          />
        )}

        {status === "success" && result && (
          <div className="gof-discover-mapwrap">
            {result.noOffices ? (
              <EmptyState
                title="No offices located"
                body={`We matched ${result.company.name} but couldn’t pin any office locations from public data.`}
                onHome={goHome}
              />
            ) : (
              <>
                <MapView
                  offices={result.offices}
                  companyById={{ [result.company.id]: result.company }}
                  activeId={activeId}
                  onSelect={(o) => {
                    setActiveId(o.id);
                    setFocus({ id: o.id });
                  }}
                  onResetView={() => {
                    setActiveId(null);
                    setFocus({ fit: true });
                  }}
                  onBackgroundClick={() => setActiveId(null)}
                  focus={focus}
                  padding={[70, 70]}
                />
                {activeOffice && (
                  <DiscoverTile
                    office={activeOffice}
                    company={result.company}
                    onClose={() => setActiveId(null)}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showEnd && (
        <EndSearchModal onConfirm={goHome} onCancel={() => setShowEnd(false)} />
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  onHome,
}: {
  title: string;
  body: string;
  onHome: () => void;
}) {
  return (
    <div className="gof-discover-empty">
      <div className="gof-empty-ic" aria-hidden="true">
        ⊘
      </div>
      <h2 className="gof-discover-empty-title">{title}</h2>
      <p className="gof-discover-empty-body">{body}</p>
      <button type="button" className="gof-btn" onClick={onHome}>
        Back to directory
      </button>
    </div>
  );
}
