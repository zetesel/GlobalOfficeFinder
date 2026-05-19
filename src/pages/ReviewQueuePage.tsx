import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import reviewQueue from "../../data/scraper/review-queue.json";
import offices from "../../data/offices.json";
import type { Office } from "../types";
import { isPublishedOffice } from "../utils/officeVisibility";

type Decision = "approved" | "rejected";

const QUEUE_DECISIONS_KEY = "goef-review-queue-decisions-v1";

interface QueueOffice {
  id?: string;
  companyId?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  officeType?: string;
  contactUrl?: string;
}

interface QueueItem {
  type: string;
  sourceId: string;
  sourceUrl: string;
  office: QueueOffice;
  reason: string;
  confidence: string;
  confidenceScore: number;
  queuedAt: string;
}

interface QueueFile {
  generatedAt: string;
  minPublishConfidence: string;
  items: QueueItem[];
}

const queue = reviewQueue as QueueFile;
const allOffices = offices as Office[];

/** Stable key for persisting approve/reject in the browser across reloads. */
function queueItemStorageKey(item: QueueItem): string {
  const o = item.office;
  return [
    item.type,
    item.sourceId,
    item.queuedAt,
    String(o.companyId ?? ""),
    String(o.city ?? ""),
    String(o.address ?? "").slice(0, 120),
  ].join("::");
}

function loadDecisionsFromStorage(): Record<string, Decision | undefined> {
  try {
    const raw = localStorage.getItem(QUEUE_DECISIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, Decision | undefined>;
    }
  } catch {
    // ignore
  }
  return {};
}

