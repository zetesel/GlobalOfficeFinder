#!/usr/bin/env node
// @ts-check
/**
 * discover-top-companies.mjs
 *
 * Dynamically discovers the top N companies from Wikipedia's Fortune Global 500
 * category, enriches each company with description, official website, industry,
 * and headquarters coordinates via the Wikipedia REST API and Wikidata API, then
 * writes a source file in the format expected by run-scraper.mjs.
 *
 * Usage:
 *   node scripts/discover-top-companies.mjs
 *
 * Environment variables:
 *   DISCOVER_LIMIT          How many companies to discover (default: 100)
 *   DISCOVER_OUTPUT         Output path (default: data/scraper/sources/auto-top-100.json)
 *   WIKIPEDIA_BASE_URL      Override Wikipedia API base (default: https://en.wikipedia.org)
 *   WIKIDATA_BASE_URL       Override Wikidata API base (default: https://www.wikidata.org)
 *   DUCKDUCKGO_BASE_URL     Override DuckDuckGo Instant Answers base (default: https://api.duckduckgo.com)
 *   DISCOVER_REQUEST_DELAY  ms between API requests (default: 350)
 *   DISCOVER_DRY_RUN        If "1", print discovery results without writing the file
 *   DISCOVER_WEBSITE_SEARCH If "0", disable DuckDuckGo fallback for official website lookup (default: enabled)
 *
 * Output file format is an array of source objects compatible with run-scraper.mjs:
 * [{ id, name, sourceUrl, trust, companies: [{ name, website, industry, description,
 *                                               logo, officePages, offices }] }]
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ─── Configuration ──────────────────────────────────────────────────────────

const DISCOVER_LIMIT = Number(process.env.DISCOVER_LIMIT ?? "100");
const OUTPUT_PATH =
  process.env.DISCOVER_OUTPUT ??
  join(root, "data", "scraper", "sources", "auto-top-100.json");
const WIKIPEDIA_BASE = (process.env.WIKIPEDIA_BASE_URL ?? "https://en.wikipedia.org").replace(/\/$/, "");
const WIKIDATA_BASE = (process.env.WIKIDATA_BASE_URL ?? "https://www.wikidata.org").replace(/\/$/, "");
const DUCKDUCKGO_BASE = (process.env.DUCKDUCKGO_BASE_URL ?? "https://api.duckduckgo.com").replace(/\/$/, "");
const REQUEST_DELAY = Number(process.env.DISCOVER_REQUEST_DELAY ?? "350");
const DRY_RUN = process.env.DISCOVER_DRY_RUN === "1";
const WEBSITE_SEARCH = process.env.DISCOVER_WEBSITE_SEARCH !== "0";

const REQUEST_HEADERS = {
  "User-Agent": "GlobalOfficeFinderBot/1.0 (https://github.com/zetesel/GlobalOfficeFinder; discovery stage)",
  Accept: "application/json",
};

// ─── Wikidata country QID → ISO 3166-1 alpha-2 ──────────────────────────────

/** @type {Record<string,string>} */
const COUNTRY_QID_TO_CODE = {
  Q30: "US",   // United States
  Q145: "GB",  // United Kingdom
  Q183: "DE",  // Germany
  Q142: "FR",  // France
  Q55: "NL",   // Netherlands
  Q35: "DK",   // Denmark
  Q38: "IT",   // Italy
  Q29: "ES",   // Spain
  Q34: "SE",   // Sweden
  Q20: "NO",   // Norway
  Q33: "FI",   // Finland
  Q39: "CH",   // Switzerland
  Q40: "AT",   // Austria
  Q31: "BE",   // Belgium
  Q32: "LU",   // Luxembourg
  Q45: "PT",   // Portugal
  Q36: "PL",   // Poland
  Q218: "RO",  // Romania
  Q17: "JP",   // Japan
  Q148: "CN",  // China
  Q668: "IN",  // India
  Q884: "KR",  // South Korea
  Q408: "AU",  // Australia
  Q664: "NZ",  // New Zealand
  Q16: "CA",   // Canada
  Q96: "MX",   // Mexico
  Q155: "BR",  // Brazil
  Q414: "AR",  // Argentina
  Q298: "CL",  // Chile
  Q182: "CO",  // Colombia
  Q419: "PE",  // Peru
  Q83: "IE",   // Ireland
  Q878: "AE",  // United Arab Emirates
  Q805: "SA",  // Saudi Arabia
  Q258: "ZA",  // South Africa
  Q1033: "NG", // Nigeria
  Q79: "EG",   // Egypt
  Q1028: "MA", // Morocco
  Q114: "KE",  // Kenya
  Q869: "TH",  // Thailand
  Q912: "MY",  // Malaysia
  Q574: "SG",  // Singapore
  Q928: "PH",  // Philippines
  Q252: "ID",  // Indonesia
  Q865: "TW",  // Taiwan
  Q794: "IR",  // Iran
  Q817: "KW",  // Kuwait
  Q736: "EC",  // Ecuador
  Q733: "PY",  // Paraguay
  Q750: "BO",  // Bolivia
  Q423: "KP",  // North Korea
  Q1064: "MZ", // Mozambique
  Q986: "LR",  // Liberia
};

