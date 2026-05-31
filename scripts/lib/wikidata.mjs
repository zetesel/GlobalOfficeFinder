// @ts-check
/**
 * Shared Wikidata helpers.
 *
 * Used both by the build-time CLI (scripts/enrich-company-photos.mjs) and the
 * runtime discovery serverless function (api/_lib/wikidata.ts). Keeping this in
 * one place avoids drift between the two code paths.
 *
 * Pure functions + thin fetch wrappers. No process.env reads here so the module
 * stays portable between Node CLI and Vercel runtime.
 */

export const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
export const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";

export const DEFAULT_HEADERS = {
  "User-Agent":
    "GlobalOfficeFinderBot/1.0 (https://github.com/zetesel/GlobalOfficeFinder; discovery)",
  Accept: "application/json",
};

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} url
 * @param {Record<string,string>} [headers]
 * @returns {Promise<any>}
 */
export async function fetchJson(url, headers = DEFAULT_HEADERS) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

/**
 * Hostname compare, robust to www. + trailing slashes.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function sameHost(a, b) {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, "").toLowerCase();
    const hb = new URL(b).hostname.replace(/^www\./, "").toLowerCase();
    return ha === hb;
  } catch {
    return false;
  }
}

/**
 * Wikidata P31 (instance-of) Q-ids that mean "this entity is a business of some
 * kind". The match is recursive in real Wikidata, but a coarse top-level set is
 * enough to filter out fruit/material/film/person articles.
 */
export const BUSINESS_INSTANCE_QIDS = new Set([
  "Q4830453", // business
  "Q43229", // organization
  "Q783794", // company
  "Q6881511", // enterprise
  "Q891723", // public company
  "Q167037", // corporation
  "Q161726", // multinational corporation
  "Q1616075", // privately held company
  "Q2401749", // joint-stock company
  "Q1058914", // software company
  "Q210167", // video game developer
  "Q270791", // state-owned enterprise
  "Q15911314", // association
  "Q1496428", // automobile manufacturer
  "Q1656682", // industrial enterprise
  "Q18388277", // technology company
  "Q4830453", // business (dup ok)
]);

/**
 * @param {any} entity
 * @returns {boolean}
 */
export function isBusinessEntity(entity) {
  const claims = entity?.claims?.P31;
  if (!Array.isArray(claims)) return false;
  return claims.some((c) =>
    BUSINESS_INSTANCE_QIDS.has(c?.mainsnak?.datavalue?.value?.id),
  );
}

/**
 * @param {any} entity
 * @param {string} prop
 * @returns {any}
 */
export function firstClaimValue(entity, prop) {
  const claims = entity?.claims?.[prop];
  if (!Array.isArray(claims) || claims.length === 0) return null;
  return claims[0]?.mainsnak?.datavalue?.value ?? null;
}

/**
 * @param {any} entity
 * @param {string} prop
 * @returns {any[]}
 */
export function allClaimValues(entity, prop) {
  const claims = entity?.claims?.[prop];
  if (!Array.isArray(claims)) return [];
  return claims.map((c) => c?.mainsnak?.datavalue?.value).filter(Boolean);
}

/**
 * Search Wikidata for entity candidates by free-text name.
 * Returns rich objects (id, label, description) — callers that only want ids
 * can map over `.id`.
 *
 * @param {string} name
 * @param {{ limit?: number, headers?: Record<string,string> }} [opts]
 * @returns {Promise<Array<{ id: string, label: string, description: string }>>}
 */
export async function searchEntities(name, opts = {}) {
  const { limit = 8, headers = DEFAULT_HEADERS } = opts;
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: name,
    language: "en",
    type: "item",
    limit: String(limit),
    format: "json",
    origin: "*",
  });
  try {
    const j = await fetchJson(`${WIKIDATA_API}?${params}`, headers);
    return (j?.search ?? [])
      .filter((s) => s?.id)
      .map((s) => ({
        id: s.id,
        label: s.label ?? "",
        description: s.description ?? "",
      }));
  } catch {
    return [];
  }
}

/**
 * Back-compat shape used by the photo CLI: just the candidate Q-ids.
 * @param {string} name
 * @param {{ headers?: Record<string,string> }} [opts]
 * @returns {Promise<string[]>}
 */
export async function searchWikidataCandidates(name, opts = {}) {
  const results = await searchEntities(name, opts);
  return results.map((r) => r.id);
}

/**
 * Fetch a single Wikidata entity's claims + labels.
 * @param {string} qid
 * @param {{ headers?: Record<string,string> }} [opts]
 * @returns {Promise<any|null>}
 */
