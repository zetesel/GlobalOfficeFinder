/**
 * OpenRouter client (OpenAI-compatible) + the two LLM calls discovery needs:
 *   1. selectEntity   — pick the right Wikidata Q-id from search candidates.
 *   2. structureOffices — turn raw SPARQL location rows into clean offices.
 *
 * The API key lives ONLY in server env (OPENROUTER_API_KEY) and never reaches
 * the browser bundle. Model is swappable via OPENROUTER_MODEL.
 */

import OpenAI from "openai";
import type { EntityCandidate, RawOfficeRow } from "../../scripts/lib/wikidata.mjs";
import type { DiscoveredOffice } from "./types";
import { sanitizeOffices } from "./sanitizer";

let cached: OpenAI | null = null;

export function getClient(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");
  cached = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer":
        process.env.OPENROUTER_REFERRER ?? "https://globalofficefinder.local",
      "X-Title": "GlobalOfficeFinder",
    },
  });
  return cached;
}

export function getModel(): string {
  return process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet";
}

/** Strip ```json fences and parse, tolerating minor LLM formatting slips. */
function parseJsonLoose(content: string): unknown {
  let text = content.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  return JSON.parse(text);
}

/**
 * Ask the LLM which candidate entity is the actual business named `companyName`.
 * Returns the chosen Q-id, or null if none of the candidates fit.
 */
export async function selectEntity(
  companyName: string,
  candidates: EntityCandidate[],
): Promise<{ wikidataId: string | null; confidence?: number }> {
  if (candidates.length === 0) return { wikidataId: null };
  const client = getClient();
  const list = candidates
    .map((c) => `- ${c.id}: ${c.label}${c.description ? ` — ${c.description}` : ""}`)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: getModel(),
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You match a free-text company name to exactly one Wikidata entity. " +
          "Choose the entity that is the operating business/company (not a person, " +
          "film, product, place, or disambiguation page). Respond ONLY with JSON: " +
          '{"wikidataId": "Q...", "confidence": 0-1} or {"wikidataId": null}.',
      },
      {
        role: "user",
        content: `Company name: "${companyName}"\nCandidates:\n${list}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  try {
    const parsed = parseJsonLoose(content) as {
      wikidataId?: string | null;
      confidence?: number;
    };
    const id = parsed?.wikidataId;
    if (typeof id === "string" && /^Q\d+$/.test(id)) {
      return { wikidataId: id, confidence: parsed.confidence };
    }
    return { wikidataId: null };
  } catch {
    return { wikidataId: null };
  }
}

/**
 * Turn raw SPARQL location rows into a clean, de-duplicated list of offices
 * matching DiscoveredOffice. The LLM normalises city/country, drops junk and
 * classifies officeType; we still validate every field server-side.
 */
export async function structureOffices(
  companyName: string,
  rows: RawOfficeRow[],
): Promise<DiscoveredOffice[] | null> {
  if (rows.length === 0) return [];
  const client = getClient();

  const completion = await client.chat.completions.create({
    model: getModel(),
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You return JSON of the form {\"offices\": Office[]} where Office is the " +
          "TypeScript type {country: string, countryCode: string (ISO 3166-1 alpha-2), " +
          "region: 'Americas'|'Europe'|'Asia-Pacific'|'Middle East & Africa', " +
          "city: string, address?: string, officeType: 'hq'|'regional'|'branch', " +
          "latitude?: number, longitude?: number}. Deduplicate locations. Skip any " +
          "location missing at least a city and a country. Use the headquarters " +
          "relation to mark exactly the main 'hq'. Preserve latitude/longitude when " +
          "provided. Return ONLY the JSON object.",
      },
      {
        role: "user",
        content: `Company: "${companyName}"\nRaw locations (JSON):\n${JSON.stringify(
          rows,
          null,
          0,
        )}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  try {
    const parsed = parseJsonLoose(content) as { offices?: unknown };
    const arr = Array.isArray(parsed?.offices) ? parsed.offices : null;
    if (!arr) return null;
    return sanitizeOffices(arr);
  } catch {
    return null;
  }
}

