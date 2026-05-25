#!/usr/bin/env node
/**
 * Pre-geocode unique review-queue offices (respecting Nominatim rate limits).
 * Output: data/scraper/queue-geocodes.json keyed by geocodeCacheKey fields.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const queuePath = path.join(ROOT, "data/scraper/review-queue.json");
const outPath = path.join(ROOT, "data/scraper/queue-geocodes.json");

const STREET_SUFFIX =
  "(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Way|Plaza|Parkway|Pkwy|Ct|Court|Ln|Lane|Place|Square|Sq|High\\s+St|Building|Bldg)";

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function dedupeAddressPrefix(line) {
  const tokens = line.split(/\s+/).filter(Boolean);
  for (let size = 1; size <= Math.floor(tokens.length / 2); size += 1) {
    const prefix = tokens.slice(0, size).join(" ");
    const repeat = tokens.slice(size, size * 2).join(" ");
    if (prefix === repeat) return tokens.slice(size).join(" ");
  }
  return line;
}

function extractStreetLine(address, city) {
  let line = (address ?? "").trim();
  if (!line) return "";
  line = line
    .replace(/^Google\s+[\w\s.'-]+\s*-\s*/i, "")
    .replace(/^North America\s+/i, "")
    .replace(/&amp;/g, "&");
  const cityWord = (city ?? "").split(/[,\s]+/)[0];
  if (cityWord) {
    line = line.replace(new RegExp(`^${cityWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "");
  }
  line = dedupeAddressPrefix(line);
  const streetPattern = new RegExp(`(\\d[\\w\\s.,#'-]*${STREET_SUFFIX}[\\w\\s.,#'-]*)`, "gi");
  const matches = [...line.matchAll(streetPattern)];
  if (matches.length > 0) {
    const candidates = matches.map((match) => match[1].trim());
    const suffixEnded = candidates.filter((candidate) =>
      /(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Way|Plaza|Parkway|Pkwy|Ct|Court|Ln|Lane)\.?$/i.test(
        candidate,
      ),
    );
    const pool = suffixEnded.length > 0 ? suffixEnded : candidates;
    const best = pool.sort((a, b) => a.length - b.length)[0];
    const numberIndex = best.search(/\d/);
    if (numberIndex >= 0) return best.slice(numberIndex).trim();
    return best;
  }
  const trailingStreet = line.match(/(\d+\s[\w\s.'-]+St\.?)\s*$/i);
  if (trailingStreet) return trailingStreet[1].trim();
  const trailingNumber = line.match(/(\d+\s+[\w\s.,#-]{4,})$/);
  if (trailingNumber) return trailingNumber[1].trim();
  return line.trim();
}

function geocodeCityLabel(city) {
  const trimmed = (city ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
    const last = parts[parts.length - 1] ?? trimmed;
    if (!/^\d/.test(last)) return last.replace(/\s+[A-Z]{1,2}\d[\w\s-]*$/i, "").trim();
    const prev = parts[parts.length - 2];
    if (prev && !/^\d/.test(prev)) return prev.trim();
  }
  return trimmed.replace(/\s+[A-Z]{1,2}\d[\w\s-]*$/i, "").trim();
}

function geocodeCountryLabel(office) {
  const country = office.country?.trim();
  const code = office.countryCode?.trim();
  if (!country && !code) return undefined;
  if (country && code && normalize(country) === normalize(code)) return country;
  if (country && code && code.length === 2) return country;
  return country || code;
}

function geocodeCacheKey(office) {
  return [office.address, office.city, office.postalCode, office.country, office.countryCode]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
}

function geocodeQueryVariants(office) {
  const street = extractStreetLine(office.address, office.city);
  const city = geocodeCityLabel(office.city);
  const postal = office.postalCode?.trim();
  const country = geocodeCountryLabel(office);
  const variants = [
    [street, city, postal, country],
    [street, city, country],
    [street, postal, country],
    [postal, city, country],
    [city, country],
  ]
    .map((parts) => parts.filter(Boolean).join(", "))
    .filter((query) => query.length > 3);
  return [...new Set(variants)];
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGeocode(query) {
  const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
  const photonResponse = await fetch(photonUrl, { headers: { Accept: "application/json" } });
  if (photonResponse.ok) {
    const payload = await photonResponse.json();
    const coords = payload.features?.[0]?.geometry?.coordinates;
    if (coords) return { latitude: coords[1], longitude: coords[0], query };
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GlobalOfficeFinder/1.0 (review queue geocoding)",
      },
    });
    if (response.status === 429) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (!response.ok) return undefined;
    const payload = await response.json();
    const top = payload[0];
    if (!top?.lat || !top?.lon) return undefined;
    return { latitude: Number(top.lat), longitude: Number(top.lon), query };
  }
  return undefined;
}

async function geocodeOffice(office) {
  for (const query of geocodeQueryVariants(office)) {
    const result = await fetchGeocode(query);
    await sleep(400);
    if (result) return result;
  }
  return undefined;
}

const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const byKey = new Map();
for (const item of queue.items ?? []) {
  if (item.type !== "office" || !item.office) continue;
  const key = geocodeCacheKey(item.office);
  if (!byKey.has(key)) byKey.set(key, item.office);
}

const existing = fs.existsSync(outPath)
  ? JSON.parse(fs.readFileSync(outPath, "utf8"))
  : { generatedAt: null, entries: {} };

const entries = { ...existing.entries };
let added = 0;
let skipped = 0;
let failed = 0;

console.log(`Geocoding ${byKey.size} unique queue offices (${Object.keys(entries).length} already cached)...`);

for (const [key, office] of byKey.entries()) {
  if (entries[key]) {
    skipped += 1;
    continue;
  }
  process.stdout.write(`Geocoding ${office.city ?? "?"}… `);
  const result = await geocodeOffice(office);
  if (result) {
    entries[key] = {
      latitude: result.latitude,
      longitude: result.longitude,
      query: result.query,
    };
    added += 1;
    console.log(`${result.latitude}, ${result.longitude}`);
  } else {
    failed += 1;
    console.log("FAILED");
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  entries,
};
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Done. added=${added} skipped=${skipped} failed=${failed} total=${Object.keys(entries).length}`);
