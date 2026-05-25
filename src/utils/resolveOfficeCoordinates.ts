import offices from "../../data/offices.json";
import queueGeocodes from "../../data/scraper/queue-geocodes.json";
import type { Office } from "../types";

const catalogOffices = offices as Office[];
const precomputedGeocodes = (queueGeocodes as { entries?: Record<string, { latitude: number; longitude: number }> })
  .entries ?? {};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface CoordinateLookupInput {
  companyId?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface ResolvedCoordinates {
  latitude: number;
  longitude: number;
  source: "inline" | "catalog";
  matchKind?: string;
}

/** Strip postal suffixes from scraped city labels like "London WC2H 8AG". */
export function extractCityBase(city: string): string {
  const trimmed = city.trim();
  const commaPart = trimmed.includes(",") ? trimmed.split(",").pop()!.trim() : trimmed;
  const withoutPostal = commaPart.replace(/\s+[A-Z]{1,2}\d[\w\s-]*$/i, "").trim();
  const wordMatch = withoutPostal.match(/^([A-Za-zÀ-ÿ]+(?:[\s'-][A-Za-zÀ-ÿ]+)?)/);
  return normalize(wordMatch?.[1] ?? withoutPostal);
}

function addressTokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length >= 2),
  );
}

function tokenOverlap(a: string, b: string): number {
  const left = addressTokens(a);
  const right = addressTokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  return shared / Math.min(left.size, right.size);
}

function toResolved(office: Office, matchKind: string): ResolvedCoordinates {
  return {
    latitude: office.latitude!,
    longitude: office.longitude!,
    source: "catalog",
    matchKind,
  };
}

/** Match queue/scraper offices to catalog rows that already have coordinates. */
export function resolveCoordinatesFromCatalog(
  input: CoordinateLookupInput,
): ResolvedCoordinates | undefined {
  if (typeof input.latitude === "number" && typeof input.longitude === "number") {
    return { latitude: input.latitude, longitude: input.longitude, source: "inline", matchKind: "inline" };
  }

  const companyId = input.companyId?.trim();
  if (!companyId) return undefined;

  const cityNorm = normalize(input.city ?? "");
  const cityBase = extractCityBase(input.city ?? "");
  const addressNorm = normalize(input.address ?? "");
  const candidates = catalogOffices.filter(
    (o) =>
      o.companyId === companyId &&
      typeof o.latitude === "number" &&
      typeof o.longitude === "number",
  );

  if (input.postalCode?.trim()) {
    const postalNorm = normalize(input.postalCode);
    const postalMatches = candidates.filter(
      (o) => o.postalCode && normalize(o.postalCode) === postalNorm,
    );
    const byPostal =
      postalMatches.length === 1
        ? postalMatches[0]
        : postalMatches.length > 1 && addressNorm
          ? postalMatches
              .map((office) => ({
                office,
                cityMatches:
                  normalize(office.city) === cityBase || normalize(office.city) === cityNorm,
                overlap: tokenOverlap(input.address ?? "", office.address),
              }))
              .filter((row) => row.cityMatches)
              .sort((a, b) => b.overlap - a.overlap)[0]?.office
          : undefined;
    if (byPostal) {
      return toResolved(byPostal, "postal");
    }
  }

  if (addressNorm) {
    const scored = candidates
      .map((office) => {
        const officeCity = normalize(office.city);
        const cityMatches = officeCity === cityBase || officeCity === cityNorm;
        return {
          office,
          cityMatches,
          overlap: tokenOverlap(input.address ?? "", office.address),
        };
      })
      .filter((row) => row.cityMatches && row.overlap >= 0.35)
      .sort((a, b) => b.overlap - a.overlap);

    if (scored[0]) {
      return toResolved(scored[0].office, "address-overlap");
    }
  }

  const inCity = candidates.filter((office) => {
    const officeCity = normalize(office.city);
    return officeCity === cityBase || officeCity === cityNorm;
  });

  if (inCity.length === 1 && addressNorm) {
    const overlap = tokenOverlap(input.address ?? "", inCity[0].address);
    if (overlap >= 0.15) {
      return toResolved(inCity[0], "single-city");
    }
  }

  const precomputedKey = geocodeCacheKey(input);
  const precomputed = precomputedGeocodes[precomputedKey];
  if (precomputed) {
    return {
      latitude: precomputed.latitude,
      longitude: precomputed.longitude,
      source: "catalog",
      matchKind: "precomputed",
    };
  }

  return undefined;
}

export function enrichOfficeWithCoordinates<T extends CoordinateLookupInput>(
  office: T,
): T & { latitude?: number; longitude?: number } {
  const resolved = resolveCoordinatesFromCatalog(office);
  if (!resolved) return office;
  return { ...office, latitude: resolved.latitude, longitude: resolved.longitude };
}

export function geocodeCacheKey(input: CoordinateLookupInput): string {
  return [input.address, input.city, input.postalCode, input.country, input.countryCode]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
}

const GEOCODE_CACHE_KEY = "goef-geocode-cache-v3";

const STREET_SUFFIX =
  "(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Way|Plaza|Parkway|Pkwy|Ct|Court|Ln|Lane|Place|Square|Sq|High\\s+St|Building|Bldg)";

function dedupeAddressPrefix(line: string): string {
  const tokens = line.split(/\s+/).filter(Boolean);
  for (let size = 1; size <= Math.floor(tokens.length / 2); size += 1) {
    const prefix = tokens.slice(0, size).join(" ");
    const repeat = tokens.slice(size, size * 2).join(" ");
    if (prefix === repeat) {
      return tokens.slice(size).join(" ");
    }
  }
  return line;
}

/** Strip scraper prefixes and extract a street line suitable for geocoding. */
export function extractStreetLine(address: string | undefined, city?: string): string {
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

  const streetPattern = new RegExp(
    `(\\d[\\w\\s.,#'-]*${STREET_SUFFIX}[\\w\\s.,#'-]*)`,
    "gi",
  );
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

/** Normalize scraped city labels for geocoding queries. */
export function geocodeCityLabel(city: string | undefined): string {
  const trimmed = (city ?? "").trim();
  if (!trimmed) return "";

  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
    const last = parts[parts.length - 1] ?? trimmed;
    if (!/^\d/.test(last)) {
      return last.replace(/\s+[A-Z]{1,2}\d[\w\s-]*$/i, "").trim();
    }
    const prev = parts[parts.length - 2];
    if (prev && !/^\d/.test(prev)) return prev.trim();
  }

  return trimmed.replace(/\s+[A-Z]{1,2}\d[\w\s-]*$/i, "").trim();
}

function geocodeCountryLabel(input: CoordinateLookupInput): string | undefined {
  const country = input.country?.trim();
  const code = input.countryCode?.trim();
  if (!country && !code) return undefined;
  if (country && code && normalize(country) === normalize(code)) return country;
  if (country && code && code.length === 2) return country;
  return country || code;
}

async function fetchPhotonResult(
  query: string,
): Promise<{ latitude: number; longitude: number } | undefined> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return undefined;

  const payload = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
  };
  const coords = payload.features?.[0]?.geometry?.coordinates;
  if (!coords) return undefined;
  return { latitude: coords[1], longitude: coords[0] };
}

