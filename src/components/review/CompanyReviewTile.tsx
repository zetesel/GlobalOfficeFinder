import CompanyLogo from "../CompanyLogo";
import { getCompanyReviewCountries, type CompanyReviewSummary } from "../../utils/reviewQueue";

interface CompanyReviewTileProps {
  companyName: string;
  industry: string;
  summary: CompanyReviewSummary;
  onClick: () => void;
}

export default function CompanyReviewTile({
  companyName,
  industry,
  summary,
  onClick,
}: CompanyReviewTileProps) {
  const officeCount = summary.queueItems.length + summary.catalogOffices.length;
  const countries = getCompanyReviewCountries(summary);

  return (
    <button
      type="button"
      className="company-review-tile"
      onClick={onClick}
      aria-label={`Review ${companyName}: ${summary.pending} awaiting approval, ${officeCount} offices, ${countries.length} countries`}
    >
      <div className="company-card-header">
        <CompanyLogo companyId={summary.companyId} companyName={companyName} />
        <div>
          <h2 className="company-name">{companyName}</h2>
          <p className="company-industry">{industry}</p>
        </div>
      </div>
      <div className="company-meta company-review-tile__badges">
        {summary.pending > 0 ? (
          <span className="meta-pill badge-pending">
            {summary.pending} pending approval
          </span>
        ) : null}
        {summary.approved > 0 ? (
          <span className="meta-pill badge-approved">{summary.approved} approved</span>
        ) : null}
        {summary.rejected > 0 ? (
          <span className="meta-pill badge-rejected">{summary.rejected} rejected</span>
        ) : null}
        <span className="meta-pill">
          {officeCount} office{officeCount !== 1 ? "s" : ""}
        </span>
        <span className="meta-pill">
          {countries.length} countr{countries.length !== 1 ? "ies" : "y"}
        </span>
      </div>
      {countries.length > 0 ? (
        <p className="company-countries">{countries.join(" · ")}</p>
      ) : null}
    </button>
  );
}
