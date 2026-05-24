import { getApprovedLogo, requiresAttribution } from "../utils/companyLogos";

interface CompanyLogoProps {
  companyId: string;
  companyName: string;
  className?: string;
  size?: "default" | "large";
}

export default function CompanyLogo({
  companyId,
  companyName,
  className = "",
  size = "default",
}: CompanyLogoProps) {
  const entry = getApprovedLogo(companyId);
  const sizeClass = size === "large" ? "company-logo-large" : "company-logo";
  const placeholderClass =
    size === "large" ? "company-logo-large-placeholder" : "company-logo-placeholder";

  if (!entry) {
    return (
      <div className={`${placeholderClass} ${className}`.trim()} aria-hidden="true">
        {companyName.charAt(0).toUpperCase()}
      </div>
    );
  }

  const titleParts = [`${companyName} logo`];
  if (entry.attribution && requiresAttribution(entry.license)) {
    titleParts.push(entry.attribution);
  } else if (entry.usageNote) {
    titleParts.push(entry.usageNote);
  }

  return (
    <>
      <img
        src={entry.file}
        alt={`${companyName} logo`}
        className={`${sizeClass} ${className}`.trim()}
        loading="lazy"
        decoding="async"
        title={titleParts.join(" — ")}
      />
      {entry.attribution && requiresAttribution(entry.license) ? (
        <span className="sr-only">{entry.attribution}</span>
      ) : null}
    </>
  );
}
