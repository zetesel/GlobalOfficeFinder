#!/usr/bin/env node
// @ts-check
/**
 * enrich-company-photos.mjs
 *
 * For each company in data/companies.json, attempt to find a permissively
 * licensed building photo via Wikidata → Wikimedia Commons and write it back
 * into the record as `photo`.
 *
 * Workflow per company:
 *   1. Resolve company name → Wikidata Q-id (via Wikipedia REST summary, then
 *      wbsearchentities fallback).
 *   2. Read claim P18 (image). If absent, read P159 (HQ location) → P18 on
 *      that entity.
 *   3. For the resulting File: page, call the Commons API for imageinfo +
 *      extmetadata. Filter to permissive licenses (CC0, PD, CC-BY*, CC-BY-SA*).
 *   4. Record { url, sourceUrl, author, license, licenseUrl, title }.
 *
 * Usage:
 *   node scripts/enrich-company-photos.mjs              # mutate data/companies.json
 *   node scripts/enrich-company-photos.mjs --dry-run    # report only
 *   ENRICH_LIMIT=5 node scripts/enrich-company-photos.mjs  # first 5 companies
 *
 * Environment:
 *   ENRICH_REQUEST_DELAY  ms between API requests (default: 250)
 *   ENRICH_OVERWRITE      "1" to re-enrich companies that already have a photo
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const COMPANIES_PATH = join(root, "data", "companies.json");

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = process.env.ENRICH_LIMIT ? Number(process.env.ENRICH_LIMIT) : Infinity;
const REQUEST_DELAY = Number(process.env.ENRICH_REQUEST_DELAY ?? "250");
const OVERWRITE = process.env.ENRICH_OVERWRITE === "1";

const REQUEST_HEADERS = {
  "User-Agent":
    "GlobalOfficeFinderBot/1.0 (https://github.com/zetesel/GlobalOfficeFinder; photo enrichment)",
  Accept: "application/json",
};

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

/**
 * Lower-case fragments allowed in license fields. Anything containing
 * NoDerivatives (-nd), NonCommercial (-nc), or "fair use" is rejected.
 * Plain "public domain", "pd", "cc0" pass through.
 */
const LICENSE_WHITELIST_PATTERNS = [
  /^cc0/, /^cc-zero/, /\bpublic domain\b/, /^pd(\b|-)/,
  /^cc[- ]by(\b|-)(?!.*\bnd\b)(?!.*\bnc\b)/, // CC-BY[-SA][-x.x]
];

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: REQUEST_HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

function stripHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function licenseAllowed(licenseShort) {
  if (!licenseShort) return false;
  const s = licenseShort.toLowerCase();
  if (/\bnd\b|\bnc\b|fair use|all rights|non-commercial|no derivatives/.test(s))
    return false;
  return LICENSE_WHITELIST_PATTERNS.some((re) => re.test(s));
}

/** Best-effort canonical license deed URL from a short name. */
function canonicalLicenseUrl(licenseShort) {
  const s = (licenseShort || "").toLowerCase().replace(/\s+/g, "-");
  if (/^cc0|cc-zero/.test(s)) return "https://creativecommons.org/publicdomain/zero/1.0/";
  if (/\bpublic-domain\b|^pd(\b|-)/.test(s)) return "https://en.wikipedia.org/wiki/Public_domain";
  const m = s.match(/^cc-?by(-sa)?-?(\d(?:\.\d)?)?/);
  if (m) {
    const sa = m[1] ? "-sa" : "";
    const ver = m[2] || "4.0";
    return `https://creativecommons.org/licenses/by${sa}/${ver}/`;
  }
  return "";
}

/** Hostname compare, robust to www. + trailing slashes. */
function sameHost(a, b) {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, "").toLowerCase();
    const hb = new URL(b).hostname.replace(/^www\./, "").toLowerCase();
    return ha === hb;
  } catch {
    return false;
  }
}

/**
 * Wikidata P31 (instance-of) Q-ids that mean "this entity is a business of
 * some kind". The match is recursive in real Wikidata, but a coarse top-level
 * set is enough to filter out fruit/material/etc. articles.
 */
const BUSINESS_INSTANCE_QIDS = new Set([
  "Q4830453", // business
  "Q43229",   // organization
  "Q783794",  // company
  "Q6881511", // enterprise
  "Q891723",  // public company
  "Q167037",  // corporation
  "Q161726",  // multinational corporation
  "Q1616075", // privately held company
  "Q2401749", // joint-stock company
  "Q1058914", // software company
  "Q210167",  // video game developer
  "Q270791",  // state-owned enterprise
  "Q15911314",// association
  "Q4830453", // business (dup ok)
  "Q1496428", // automobile manufacturer
  "Q1656682", // industrial enterprise
]);

function isBusinessEntity(entity) {
  const claims = entity?.claims?.P31;
  if (!Array.isArray(claims)) return false;
  return claims.some((c) => BUSINESS_INSTANCE_QIDS.has(c?.mainsnak?.datavalue?.value?.id));
}

/** Multi-candidate search via wbsearchentities. */
async function searchWikidataCandidates(name) {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: name,
    language: "en",
    type: "item",
    limit: "8",
    format: "json",
    origin: "*",
  });
  try {
    const j = await fetchJson(`${WIKIDATA_API}?${params}`);
    return (j?.search ?? []).map((s) => s.id).filter(Boolean);
  } catch {
    return [];
  }
}