/** @type {Record<string,string>} */
const COUNTRY_LABEL_TO_CODE = {
  "United States": "US",
  "United Kingdom": "GB",
  Germany: "DE",
  France: "FR",
  Netherlands: "NL",
  Denmark: "DK",
  Italy: "IT",
  Spain: "ES",
  Sweden: "SE",
  Norway: "NO",
  Finland: "FI",
  Switzerland: "CH",
  Austria: "AT",
  Belgium: "BE",
  Luxembourg: "LU",
  Portugal: "PT",
  Poland: "PL",
  Japan: "JP",
  China: "CN",
  India: "IN",
  "South Korea": "KR",
  Australia: "AU",
  "New Zealand": "NZ",
  Canada: "CA",
  Mexico: "MX",
  Brazil: "BR",
  Argentina: "AR",
  Chile: "CL",
  Colombia: "CO",
  Peru: "PE",
  Ireland: "IE",
  "United Arab Emirates": "AE",
  "Saudi Arabia": "SA",
  "South Africa": "ZA",
  Nigeria: "NG",
  Egypt: "EG",
  Morocco: "MA",
  Kenya: "KE",
  Thailand: "TH",
  Malaysia: "MY",
  Singapore: "SG",
  Philippines: "PH",
  Indonesia: "ID",
  Taiwan: "TW",
  Iran: "IR",
  Russia: "RU",
  "Hong Kong": "HK",
  Israel: "IL",
  Turkey: "TR",
};

/** @type {Record<string,string>} */
const REGION_BY_CODE = {
  US: "Americas", CA: "Americas", MX: "Americas", BR: "Americas",
  AR: "Americas", CL: "Americas", CO: "Americas", PE: "Americas",
  GB: "Europe", IE: "Europe", DE: "Europe", FR: "Europe", NL: "Europe",
  SE: "Europe", NO: "Europe", FI: "Europe", CH: "Europe", ES: "Europe",
  IT: "Europe", PT: "Europe", PL: "Europe", AT: "Europe", DK: "Europe",
  BE: "Europe", LU: "Europe", RO: "Europe", RU: "Europe",
  JP: "Asia-Pacific", SG: "Asia-Pacific", AU: "Asia-Pacific", IN: "Asia-Pacific",
  KR: "Asia-Pacific", CN: "Asia-Pacific", HK: "Asia-Pacific", NZ: "Asia-Pacific",
  TW: "Asia-Pacific", TH: "Asia-Pacific", MY: "Asia-Pacific", PH: "Asia-Pacific",
  ID: "Asia-Pacific",
  AE: "Middle East & Africa", SA: "Middle East & Africa", ZA: "Middle East & Africa",
  NG: "Middle East & Africa", EG: "Middle East & Africa", MA: "Middle East & Africa",
  KE: "Middle East & Africa", IL: "Middle East & Africa", TR: "Middle East & Africa",
  IR: "Middle East & Africa",
};

