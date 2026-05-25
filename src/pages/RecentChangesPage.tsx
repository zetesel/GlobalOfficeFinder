import { Link } from "react-router-dom";
import lastRun from "../../data/scraper/last-run.json";
import reviewQueue from "../../data/scraper/review-queue.json";
import companies from "../../data/companies.json";
import type { Company } from "../types";
import type { QueueFile } from "../utils/reviewQueue";

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
const queue = reviewQueue as QueueFile;
const companyNameById = Object.fromEntries(
  (companies as Company[]).map((company) => [company.id, company.name]),
);
const companyIds = new Set((companies as Company[]).map((c) => c.id));

const STAGE_LABELS: Record<string, string> = {
  discoveredCompanies: "Companies scanned",
  collectedPages: "Pages collected",
  acceptedCompanies: "Auto-approved companies",
  acceptedOffices: "Auto-approved offices",
  officesQueuedForManualReview: "New this run",
  reviewQueueItems: "In review queue",
  skippedSources: "Skipped sources",
};

const HIGHLIGHT_STAGE_KEYS = [
  "reviewQueueItems",
  "officesQueuedForManualReview",
  "acceptedOffices",
  "discoveredCompanies",
  "skippedSources",
] as const;

const TOP_COMPANY_LIMIT = 8;

function formatStageLabel(key: string): string {
  return STAGE_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export default function RecentChangesPage() {
  const started = new Date(run.startedAt);
  const finished = new Date(run.finishedAt);
  const durationSeconds = Math.max(
    0,
    Math.round((finished.getTime() - started.getTime()) / 1000),
  );

  const acceptedOfficeCount = run.acceptedOffices?.length ?? 0;
  const queueTotal = queue.items.length;
  const reviewQueueItemsFromRun = run.stages.reviewQueueItems ?? queueTotal;

  const topCompaniesByQueue = (() => {
    const counts = new Map<string, number>();
    for (const item of queue.items) {
      if (item.type !== "office") continue;
      const companyId = item.office.companyId?.trim();
      if (!companyId) continue;
      counts.set(companyId, (counts.get(companyId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_COMPANY_LIMIT);
  })();

  const sourceFailures = run.safeguards?.sourceFailures ?? {};
  const skippedSources = run.safeguards?.skippedSources ?? [];

  return (
    <div className="container recent-changes-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Home</Link> › <span>Recent Changes</span>
      </nav>

      <header className="page-header">
        <h1>Recent Changes</h1>
        <p className="page-subtitle">
          Last scraper run: {finished.toLocaleString()} ({durationSeconds}s)
        </p>
        <p className="muted">
          The scraper discovers offices, sends uncertain matches to the Review Queue, and only
          auto-publishes high-confidence results. Approve items in the queue, export JSON, then merge
          into the site catalog.
        </p>
      </header>

      <section className="review-summary" aria-label="Run summary">
        {HIGHLIGHT_STAGE_KEYS.map((key) => {
          const value = run.stages[key];
          if (value === undefined) return null;
          const highlight = key === "reviewQueueItems" && acceptedOfficeCount === 0 && value > 0;
          return (
            <div
              key={key}
              className={`stat-box${highlight ? " stat-box-highlight" : ""}`}
            >
              <span className="stat-number">{value}</span>
              <span className="stat-label">{STAGE_LABELS[key]}</span>
            </div>
          );
        })}
        <div className="stat-box">
          <span className="stat-number">{queueTotal}</span>
          <span className="stat-label">Current queue total</span>
        </div>
      </section>

      <p className="recent-changes-cta">
        <Link to="/review-queue" className="btn-primary">
          Open Review Queue
        </Link>
      </p>

      <section className="info-grid" aria-label="Run overview">
        <article className="info-card">
          <h2>Run settings</h2>
          <p>Dry run: {run.dryRun ? "Yes" : "No"}</p>
          <p>Confidence threshold: {run.confidenceThreshold}</p>
          <p>Minimum source trust: {run.safeguards?.minSourceTrust ?? "n/a"}</p>
          <p>robots.txt checks: {run.safeguards?.robotsCheckEnabled ? "Enabled" : "Disabled"}</p>
        </article>

        <article className="info-card">
          <h2>Stage results</h2>
          <ul className="plain-list">
            {Object.entries(run.stages).map(([name, value]) => (
              <li key={name}>
                <strong>{formatStageLabel(name)}</strong>: {value}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="info-card" aria-label="Review queue by company">
        <h2>Offices waiting in Review Queue</h2>
        <p>
          {queueTotal} office{queueTotal !== 1 ? "s" : ""} in the current queue
          {reviewQueueItemsFromRun !== queueTotal
            ? ` (${reviewQueueItemsFromRun} from the latest run)`
            : ""}
          .
        </p>
        {topCompaniesByQueue.length > 0 ? (
          <ul className="plain-list">
            {topCompaniesByQueue.map(([companyId, count]) => (
              <li key={companyId}>
                {companyNameById[companyId] ?? companyId} — {count} office
                {count !== 1 ? "s" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">The review queue is empty.</p>
        )}
      </section>

      <section className="info-card" aria-label="Accepted entities">
        <h2>Auto-published in latest run</h2>
        <p>
          Companies: {run.acceptedCompanies?.length ?? 0} · Offices: {acceptedOfficeCount}
        </p>
        {acceptedOfficeCount > 0 ? (
          <ul className="plain-list">
            {run.acceptedOffices!.slice(0, 15).map((office) => {
              const companyName = companyNameById[office.companyId] ?? office.companyId;
              return (
                <li key={office.id || `${office.companyId}-${office.city}-${office.country}`}>
                  {companyIds.has(office.companyId) ? (
                    <Link to={`/company/${office.companyId}`}>{companyName}</Link>
                  ) : (
                    companyName
                  )}{" "}
                  — {office.city}, {office.country}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">
            No offices were auto-published. {queueTotal} office
            {queueTotal !== 1 ? "s are" : " is"} waiting in the{" "}
            <Link to="/review-queue">Review Queue</Link>.
          </p>
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
        {Object.keys(sourceFailures).length > 0 ? (
          <>
            <h3>Source failures</h3>
            <ul className="plain-list">
              {Object.entries(sourceFailures).map(([sourceId, count]) => (
                <li key={sourceId}>
                  {sourceId}: {count} failure{count !== 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {skippedSources.length > 0 ? (
          <>
            <h3>Skipped sources</h3>
            <ul className="plain-list">
              {skippedSources.map((sourceId) => (
                <li key={sourceId}>{sourceId}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  );
}
