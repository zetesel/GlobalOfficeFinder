import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import reviewQueue from "../../data/scraper/review-queue.json";
import offices from "../../data/offices.json";
import companies from "../../data/companies.json";
import type { Company, Office } from "../types";
import { isPublishedOffice } from "../utils/officeVisibility";
import CompanyReviewTile from "../components/review/CompanyReviewTile";
import CompanyReviewDrawer from "../components/review/CompanyReviewDrawer";
import {
  buildCompanyReviewSummaries,
  buildExportPayload,
  CATALOG_APPROVALS_KEY,
  countLocallyApprovedOffices,
  countOfficesAwaitingApproval,
  countRejectedOffices,
  getQueueItemDecision,
  loadCatalogApprovals,
  loadCorrections,
  loadDecisions,
  loadReviewStateSnapshot,
  matchesReviewFilter,
  matchesReviewSearch,
  QUEUE_CORRECTIONS_KEY,
  QUEUE_DECISIONS_KEY,
  notifyReviewQueueChanged,
  queueItemStorageKey,
  reviewStateSnapshotKey,
  type OfficeCorrection,
  type QueueFile,
  type ReviewDecision,
  type ReviewFilter,
} from "../utils/reviewQueue";

const queue = reviewQueue as QueueFile;
const allOffices = offices as Office[];
const allCompanies = companies as Company[];
const companyById = new Map(allCompanies.map((c) => [c.id, c]));
const companyNameById = Object.fromEntries(allCompanies.map((c) => [c.id, c.name]));

