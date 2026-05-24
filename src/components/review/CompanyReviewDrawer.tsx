import { useEffect, useRef } from "react";
import type { Company } from "../../types";
import type {
  CompanyReviewSummary,
  OfficeCorrection,
  ReviewDecision,
} from "../../utils/reviewQueue";
import {
  getCatalogOfficeDecision,
  getQueueItemDecision,
  queueItemStorageKey,
} from "../../utils/reviewQueue";
import CompanyLogo from "../CompanyLogo";
import OfficeReviewRow from "./OfficeReviewRow";

interface CompanyReviewDrawerProps {
  company: Company;
  summary: CompanyReviewSummary;
  decisions: Record<string, ReviewDecision | undefined>;
  corrections: Record<string, OfficeCorrection | undefined>;
  catalogApprovals: Record<string, boolean | undefined>;
  onClose: () => void;
  onSetDecision: (key: string, decision: ReviewDecision | undefined) => void;
  onSetCorrection: (key: string, correction: OfficeCorrection) => void;
  onSetCatalogApproval: (officeId: string, decision: ReviewDecision | undefined) => void;
  onApproveAllPending: () => void;
  onRejectAllPending: () => void;
}

export default function CompanyReviewDrawer({
  company,
  summary,
  decisions,
  corrections,
  catalogApprovals,
  onClose,
  onSetDecision,
  onSetCorrection,
  onSetCatalogApproval,
  onApproveAllPending,
  onRejectAllPending,
}: CompanyReviewDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function syncHeaderOffset() {
      const header = document.querySelector(".site-header");
      const height = header?.getBoundingClientRect().height ?? 56;
      document.documentElement.style.setProperty("--site-header-height", `${height}px`);
      return height;
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", syncHeaderOffset);
    document.body.style.overflow = "hidden";
    syncHeaderOffset();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", syncHeaderOffset);
      document.body.style.overflow = "";
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, [onClose, company.id]);

  const pendingQueueItems = summary.queueItems.filter(
    (item) => !getQueueItemDecision(item, decisions),
  );
  const pendingCatalogOffices = summary.catalogOffices.filter(
    (office) => getCatalogOfficeDecision(catalogApprovals, office.id) === undefined,
  );
  const pendingCount = pendingQueueItems.length + pendingCatalogOffices.length;

  const approvedQueueItems = summary.queueItems.filter(
    (item) => getQueueItemDecision(item, decisions) === "approved",
  );
  const approvedCatalogOffices = summary.catalogOffices.filter(
    (office) => getCatalogOfficeDecision(catalogApprovals, office.id) === "approved",
  );

  const rejectedQueueItems = summary.queueItems.filter(
    (item) => getQueueItemDecision(item, decisions) === "rejected",
  );
  const rejectedCatalogOffices = summary.catalogOffices.filter(
    (office) => getCatalogOfficeDecision(catalogApprovals, office.id) === "rejected",
  );

  return (
    <div className="review-drawer-overlay" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="review-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="review-drawer__header">
          <div className="review-drawer__title-row">
            <CompanyLogo companyId={company.id} companyName={company.name} size="large" />
            <div>
              <h2 id="review-drawer-title">{company.name}</h2>
              <p className="muted">{company.industry}</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="review-drawer__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="review-drawer__bulk">
          <button type="button" className="btn-approve" onClick={onApproveAllPending}>
            Approve all pending
          </button>
          <button type="button" className="btn-reject" onClick={onRejectAllPending}>
            Reject all pending
          </button>
        </div>

        {pendingCount > 0 ? (
          <section className="review-drawer__section" aria-label="Offices pending approval">
            <h3>Pending approval ({pendingCount})</h3>
            {pendingQueueItems.map((item) => {
              const key = queueItemStorageKey(item);
              return (
                <OfficeReviewRow
                  key={key}
                  variant="queue"
                  companyName={company.name}
                  queueItem={item}
                  decision={decisions[key]}
                  correction={corrections[key]}
                  mapEnabled
                  onApprove={() => onSetDecision(key, "approved")}
                  onReject={() => onSetDecision(key, "rejected")}
                  onClear={() => onSetDecision(key, undefined)}
                  onSaveCorrection={(c) => onSetCorrection(key, c)}
                />
              );
            })}
            {pendingCatalogOffices.map((office) => (
              <OfficeReviewRow
                key={office.id}
                variant="catalog"
                companyName={company.name}
                catalogOffice={office}
                decision={undefined}
                mapEnabled
                onApprove={() => onSetCatalogApproval(office.id, "approved")}
                onReject={() => onSetCatalogApproval(office.id, "rejected")}
                onClear={() => onSetCatalogApproval(office.id, undefined)}
              />
            ))}
          </section>
        ) : null}

        {approvedQueueItems.length + approvedCatalogOffices.length > 0 ? (
          <section className="review-drawer__section" aria-label="Approved offices">
            <h3>Approved</h3>
            {approvedQueueItems.map((item) => {
              const key = queueItemStorageKey(item);
              return (
                <OfficeReviewRow
                  key={key}
                  variant="queue"
                  companyName={company.name}
                  queueItem={item}
                  decision="approved"
                  correction={corrections[key]}
                  mapEnabled
                  onApprove={() => onSetDecision(key, "approved")}
                  onReject={() => onSetDecision(key, "rejected")}
                  onClear={() => onSetDecision(key, undefined)}
                  onSaveCorrection={(c) => onSetCorrection(key, c)}
                />
              );
            })}
            {approvedCatalogOffices.map((office) => (
              <OfficeReviewRow
                key={office.id}
                variant="catalog"
                companyName={company.name}
                catalogOffice={office}
                decision="approved"
                mapEnabled
                onApprove={() => onSetCatalogApproval(office.id, "approved")}
                onReject={() => onSetCatalogApproval(office.id, "rejected")}
                onClear={() => onSetCatalogApproval(office.id, undefined)}
              />
            ))}
          </section>
        ) : null}

        {rejectedQueueItems.length + rejectedCatalogOffices.length > 0 ? (
          <section className="review-drawer__section" aria-label="Rejected offices">
            <h3>Rejected</h3>
            {rejectedQueueItems.map((item) => {
              const key = queueItemStorageKey(item);
              return (
                <OfficeReviewRow
                  key={key}
                  variant="queue"
                  companyName={company.name}
                  queueItem={item}
                  decision="rejected"
                  correction={corrections[key]}
                  mapEnabled={false}
                  onApprove={() => onSetDecision(key, "approved")}
                  onReject={() => onSetDecision(key, "rejected")}
                  onClear={() => onSetDecision(key, undefined)}
                  onSaveCorrection={(c) => onSetCorrection(key, c)}
                />
              );
            })}
            {rejectedCatalogOffices.map((office) => (
              <OfficeReviewRow
                key={office.id}
                variant="catalog"
                companyName={company.name}
                catalogOffice={office}
                decision="rejected"
                mapEnabled={false}
                onApprove={() => onSetCatalogApproval(office.id, "approved")}
                onReject={() => onSetCatalogApproval(office.id, "rejected")}
                onClear={() => onSetCatalogApproval(office.id, undefined)}
              />
            ))}
          </section>
        ) : null}

        <footer className="review-drawer__footer muted">
          Export approved offices via Download approved JSON on the main review page.
        </footer>
      </div>
    </div>
  );
}