export async function getEntity(qid, opts = {}) {
  const { headers = DEFAULT_HEADERS } = opts;
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: qid,
    props: "claims|labels|descriptions",
    languages: "en",
    format: "json",
    origin: "*",
  });
  try {
    const j = await fetchJson(`${WIKIDATA_API}?${params}`, headers);
    return j?.entities?.[qid] ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve a company → its Wikidata entity using the company's own website as
 * the disambiguator. Falls back to "first business-type result" when no website
 * match exists.
 *
 * @param {{ name: string, website?: string }} company
 * @param {{ requestDelay?: number, headers?: Record<string,string> }} [opts]
 * @returns {Promise<any|null>}
 */
export async function resolveCompanyEntity(company, opts = {}) {
  const { requestDelay = 250, headers = DEFAULT_HEADERS } = opts;
  const candidates = await searchWikidataCandidates(company.name, { headers });
  if (!candidates.length) return null;

  let businessFallback = null;
  for (const qid of candidates) {
    await delay(requestDelay);
    const entity = await getEntity(qid, { headers });
    if (!entity) continue;
    const websites = allClaimValues(entity, "P856");
    if (company.website && websites.some((w) => sameHost(w, company.website)))
      return entity;
    if (!businessFallback && isBusinessEntity(entity)) businessFallback = entity;
  }
  return businessFallback;
}

/**
 * Run a SPARQL query against the Wikidata Query Service, returning the raw
 * bindings array.
 *
 * @param {string} query
 * @param {{ headers?: Record<string,string> }} [opts]
 * @returns {Promise<Array<Record<string, { type: string, value: string }>>>}
 */
export async function runSparql(query, opts = {}) {
  const { headers = DEFAULT_HEADERS } = opts;
  const url = `${WIKIDATA_SPARQL}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { ...headers, Accept: "application/sparql-results+json" },
  });
  if (!res.ok) throw new Error(`SPARQL ${res.status} ${res.statusText}`);
  const j = await res.json();
  return j?.results?.bindings ?? [];
}

/**
 * For a company entity QID, pull raw office-like locations:
 *   - P159 headquarters location (with qualifiers / coords)
 *   - P276 location
 *   - subsidiaries (P355) and their P159
 * Each row carries: place QID/label, city label, country label + ISO code,
 * latitude/longitude when present.
 *
 * @param {string} qid
 * @param {{ headers?: Record<string,string>, limit?: number }} [opts]
 * @returns {Promise<Array<{
 *   place: string, placeLabel: string, cityLabel: string,
 *   countryLabel: string, countryCode: string,
 *   latitude?: number, longitude?: number, relation: string,
 * }>>}
 */
export async function fetchEntityOffices(qid, opts = {}) {
  const { headers = DEFAULT_HEADERS, limit = 200 } = opts;
  // Headquarters / locations for the company itself and its subsidiaries.
  const query = `
SELECT ?relation ?place ?placeLabel ?cityLabel ?countryLabel ?countryCode ?coord WHERE {
  {
    wd:${qid} p:P159 ?st .
    ?st ps:P159 ?place .
    OPTIONAL { ?st pq:P625 ?coord . }
    BIND("hq" AS ?relation)
  } UNION {
    wd:${qid} wdt:P276 ?place .
    BIND("location" AS ?relation)
  } UNION {
    wd:${qid} wdt:P355 ?sub .
    ?sub wdt:P159 ?place .
    BIND("subsidiary" AS ?relation)
  }
  OPTIONAL { ?place wdt:P625 ?coord . }
  OPTIONAL { ?place wdt:P131 ?city . }
  OPTIONAL { ?place wdt:P17 ?country . ?country wdt:P297 ?countryCode . }
  OPTIONAL { ?place wdt:P17 ?country . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${limit}
`;
  const bindings = await runSparql(query, { headers });
  return bindings.map((b) => {
    let latitude;
    let longitude;
    const coord = b.coord?.value;
    if (coord) {
      // Format: "Point(long lat)"
      const m = coord.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
      if (m) {
        longitude = Number(m[1]);
        latitude = Number(m[2]);
      }
    }
    return {
      place: b.place?.value ?? "",
      placeLabel: b.placeLabel?.value ?? "",
      cityLabel: b.cityLabel?.value ?? "",
      countryLabel: b.countryLabel?.value ?? "",
      countryCode: (b.countryCode?.value ?? "").toUpperCase(),
      latitude,
      longitude,
      relation: b.relation?.value ?? "location",
    };
  });
}
