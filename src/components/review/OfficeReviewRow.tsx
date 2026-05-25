import { useState } from "react";
import type { Office } from "../../types";
import type {
  OfficeCorrection,
  QueueItem,
  ReviewDecision,
} from "../../utils/reviewQueue";
import { enrichOfficeWithCoordinates } from "../../utils/resolveOfficeCoordinates";
import MiniMapView from "./MiniMapView";

interface OfficeReviewRowProps {
  variant: "queue" | "catalog";
  companyName: string;
  queueItem?: QueueItem;
  catalogOffice?: Office;
  decision?: ReviewDecision | boolean;
  correction?: OfficeCorrection;
  mapEnabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClear?: () => void;
  onSaveCorrection?: (correction: OfficeCorrection) => void;
}

export default function OfficeReviewRow({
  variant,
  companyName,
  queueItem,
  catalogOffice,
  decision,
  correction,
  mapEnabled = true,
  onApprove,
  onReject,
  onClear,
  onSaveCorrection,
}: OfficeReviewRowProps) {
  const [correcting, setCorrecting] = useState(false);
  const [draft, setDraft] = useState<OfficeCorrection>({});
  const [flashing, setFlashing] = useState<"approve" | "reject" | null>(null);

  const isApproved = decision === "approved" || decision === true;
  const isRejected = decision === "rejected";

  let previewOffice: Office | null = null;
  let title = "";
  let meta: React.ReactNode = null;

  if (variant === "queue" && queueItem) {
    const merged = correction ? { ...queueItem.office, ...correction } : queueItem.office;
    previewOffice = enrichOfficeWithCoordinates({
      id: merged.id ?? `queue-${queueItem.queuedAt}`,
      companyId: merged.companyId ?? "",
      country: merged.country ?? "",
      countryCode: merged.countryCode ?? "",
      region: merged.region ?? "",
      city: merged.city ?? "",
      address: merged.address ?? "",
      postalCode: merged.postalCode ?? "",
      officeType: merged.officeType ?? "Office",
      latitude: merged.latitude,
      longitude: merged.longitude,
      contactUrl: merged.contactUrl,
    });
    title = `${merged.city ?? "—"}, ${merged.country ?? merged.countryCode ?? "—"}`;
    meta = (
      <>
        <p>
          <strong>Reason:</strong> {queueItem.reason}
        </p>
        <p>
          <span className="meta-pill" title="How confidently the scraper matched this office">
            Confidence: {queueItem.confidence} (score {queueItem.confidenceScore})
          </span>
        </p>
        <p>
          <strong>Address:</strong> {merged.address ?? "—"} {merged.postalCode ?? ""}
        </p>
        <p>
          <strong>Source:</strong>{" "}
          <a href={queueItem.sourceUrl} target="_blank" rel="noopener noreferrer">
            {queueItem.sourceId}
          </a>
        </p>
      </>
    );
  } else if (variant === "catalog" && catalogOffice) {
    previewOffice = enrichOfficeWithCoordinates(catalogOffice);
    title = `${catalogOffice.city}, ${catalogOffice.country}`;
    meta = (
      <>
        <p>
          <strong>Office ID:</strong> {catalogOffice.id}
        </p>
        <p>
          <strong>Address:</strong> {catalogOffice.address} {catalogOffice.postalCode}
        </p>
        <p>
          <strong>Type:</strong> {catalogOffice.officeType}
        </p>
      </>
    );
  }

  function startCorrecting() {
    if (variant !== "queue" || !queueItem) return;
    const o = queueItem.office;
    setDraft({
      address: correction?.address ?? o.address ?? "",
      city: correction?.city ?? o.city ?? "",
      postalCode: correction?.postalCode ?? o.postalCode ?? "",
      country: correction?.country ?? o.country ?? "",
      region: correction?.region ?? o.region ?? "",
      officeType: correction?.officeType ?? o.officeType ?? "",
    });
    setCorrecting(true);
  }

  function saveCorrection() {
    onSaveCorrection?.(draft);
    setCorrecting(false);
  }

  return (
    <article className="office-review-row">
      <div className="office-review-row__info">
        <h4>{title}</h4>
        {meta}
      </div>
      <div className="office-review-row__map">
        {previewOffice ? (
          <MiniMapView office={previewOffice} companyName={companyName} enabled={mapEnabled} />
        ) : null}
      </div>
      <div className="office-review-row__actions">
        <button
          type="button"
          className={`btn-approve ${isApproved ? "active" : ""} ${flashing === "approve" ? "flash" : ""}`}
          aria-pressed={isApproved}
          onClick={() => {
            setFlashing("approve");
            setTimeout(() => setFlashing(null), 400);
            onApprove();
          }}
        >
          Approve
        </button>
        <button
          type="button"
          className={`btn-reject ${isRejected ? "active" : ""} ${flashing === "reject" ? "flash" : ""}`}
          aria-pressed={isRejected}
          onClick={() => {
            setFlashing("reject");
            setTimeout(() => setFlashing(null), 400);
            onReject();
          }}
        >
          Reject
        </button>
        {variant === "queue" ? (
          <button type="button" className="btn-reset" onClick={startCorrecting}>
            Correct
          </button>
        ) : null}
        {(decision === "approved" || decision === "rejected" || decision === true) && onClear ? (
          <button type="button" className="btn-reset" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
      {correcting && variant === "queue" ? (
        <form
          className="office-review-correct-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveCorrection();
          }}
        >
          <label>
            Address
            <input
              value={draft.address ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
            />
          </label>
          <label>
            City
            <input
              value={draft.city ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
            />
          </label>
          <label>
            Postal code
            <input
              value={draft.postalCode ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))}
            />
          </label>
          <label>
            Country
            <input
              value={draft.country ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
            />
          </label>
          <label>
            Region
            <input
              value={draft.region ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))}
            />
          </label>
          <label>
            Office type
            <input
              value={draft.officeType ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, officeType: e.target.value }))}
            />
          </label>
          <div className="office-review-correct-form__actions">
            <button type="submit" className="btn-primary">
              Save correction
            </button>
            <button type="button" className="btn-reset" onClick={() => setCorrecting(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
