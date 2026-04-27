#!/usr/bin/env node
// @ts-check

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

const COMPANIES_PATH = join(root, "data", "companies.json");
const OFFICES_PATH = join(root, "data", "offices.json");
const SOURCES_PATH = join(root, "data", "scraper", "sources", "phase-a-curated.json");
const REVIEW_QUEUE_PATH = join(root, "data", "scraper", "review-queue.json");
const RUN_REPORT_PATH = join(root, "data", "scraper", "last-run.json");

const REQUIRED_COMPANY_FIELDS = ["name", "website", "industry", "description"];
const REQUIRED_OFFICE_FIELDS = [
  "country",
  "countryCode",
  "region",
  "city",
  "address",
  "officeType",
  "latitude",
  "longitude",
];

const REGION_BY_COUNTRY_CODE = {
  US: "Americas",
  CA: "Americas",
  MX: "Americas",
  BR: "Americas",
  AR: "Americas",
  CL: "Americas",
  GB: "Europe",
  IE: "Europe",
  DE: "Europe",
  FR: "Europe",
  NL: "Europe",
  LU: "Europe",
  SE: "Europe",
  NO: "Europe",
  FI: "Europe",
  PL: "Europe",
  CH: "Europe",
  ES: "Europe",
  IT: "Europe",
  PT: "Europe",
  JP: "Asia-Pacific",
  SG: "Asia-Pacific",
  AU: "Asia-Pacific",
  NZ: "Asia-Pacific",
  IN: "Asia-Pacific",
  KR: "Asia-Pacific",
  CN: "Asia-Pacific",
  HK: "Asia-Pacific",
  AE: "Middle East & Africa",
  ZA: "Middle East & Africa",
  EG: "Middle East & Africa",
  NG: "Middle East & Africa",
  SA: "Middle East & Africa",
};

const COUNTRY_CODE_FALLBACK = {
  "united states": "US",
  "united kingdom": "GB",
  germany: "DE",
  france: "FR",
  ireland: "IE",
  luxembourg: "LU",
  singapore: "SG",
  japan: "JP",
  india: "IN",
  australia: "AU",
  canada: "CA",
  netherlands: "NL",
  sweden: "SE",
};

const REQUEST_HEADERS = {
  "User-Agent": "GlobalOfficeFinderBot/1.0 (https://github.com/zetesel/GlobalOfficeFinder)",
  Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
};

const DRY_RUN = process.env.SCRAPER_DRY_RUN === "1";
const FETCH_OFFICE_PAGES = process.env.SCRAPER_FETCH_PAGES !== "0";
const GEOCODE_ENABLED = process.env.SCRAPER_GEOCODE !== "0";
const MIN_CONFIDENCE_FOR_PUBLISH = process.env.SCRAPER_MIN_CONFIDENCE ?? "medium";
const MIN_SOURCE_TRUST = process.env.SCRAPER_MIN_SOURCE_TRUST ?? "high";
const ENABLE_ROBOTS_CHECK = process.env.SCRAPER_CHECK_ROBOTS !== "0";
const PER_SOURCE_FAILURE_THRESHOLD = Number(process.env.SCRAPER_SOURCE_FAILURE_THRESHOLD ?? "4");
const AUTO_DISCOVER = process.env.SCRAPER_AUTO_DISCOVER === "1";

const CONFIDENCE_RANK = { low: 1, medium: 2, high: 3 };
const SOURCE_TRUST_RANK = { low: 1, medium: 2, high: 3 };
const robotsDecisionCache = new Map();

/** @returns {string} */
function nowIso() {
  return new Date().toISOString();
}

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} value
 */
function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * @param {string} value
 */
function slugify(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * @param {string | undefined} value
 */
function safeText(value) {
  if (!value) return "";
  const cleaned = normalizeWhitespace(value);
  const htmlPattern = /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s+[^<>]*?)?\s*\/?>/;
  if (htmlPattern.test(cleaned)) return "";
  return cleaned;
}

/**
 * @param {string | undefined} url
 * @returns {string | undefined}
 */
function sanitizeUrl(url) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    // noop
  }
  return undefined;
}

/**
 * @param {string} url
 */
function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * @param {string} name
 */
function normalizeCompanyNameTokens(name) {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => !["inc", "corp", "corporation", "company", "co", "ltd", "llc", "plc", "group", "holdings"].includes(token)),
  );
}

/**
 * @param {string} a
 * @param {string} b
 */
function nameSimilarity(a, b) {
  const ta = normalizeCompanyNameTokens(a);
  const tb = normalizeCompanyNameTokens(b);
  const union = new Set([...ta, ...tb]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const token of ta) {
    if (tb.has(token)) intersection += 1;
  }
  return intersection / union.size;
}

