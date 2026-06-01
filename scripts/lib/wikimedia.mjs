// @ts-check
/**
 * Shared Wikimedia Commons helpers (license filtering + photo record building).
 *
 * Used by scripts/enrich-company-photos.mjs (build-time) and
 * api/_lib/wikimedia.ts (runtime discovery). Logic moved here 1:1 from the
 * original CLI so behaviour is identical.
 */

import { fetchJson, DEFAULT_HEADERS } from "./wikidata.mjs";

export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

/**
 * Lower-case fragments allowed in license fields. Anything containing
 * NoDerivatives (-nd), NonCommercial (-nc), or "fair use" is rejected.
 * Plain "public domain", "pd", "cc0" pass through.
 */
export const LICENSE_WHITELIST_PATTERNS = [
  /^cc0/,
  /^cc-zero/,
  /\bpublic domain\b/,
  /^pd(\b|-)/,
  /^cc[- ]by(\b|-)(?!.*\bnd\b)(?!.*\bnc\b)/, // CC-BY[-SA][-x.x]
];

/**
 * @param {string | undefined} s
 * @returns {string}
 */
export function stripHtml(s) {
  if (!s) return "";
  let out = String(s);
  let prev;
  do {
    prev = out;
    out = out.replace(/<[^<>]*>?/g, "");
  } while (out !== prev);
  return out
    .replace(/[<>]/g, "")
    .replace(/&lt;/g, "")
    .replace(/&gt;/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string | undefined} licenseShort
 * @returns {boolean}
 */
export function licenseAllowed(licenseShort) {
  if (!licenseShort) return false;
  const s = licenseShort.toLowerCase();
  if (/\bnd\b|\bnc\b|fair use|all rights|non-commercial|no derivatives/.test(s))
    return false;
  return LICENSE_WHITELIST_PATTERNS.some((re) => re.test(s));
}

/**
 * Best-effort canonical license deed URL from a short name.
 * @param {string | undefined} licenseShort
 * @returns {string}
 */
export function canonicalLicenseUrl(licenseShort) {
  const s = (licenseShort || "").toLowerCase().replace(/\s+/g, "-");
  if (/^cc0|cc-zero/.test(s))
    return "https://creativecommons.org/publicdomain/zero/1.0/";
  if (/\bpublic-domain\b|^pd(\b|-)/.test(s))
    return "https://en.wikipedia.org/wiki/Public_domain";
  const m = s.match(/^cc-?by(-sa)?-?(\d(?:\.\d)?)?/);
  if (m) {
    const sa = m[1] ? "-sa" : "";
    const ver = m[2] || "4.0";
    return `https://creativecommons.org/licenses/by${sa}/${ver}/`;
  }
  return "";
}

/**
 * Fetch imageinfo + extmetadata for a File:… title.
 * @param {string} fileTitle
 * @param {{ headers?: Record<string,string>, width?: number }} [opts]
 * @returns {Promise<any|null>}
 */
export async function getCommonsFileInfo(fileTitle, opts = {}) {
  const { headers = DEFAULT_HEADERS, width = 1600 } = opts;
  const params = new URLSearchParams({
    action: "query",
    prop: "imageinfo",
    iiprop: "url|extmetadata|user",
    iiurlwidth: String(width),
    titles: fileTitle,
    format: "json",
    origin: "*",
  });
  const j = await fetchJson(`${COMMONS_API}?${params}`, headers);
  const pages = j?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  return info;
}

/**
 * Turn Commons imageinfo into a CompanyPhoto record, or a rejection reason.
 * @param {any} info
 * @param {string} fileTitle
 * @returns {{ photo: { url: string, sourceUrl: string, author: string, license: string, licenseUrl: string, title: string } } | { rejected: true, reason: string }}
 */
export function buildPhotoRecord(info, fileTitle) {
  const ext = info.extmetadata || {};
  const license =
    stripHtml(ext.LicenseShortName?.value) || stripHtml(ext.License?.value);
  const licenseUrl =
    (ext.LicenseUrl?.value || "").trim() || canonicalLicenseUrl(license);
  const author = stripHtml(ext.Artist?.value) || info.user || "Unknown";
  const title = stripHtml(ext.ObjectName?.value) || fileTitle.replace(/^File:/, "");
  if (!licenseAllowed(license))
    return { rejected: true, reason: `license="${license}"` };
  if (!licenseUrl) return { rejected: true, reason: "missing license URL" };
  const url = info.thumburl || info.url;
  if (!url) return { rejected: true, reason: "missing image URL" };
  if (!/^https:\/\/upload\.wikimedia\.org\//.test(url))
    return { rejected: true, reason: `unexpected host: ${url}` };
  return {
    photo: {
      url,
      sourceUrl: info.descriptionurl,
      author,
      license,
      licenseUrl,
      title,
    },
  };
}
