/** Confirm dialog before leaving the discovery view (results are discarded). */
interface EndSearchModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function EndSearchModal({ onConfirm, onCancel }: EndSearchModalProps) {
  return (
    <div className="gof-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="gof-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gof-end-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="gof-end-title" className="gof-modal-title">
          End discovery?
        </h2>
        <p className="gof-modal-body">
          These results were discovered live and aren’t saved. Leaving will
          discard them. Continue?
        </p>
        <div className="gof-modal-actions">
          <button type="button" className="gof-btn gof-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="gof-btn" onClick={onConfirm} autoFocus>
            Yes, end search
          </button>
        </div>
      </div>
    </div>
  );
}
