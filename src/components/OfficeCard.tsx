import React from "react";
import type { Office } from "../types";
import { sanitizeUrl } from "../utils/data";

interface OfficeCardProps {
  office: Office;
  onClick?: () => void;
}

export default function OfficeCard({ office, onClick }: OfficeCardProps) {
  const safeContactUrl = sanitizeUrl(office.contactUrl);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      onClick?.();
    }
  };
  return (
    <article
      className="office-card"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      aria-label={`Office in ${office.city}, ${office.country}`}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
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