/** Fetch a single Wikidata entity's claims. */
async function getEntity(qid) {
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: qid,
    props: "claims|labels",
    languages: "en",
    format: "json",
    origin: "*",
  });
  try {
    const j = await fetchJson(`${WIKIDATA_API}?${params}`);
    return j?.entities?.[qid] ?? null;
  } catch {
    return null;
  }
}

function firstClaimValue(entity, prop) {
  const claims = entity?.claims?.[prop];
  if (!Array.isArray(claims) || claims.length === 0) return null;
  return claims[0]?.mainsnak?.datavalue?.value ?? null;
}

function allClaimValues(entity, prop) {
  const claims = entity?.claims?.[prop];
  if (!Array.isArray(claims)) return [];
  return claims.map((c) => c?.mainsnak?.datavalue?.value).filter(Boolean);
}

/**
 * Resolve a company → its Wikidata entity using the company's own website as
 * the disambiguator. Falls back to "first business-type result" when no
 * website match exists.
 */
async function resolveCompanyEntity(company) {
  const candidates = await searchWikidataCandidates(company.name);
  if (!candidates.length) return null;

  let businessFallback = null;
  for (const qid of candidates) {
    await delay(REQUEST_DELAY);
    const entity = await getEntity(qid);
    if (!entity) continue;
    const websites = allClaimValues(entity, "P856");
    if (websites.some((w) => sameHost(w, company.website))) return entity;
    if (!businessFallback && isBusinessEntity(entity)) businessFallback = entity;
  }
  return businessFallback;
}

/** Resolve company → File:… title (HQ building or company image). */
async function findBuildingFile(company) {
  const entity = await resolveCompanyEntity(company);
  if (!entity) return null;

  // P18 directly on the company entity is the canonical building/image.
  const directFile = firstClaimValue(entity, "P18");
  if (directFile) return { file: `File:${directFile}` };

  // Otherwise resolve HQ location (P159) → its P18.
  const hqId = firstClaimValue(entity, "P159")?.id;
  if (hqId) {
    await delay(REQUEST_DELAY);
    const hq = await getEntity(hqId);
    const hqFile = firstClaimValue(hq, "P18");
    if (hqFile) return { file: `File:${hqFile}` };
  }
  return null;
}

/** Fetch imageinfo + extmetadata for a File:… title. */
async function getCommonsFileInfo(fileTitle) {
  const params = new URLSearchParams({
    action: "query",
    prop: "imageinfo",
    iiprop: "url|extmetadata|user",
    iiurlwidth: "1600",
    titles: fileTitle,
    format: "json",
    origin: "*",
  });
  const j = await fetchJson(`${COMMONS_API}?${params}`);
  const pages = j?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  return info;
}

function buildPhotoRecord(info, fileTitle) {
  const ext = info.extmetadata || {};
  const license = stripHtml(ext.LicenseShortName?.value) || stripHtml(ext.License?.value);
  const licenseUrl = (ext.LicenseUrl?.value || "").trim() || canonicalLicenseUrl(license);
  const author = stripHtml(ext.Artist?.value) || info.user || "Unknown";
  const title = stripHtml(ext.ObjectName?.value) || fileTitle.replace(/^File:/, "");
  if (!licenseAllowed(license)) return { rejected: true, reason: `license="${license}"` };
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

async function enrichCompany(company) {
  if (company.photo && !OVERWRITE) return { skipped: true, reason: "already has photo" };
  const found = await findBuildingFile(company);
  if (!found) return { skipped: true, reason: "no Wikidata image" };
  await delay(REQUEST_DELAY);
  const info = await getCommonsFileInfo(found.file);
  if (!info) return { skipped: true, reason: "Commons file fetch failed" };
  const result = buildPhotoRecord(info, found.file);
  if (result.rejected) return { skipped: true, reason: result.reason };
  return { photo: result.photo };
}

async function main() {
  const companies = JSON.parse(readFileSync(COMPANIES_PATH, "utf8"));
  const stats = { tried: 0, enriched: 0, skipped: 0, errors: 0 };
  const report = [];

  for (const company of companies) {
    if (stats.tried >= LIMIT) break;
    stats.tried++;
    try {
      const out = await enrichCompany(company);
      if (out.photo) {
        company.photo = out.photo;
        stats.enriched++;
        report.push({ id: company.id, status: "enriched", license: out.photo.license });
        console.log(`[ok ]  ${company.id.padEnd(20)} ← ${out.photo.license}  ${out.photo.title}`);
      } else {
        stats.skipped++;
        report.push({ id: company.id, status: "skipped", reason: out.reason });
        console.log(`[skip] ${company.id.padEnd(20)} (${out.reason})`);
      }
    } catch (err) {
      stats.errors++;
      report.push({ id: company.id, status: "error", error: String(err) });
      console.log(`[err ] ${company.id.padEnd(20)} ${err}`);
    }
    await delay(REQUEST_DELAY);
  }

  console.log("\n=== summary ===");
  console.log(stats);

  if (!DRY_RUN && stats.enriched > 0) {
    writeFileSync(COMPANIES_PATH, JSON.stringify(companies, null, 2) + "\n");
    console.log(`\nWrote ${COMPANIES_PATH}`);
  } else if (DRY_RUN) {
    console.log("\n(dry run — no file written)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
