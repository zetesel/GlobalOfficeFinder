/**
 * POST /api/discover  — runtime "discover this company's offices on the web".
 *
 * Body: { companyName: string }
 * Flow:
 *   A. Wikidata wbsearchentities → candidates
 *   B. LLM picks the right entity (business, not person/film/place)
 *   C. SPARQL → raw HQ/location/subsidiary rows
 *   D. LLM structures rows → clean Office[] (validated server-side)
 *   E. Commons → permissively-licensed photo (optional)
 *
 * The OpenRouter key stays server-side. Results are cached (1h TTL) and rate
 * limited per IP (best-effort in-memory; fine for a single-region function).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  searchEntities,
  getEntity,
  firstClaimValue,
  fetchEntityOffices,
} from "./_lib/wikidata";
import { selectEntity, structureOffices } from "./_lib/openrouter";
import { findEntityPhoto } from "./_lib/wikimedia";
import type { DiscoverResponse, DiscoveredOffice } from "./_lib/types";

// ─── Config ──────────────────────────────────────────────────────────────────
const NAME_MIN = 2;
const NAME_MAX = 80;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 10; // requests / IP / window
const MAX_OFFICES = Number(process.env.DISCOVER_MAX_OFFICES ?? "100");

const REGION_BY_COUNTRY_CODE: Record<string, string> = {
  US: "Americas", CA: "Americas", MX: "Americas", BR: "Americas", AR: "Americas",
  CL: "Americas", CO: "Americas",
  GB: "Europe", IE: "Europe", DE: "Europe", FR: "Europe", NL: "Europe",
  LU: "Europe", SE: "Europe", NO: "Europe", FI: "Europe", PL: "Europe",
  CH: "Europe", ES: "Europe", IT: "Europe", PT: "Europe", DK: "Europe",
  LT: "Europe", RO: "Europe", GR: "Europe", TR: "Europe",
  JP: "Asia-Pacific", SG: "Asia-Pacific", AU: "Asia-Pacific", NZ: "Asia-Pacific",
  IN: "Asia-Pacific", KR: "Asia-Pacific", CN: "Asia-Pacific", HK: "Asia-Pacific",
  AE: "Middle East & Africa", ZA: "Middle East & Africa", EG: "Middle East & Africa",
  NG: "Middle East & Africa", SA: "Middle East & Africa", GH: "Middle East & Africa",
  IL: "Middle East & Africa",
};

// ─── In-memory state (best-effort; reset on cold start) ──────────────────────
interface CacheEntry {
  at: number;
  body: DiscoverResponse;
}
const cache = new Map<string, CacheEntry>();
const rate = new Map<string, { count: number; windowStart: number }>();

function clientIp(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  if (Array.isArray(fwd)) return fwd[0];
  return req.socket?.remoteAddress ?? "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rate.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rate.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

function fillRegion(o: DiscoveredOffice): DiscoveredOffice {
  if (o.region) return o;
  return { ...o, region: REGION_BY_COUNTRY_CODE[o.countryCode] ?? "" };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  // ── Validate input ──
  const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) ?? {};
  const rawName = typeof body.companyName === "string" ? body.companyName : "";
  const companyName = rawName.replace(/\s+/g, " ").trim();
  if (companyName.length < NAME_MIN || companyName.length > NAME_MAX) {
    res.status(400).json({ error: "invalid_company_name" });
    return;
  }

  // ── Cache ──
  const cacheKey = companyName.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    res.status(200).json(hit.body);
    return;
  }

  try {
    // A. Search candidates
    const candidates = await searchEntities(companyName, { limit: 8 });
    if (candidates.length === 0) {
      return finish(res, cacheKey, notFound(companyName));
    }

    // B. LLM entity selection
    const { wikidataId } = await selectEntity(companyName, candidates);
    if (!wikidataId) {
      return finish(res, cacheKey, notFound(companyName));
    }

    // Resolve entity (for name/description/website/photo)
    const entity = await getEntity(wikidataId);
    const label = entity?.labels?.en?.value ?? companyName;
    const description = entity?.descriptions?.en?.value ?? "";
    const website =
      typeof firstClaimValue(entity, "P856") === "string"
        ? (firstClaimValue(entity, "P856") as string)
        : undefined;

    // C. SPARQL raw locations
    const rows = await fetchEntityOffices(wikidataId, { limit: MAX_OFFICES * 2 });

    // D. LLM structuring (validated inside structureOffices)
    const structured = await structureOffices(label, rows);
    if (structured === null) {
      return finish(res, cacheKey, {
        company: { name: label, description, website, wikidataId },
        offices: [],
        error: "LLM_INVALID",
      });
    }

    const offices = structured.map(fillRegion).slice(0, MAX_OFFICES);

    // E. Photo (best-effort)
    const photo = entity ? await findEntityPhoto(entity) : null;

    const response: DiscoverResponse = {
      company: { name: label, description, website, wikidataId },
      offices,
      ...(photo ? { photo } : {}),
      ...(offices.length === 0 ? { error: "NO_OFFICES" as const } : {}),
    };
    return finish(res, cacheKey, response);
  } catch (err) {
    // Don't cache hard errors.
    res.status(502).json({ error: "discovery_failed", detail: String(err) });
  }
}

function notFound(name: string): DiscoverResponse {
  return {
    company: { name, description: "" },
    offices: [],
    error: "NOT_FOUND",
  };
}

function finish(res: VercelResponse, key: string, body: DiscoverResponse): void {
  // Cache soft results (incl. NOT_FOUND) so refreshes don't re-hit the LLM.
  cache.set(key, { at: Date.now(), body });
  res.status(200).json(body);
}

function safeParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