// Wikidata industry QID → readable label
/** @type {Record<string,string>} */
const INDUSTRY_QID_MAP = {
  Q8148: "Technology / Software",
  Q25287: "Technology / Software",
  Q4830453: "Technology",
  Q1787082: "Semiconductors",
  Q11650: "Semiconductors",
  Q178061: "Financial Technology",
  Q837: "Banking / Finance",
  Q22687: "Banking / Finance",
  Q191993: "Insurance",
  Q41568: "Asset Management",
  Q650361: "Retail",
  Q13187: "Retail",
  Q9297: "Automotive",
  Q80151: "Automotive",
  Q188860: "Energy / Oil & Gas",
  Q5300831: "Energy / Oil & Gas",
  Q217690: "Pharmaceuticals",
  Q507443: "Healthcare",
  Q20202272: "Healthcare / Medical Devices",
  Q41726: "Food & Beverage",
  Q17088: "Consumer Goods",
  Q1667921: "Consulting",
  Q386724: "Media / Entertainment",
  Q160645: "Telecommunications",
  Q1069264: "E-Commerce",
  Q168983: "Logistics / Shipping",
  Q15831596: "Aerospace / Defense",
  Q57627: "Manufacturing",
  Q14356: "Mining",
  Q11024: "Agriculture",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** @param {string} value */
function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Clamp a description to a safe length and strip any embedded HTML-like content.
 * @param {string} text
 */
function sanitizeDescription(text) {
  if (!text) return "";
  // Remove HTML tags
  const stripped = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.slice(0, 1500);
}

/** @param {string} website */
function guessOfficePages(website) {
  try {
    const url = new URL(website);
    const base = `${url.protocol}//${url.host}`;
    return [
      `${base}/contact`,
      `${base}/about/contact`,
      `${base}/company/contact`,
      `${base}/locations`,
    ];
  } catch {
    return [];
  }
}

/**
 * Fetch with retry and exponential back-off.
 * @param {string} url
 * @param {Record<string,string>} headers
 * @param {number} [maxAttempts]
 * @returns {Promise<any>}
 */
async function fetchJSON(url, headers, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await sleep(600 * attempt);
    }
  }
}

// ─── Wikipedia API ────────────────────────────────────────────────────────────

/**
 * Returns Wikipedia page titles from a category, up to `limit`.
 * Tries Fortune_Global_500_companies first, falls back to Fortune_500_companies.
 * @param {number} limit
 * @returns {Promise<string[]>}
 */
async function fetchCategoryMembers(limit) {
  const categories = [
    "Category:Fortune_Global_500_companies",
    "Category:Fortune_500_companies",
  ];

  for (const category of categories) {
    try {
      const url = new URL(`${WIKIPEDIA_BASE}/w/api.php`);
      url.searchParams.set("action", "query");
      url.searchParams.set("list", "categorymembers");
      url.searchParams.set("cmtitle", category);
      url.searchParams.set("cmlimit", String(Math.min(limit, 500)));
      url.searchParams.set("cmtype", "page");
      url.searchParams.set("cmsort", "sortkey");
      url.searchParams.set("cmdir", "asc");
      url.searchParams.set("format", "json");

      const data = await fetchJSON(url.toString(), REQUEST_HEADERS);
      const members = data?.query?.categorymembers ?? [];
      if (members.length > 0) {
        console.log(`[discover] Using category: ${category} (${members.length} members)`);
        return members.slice(0, limit).map((/** @type {{title:string}} */ m) => m.title);
      }
    } catch (err) {
      console.warn(`[discover] Could not fetch category ${category}: ${err.message}`);
    }
  }

  console.error("[discover] Could not fetch any company list from Wikipedia");
  return [];
}

/**
 * Fetches the live Fortune Global 500 Wikipedia article wikitext and extracts
 * an ordered list of company Wikipedia page titles by parsing [[wikilinks]] from
 * table rows.  Cross-references against `knownTitles` (a Set from the category
 * API) to filter out non-company links such as country or industry names.
 *
 * Falls back gracefully: if parsing yields fewer than 10 titles we return null
 * so the caller can use the category-based list instead.
 *
 * @param {number} limit
 * @param {Set<string>} knownTitles   Set of titles from the category API (used as filter)
 * @returns {Promise<string[]|null>}
 */
