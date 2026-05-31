export const WIKIDATA_API: string;
export const WIKIDATA_SPARQL: string;
export const DEFAULT_HEADERS: Record<string, string>;
export const BUSINESS_INSTANCE_QIDS: Set<string>;

export function delay(ms: number): Promise<void>;
export function fetchJson(url: string, headers?: Record<string, string>): Promise<any>;
export function sameHost(a: string, b: string): boolean;
export function isBusinessEntity(entity: any): boolean;
export function firstClaimValue(entity: any, prop: string): any;
export function allClaimValues(entity: any, prop: string): any[];

export interface EntityCandidate {
  id: string;
  label: string;
  description: string;
}

export function searchEntities(
  name: string,
  opts?: { limit?: number; headers?: Record<string, string> },
): Promise<EntityCandidate[]>;

export function searchWikidataCandidates(
  name: string,
  opts?: { headers?: Record<string, string> },
): Promise<string[]>;

export function getEntity(
  qid: string,
  opts?: { headers?: Record<string, string> },
): Promise<any | null>;

export function resolveCompanyEntity(
  company: { name: string; website?: string },
  opts?: { requestDelay?: number; headers?: Record<string, string> },
): Promise<any | null>;

export function runSparql(
  query: string,
  opts?: { headers?: Record<string, string> },
): Promise<Array<Record<string, { type: string; value: string }>>>;

export interface RawOfficeRow {
  place: string;
  placeLabel: string;
  cityLabel: string;
  countryLabel: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  relation: string;
}

export function fetchEntityOffices(
  qid: string,
  opts?: { headers?: Record<string, string>; limit?: number },
): Promise<RawOfficeRow[]>;
