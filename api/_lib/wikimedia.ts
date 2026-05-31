/**
 * Resolve a permissively-licensed Commons photo for an already-resolved
 * Wikidata company entity. Mirrors scripts/enrich-company-photos.mjs's
 * findBuildingFile, but takes the entity we already fetched during discovery
 * so we don't re-resolve it.
 */
import {
  getEntity,
  firstClaimValue,
  DEFAULT_HEADERS,
} from "../../scripts/lib/wikidata.mjs";
import {
  getCommonsFileInfo,
  buildPhotoRecord,
} from "../../scripts/lib/wikimedia.mjs";
import type { DiscoveredPhoto } from "./types";

const HEADERS = {
  ...DEFAULT_HEADERS,
  "User-Agent":
    "GlobalOfficeFinderBot/1.0 (https://github.com/zetesel/GlobalOfficeFinder; runtime discovery)",
};

/** Find the File:… title for a company entity (P18, else HQ P159 → P18). */
async function findBuildingFile(entity: unknown): Promise<string | null> {
  const directFile = firstClaimValue(entity, "P18");
  if (directFile) return `File:${directFile}`;

  const hqId = firstClaimValue(entity, "P159")?.id;
  if (hqId) {
    const hq = await getEntity(hqId, { headers: HEADERS });
    const hqFile = firstClaimValue(hq, "P18");
    if (hqFile) return `File:${hqFile}`;
  }
  return null;
}

/**
 * @returns a permissively-licensed photo for the entity, or null if none found
 * / none with an acceptable license.
 */
export async function findEntityPhoto(
  entity: unknown,
): Promise<DiscoveredPhoto | null> {
  try {
    const file = await findBuildingFile(entity);
    if (!file) return null;
    const info = await getCommonsFileInfo(file, { headers: HEADERS });
    if (!info) return null;
    const result = buildPhotoRecord(info, file);
    if ("rejected" in result) return null;
    return result.photo;
  } catch {
    return null;
  }
}
