/**
 * Shown on the home page when a search yields zero local matches. Offers to
 * search the company's offices live on the web (Wikidata + Commons + AI).
 */
interface NotFoundDiscoverModalProps {
  companyName: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function NotFoundDiscoverModal({
  companyName,
  onConfirm,
  onDismiss,
}: NotFoundDiscoverModalProps) {
  return (
    <div className="gof-modal-backdrop" role="presentation" onClick={onDismiss}>
      <div
        className="gof-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gof-discover-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="gof-discover-title" className="gof-modal-title">
          Not in the directory yet
        </h2>
        <p className="gof-modal-body">
          “{companyName}” isn’t in our catalogue. Want to discover its offices
          live on the web? We’ll search public sources (Wikidata &amp; Wikimedia
          Commons) and assemble a temporary map.
        </p>
        <div className="gof-modal-actions">
          <button
            type="button"
            className="gof-btn gof-btn-ghost"
            onClick={onDismiss}
          >
            Not now
          </button>
          <button
            type="button"
            className="gof-btn"
            onClick={onConfirm}
            autoFocus
          >
            Discover offices
          </button>
        </div>
      </div>
    </div>
  );
}
