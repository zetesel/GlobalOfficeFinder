import type { OfficeTone } from "../types";

export interface OfficeTag {
  short: string;
  tone: OfficeTone;
}

const typeTagCache = new Map<string, OfficeTag>();

export function typeTag(t: string | undefined): OfficeTag {
  const value = t ?? "";
  const cached = typeTagCache.get(value);
  if (cached) return cached;

  let result: OfficeTag;
  if (/headquarters|co-headquarters/i.test(value)) {
    result = { short: "HQ", tone: "hq" };
  } else if (/regional/i.test(value)) {
    result = { short: "Regional", tone: "reg" };
  } else if (/engineering|development|r&d|research/i.test(value)) {
    result = { short: "R&D", tone: "rnd" };
  } else {
    result = { short: value.replace(/ office| headquarters/i, "") || "Office", tone: "reg" };
  }

  typeTagCache.set(value, result);
  return result;
}

export const REGION_ORDER = ["Americas", "Europe", "Asia-Pacific", "Middle East & Africa"];

export function truncate(text: string | undefined | null, max = 140): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  // Prefer breaking after the first sentence if it fits within max.
  const firstSentence = trimmed.match(/^.*?[.!?](?=\s|$)/);
  if (firstSentence && firstSentence[0].length <= max) return firstSentence[0];
  // Otherwise cut at the last word boundary before max and append an ellipsis.
  const slice = trimmed.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return cut.replace(/[\s,;:.-]+$/, "") + "…";
}