export default function ReviewQueuePage() {
  const [decisions, setDecisions] = useState<Record<string, Decision | undefined>>(loadDecisionsFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_DECISIONS_KEY, JSON.stringify(decisions));
    } catch {
      // ignore quota / private mode
    }
  }, [decisions]);

  const heldBackCatalogOffices = useMemo(
    () => allOffices.filter((o) => !isPublishedOffice(o)),
    [],
  );

  const pendingQueueItems = useMemo(
    () => queue.items.filter((item) => !decisions[queueItemStorageKey(item)]),
    [decisions, queue.items],
  );
  const approvedQueueItems = useMemo(
    () => queue.items.filter((item) => decisions[queueItemStorageKey(item)] === "approved"),
    [decisions, queue.items],
  );
  const rejectedQueueItems = useMemo(
    () => queue.items.filter((item) => decisions[queueItemStorageKey(item)] === "rejected"),
    [decisions, queue.items],
  );

  const approvedCount = approvedQueueItems.length;
  const rejectedCount = rejectedQueueItems.length;
  const pendingCount = pendingQueueItems.length;

  const approvedPayload = useMemo(() => {
    return {
      generatedAt: queue.generatedAt,
      reviewedAt: new Date().toISOString(),
      minPublishConfidence: queue.minPublishConfidence,
      approvedItems: approvedQueueItems,
    };
  }, [approvedQueueItems]);

  const approvedJsonDataUrl = useMemo(
    () =>
      `data:application/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(approvedPayload, null, 2),
      )}`,
    [approvedPayload],
  );

  function setDecisionForItem(item: QueueItem, decision: Decision) {
    const key = queueItemStorageKey(item);
    setDecisions((prev) => ({ ...prev, [key]: decision }));
  }

  function clearDecisionForItem(item: QueueItem) {
    const key = queueItemStorageKey(item);
    setDecisions((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function renderQueueCard(item: QueueItem) {
    const key = queueItemStorageKey(item);
    const decision = decisions[key];
    const o = item.office;
    return (
      <article key={key} className="queue-item-card">
        <header className="queue-item-header">
          <h3>
            {o.companyId ?? "—"} — {o.city ?? "—"}, {o.country ?? o.countryCode ?? "—"}
          </h3>
          <span className="meta-pill">
            {item.confidence} ({item.confidenceScore})
          </span>
        </header>

        <p>
          <strong>Reason:</strong> {item.reason}
        </p>
        <p>
          <strong>Office type:</strong> {o.officeType ?? "—"}
        </p>
        <p>
          <strong>Address:</strong> {o.address ?? "—"} {o.postalCode ?? ""}
        </p>
        <p>
          <strong>Source:</strong>{" "}
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
            {item.sourceId}
          </a>
        </p>

        <div className="queue-actions">
          <button
            type="button"
            className={`btn-approve ${decision === "approved" ? "active" : ""}`}
            onClick={() => setDecisionForItem(item, "approved")}
          >
            Approve
          </button>
          <button
            type="button"
            className={`btn-reject ${decision === "rejected" ? "active" : ""}`}
            onClick={() => setDecisionForItem(item, "rejected")}
          >
            Reject
          </button>
          {decision ? (
            <button type="button" className="btn-reset" onClick={() => clearDecisionForItem(item)}>
              Clear
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <div className="container review-queue-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Home</Link> › <span>Review Queue</span>
      </nav>

      <header className="page-header">
        <h1>Review Queue</h1>
        <p className="page-subtitle">
          Rejected and pending records stay off the public site and are visible here only. Approve entries
          to export JSON for publication into <code>data/offices.json</code>.
        </p>
      </header>

      <section className="review-summary" aria-label="Review summary">
        <div className="stat-box">
          <span className="stat-number">{queue.items.length}</span>
          <span className="stat-label">Scraper queue items</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{pendingCount}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{approvedCount}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{rejectedCount}</span>
          <span className="stat-label">Rejected</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{heldBackCatalogOffices.length}</span>
          <span className="stat-label">Held in catalog (unpublished)</span>
        </div>
      </section>

      <section className="info-card">
        <h2>Export approvals</h2>
        <p className="muted">
          Download JSON for scraper queue items you marked <strong>Approve</strong>. Merge into your
          publish workflow (for example <code>promote-accepted</code> or a manual edit) so they appear on
          the main site.
        </p>
        <a
          href={approvedJsonDataUrl}
          download="review-queue-approved.json"
          className={`btn-primary ${approvedCount === 0 ? "disabled-link" : ""}`}
          aria-disabled={approvedCount === 0}
          onClick={(e) => {
            if (approvedCount === 0) e.preventDefault();
          }}
        >
          Download approved JSON
        </a>
      </section>

      {heldBackCatalogOffices.length > 0 ? (
        <section className="info-card" aria-label="Unpublished catalog offices">
          <h2>Unpublished in catalog</h2>
          <p className="muted">
            These rows exist in <code>data/offices.json</code> but are not approved. They are{" "}
            <strong>hidden from the public site</strong> and listed only here. Set <code>&quot;approved&quot;:
            true</code> to publish.
          </p>
          <ul className="held-back-catalog-list">
            {heldBackCatalogOffices.map((o) => (
              <li key={o.id}>
                <strong>{o.companyId}</strong> — {o.city}, {o.country} ({o.id})
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="queue-section" aria-label="Pending review">
        <h2>Pending ({pendingCount})</h2>
        <p className="muted">No decision yet — not shown on the home, company, or country pages.</p>
        <div className="queue-items">
          {pendingQueueItems.length === 0 ? (
            <p className="muted">No pending scraper items.</p>
          ) : (
            pendingQueueItems.map((item) => renderQueueCard(item))
          )}
        </div>
      </section>

      <section className="queue-section" aria-label="Approved for export">
        <h2>Approved for export ({approvedCount})</h2>
        <div className="queue-items">
          {approvedQueueItems.length === 0 ? (
            <p className="muted">None yet.</p>
          ) : (
            approvedQueueItems.map((item) => renderQueueCard(item))
          )}
        </div>
      </section>

      <section className="queue-section queue-section-rejected" aria-label="Rejected items">
        <h2>Rejected ({rejectedCount})</h2>
        <p className="muted">
          Visible on this page only. Rejections are stored in this browser (localStorage) so you can
          revisit them; they are never shown on the public site.
        </p>
        <div className="queue-items">
          {rejectedQueueItems.length === 0 ? (
            <p className="muted">None yet.</p>
          ) : (
            rejectedQueueItems.map((item) => renderQueueCard(item))
          )}
        </div>
      </section>
    </div>
  );
}