/**
 * @template T
 * @param {string} path
 * @returns {T}
 */
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

/**
 * @param {string} path
 * @param {unknown} value
 */
function writeJson(path, value) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

/**
 * @param {string} path
 */
function backupFile(path) {
  return readFileSync(path, "utf-8");
}

/**
 * @param {string} path
 * @param {string} content
 */
function restoreFile(path, content) {
  writeFileSync(path, content, "utf-8");
}

/**
 * @param {Array<{countryCode:string,region:string}>} existingOffices
 */
function buildRegionMap(existingOffices) {
  const map = new Map();
  for (const office of existingOffices) {
    if (office.countryCode && office.region) {
      map.set(office.countryCode.toUpperCase(), office.region);
    }
  }
  return map;
}

/**
 * @param {Array<{country:string,countryCode:string}>} existingOffices
 */
function buildCountryCodeMap(existingOffices) {
  const map = new Map();
  for (const office of existingOffices) {
    if (office.country && office.countryCode) {
      map.set(office.country.toLowerCase(), office.countryCode.toUpperCase());
    }
  }
  return map;
}

/**
 * @param {string | undefined} country
 * @param {string | undefined} countryCode
 * @param {Map<string,string>} countryCodeMap
 */
function normalizeCountryCode(country, countryCode, countryCodeMap) {
  if (countryCode && /^[A-Z]{2}$/.test(countryCode.toUpperCase())) {
    return countryCode.toUpperCase();
  }
  const normalized = (country ?? "").trim().toLowerCase();
  return countryCodeMap.get(normalized) ?? COUNTRY_CODE_FALLBACK[normalized] ?? "";
}

/**
 * @param {string} countryCode
 * @param {Map<string,string>} regionMap
 */
function normalizeRegion(countryCode, regionMap) {
  return (
    regionMap.get(countryCode) ??
    REGION_BY_COUNTRY_CODE[countryCode] ??
    ""
  );
}

/**
 * @param {string} website
 * @param {string[]} sourceUrls
 */
function isOfficialSourceMatch(website, sourceUrls) {
  const domain = getDomain(website);
  if (!domain) return false;
  return sourceUrls.some((url) => getDomain(url) === domain);
}

let lastGeocodeTimestamp = 0;

/**
 * @param {{address:string,city:string,country:string,postalCode?:string}} office
 */
