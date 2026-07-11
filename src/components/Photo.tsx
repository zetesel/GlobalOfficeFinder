import { useState, type MouseEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { CompanyPhoto } from "../types";
import { sanitizeUrl } from "../utils/sanitizeUrl";

// Curated pool of Pexels photo IDs (office / architecture / skyline /
// interior). Source pages: https://www.pexels.com/photo/<id>/
// License: Pexels License — free commercial use, no attribution required.
// See docs/photo-credits.json for the full traceability manifest.
const PHOTO_POOL = [
  273209, 380769, 258083, 416405, 380330, 2467287, 220639, 1170412,
  1112048, 374870, 256490, 269077, 327540, 280221, 1098460, 2096700,
  416430, 372326, 1648392, 1325751,
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function fallbackUrl(seed: string, w: number, h: number): string {
  const id = PHOTO_POOL[hashStr(String(seed)) % PHOTO_POOL.length];
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;
}

type PhotoState = "loading" | "loaded" | "error";

interface PhotoProps {
  seed: string;
  w?: number;
  h?: number;
  className?: string;
  children?: ReactNode;
  /**
   * Curated photo with full attribution. When present and the image loads
   * successfully, an info badge is shown and the sample disclaimer is
   * suppressed.
   */
  photo?: CompanyPhoto;
  /** Label used in the sample disclaimer (e.g. company name). */
  subject?: string;
}

export default function Photo({
  seed,
  w = 800,
  h = 450,
  className,
  children,
  photo,
  subject,
}: PhotoProps) {
  const [state, setState] = useState<PhotoState>("loading");

  const src = photo ? photo.url : fallbackUrl(seed, w, h);

  return (
    <div className={"gof-photo " + (className || "")}>
      <img
        src={src}
        alt=""
        loading="lazy"
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className={state === "loaded" ? "is-loaded" : ""}
      />
      <div className="gof-photo-grad" />
      {photo && state !== "error" ? (
        <RealBadge photo={photo} />
      ) : (
        <SampleBadge subject={subject} />
      )}
      {children}
    </div>
  );
}

/** Open a URL without triggering an enclosing <Link>. */
function openExternal(href: string) {
  return (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(href, "_blank", "noopener,noreferrer");
  };
}

function RealBadge({ photo }: { photo: CompanyPhoto }) {
  const source = sanitizeUrl(photo.sourceUrl);
  const licenseHref = sanitizeUrl(photo.licenseUrl);
  const stop = (e: MouseEvent) => e.stopPropagation();
  return (
    <span
      className="gof-photo-badge is-real"
      tabIndex={0}
      role="group"
      onClick={stop}
      aria-label={`Photo credit: ${photo.author}, ${photo.license}.`}
    >
      <span className="gof-photo-badge-ic" aria-hidden="true">i</span>
      <span className="gof-photo-badge-panel">
        <span className="gof-photo-badge-line">
          Photo: {photo.author} · {photo.license}
        </span>
        <span className="gof-photo-badge-links">
          {source && (
            <button type="button" onClick={openExternal(source)}>
              Source
            </button>
          )}
          {licenseHref && (
            <button type="button" onClick={openExternal(licenseHref)}>
              License
            </button>
          )}
        </span>
      </span>
    </span>
  );
}

function SampleBadge({ subject }: { subject?: string }) {
  const navigate = useNavigate();
  const stop = (e: MouseEvent) => e.stopPropagation();
  const goAbout = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/about/photos");
  };
  return (
    <span
      className="gof-photo-badge is-sample"
      tabIndex={0}
      role="group"
      onClick={stop}
      aria-label={
        subject
          ? `Sample image — does not depict ${subject}.`
          : "Sample image."
      }
    >
      <span className="gof-photo-badge-ic" aria-hidden="true">Sample</span>
      <span className="gof-photo-badge-panel">
        <span className="gof-photo-badge-line">
          Sample image{subject ? ` — does not depict ${subject}` : ""}.
        </span>
        <span className="gof-photo-badge-links">
          <button type="button" onClick={goAbout}>
            About the photos
          </button>
        </span>
      </span>
    </span>
  );
}