export default function ReviewQueuePage() {
  const location = useLocation();
  const [decisions, setDecisions] = useState(loadDecisions);
  const [corrections, setCorrections] = useState(loadCorrections);
  const [catalogApprovals, setCatalogApprovals] = useState(loadCatalogApprovals);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const skipPersistRef = useRef(false);
  const reviewStateKeyRef = useRef(
    reviewStateSnapshotKey(loadReviewStateSnapshot()),
  );

  function applyReviewStateFromStorage(_source: string, closeDrawer = true) {
    const next = loadReviewStateSnapshot();
    const nextKey = reviewStateSnapshotKey(next);
    if (nextKey === reviewStateKeyRef.current) return;
    skipPersistRef.current = true;
    reviewStateKeyRef.current = nextKey;
    setDecisions(next.decisions);
    setCorrections(next.corrections);
    setCatalogApprovals(next.catalogApprovals);
    if (closeDrawer) setSelectedCompanyId(null);
  }

  useEffect(() => {
    queueMicrotask(() => applyReviewStateFromStorage("route-enter", false));
  }, [location.pathname]);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    reviewStateKeyRef.current = reviewStateSnapshotKey({
      decisions,
      corrections,
      catalogApprovals,
    });
    try {
      localStorage.setItem(QUEUE_DECISIONS_KEY, JSON.stringify(decisions));
      localStorage.setItem(QUEUE_CORRECTIONS_KEY, JSON.stringify(corrections));
      localStorage.setItem(CATALOG_APPROVALS_KEY, JSON.stringify(catalogApprovals));
    } catch {
      // ignore
    }
  }, [decisions, corrections, catalogApprovals]);

  useEffect(() => {
    notifyReviewQueueChanged();
  }, [decisions, corrections, catalogApprovals]);

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) applyReviewStateFromStorage("pageshow-bfcache", true);
    }

    const onStorage = () => applyReviewStateFromStorage("storage", true);

    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const heldBackCatalogOffices = useMemo(
    () => allOffices.filter((o) => !isPublishedOffice(o)),
    [],
  );

  const summaries = useMemo(
    () =>
      buildCompanyReviewSummaries(
        queue.items,
        heldBackCatalogOffices,
        decisions,
        catalogApprovals,
      ),
    [decisions, catalogApprovals, heldBackCatalogOffices],
  );

  const filteredSummaries = useMemo(
    () =>
      summaries.filter(
        (s) =>
          matchesReviewFilter(s, filter) &&
          matchesReviewSearch(s, searchQuery, companyNameById),
      ),
    [summaries, filter, searchQuery],
  );

  const approvedQueueItems = useMemo(
    () => queue.items.filter((item) => getQueueItemDecision(item, decisions) === "approved"),
    [decisions],
  );

  const approvedCatalogOfficeIds = useMemo(
    () =>
      Object.entries(catalogApprovals)
        .filter(([, approved]) => approved === true)
        .map(([id]) => id),
    [catalogApprovals],
  );

  const pendingCount = useMemo(
    () =>
      countOfficesAwaitingApproval(
        queue.items,
        heldBackCatalogOffices,
        decisions,
        catalogApprovals,
      ),
    [decisions, catalogApprovals, heldBackCatalogOffices],
  );
  const approvedCount = useMemo(
    () =>
      countLocallyApprovedOffices(
        queue.items,
        heldBackCatalogOffices,
        decisions,
        catalogApprovals,
      ),
    [decisions, catalogApprovals, heldBackCatalogOffices],
  );
  const rejectedCount = useMemo(
    () =>
      countRejectedOffices(
        queue.items,
        heldBackCatalogOffices,
        decisions,
        catalogApprovals,
      ),
    [decisions, catalogApprovals, heldBackCatalogOffices],
  );
  const totalOfficeCount = queue.items.length + heldBackCatalogOffices.length;

  const approvedPayload = useMemo(
    () =>
      buildExportPayload(queue, approvedQueueItems, approvedCatalogOfficeIds, corrections),
    [approvedQueueItems, approvedCatalogOfficeIds, corrections],
  );

  const approvedJsonDataUrl = useMemo(
    () =>
      `data:application/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(approvedPayload, null, 2),
      )}`,
    [approvedPayload],
  );

  const selectedCompany = selectedCompanyId ? companyById.get(selectedCompanyId) : undefined;
  const selectedSummary = selectedCompanyId
    ? summaries.find((s) => s.companyId === selectedCompanyId)
    : undefined;

  function setDecisionForKey(key: string, decision: ReviewDecision | undefined) {
    setDecisions((prev) => {
      const next = { ...prev };
      if (decision) next[key] = decision;
      else delete next[key];
      return next;
    });
  }

  function setCorrectionForKey(key: string, correction: OfficeCorrection) {
    setCorrections((prev) => ({ ...prev, [key]: correction }));
  }

  function setCatalogApproval(officeId: string, decision: ReviewDecision | undefined) {
    setCatalogApprovals((prev) => {
      const next = { ...prev };
      if (decision === "approved") next[officeId] = true;
      else if (decision === "rejected") next[officeId] = false;
      else delete next[officeId];
      return next;
    });
  }

  function approveAllPendingForCompany(companyId: string) {
    const summary = summaries.find((s) => s.companyId === companyId);
    if (!summary) return;
    setDecisions((prev) => {
      const next = { ...prev };
      for (const item of summary.queueItems) {
        if (!getQueueItemDecision(item, next)) {
          next[queueItemStorageKey(item)] = "approved";
        }
      }
      return next;
    });
    setCatalogApprovals((prev) => {
      const next = { ...prev };
      for (const office of summary.catalogOffices) {
        if (next[office.id] === undefined) next[office.id] = true;
      }
      return next;
    });
  }

  function rejectAllPendingForCompany(companyId: string) {
    const summary = summaries.find((s) => s.companyId === companyId);
    if (!summary) return;
    setDecisions((prev) => {
      const next = { ...prev };
      for (const item of summary.queueItems) {
        if (!getQueueItemDecision(item, next)) {
          next[queueItemStorageKey(item)] = "rejected";
        }
      }
      return next;
    });
    setCatalogApprovals((prev) => {
      const next = { ...prev };
      for (const office of summary.catalogOffices) {
        if (next[office.id] === undefined) next[office.id] = false;
      }
      return next;
    });
  }

  return (
    <div className="container review-queue-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Home</Link> › <span>Review Queue</span>
      </nav>

      <header className="page-header">
        <h1>Review Queue</h1>
      </header>

      <section className="review-summary" aria-label="Review summary">
        <div className="stat-box">
          <span className="stat-number">{totalOfficeCount}</span>
          <span className="stat-label">Total offices</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{pendingCount}</span>
          <span className="stat-label">Pending approval</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{approvedCount}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{rejectedCount}</span>
          <span className="stat-label">Rejected</span>
        </div>
      </section>

      <section className="info-card">
        <h2>Export approvals</h2>
        <p className="muted">
          Download JSON for approved offices. Merge via your publish workflow or manual edit of{" "}
          <code>data/offices.json</code>.
        </p>
        <a
          href={approvedJsonDataUrl}
          download="review-queue-approved.json"
          className={`btn-primary ${approvedCount === 0 && approvedCatalogOfficeIds.length === 0 ? "disabled-link" : ""}`}
          aria-disabled={approvedCount === 0 && approvedCatalogOfficeIds.length === 0}
          onClick={(e) => {
            if (approvedCount === 0 && approvedCatalogOfficeIds.length === 0) e.preventDefault();
          }}
        >
          Download approved JSON
        </a>
      </section>

      <section className="review-queue-toolbar" aria-label="Search and filter companies">
        <label className="review-search-label">
          Search companies
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or id…"
            className="search-input"
          />
        </label>
        <div className="review-filter-chips" role="group" aria-label="Filter companies">
          {(["all", "pending", "approved"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`chip ${filter === value ? "active" : ""}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "all"
                ? "All"
                : value === "pending"
                  ? "Awaiting approval"
                  : "Approved"}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Companies to review">
        {filteredSummaries.length === 0 ? (
          <p className="muted">No companies match your search and filter.</p>
        ) : (
          <div className="company-grid company-review-grid">
            {filteredSummaries.map((summary) => {
              const company = companyById.get(summary.companyId);
              if (!company) return null;
              return (
                <CompanyReviewTile
                  key={summary.companyId}
                  companyName={company.name}
                  industry={company.industry}
                  summary={summary}
                  onClick={() => setSelectedCompanyId(summary.companyId)}
                />
              );
            })}
          </div>
        )}
      </section>

      {selectedCompany && selectedSummary ? (
        <CompanyReviewDrawer
          company={selectedCompany}
          summary={selectedSummary}
          decisions={decisions}
          corrections={corrections}
          catalogApprovals={catalogApprovals}
          onClose={() => setSelectedCompanyId(null)}
          onSetDecision={setDecisionForKey}
          onSetCorrection={setCorrectionForKey}
          onSetCatalogApproval={setCatalogApproval}
          onApproveAllPending={() => approveAllPendingForCompany(selectedCompany.id)}
          onRejectAllPending={() => rejectAllPendingForCompany(selectedCompany.id)}
        />
      ) : null}
    </div>
  );
}