async function geocodeOffice(office) {
  if (!GEOCODE_ENABLED) return { latitude: undefined, longitude: undefined, certainty: "none" };

  const query = [office.address, office.city, office.postalCode, office.country]
    .filter(Boolean)
    .join(", ");

  const baseUrl = process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org/search";
  const url = `${baseUrl}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const now = Date.now();
      const elapsed = now - lastGeocodeTimestamp;
      if (elapsed < 1100) {
        await sleep(1100 - elapsed);
      }

      const response = await fetch(url, { headers: REQUEST_HEADERS });
      lastGeocodeTimestamp = Date.now();

      if (!response.ok) {
        throw new Error(`geocode HTTP ${response.status}`);
      }

      const payload = await response.json();
      const top = Array.isArray(payload) ? payload[0] : undefined;
      if (!top?.lat || !top?.lon) {
        return { latitude: undefined, longitude: undefined, certainty: "none" };
      }

      const importance = Number(top.importance ?? 0);
      const certainty = importance >= 0.7 ? "high" : importance >= 0.4 ? "medium" : "low";
      return {
        latitude: Number(top.lat),
        longitude: Number(top.lon),
        certainty,
      };
    } catch (error) {
      if (attempt === maxAttempts) {
        return { latitude: undefined, longitude: undefined, certainty: "none", error: String(error) };
      }
      await sleep(400 * attempt);
    }
  }

  // Attach any extracted offices (from HTML JSON-LD or <address>) back to the discovered company entries
  try {
    const extractedEntries = collectedPageData.filter((p) => p.extractedOffice);
    if (extractedEntries.length > 0) {
      for (const ex of extractedEntries) {
        const exUrl = ex.url || ex.sourceUrl || "";
        let exDomain = "";
        try {
          exDomain = new URL(exUrl.replace(/#.*$/, "")).hostname.replace(/^www\./, "");
        } catch {
          // noop
        }

        for (const entry of discovered) {
          const companyUrl = sanitizeUrl(entry.company.website) || "";
          let companyDomain = "";
          try {
            companyDomain = new URL(companyUrl).hostname.replace(/^www\./, "");
          } catch {
            // noop
          }

          if (!companyDomain) continue;
          if (exDomain === companyDomain) {
            entry.company.offices = entry.company.offices || [];
            entry.company.offices.push(ex.extractedOffice);
          }
        }
      }
    }
  } catch (e) {
    // ignore mapping errors
  }

  // Persist collected page data for inspection/debugging
  try {
    writeJson(join(root, "data", "scraper", "collected-pages.json"), collectedPageData);
  } catch (e) {
    // ignore write errors
  }

  // Also add any extracted office candidates directly to the review queue (so they can be accepted manually)
  try {
    for (const p of collectedPageData) {
      if (p.extractedOffice) {
        reviewQueue.push({
          type: "office",
          sourceId: p.sourceId || "auto-discover",
          sourceUrl: p.url || null,
          office: p.extractedOffice,
          reason: "extracted from page HTML",
          confidence: "low",
          confidenceScore: 0,
          queuedAt: nowIso(),
        });
      }
    }
  } catch (e) {
    // ignore
  }

  return { latitude: undefined, longitude: undefined, certainty: "none" };
}

/**
 * @param {string} url
 */
async function fetchPage(url) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { headers: REQUEST_HEADERS });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      const titleMatch = text.match(/<title>([^<]{1,200})<\/title>/i);
      return {
        url,
        fetched: true,
        status: response.status,
        title: safeText(titleMatch?.[1] ?? "") || undefined,
        body: text,
        fetchedAt: nowIso(),
      };
    } catch (error) {
      if (attempt === maxAttempts) {
        return {
          url,
          fetched: false,
          error: String(error),
          fetchedAt: nowIso(),
        };
      }
      await sleep(300 * attempt);
    }
  }

  return {
    url,
    fetched: false,
    error: "fetch failed",
    fetchedAt: nowIso(),
  };
}

/**
 * @param {unknown} value
 */
function hasAllRequired(value, keys) {
  if (!value || typeof value !== "object") return false;
  return keys.every((key) => {
    const v = value[key];
    return v !== undefined && v !== null && String(v).trim() !== "";
  });
}

/**
 * @param {{website:string,name:string}} candidate
 * @param {Array<{id:string,name:string,website:string}>} existingCompanies
 */
function findCompanyDuplicate(candidate, existingCompanies) {
  const candidateDomain = getDomain(candidate.website);
  for (const existing of existingCompanies) {
    const existingDomain = getDomain(existing.website);
    if (candidateDomain && existingDomain && candidateDomain === existingDomain) {
      return existing;
    }
    if (nameSimilarity(candidate.name, existing.name) >= 0.8) {
      return existing;
    }
  }
  return undefined;
}

/**
 * @param {{companyId:string,address:string,city:string,countryCode:string}} office
 */
function officeDedupKey(office) {
  return [
    office.companyId,
    slugify(office.address),
    slugify(office.city),
    office.countryCode,
  ].join("|");
}

/**
 * @param {Array<{id:string}>} existingOffices
 * @param {string} companyId
 * @param {string} countryCode
 * @param {string} city
 */
function makeOfficeId(existingOffices, companyId, countryCode, city) {
  const citySlug = slugify(city).slice(0, 12) || "city";
  const cc = countryCode.toLowerCase();
  let id = `${companyId}-${cc}-${citySlug}`;
  let i = 2;
  const existingIds = new Set(existingOffices.map((o) => o.id));
  while (existingIds.has(id)) {
    id = `${companyId}-${cc}-${citySlug}-${i}`;
    i += 1;
  }
  return id;
}

function scoreConfidence({ officialSourceMatch, pageFetchSuccess, completenessScore, geocodeCertainty }) {
  let score = 0;
  score += Math.round(completenessScore * 50);
  score += officialSourceMatch ? 25 : 0;
  score += pageFetchSuccess ? 10 : 0;
  score += geocodeCertainty === "high" ? 15 : geocodeCertainty === "medium" ? 10 : geocodeCertainty === "low" ? 5 : 0;

  if (score >= 80) return { score, level: "high" };
  if (score >= 60) return { score, level: "medium" };
  return { score, level: "low" };
}

function levelPasses(level) {
  return CONFIDENCE_RANK[level] >= CONFIDENCE_RANK[MIN_CONFIDENCE_FOR_PUBLISH];
}

/**
 * @param {string} robotsText
 * @param {string} userAgent
 */
function extractDisallowRules(robotsText, userAgent) {
  const lines = robotsText
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim());
  const rulesByAgent = new Map();
  let activeAgents = [];

  for (const line of lines) {
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!value) continue;

    if (key === "user-agent") {
      const agent = value.toLowerCase();
      activeAgents = [agent];
      if (!rulesByAgent.has(agent)) rulesByAgent.set(agent, []);
      continue;
    }

    if (key === "disallow") {
      for (const agent of activeAgents) {
        if (!rulesByAgent.has(agent)) rulesByAgent.set(agent, []);
        rulesByAgent.get(agent).push(value);
      }
    }
  }

  const agentKey = userAgent.toLowerCase();
  return rulesByAgent.get(agentKey) ?? rulesByAgent.get("*") ?? [];
}

/**
 * @param {string[]} disallowRules
 * @param {string} path
 */
function isPathDisallowed(disallowRules, path) {
  for (const rule of disallowRules) {
    const normalizedRule = rule.trim();
    if (!normalizedRule) continue;
    if (normalizedRule === "/") return true;
    if (path.startsWith(normalizedRule)) return true;
  }
  return false;
}

/**
 * @param {string} url
 */
async function isUrlAllowedByRobots(url) {
  if (!ENABLE_ROBOTS_CHECK) {
    return { allowed: true, checked: false, reason: "robots check disabled" };
  }

  try {
    const parsed = new URL(url);
    const origin = `${parsed.protocol}//${parsed.host}`;

    if (!robotsDecisionCache.has(origin)) {
      const robotsUrl = `${origin}/robots.txt`;
      const response = await fetch(robotsUrl, { headers: REQUEST_HEADERS });
      if (!response.ok) {
        robotsDecisionCache.set(origin, { disallowRules: [], fetched: false, reason: `robots HTTP ${response.status}` });
      } else {
        const robotsText = await response.text();
        robotsDecisionCache.set(origin, {
          disallowRules: extractDisallowRules(robotsText, "globalofficefinderbot"),
          fetched: true,
          reason: "ok",
        });
      }
    }

    const cached = robotsDecisionCache.get(origin);
    const path = parsed.pathname || "/";
    const blocked = isPathDisallowed(cached.disallowRules, path);
    return {
      allowed: !blocked,
      checked: true,
      reason: blocked ? "blocked by robots.txt disallow rule" : cached.reason,
    };
  } catch (error) {
    return { allowed: false, checked: true, reason: `robots check failed: ${String(error)}` };
  }
}

