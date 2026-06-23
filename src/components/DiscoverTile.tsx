/**
 * Map card for the discovery view. Mirrors HomePage's OfficeTile but is
 * standalone (no router links into the catalogue) and carries a banner making
 * clear the data is temporary, discovered live, and not manually verified.
 */
import type { Company, Office } from "../types";
import Photo from "./Photo";
import Monogram from "./Monogram";
import FlagChip from "./FlagChip";
import { truncate } from "../utils/typeTag";

interface DiscoverTileProps {
  office: Office;
  company: Company;
  onClose: () => void;
}

export default function DiscoverTile({ office, company, onClose }: DiscoverTileProps) {
  const tag = office.tag;
  const summary = truncate(company.description, 160);
  return (
    <div className="gof-mapcard" role="dialog" aria-label={`${company.name} — ${office.city}`}>
      <Photo
        seed={office.id}
        w={560}
        h={200}
        className="gof-mapcard-photo"
        photo={company.photo}
        subject={company.name}
      >
        <span className={"gof-tag tag-" + tag.tone + " gof-mapcard-tag"}>{tag.short}</span>
        <button
          type="button"
          className="gof-mapcard-close"
          aria-label="Close office details"
          onClick={onClose}
        >
          ✕
        </button>
      </Photo>
      <div className="gof-mapcard-body">
        <div className="gof-discover-banner" role="note">
          Temporary data — discovered live, not manually verified.
        </div>
        <div className="gof-mapcard-head">
          <Monogram name={company.name} size={42} square />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="gof-mapcard-name">{company.name}</div>
            <div className="gof-mapcard-loc">
              <FlagChip code={office.countryCode} />
              <span>
                {office.city}, {office.country}
              </span>
            </div>
          </div>
        </div>
        {summary && <p className="gof-mapcard-desc">{summary}</p>}
        {company.website && (
          <div className="gof-mapcard-actions">
            <a
              className="gof-btn"
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit website
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