async function fetchFortuneArticleList(limit, knownTitles) {
  const articlePage = "Fortune_Global_500";
  try {
    const url = new URL(`${WIKIPEDIA_BASE}/w/api.php`);
    url.searchParams.set("action", "parse");
    url.searchParams.set("page", articlePage);
    url.searchParams.set("prop", "wikitext");
    url.searchParams.set("format", "json");

    console.log(`[discover] Fetching ranked list from Wikipedia article: ${articlePage}`);
    const data = await fetchJSON(url.toString(), REQUEST_HEADERS);
    const wikitext = data?.parse?.wikitext?.["*"] ?? "";
    if (!wikitext) return null;

    // Extract wikilinks from table rows (lines starting with | or |- )
    // Match [[Page Title]] or [[Page Title|Display text]]
    const wikilinkRe = /\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/g;
    /** @type {Map<string, true>} preserves first-seen order */
    const seen = new Map();
    const lines = wikitext.split("\n");

    for (const line of lines) {
      // Only consider lines that are part of a table (start with | or ! )
      if (!line.trimStart().startsWith("|") && !line.trimStart().startsWith("!")) continue;
      let match;
      while ((match = wikilinkRe.exec(line)) !== null) {
        const title = match[1].trim();
        // Filter: must be in the known category set (skips country/industry links)
        if (knownTitles.has(title) && !seen.has(title)) {
          seen.set(title, true);
        }
      }
    }

    // If cross-referencing with known titles left nothing (e.g. different capitalization),
    // fall back to extracting all wikilinks from table rows that look like company names.
    if (seen.size < 10) {
      // Re-scan without the knownTitles filter, but apply heuristics
      wikilinkRe.lastIndex = 0;
      for (const line of lines) {
        if (!line.trimStart().startsWith("|") && !line.trimStart().startsWith("!")) continue;
        let match;
        while ((match = wikilinkRe.exec(line)) !== null) {
          const title = match[1].trim();
          // Skip obvious non-company links: short names, template-like, file/image
          if (title.length < 3) continue;
          if (title.startsWith("File:") || title.startsWith("Image:") || title.startsWith("Category:")) continue;
          // Skip if it looks like a country name
          if (Object.keys(COUNTRY_LABEL_TO_CODE).some((c) => title === c)) continue;
          if (!seen.has(title)) seen.set(title, true);
        }
      }
    }

    const titles = [...seen.keys()].slice(0, limit);
    if (titles.length < 5) return null;

    console.log(`[discover] Extracted ${titles.length} ranked company titles from article`);
    return titles;
  } catch (err) {
    console.warn(`[discover] Could not parse Fortune article: ${err.message}`);
    return null;
  }
}

// ─── DuckDuckGo Instant Answers ──────────────────────────────────────────────

/** Domains that should never be treated as an official company website. */
const NON_OFFICIAL_DOMAINS = new Set([
  "wikipedia.org",
  "en.wikipedia.org",
  "wikidata.org",
  "twitter.com",
  "x.com",
  "facebook.com",
  "linkedin.com",
  "instagram.com",
  "youtube.com",
  "reddit.com",
  "bloomberg.com",
  "reuters.com",
  "forbes.com",
  "crunchbase.com",
  "owler.com",
  "dnb.com",
]);

/**
 * Returns true if the URL looks like a plausible official corporate website.
 * @param {string} url
 */
function isOfficialWebsite(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return !NON_OFFICIAL_DOMAINS.has(host) && !host.includes("wikipedia");
  } catch {
    return false;
  }
}

/**
 * Uses the DuckDuckGo Instant Answers API to find the official website for a
 * company.  Checks `Infobox.content` (same data as the Wikipedia infobox, but
 * fetched live) then falls back to the first non-Wikipedia `AbstractURL`.
 *
 * No API key required.  Rate-limited by REQUEST_DELAY.
 *
 * @param {string} companyName
 * @returns {Promise<string|null>}
 */
