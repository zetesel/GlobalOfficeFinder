import type { OfficeTag } from "../types";

export function typeTag(t: string | undefined): OfficeTag {
  const value = t ?? "";
  if (/headquarters|co-headquarters/i.test(value))
    return { short: "HQ", tone: "hq" };
  if (/regional/i.test(value)) return { short: "Regional", tone: "reg" };
  if (/engineering|development|r&d|research/i.test(value))
    return { short: "R&D", tone: "rnd" };
  return {
    short: value.replace(/ office| headquarters/i, "") || "Office",
    tone: "reg",
  };
}

export const REGION_ORDER = [
  "Americas",
  "Europe",
  "Asia-Pacific",
  "Middle East & Africa",
];

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