/**
 * Try to extract office/address information from an HTML page body.
 * Returns an array of partial office objects: {country, countryCode, city, address, postalCode, contactUrl, sourceUrl}
 */
function extractOfficesFromHtml(body, pageUrl) {
  const results = [];
  if (!body || typeof body !== "string") return results;

  // 1) Try to parse JSON-LD blocks for PostalAddress or LocalBusiness
  try {
    const jsonLdMatches = [...body.matchAll(/<script[^>]*type=(?:"|')application\/ld\+json(?:"|')[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of jsonLdMatches) {
      try {
        const payload = JSON.parse(m[1]);
        const items = Array.isArray(payload) ? payload : [payload];
        for (const item of items) {
          // PostalAddress inside
          const address = item.address || (item['@graph'] && item['@graph'].find((g) => g.address)?.address);
          if (address && (address.streetAddress || address.addressLocality || address.postalCode)) {
            results.push({
              country: address.addressCountry || "",
              countryCode: typeof address.addressCountry === 'string' && address.addressCountry.length === 2 ? address.addressCountry : undefined,
              city: address.addressLocality || "",
              address: address.streetAddress || "",
              postalCode: address.postalCode || "",
              contactUrl: pageUrl,
              sourceUrl: pageUrl,
            });
          }
        }
      } catch {
        // ignore JSON parse errors
      }
    }
  } catch (e) {
    // noop
  }

  // 2) Look for <address> tags
  try {
    const addrMatches = [...body.matchAll(/<address[^>]*>([\s\S]*?)<\/address>/gi)];
    for (const m of addrMatches) {
      let inner = m[1].replace(/<[^>]+>/g, "\n").replace(/\s+/g, " ").trim();
      const parts = inner.split(/\n|,|\r/).map((s) => s.trim()).filter(Boolean);
      if (parts.length === 0) continue;
      const street = parts[0] || "";
      let city = parts[1] || "";
      let postal = "";
      // try to extract postal code from city line
      const pcMatch = city.match(/(\d{3,}\b.*)/);
      if (pcMatch) {
        postal = pcMatch[1];
        city = city.replace(pcMatch[1], "").trim();
      }
      results.push({ country: "", countryCode: undefined, city, address: street, postalCode: postal, contactUrl: pageUrl, sourceUrl: pageUrl });
    }
  } catch (e) {
    // noop
  }

  // 3) Look for lists (<ul>/<ol>) where each <li> may be an address or contain comma-separated address parts
  try {
    const listMatches = [...body.matchAll(/<(?:ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/gi)];
    for (const lm of listMatches) {
      const liMatches = [...lm[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
      for (const li of liMatches) {
        const text = li[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        // heuristics: comma-separated pieces > 1
        const parts = text.split(/,|;|\n/).map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2 && /\d/.test(parts[0] + parts.join(' '))) {
          // choose first as street, last as city/postal/country if present
          const street = parts[0];
          const tail = parts.slice(1).join(', ');
          // try to split city and postal from tail
          const pcMatch = tail.match(/(\b\d{3,}\b.*$)/);
          const postal = pcMatch ? pcMatch[1] : "";
          const city = pcMatch ? tail.replace(pcMatch[1], "").replace(/,$/, '').trim() : (parts[1] || '');
          results.push({ country: "", countryCode: undefined, city, address: street, postalCode: postal, contactUrl: pageUrl, sourceUrl: pageUrl });
        }
      }
    }
  } catch (e) {
    // noop
  }

  // 4) Look for table rows that look like addresses (td count >=2 and contains digits/words)
  try {
    const tableRowMatches = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (const tr of tableRowMatches) {
      const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
      if (tds.length >= 2) {
        const joined = tds.join(', ');
        if (/\d/.test(joined) && /[A-Za-z]/.test(joined)) {
          // attempt to extract street, city
          const parts = joined.split(/,|;|\n/).map((s) => s.trim()).filter(Boolean);
          if (parts.length >= 2) {
            const street = parts[0];
            const city = parts.slice(1, 2).join(' ');
            const postalMatch = joined.match(/(\b\d{3,}\b)/);
            const postal = postalMatch ? postalMatch[1] : '';
            results.push({ country: '', countryCode: undefined, city, address: street, postalCode: postal, contactUrl: pageUrl, sourceUrl: pageUrl });
          }
        }
      }
    }
  } catch (e) {
    // noop
  }

  // 5) Look for location blocks: elements with class names containing 'location' or 'office'
  try {
    const locBlockMatches = [...body.matchAll(/<([a-z0-9]+)[^>]*class=(?:"|')([^"']*)(?:"|')[^>]*>([\s\S]*?)<\/\1>/gi)];
    for (const m of locBlockMatches) {
      const cls = (m[2] || '').toLowerCase();
      if (!/location|office|headquarter|address|branch/.test(cls)) continue;
      const inner = (m[3] || '').replace(/<[^>]+>/g, '\n').replace(/\s+/g, ' ').trim();
      const lines = inner.split(/\n|,|\r/).map((s) => s.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      // Find a line with digits (street) and a line with city/postal
      let street = '';
      let city = '';
      let postal = '';
      for (const line of lines) {
        if (!street && /\d/.test(line)) street = line;
        else if (!city && /[A-Za-z]/.test(line)) city = line;
      }
      if (street) {
        const pc = city.match(/(\b\d{3,}\b.*)/);
        if (pc) { postal = pc[1]; city = city.replace(pc[1], '').trim(); }
        results.push({ country: '', countryCode: undefined, city: city || '', address: street, postalCode: postal || '', contactUrl: pageUrl, sourceUrl: pageUrl });
      }
    }
  } catch (e) {
    // noop
  }
  return results;
}

/**
 * Extract candidate links from a page HTML body that likely point to location/contact pages.
 * Returns absolute URLs.
 */
function extractCandidateLinksFromHtml(body, baseUrl) {
  const links = new Set();
  if (!body || typeof body !== 'string') return [];
  try {
    const anchorMatches = [...body.matchAll(/<a[^>]+href=(?:"|')([^"']+)(?:"|')[^>]*>/gi)];
    const keywords = ['location', 'office', 'locations', 'offices', 'contact', 'find-us', 'where-we-are', 'our-locations'];
    for (const m of anchorMatches) {
      const href = m[1];
      if (!href) continue;
      const lower = href.toLowerCase();
      if (!keywords.some((k) => lower.includes(k))) continue;
      try {
        const abs = new URL(href, baseUrl).href;
        links.add(abs);
      } catch {
        // ignore
      }
    }
  } catch (e) {
    // noop
  }
  return Array.from(links);
}

/**
 * @param {any} source
 */
function sourcePassesHardFilters(source) {
  const sourceUrl = sanitizeUrl(source?.sourceUrl);
  if (!sourceUrl || !sourceUrl.startsWith("https://")) {
    return { ok: false, reason: "invalid or non-https source URL" };
  }

  const trust = String(source?.trust ?? "").toLowerCase();
  if (!(trust in SOURCE_TRUST_RANK)) {
    return { ok: false, reason: "missing/invalid source trust rating" };
  }

  if (SOURCE_TRUST_RANK[trust] < SOURCE_TRUST_RANK[MIN_SOURCE_TRUST]) {
    return { ok: false, reason: `source trust ${trust} below minimum ${MIN_SOURCE_TRUST}` };
  }

  if (!Array.isArray(source?.companies) || source.companies.length === 0) {
    return { ok: false, reason: "source has no company candidates" };
  }

  return { ok: true, reason: "ok" };
}

function runValidationCommand() {
  const result = spawnSync("npm", ["run", "validate-data"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

async function main() {
  const startedAt = nowIso();
  const companiesOriginalContent = backupFile(COMPANIES_PATH);
  const officesOriginalContent = backupFile(OFFICES_PATH);

  const existingCompanies = readJson(COMPANIES_PATH);
  const existingOffices = readJson(OFFICES_PATH);
  const sources = readJson(SOURCES_PATH);

  const regionMap = buildRegionMap(existingOffices);
  const countryCodeMap = buildCountryCodeMap(existingOffices);
  const reviewQueue = [];
  const skippedSources = [];
  const sourceFailures = new Map();

  // Stage 1: discover companies from curated sources
  const discovered = [];
  for (const source of sources) {
    const sourceCheck = sourcePassesHardFilters(source);
    if (!sourceCheck.ok) {
      skippedSources.push({
        sourceId: source.id ?? "unknown",
        sourceUrl: source.sourceUrl ?? null,
        reason: sourceCheck.reason,
      });
      continue;
    }

    for (const company of source.companies) {
      discovered.push({ source, company });
    }
  }

  // Optional: auto-discover candidate pages for existing companies in companies.json
  if (AUTO_DISCOVER) {
    // auto-discover should be considered high-trust for the purposes of probing existing company websites
    const autoSource = { id: "auto-discover", name: "Auto Discover", sourceUrl: "https://auto-discover.local", trust: "high" };
    for (const existingCompany of existingCompanies) {
      discovered.push({ source: autoSource, company: { name: existingCompany.name, website: existingCompany.website, industry: existingCompany.industry, description: existingCompany.description, logo: existingCompany.logo, officePages: [] } });
    }
  }

  // Stage 2: collect office pages
  const collectedPageData = [];
  for (const entry of discovered) {
    const sourceId = String(entry.source.id ?? "unknown");
    const currentFailures = sourceFailures.get(sourceId) ?? 0;
    if (currentFailures >= PER_SOURCE_FAILURE_THRESHOLD) {
      collectedPageData.push({
        sourceId,
        fetched: false,
        skipped: true,
        reason: `circuit breaker open after ${currentFailures} failure(s)`,
        fetchedAt: nowIso(),
      });
      continue;
    }

    const urls = [
      sanitizeUrl(entry.company.website),
      ...(Array.isArray(entry.company.officePages) ? entry.company.officePages.map((u) => sanitizeUrl(u)).filter(Boolean) : []),
    ].filter(Boolean);

    for (const url of new Set(urls)) {
      // Build candidate list: include common locations/contact paths for auto-discovered entries
      const candidateUrls = [url];
      try {
        if (String(entry.source?.id ?? "") === "auto-discover") {
          const base = new URL(url);
          const candidatePaths = ["/locations", "/locations/", "/about/locations", "/about/locations/", "/contact", "/contact/", "/about", "/about/", "/locations.html", "/office-locations", "/our-locations"];
          for (const p of candidatePaths) {
            try {
              candidateUrls.push(new URL(p, base).href);
            } catch {
              // ignore bad URL concat
            }
          }
        }
      } catch {
        // noop
      }

      for (const candidateUrl of new Set(candidateUrls)) {
        if (!FETCH_OFFICE_PAGES) {
          collectedPageData.push({ url: candidateUrl, fetched: false, skipped: true, fetchedAt: nowIso() });
          continue;
        }
        const robotsCheck = await isUrlAllowedByRobots(candidateUrl);
        if (!robotsCheck.allowed) {
          collectedPageData.push({
            url: candidateUrl,
            sourceId,
            fetched: false,
            skipped: true,
            reason: robotsCheck.reason,
            fetchedAt: nowIso(),
          });
          sourceFailures.set(sourceId, (sourceFailures.get(sourceId) ?? 0) + 1);
          continue;
        }

        const pageResult = await fetchPage(candidateUrl);
        collectedPageData.push({ ...pageResult, sourceId, robots: robotsCheck });
        // Try to extract offices from HTML body for possible auto-discovery
        try {
          const extracted = extractOfficesFromHtml(pageResult.body, candidateUrl);
          for (const ex of extracted) {
            collectedPageData.push({ url: candidateUrl + "#extracted", fetched: true, status: 200, title: pageResult.title, body: undefined, sourceId, extractedOffice: ex, robots: robotsCheck, fetchedAt: nowIso() });
          }
        } catch (e) {
          // ignore
        }
        // Also follow any candidate links found within the page (keeps probing to find addresses)
        try {
          const extraLinks = extractCandidateLinksFromHtml(pageResult.body, candidateUrl);
          for (const l of extraLinks) {
            // respect robots and circuit breaker
            const rc = await isUrlAllowedByRobots(l);
            if (!rc.allowed) continue;
            const pl = await fetchPage(l);
            collectedPageData.push({ ...pl, sourceId, robots: rc });
            try {
              const extracted2 = extractOfficesFromHtml(pl.body, l);
              for (const ex of extracted2) {
                collectedPageData.push({ url: l + "#extracted", fetched: true, status: 200, title: pl.title, body: undefined, sourceId, extractedOffice: ex, robots: rc, fetchedAt: nowIso() });
              }
            } catch {
              // ignore
            }
            await sleep(150);
          }
        } catch (e) {
          // ignore
        }
        if (!pageResult.fetched) {
          sourceFailures.set(sourceId, (sourceFailures.get(sourceId) ?? 0) + 1);
        }
        await sleep(200);
      }
    }
  }

  // Stage 3+4+5: extract, normalize, geocode, dedupe, quality controls
  const acceptedCompanies = [];
  const acceptedOffices = [];
  const companyIdRemap = new Map();

  const mergedCompanies = [...existingCompanies];
  const mergedOffices = [...existingOffices];
  const officeKeys = new Set(existingOffices.map((office) => officeDedupKey(office)));

  for (const { source, company } of discovered) {
    const normalizedCompany = {
      id: slugify(company.id || company.name),
      name: safeText(company.name),
      website: sanitizeUrl(company.website) || "",
      industry: safeText(company.industry),
      description: safeText(company.description),
      logo: sanitizeUrl(company.logo) || "",
    };

    if (!hasAllRequired(normalizedCompany, REQUIRED_COMPANY_FIELDS)) {
      reviewQueue.push({
        type: "company",
        sourceId: source.id,
        sourceUrl: source.sourceUrl,
        company: normalizedCompany,
        reason: "missing required company fields",
        confidence: "low",
        queuedAt: nowIso(),
      });
      continue;
    }

    const duplicate = findCompanyDuplicate(normalizedCompany, mergedCompanies);
    if (duplicate) {
      companyIdRemap.set(normalizedCompany.id, duplicate.id);
      normalizedCompany.id = duplicate.id;
    } else {
      mergedCompanies.push(normalizedCompany);
      acceptedCompanies.push({
        ...normalizedCompany,
        source: {
          sourceId: source.id,
          sourceUrl: source.sourceUrl,
          discoveredAt: nowIso(),
          confidence: "high",
        },
      });
    }

    const rawOffices = Array.isArray(company.offices) ? company.offices : [];
    for (const rawOffice of rawOffices) {
      const country = safeText(rawOffice.country);
      const countryCode = normalizeCountryCode(country, rawOffice.countryCode, countryCodeMap);
      const region = rawOffice.region && safeText(rawOffice.region)
        ? safeText(rawOffice.region)
        : normalizeRegion(countryCode, regionMap);

      const normalizedOffice = {
        id: "",
        companyId: companyIdRemap.get(normalizedCompany.id) || normalizedCompany.id,
        country,
        countryCode,
        region,
        city: safeText(rawOffice.city),
        address: safeText(rawOffice.address),
        postalCode: safeText(rawOffice.postalCode),
        officeType: safeText(rawOffice.officeType),
        latitude:
          typeof rawOffice.latitude === "number" ? rawOffice.latitude : undefined,
        longitude:
          typeof rawOffice.longitude === "number" ? rawOffice.longitude : undefined,
        contactUrl: sanitizeUrl(rawOffice.contactUrl),
      };

      const completenessScore =
        REQUIRED_OFFICE_FIELDS.filter((k) => normalizedOffice[k] !== undefined && normalizedOffice[k] !== null && String(normalizedOffice[k]).trim() !== "").length /
        REQUIRED_OFFICE_FIELDS.length;

      const sourceUrls = [
        source.sourceUrl,
        sanitizeUrl(rawOffice.sourceUrl),
        ...(Array.isArray(company.officePages) ? company.officePages.map((u) => sanitizeUrl(u)).filter(Boolean) : []),
      ].filter(Boolean);

      const officialSourceMatch = isOfficialSourceMatch(normalizedCompany.website, sourceUrls);
      const pageFetchSuccess = collectedPageData.some((p) => p.fetched && sourceUrls.includes(p.url));

      let geocodeCertainty = "none";
      if (
        normalizedOffice.latitude === undefined ||
        normalizedOffice.longitude === undefined
      ) {
        const geocode = await geocodeOffice(normalizedOffice);
        if (geocode.error) {
          const sourceId = String(source.id ?? "unknown");
          sourceFailures.set(sourceId, (sourceFailures.get(sourceId) ?? 0) + 1);
        }
        if (typeof geocode.latitude === "number" && typeof geocode.longitude === "number") {
          normalizedOffice.latitude = geocode.latitude;
          normalizedOffice.longitude = geocode.longitude;
        }
        geocodeCertainty = geocode.certainty;
      } else {
        geocodeCertainty = "high";
      }

      const confidence = scoreConfidence({
        officialSourceMatch,
        pageFetchSuccess,
        completenessScore,
        geocodeCertainty,
      });

      const missingCoords =
        normalizedOffice.latitude === undefined ||
        normalizedOffice.longitude === undefined;

      if (!hasAllRequired(normalizedOffice, REQUIRED_OFFICE_FIELDS) || missingCoords) {
        reviewQueue.push({
          type: "office",
          sourceId: source.id,
          sourceUrl: source.sourceUrl,
          office: normalizedOffice,
          reason: missingCoords
            ? "missing latitude/longitude after geocoding"
            : "missing required office fields",
          confidence: "low",
          confidenceScore: confidence.score,
          queuedAt: nowIso(),
        });
        continue;
      }

      if (!levelPasses(confidence.level)) {
        reviewQueue.push({
          type: "office",
          sourceId: source.id,
          sourceUrl: source.sourceUrl,
          office: normalizedOffice,
          reason: `confidence below threshold (${confidence.level})`,
          confidence: confidence.level,
          confidenceScore: confidence.score,
          queuedAt: nowIso(),
        });
        continue;
      }

      const dedupeKey = officeDedupKey(normalizedOffice);
      if (officeKeys.has(dedupeKey)) {
        continue;
      }

      normalizedOffice.id = makeOfficeId(mergedOffices, normalizedOffice.companyId, normalizedOffice.countryCode, normalizedOffice.city);
      officeKeys.add(dedupeKey);
      mergedOffices.push(normalizedOffice);
      acceptedOffices.push({
        ...normalizedOffice,
        source: {
          sourceId: source.id,
          sourceUrl: source.sourceUrl,
          scrapedAt: nowIso(),
          confidence: confidence.level,
          confidenceScore: confidence.score,
          officialSourceMatch,
          geocodeCertainty,
        },
      });
    }
  }

  mergedCompanies.sort((a, b) => a.name.localeCompare(b.name));
  mergedOffices.sort((a, b) => a.id.localeCompare(b.id));

  const runReport = {
    startedAt,
    finishedAt: nowIso(),
    dryRun: DRY_RUN,
    confidenceThreshold: MIN_CONFIDENCE_FOR_PUBLISH,
    stages: {
      discoveredCompanies: discovered.length,
      collectedPages: collectedPageData.length,
      acceptedCompanies: acceptedCompanies.length,
      acceptedOffices: acceptedOffices.length,
      reviewQueueItems: reviewQueue.length,
      skippedSources: skippedSources.length,
    },
    safeguards: {
      minSourceTrust: MIN_SOURCE_TRUST,
      robotsCheckEnabled: ENABLE_ROBOTS_CHECK,
      perSourceFailureThreshold: PER_SOURCE_FAILURE_THRESHOLD,
      sourceFailures: Object.fromEntries(sourceFailures.entries()),
      skippedSources,
    },
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      sourceUrl: source.sourceUrl,
      companyCandidates: Array.isArray(source.companies) ? source.companies.length : 0,
      trust: source.trust,
    })),
    acceptedCompanies,
    acceptedOffices,
  };

  writeJson(REVIEW_QUEUE_PATH, {
    generatedAt: nowIso(),
    minPublishConfidence: MIN_CONFIDENCE_FOR_PUBLISH,
    items: reviewQueue,
  });

  // Persist collected page data so the CLI and humans can inspect what was fetched and what was extracted
  try {
    writeJson(join(root, "data", "scraper", "collected-pages.json"), collectedPageData);
  } catch (e) {
    // ignore write errors
  }

  if (!DRY_RUN) {
    writeJson(COMPANIES_PATH, mergedCompanies);
    writeJson(OFFICES_PATH, mergedOffices);

    const valid = runValidationCommand();
    if (!valid) {
      restoreFile(COMPANIES_PATH, companiesOriginalContent);
      restoreFile(OFFICES_PATH, officesOriginalContent);
      throw new Error("validate-data failed after scraper merge; restored original data files");
    }
  }

  writeJson(RUN_REPORT_PATH, runReport);

  console.log(`[scraper] discovered=${discovered.length} acceptedCompanies=${acceptedCompanies.length} acceptedOffices=${acceptedOffices.length} reviewQueue=${reviewQueue.length} dryRun=${DRY_RUN}`);
}

main().catch((error) => {
  console.error("[scraper] failed", error);
  process.exit(1);
});
