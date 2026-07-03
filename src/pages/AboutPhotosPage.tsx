import { Link } from "react-router-dom";
import { useData } from "../hooks/useData";
import { sanitizeUrl } from "../utils/sanitizeUrl";
import type { Company, CompanyPhoto } from "../types";

export default function AboutPhotosPage() {
  const { companies } = useData();
  const credited = companies
    .filter((c): c is Company & { photo: CompanyPhoto } => !!c.photo)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sample = companies.filter((c) => !c.photo).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="gof-page">
      <div className="gof-page-inner gof-about">
        <Link to="/" className="gof-back">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M8.5 3L4.5 7L8.5 11"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Directory
        </Link>

        <h1 className="gof-about-title">About the photos</h1>

        <p className="gof-about-lead">
          GlobalOfficeFinder is an open-source project. Every image you see falls into one of
          two clearly-labelled categories: a real, attributed photo from Wikimedia Commons, or a
          decorative sample photo from Pexels that does not depict the company in view.
        </p>

        <h2 className="gof-about-h">Real building photos — Wikimedia Commons</h2>
        <p>
          Real photos are sourced from{" "}
          <a
            href="https://commons.wikimedia.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Wikimedia Commons
          </a>{" "}
          and reused under their original free-culture licenses. We only accept files licensed
          under:
        </p>
        <ul>
          <li>Public Domain / CC0</li>
          <li>Creative Commons Attribution (CC-BY, all versions)</li>
          <li>Creative Commons Attribution-ShareAlike (CC-BY-SA, all versions)</li>
        </ul>
        <p>
          On every real photo a small <strong>i</strong> badge appears in the bottom-right
          corner; tap or focus it to reveal the author, license short name, and links back to
          the original Commons file page and the license deed.
        </p>

        <h2 className="gof-about-h">Sample decorative photos — Pexels</h2>
        <p>
          Companies without a Commons match fall back to a small curated pool of stock photos
          from{" "}
          <a href="https://www.pexels.com/" target="_blank" rel="noopener noreferrer">
            Pexels
          </a>{" "}
          under the{" "}
          <a
            href="https://www.pexels.com/license/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pexels License
          </a>{" "}
          (free commercial use, no attribution required). These images are <em>decorative
          only</em> — they do not depict the company shown next to them. Every sample image is
          marked with a <strong>Sample</strong> badge in the bottom-right corner.
        </p>

        <h2 className="gof-about-h">
          Credited photos <span className="gof-about-count">{credited.length}</span>
        </h2>
        <ul className="gof-about-table">
          {credited.map((c) => {
            const { photo } = c;
            const src = sanitizeUrl(photo.sourceUrl);
            const lic = sanitizeUrl(photo.licenseUrl);
            return (
              <li key={c.id}>
                <Link to={`/company/${encodeURIComponent(c.id)}`} className="gof-about-co">
                  {c.name}
                </Link>
                <span className="gof-about-meta">
                  {photo.author} ·{" "}
                  {lic ? (
                    <a href={lic} target="_blank" rel="noopener noreferrer">
                      {photo.license}
                    </a>
                  ) : (
                    photo.license
                  )}
                  {src && (
                    <>
                      {" · "}
                      <a href={src} target="_blank" rel="noopener noreferrer">
                        source
                      </a>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        {sample.length > 0 && (
          <>
            <h2 className="gof-about-h">
              Sample-only companies <span className="gof-about-count">{sample.length}</span>
            </h2>
            <p>
              We could not find a permissively-licensed building photo for these companies on
              Wikimedia Commons. They use a decorative Pexels stock photo instead.
            </p>
            <ul className="gof-about-table">
              {sample.map((c) => (
                <li key={c.id}>
                  <Link to={`/company/${encodeURIComponent(c.id)}`} className="gof-about-co">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