async function fetchNominatimResult(
  query: string,
): Promise<{ latitude: number; longitude: number } | undefined> {
  const encoded = encodeURIComponent(query);
  const url = import.meta.env.DEV
    ? `/api/nominatim/search?format=jsonv2&limit=1&q=${encoded}`
    : `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encoded}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (response.status === 429) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 2500 * (attempt + 1));
      });
      continue;
    }
    if (!response.ok) return undefined;

    const payload = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const top = payload[0];
    if (!top?.lat || !top?.lon) return undefined;
    return { latitude: Number(top.lat), longitude: Number(top.lon) };
  }

  return undefined;
}

async function fetchGeocodeResult(
  query: string,
): Promise<{ latitude: number; longitude: number } | undefined> {
  const photon = await fetchPhotonResult(query);
  if (photon) return photon;
  return fetchNominatimResult(query);
}

/** Build geocode query variants from most to least specific. */
export function geocodeQueryVariants(input: CoordinateLookupInput): string[] {
  const street = extractStreetLine(input.address, input.city);
  const city = geocodeCityLabel(input.city);
  const postal = input.postalCode?.trim();
  const country = geocodeCountryLabel(input);

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

let geocodeQueue: Promise<unknown> = Promise.resolve();
let lastGeocodeAt = 0;
const GEOCODE_MIN_INTERVAL_MS = 1500;
const inFlightGeocodes = new Map<string, Promise<ResolvedCoordinates | undefined>>();

function scheduleGeocode<T>(task: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = Math.max(0, GEOCODE_MIN_INTERVAL_MS - (Date.now() - lastGeocodeAt));
    if (wait > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, wait);
      });
    }
    lastGeocodeAt = Date.now();
    return task();
  };
  const result = geocodeQueue.then(run, run);
  geocodeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function readGeocodeCache(key: string): ResolvedCoordinates | undefined {
  try {
    const raw = sessionStorage.getItem(GEOCODE_CACHE_KEY);
    if (!raw) return undefined;
    const cache = JSON.parse(raw) as Record<string, ResolvedCoordinates>;
    return cache[key];
  } catch {
    return undefined;
  }
}

export function writeGeocodeCache(key: string, coords: ResolvedCoordinates): void {
  try {
    const raw = sessionStorage.getItem(GEOCODE_CACHE_KEY);
    const cache = raw ? (JSON.parse(raw) as Record<string, ResolvedCoordinates>) : {};
    cache[key] = coords;
    sessionStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota / private mode
  }
}

export function clearGeocodeCache(): void {
  try {
    sessionStorage.removeItem(GEOCODE_CACHE_KEY);
  } catch {
    // ignore
  }
}

export async function geocodeAddress(
  input: CoordinateLookupInput,
): Promise<ResolvedCoordinates | undefined> {
  const queries = geocodeQueryVariants(input);
  if (queries.length === 0) return undefined;

  const cacheKey = geocodeCacheKey(input);
  const cached = readGeocodeCache(cacheKey);
  if (cached) return cached;

  const inFlight = inFlightGeocodes.get(cacheKey);
  if (inFlight) return inFlight;

  const promise = scheduleGeocode(async () => {
    for (let i = 0; i < queries.length; i += 1) {
      const q = queries[i];
      if (i > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 350);
        });
      }

      const coords = await fetchGeocodeResult(q);
      if (!coords) {
        continue;
      }

      const result = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        source: "inline" as const,
        matchKind: "geocode",
      };

      return result;
    }

    return undefined;
  }).finally(() => {
    inFlightGeocodes.delete(cacheKey);
  });

  inFlightGeocodes.set(cacheKey, promise);
  return promise;
}
