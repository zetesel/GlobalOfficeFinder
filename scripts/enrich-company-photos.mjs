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
 *   1. Resolve company name → Wikidata Q-id (wbsearchentities + website match).
 *   2. Read claim P18 (image). If absent, read P159 (HQ location) → P18 on
 *      that entity.
 *   3. For the resulting File: page, call the Commons API for imageinfo +
 *      extmetadata. Filter to permissive licenses (CC0, PD, CC-BY*, CC-BY-SA*).
 *   4. Record { url, sourceUrl, author, license, licenseUrl, title }.
 *
 * The Wikidata + Wikimedia primitives now live in scripts/lib/*.mjs so they can
 * be shared with the runtime discovery endpoint (api/_lib/*). This script keeps
 * its CLI behaviour (env knobs, dry-run, mutate companies.json).
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
import {
  delay,
  resolveCompanyEntity,
  getEntity,
  firstClaimValue,
} from "./lib/wikidata.mjs";
import { getCommonsFileInfo, buildPhotoRecord } from "./lib/wikimedia.mjs";

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

/** Resolve company → File:… title (HQ building or company image). */
async function findBuildingFile(company) {
  const entity = await resolveCompanyEntity(company, {
    requestDelay: REQUEST_DELAY,
    headers: REQUEST_HEADERS,
  });
  if (!entity) return null;

  // P18 directly on the company entity is the canonical building/image.
  const directFile = firstClaimValue(entity, "P18");
  if (directFile) return { file: `File:${directFile}` };

  // Otherwise resolve HQ location (P159) → its P18.
  const hqId = firstClaimValue(entity, "P159")?.id;
  if (hqId) {
    await delay(REQUEST_DELAY);
    const hq = await getEntity(hqId, { headers: REQUEST_HEADERS });
    const hqFile = firstClaimValue(hq, "P18");
    if (hqFile) return { file: `File:${hqFile}` };
  }
  return null;
}

async function enrichCompany(company) {
  if (company.photo && !OVERWRITE) return { skipped: true, reason: "already has photo" };
  const found = await findBuildingFile(company);
  if (!found) return { skipped: true, reason: "no Wikidata image" };
  await delay(REQUEST_DELAY);
  const info = await getCommonsFileInfo(found.file, { headers: REQUEST_HEADERS });
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
