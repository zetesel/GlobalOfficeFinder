import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import reviewQueue from "../../data/scraper/review-queue.json";

type Decision = "approved" | "rejected";

interface QueueOffice {
  id: string;
  companyId: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  address: string;
  postalCode: string;
  officeType: string;
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

export default function ReviewQueuePage() {
  const [decisions, setDecisions] = useState<Record<number, Decision | undefined>>({});

  const approvedCount = Object.values(decisions).filter((d) => d === "approved").length;
  const rejectedCount = Object.values(decisions).filter((d) => d === "rejected").length;
  const pendingCount = queue.items.length - approvedCount - rejectedCount;

  const approvedPayload = useMemo(() => {
    const approvedItems = queue.items.filter((_, index) => decisions[index] === "approved");
    return {
      generatedAt: queue.generatedAt,
      reviewedAt: new Date().toISOString(),
      minPublishConfidence: queue.minPublishConfidence,
      approvedItems,
    };
  }, [decisions]);

  const approvedJsonDataUrl = useMemo(
    () =>
      `data:application/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(approvedPayload, null, 2),
      )}`,
    [approvedPayload],
  );

  function setDecision(index: number, decision: Decision) {
    setDecisions((prev) => ({ ...prev, [index]: decision }));
  }

  return (
    <div className="container review-queue-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Home</Link> › <span>Review Queue</span>
      </nav>

      <header className="page-header">
        <h1>Review Queue</h1>
        <p className="page-subtitle">
          Low-confidence records awaiting manual approval before publication.
        </p>
      </header>

      <section className="review-summary" aria-label="Review summary">
        <div className="stat-box">
          <span className="stat-number">{queue.items.length}</span>
          <span className="stat-label">Queued</span>
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
          <span className="stat-number">{pendingCount}</span>
          <span className="stat-label">Pending</span>
        </div>
      </section>

      <section className="info-card">
        <h2>Export approvals</h2>
        <p className="muted">
          Download the approved subset and feed it into your publish/reconcile workflow.
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

      <section className="queue-items" aria-label="Queued review items">
        {queue.items.map((item, index) => {
          const decision = decisions[index];
          return (
            <article key={`${item.sourceId}-${item.office.companyId}-${index}`} className="queue-item-card">
              <header className="queue-item-header">
                <h3>
                  {item.office.companyId} — {item.office.city}, {item.office.country}
                </h3>
                <span className="meta-pill">
                  {item.confidence} ({item.confidenceScore})
                </span>
              </header>

              <p>
                <strong>Reason:</strong> {item.reason}
              </p>
              <p>
                <strong>Office type:</strong> {item.office.officeType}
              </p>
              <p>
                <strong>Address:</strong> {item.office.address} {item.office.postalCode}
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
                  onClick={() => setDecision(index, "approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className={`btn-reject ${decision === "rejected" ? "active" : ""}`}
                  onClick={() => setDecision(index, "rejected")}
                >
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