async function searchWebsiteViaDDG(companyName) {
  if (!WEBSITE_SEARCH) return null;
  await sleep(REQUEST_DELAY);
  try {
    const url = new URL(DUCKDUCKGO_BASE + "/");
    url.searchParams.set("q", companyName);
    url.searchParams.set("format", "json");
    url.searchParams.set("ia", "about");
    url.searchParams.set("no_redirect", "1");
    url.searchParams.set("no_html", "1");
    url.searchParams.set("skip_disambig", "1");

    const data = await fetchJSON(url.toString(), {
      ...REQUEST_HEADERS,
      Accept: "application/json",
    });

    // 1. Check infobox for an explicit "Official website" entry
    const infobox = data?.Infobox?.content ?? [];
    for (const item of infobox) {
      if (
        typeof item.label === "string" &&
        item.label.toLowerCase().includes("official") &&
        typeof item.value === "string" &&
        isOfficialWebsite(item.value)
      ) {
        return item.value.trim();
      }
    }

    // 2. Check the RelatedTopics URLs for a plausible official site
    const topics = data?.RelatedTopics ?? [];
    for (const topic of topics) {
      const firstUrl = topic?.FirstURL ?? "";
      if (firstUrl && isOfficialWebsite(firstUrl)) {
        return firstUrl;
      }
    }

    // 3. Fall back to AbstractURL if it's not Wikipedia
    const abstractUrl = data?.AbstractURL ?? "";
    if (abstractUrl && isOfficialWebsite(abstractUrl)) {
      return abstractUrl;
    }
  } catch (err) {
    console.warn(`[discover]   DuckDuckGo search error for "${companyName}": ${err.message}`);
  }
  return null;
}

/**
 * Fetches a Wikipedia REST API page summary.
 * @param {string} title
 * @returns {Promise<{extract:string, qid:string|null, contentUrl:string|null}|null>}
 */
async function fetchWikipediaSummary(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `${WIKIPEDIA_BASE}/api/rest_v1/page/summary/${encoded}`;
  try {
    const data = await fetchJSON(url, REQUEST_HEADERS);
    return {
      extract: data?.extract ?? "",
      qid: data?.wikibase_item ?? null,
      contentUrl: data?.content_urls?.desktop?.page ?? null,
    };
  } catch (err) {
    console.warn(`[discover]   Wikipedia summary error for "${title}": ${err.message}`);
    return null;
  }
}

// ─── Wikidata API ─────────────────────────────────────────────────────────────

/**
 * Fetches a Wikidata entity's labels and claims.
 * @param {string} qid
 * @returns {Promise<{labels:any, claims:any}|null>}
 */
async function fetchWikidataEntity(qid) {
  const url = new URL(`${WIKIDATA_BASE}/w/api.php`);
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", qid);
  url.searchParams.set("props", "claims|labels");
  url.searchParams.set("languages", "en");
  url.searchParams.set("format", "json");
  try {
    const data = await fetchJSON(url.toString(), REQUEST_HEADERS);
    const entity = data?.entities?.[qid];
    if (!entity || entity.missing !== undefined) return null;
    return { labels: entity.labels ?? {}, claims: entity.claims ?? {} };
  } catch (err) {
    console.warn(`[discover]   Wikidata entity error for ${qid}: ${err.message}`);
    return null;
  }
}

/**
 * Gets the English label of a Wikidata entity.
 * @param {string} qid
 * @returns {Promise<string|null>}
 */
async function fetchEntityLabel(qid) {
  const entity = await fetchWikidataEntity(qid);
  return entity?.labels?.en?.value ?? null;
}

/**
 * Returns the first string value of a claim property on a Wikidata entity.
 * @param {any} claims
 * @param {string} prop
 * @returns {string|null}
 */
function claimStringValue(claims, prop) {
  try {
    const val = claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
    return typeof val === "string" ? val : null;
  } catch {
    return null;
  }
}

/**
 * Returns the first QID value of a claim property.
 * @param {any} claims
 * @param {string} prop
 * @returns {string|null}
 */
