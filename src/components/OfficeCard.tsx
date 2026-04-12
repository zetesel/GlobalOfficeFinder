import type { Office } from "../types";
import { sanitizeUrl } from "../utils/data";

interface OfficeCardProps {
  office: Office;
}

export default function OfficeCard({ office }: OfficeCardProps) {
  const safeContactUrl = sanitizeUrl(office.contactUrl);
  return (
    <article className="office-card">
      <div className="office-card-header">
        <span className="office-type-badge">{office.officeType}</span>
        <span className="office-country-code">{office.countryCode}</span>
      </div>
      <h3 className="office-city">
        {office.city}, {office.country}
      </h3>
      <address className="office-address">{office.address}</address>
      {office.postalCode && (
        <p className="office-postal">{office.postalCode}</p>
      )}
      {safeContactUrl && (
        <a
          className="office-link"
          href={safeContactUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Contact / More info ↗
        </a>
      )}
    </article>
  );
}
