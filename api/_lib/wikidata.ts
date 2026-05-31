/**
 * Typed re-exports of the shared Wikidata helpers for the runtime endpoint.
 * The implementation lives in scripts/lib/wikidata.mjs (also used by the
 * build-time photo CLI) so the two paths can't drift.
 */
export {
  searchEntities,
  getEntity,
  firstClaimValue,
  fetchEntityOffices,
  DEFAULT_HEADERS,
} from "../../scripts/lib/wikidata.mjs";

export type {
  EntityCandidate,
  RawOfficeRow,
} from "../../scripts/lib/wikidata.mjs";