function claimQidValue(claims, prop) {
  try {
    const val = claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
    return val?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns the first coordinate value of a P625 claim.
 * @param {any} claims
 * @returns {{lat:number,lon:number}|null}
 */
function claimCoords(claims) {
  try {
    const val = claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    if (val && typeof val.latitude === "number" && typeof val.longitude === "number") {
      return { lat: Number(val.latitude), lon: Number(val.longitude) };
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Resolves a headquarters QID to location info (city name, coords, country).
 * Handles the case where P159 points to a campus/building by falling back to P131.
 * @param {string} hqQid
 * @returns {Promise<{cityName:string, lat:number|null, lon:number|null, countryCode:string|null, countryName:string|null}|null>}
 */
async function resolveHQLocation(hqQid) {
  await sleep(REQUEST_DELAY);
  const hqEntity = await fetchWikidataEntity(hqQid);
  if (!hqEntity) return null;

  const hqLabel = hqEntity.labels?.en?.value ?? "";
  const hqClaims = hqEntity.claims;

  // Try to get coordinates directly from HQ entity (P625)
  let coords = claimCoords(hqClaims);
  let cityName = hqLabel;

  // P131 = located in administrative territorial entity (city/county)
  const adminQid = claimQidValue(hqClaims, "P131");

  // If no coords on the HQ entity itself, fall back to the admin entity
  if (!coords && adminQid) {
    await sleep(REQUEST_DELAY);
    const adminEntity = await fetchWikidataEntity(adminQid);
    if (adminEntity) {
      coords = claimCoords(adminEntity.claims);
      cityName = adminEntity.labels?.en?.value ?? hqLabel;
    }
  } else if (adminQid) {
    // We have coords on the HQ entity (campus), but prefer admin entity label for city name
    await sleep(REQUEST_DELAY);
    const adminLabel = await fetchEntityLabel(adminQid);
    if (adminLabel) cityName = adminLabel;
  }

  // P17 = country
  const countryQid = claimQidValue(hqClaims, "P17");
  let countryCode = countryQid ? (COUNTRY_QID_TO_CODE[countryQid] ?? null) : null;
  let countryName = null;

  if (countryQid) {
    await sleep(REQUEST_DELAY);
    countryName = await fetchEntityLabel(countryQid);
    if (!countryCode && countryName) {
      countryCode = COUNTRY_LABEL_TO_CODE[countryName] ?? null;
    }
  }

  return {
    cityName,
    lat: coords?.lat ?? null,
    lon: coords?.lon ?? null,
    countryCode,
    countryName,
  };
}

// ─── Industry resolution ──────────────────────────────────────────────────────

/**
 * Resolves an industry QID to a human-readable label.
 * @param {string} industryQid
 * @returns {Promise<string>}
 */
async function resolveIndustry(industryQid) {
  // Check our static map first
  if (INDUSTRY_QID_MAP[industryQid]) return INDUSTRY_QID_MAP[industryQid];

  await sleep(REQUEST_DELAY);
  const label = await fetchEntityLabel(industryQid);
  if (!label) return "Business";

  // Normalize common patterns
  const lower = label.toLowerCase();
  if (lower.includes("software") || lower.includes("computing")) return "Technology / Software";
  if (lower.includes("semiconductor")) return "Semiconductors";
  if (lower.includes("automotive") || lower.includes("automobile")) return "Automotive";
  if (lower.includes("petroleum") || lower.includes("oil") || lower.includes("gas")) return "Energy / Oil & Gas";
  if (lower.includes("pharmaceutical") || lower.includes("pharma")) return "Pharmaceuticals";
  if (lower.includes("health") || lower.includes("medical")) return "Healthcare";
  if (lower.includes("bank") || lower.includes("financial service")) return "Banking / Finance";
  if (lower.includes("insurance")) return "Insurance";
  if (lower.includes("asset management") || lower.includes("investment management")) return "Asset Management";
  if (lower.includes("retail") || lower.includes("commerce")) return "Retail";
  if (lower.includes("food") || lower.includes("beverage") || lower.includes("drink")) return "Food & Beverage";
  if (lower.includes("telecom") || lower.includes("communication")) return "Telecommunications";
  if (lower.includes("aerospace") || lower.includes("defense") || lower.includes("defence")) return "Aerospace / Defense";
  if (lower.includes("consult")) return "Consulting";
  if (lower.includes("entertain") || lower.includes("media")) return "Media / Entertainment";
  if (lower.includes("logistic") || lower.includes("shipping") || lower.includes("transport")) return "Logistics / Shipping";
  if (lower.includes("manufactur")) return "Manufacturing";
  if (lower.includes("consumer good")) return "Consumer Goods";
  if (lower.includes("luxury")) return "Luxury Goods";
  if (lower.includes("mining") || lower.includes("mineral")) return "Mining";
  if (lower.includes("construction") || lower.includes("engineering")) return "Engineering / Construction";
  if (lower.includes("electric") || lower.includes("utility") || lower.includes("energy")) return "Energy / Utilities";

  // Capitalize first letter and return
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ─── Main company building ─────────────────────────────────────────────────

/**
 * @typedef {{
 *   name: string,
 *   website: string,
 *   industry: string,
 *   description: string,
 *   logo: string,
 *   officePages: string[],
 *   offices: Array<{
 *     country: string, countryCode: string, city: string, address: string,
 *     officeType: string, latitude?: number, longitude?: number,
 *     contactUrl: string, sourceUrl: string
 *   }>
 * }} CompanyEntry
 */

/**
 * Builds a full company entry from a Wikipedia page title.
 * @param {string} wikiTitle
 * @param {number} index
 * @param {number} total
 * @returns {Promise<CompanyEntry|null>}
 */
async function buildCompanyEntry(wikiTitle, index, total) {
  console.log(`[discover] (${index}/${total}) Processing: ${wikiTitle}`);

  // ── Wikipedia summary ──────────────────────────────────────────
  await sleep(REQUEST_DELAY);
  const wikiInfo = await fetchWikipediaSummary(wikiTitle);
  if (!wikiInfo) {
    console.warn(`[discover]   Skipping "${wikiTitle}" — no Wikipedia summary`);
    return null;
  }

  const name = wikiTitle.replace(/_/g, " ");
  const description = sanitizeDescription(wikiInfo.extract);

  // ── Wikidata entity ────────────────────────────────────────────
  let qid = wikiInfo.qid;

  // Fall back to pageprops API if REST API didn't return wikibase_item
  if (!qid) {
    const propsUrl = new URL(`${WIKIPEDIA_BASE}/w/api.php`);
    propsUrl.searchParams.set("action", "query");
    propsUrl.searchParams.set("titles", wikiTitle);
    propsUrl.searchParams.set("prop", "pageprops");
    propsUrl.searchParams.set("ppprop", "wikibase_item");
    propsUrl.searchParams.set("format", "json");
    await sleep(REQUEST_DELAY);
    try {
      const data = await fetchJSON(propsUrl.toString(), REQUEST_HEADERS);
      const pages = data?.query?.pages ?? {};
      const page = Object.values(pages)[0];
      qid = page?.pageprops?.wikibase_item ?? null;
    } catch {
      // ignore
    }
  }

  let website = null;
  let industry = "Business";
  /** @type {Array<{country:string, countryCode:string, city:string, address:string, officeType:string, latitude?:number, longitude?:number, contactUrl:string, sourceUrl:string}>} */
  const offices = [];

  if (qid) {
    await sleep(REQUEST_DELAY);
    const entity = await fetchWikidataEntity(qid);

    if (entity) {
      // P856 = official website
      website = claimStringValue(entity.claims, "P856");
      // P452 = industry
      const industryQid = claimQidValue(entity.claims, "P452");
      if (industryQid) {
        industry = await resolveIndustry(industryQid);
      }

      // P159 = headquarters location
      const hqQid = claimQidValue(entity.claims, "P159");
      if (hqQid) {
        const location = await resolveHQLocation(hqQid);
        if (location && location.countryCode && REGION_BY_CODE[location.countryCode]) {
          offices.push({
            country: location.countryName ?? location.countryCode,
            countryCode: location.countryCode,
            city: location.cityName,
            // Use city name as a fallback address; will be enriched by geocoding or human review
            address: location.cityName,
            officeType: "Headquarters",
            ...(location.lat !== null && location.lon !== null
              ? { latitude: location.lat, longitude: location.lon }
              : {}),
            contactUrl: website ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, "_"))}`,
            // Set sourceUrl to the company's official website so officialSourceMatch fires
            sourceUrl: website ?? "",
          });
        } else {
          console.warn(`[discover]   Could not resolve HQ location for "${name}" (hq: ${hqQid})`);
        }
      }
    }
  }

  // If Wikidata didn't provide a website, try a live DuckDuckGo Instant Answers search
  if (!website) {
    const ddgSite = await searchWebsiteViaDDG(name);
    if (ddgSite) {
      website = ddgSite;
      console.log(`[discover]   ✦ Found website via DuckDuckGo for "${name}": ${website}`);
    }
  }

  // Last resort: use the Wikipedia content URL so the entry isn't dropped entirely
  if (!website && wikiInfo.contentUrl) {
    website = wikiInfo.contentUrl;
    console.warn(`[discover]   Using Wikipedia page as website fallback for "${name}"`);
  }

  if (!website) {
    console.warn(`[discover]   Skipping "${name}" — no website found`);
    return null;
  }

  const entry = {
    name,
    website,
    industry,
    description,
    logo: "",
    officePages: guessOfficePages(website),
    offices,
  };

  const hqSummary = offices[0]
    ? `${offices[0].city}, ${offices[0].countryCode}`
    : "no HQ";
  console.log(`[discover]   ✓ ${name} | ${website} | ${industry} | HQ: ${hqSummary}`);

  return entry;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`[discover] Starting top-${DISCOVER_LIMIT} company discovery...`);
  console.log(`[discover] Wikipedia: ${WIKIPEDIA_BASE}`);
  console.log(`[discover] Wikidata:  ${WIKIDATA_BASE}`);
  console.log(`[discover] DuckDuckGo website search: ${WEBSITE_SEARCH ? "enabled" : "disabled"}`);
  if (DRY_RUN) console.log("[discover] DRY RUN — will not write output file");

  // Step 1: Get company titles.
  // Prefer the ranked list from the live Fortune Global 500 article (more current
  // than alphabetical category membership).  Fall back to category members.
  const categoryTitles = await fetchCategoryMembers(Math.max(DISCOVER_LIMIT * 2, 500));
  const knownTitles = new Set(categoryTitles);

  const articleTitles = await fetchFortuneArticleList(DISCOVER_LIMIT, knownTitles);
  const titles = articleTitles ?? categoryTitles.slice(0, DISCOVER_LIMIT);

  if (titles.length === 0) {
    console.error("[discover] No company titles discovered. Aborting.");
    process.exit(1);
  }
  console.log(`[discover] Using ${titles.length} Wikipedia titles to process (source: ${articleTitles ? "Fortune article" : "category members"})`);

  // Step 2: Build company entries
  /** @type {CompanyEntry[]} */
  const companies = [];
  let processed = 0;

  for (const title of titles) {
    const entry = await buildCompanyEntry(title, ++processed, titles.length);
    if (entry) companies.push(entry);
  }

  console.log(`[discover] Built ${companies.length} company entries (from ${titles.length} titles)`);

  // Step 3: Write output
  const output = [
    {
      id: "auto-top-100",
      name: `Auto-Discovered Top ${DISCOVER_LIMIT} Companies (Fortune Global 500)`,
      sourceUrl: "https://en.wikipedia.org/wiki/Fortune_Global_500",
      trust: "high",
      companies,
    },
  ];

  if (DRY_RUN) {
    console.log("[discover] DRY RUN — output preview:");
    console.log(JSON.stringify(output, null, 2).slice(0, 2000));
    return;
  }

  const dir = dirname(OUTPUT_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf-8");
  console.log(`[discover] Written to ${OUTPUT_PATH}`);
  console.log(`[discover] Done. Run "npm run scrape:companies" to ingest discovered companies.`);
}

main().catch((err) => {
  console.error("[discover] Fatal error:", err);
  process.exit(1);
});
