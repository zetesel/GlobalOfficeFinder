import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData";
import type { Office, Company } from "../types";
import { typeTag } from "../utils/typeTag";
import FlagChip from "../components/FlagChip";

interface ReviewRowProps {
  office: Office;
  company: Company;
}

function ReviewRow({ office: initialOffice, company }: ReviewRowProps) {
  const [office, setOffice] = useState({ ...initialOffice });

  const { tag } = office;

  const promoteSnippet = JSON.stringify(
    {
      ...office,
      verification: office.verification
        ? { ...office.verification }
        : undefined,
    },
    null,
    2,
  );

  return (
    <div className="gof-review-row" data-testid="gof-review-row">
      <div className="gof-review-row-head">
        <span className={"gof-tag tag-" + tag.tone}>{tag.short}</span>
        <FlagChip code={office.countryCode} />
        <span className="gof-review-company">{company.name}</span>
        <span className="gof-muted">—</span>
        <span>
          {office.city}, {office.country}
        </span>
      </div>

      {office.verification && (
        <div className="gof-review-verdict">
          <b>Verdict:</b> {office.verification.verdict}
          {office.verification.confidence !== undefined && (
            <span className="gof-muted">
              {" "}
              (confidence: {(office.verification.confidence * 100).toFixed(0)}%)
            </span>
          )}
          {office.verification.reason && (
            <div className="gof-review-reason">
              {office.verification.reason}
            </div>
          )}
        </div>
      )}

      <div className="gof-review-fields">
        <label className="gof-review-label">
          City
          <input
            className="gof-review-input"
            value={office.city}
            onChange={(e) => setOffice((o) => ({ ...o, city: e.target.value }))}
          />
        </label>
        <label className="gof-review-label">
          Country
          <input
            className="gof-review-input"
            value={office.country}
            onChange={(e) =>
              setOffice((o) => ({ ...o, country: e.target.value }))
            }
          />
        </label>
        <label className="gof-review-label">
          Address
          <input
            className="gof-review-input"
            value={office.address}
            onChange={(e) =>
              setOffice((o) => ({ ...o, address: e.target.value }))
            }
          />
        </label>
        <label className="gof-review-label">
          Office type
          <input
            className="gof-review-input"
            value={office.officeType}
            onChange={(e) => {
              const officeType = e.target.value;
              const tag = typeTag(officeType);
              setOffice((o) => ({ ...o, officeType, tag, tone: tag.tone }));
            }}
          />
        </label>
      </div>

      <div className="gof-review-promote" data-testid="promote-snippet">
        <div className="gof-review-promote-label">
          Copy corrected JSON and paste into a PR:
        </div>
        <pre className="gof-review-snippet">{promoteSnippet}</pre>
        <button
          type="button"
          className="gof-btn-ghost"
          onClick={() => navigator.clipboard.writeText(promoteSnippet)}
        >
          Copy to clipboard
        </button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { offices, companyById } = useData();

  const rejectedOffices = useMemo(
    () => offices.filter((o) => o.verification?.verdict === "rejected"),
    [offices],
  );

  return (
    <div className="gof-page">
      <div className="gof-page-inner">
        <div className="gof-review-header">
          <h1 className="gof-review-title">Office Review</h1>
          <p className="gof-muted">
            Offices flagged by the CI verification job as likely incorrect.
            Correct the details and copy the JSON snippet to paste into a PR.
          </p>
          <Link to="/" className="gof-link">
            ← Back to directory
          </Link>
        </div>

        {rejectedOffices.length === 0 ? (
          <div className="gof-empty" data-testid="review-empty">
            No rejected offices found. All offices passed verification or have
            not been checked yet.
          </div>
        ) : (
          <div className="gof-review-list">
            {rejectedOffices.map((o) => {
              const co = companyById[o.companyId];
              if (!co) return null;
              return <ReviewRow key={o.id} office={o} company={co} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
