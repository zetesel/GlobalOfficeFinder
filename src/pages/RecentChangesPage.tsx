import { Link } from "react-router-dom";
import lastRun from "../../data/scraper/last-run.json";

interface LastRunSource {
  id: string;
  name: string;
  sourceUrl: string;
  companyCandidates: number;
  trust: string;
}

interface LastRunData {
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  confidenceThreshold: string;
  stages: Record<string, number>;
  safeguards?: {
    minSourceTrust?: string;
    robotsCheckEnabled?: boolean;
    perSourceFailureThreshold?: number;
    sourceFailures?: Record<string, number>;
    skippedSources?: string[];
  };
  sources?: LastRunSource[];
  acceptedCompanies?: Array<{ id: string; name?: string }>;
  acceptedOffices?: Array<{ id: string; companyId: string; city: string; country: string }>;
}

const run = lastRun as LastRunData;

export default function RecentChangesPage() {
  const started = new Date(run.startedAt);
  const finished = new Date(run.finishedAt);
  const durationSeconds = Math.max(
    0,
    Math.round((finished.getTime() - started.getTime()) / 1000),
  );

  return (
    <div className="container recent-changes-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Home</Link> › <span>Recent Changes</span>
      </nav>

      <header className="page-header">
        <h1>Recent Scraper Changes</h1>
        <p className="page-subtitle">
          Last run: {finished.toLocaleString()} ({durationSeconds}s)
        </p>
      </header>

      <section className="info-grid" aria-label="Run overview">
        <article className="info-card">
          <h2>Run Settings</h2>
          <p>Dry run: {run.dryRun ? "Yes" : "No"}</p>
          <p>Publish confidence threshold: {run.confidenceThreshold}</p>
          <p>Minimum source trust: {run.safeguards?.minSourceTrust ?? "n/a"}</p>
          <p>
            robots.txt checks: {run.safeguards?.robotsCheckEnabled ? "Enabled" : "Disabled"}
          </p>
        </article>

        <article className="info-card">
          <h2>Stage Results</h2>
          <ul className="plain-list">
            {Object.entries(run.stages).map(([name, value]) => (
              <li key={name}>
                <strong>{name}</strong>: {value}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="info-card" aria-label="Accepted entities">
        <h2>Accepted entities in latest run</h2>
        <p>
          Companies: {run.acceptedCompanies?.length ?? 0} · Offices: {run.acceptedOffices?.length ?? 0}
        </p>
        {run.acceptedOffices && run.acceptedOffices.length > 0 ? (
          <ul className="plain-list">
            {run.acceptedOffices.slice(0, 15).map((office) => (
              <li key={office.id || `${office.companyId}-${office.city}-${office.country}`}>
                {office.companyId} — {office.city}, {office.country}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No offices were accepted in this run.</p>
        )}
      </section>

      <section className="info-card" aria-label="Sources processed">
        <h2>Sources processed</h2>
        {run.sources && run.sources.length > 0 ? (
          <ul className="plain-list">
            {run.sources.map((source) => (
              <li key={source.id}>
                <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {source.name}
                </a>{" "}
                — trust: {source.trust}, candidates: {source.companyCandidates}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No source details available for this run.</p>
        )}
      </section>
    </div>
  );
}
