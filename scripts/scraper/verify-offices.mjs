// @ts-check
/**
 * CI batch verification script.
 *
 * Reads data/offices.json + data/companies.json, calls OpenRouter for each
 * office that hasn't been verified (or has verdict==="unverified"), and writes
 * the verdict back into data/offices.json.
 *
 * Usage:
 *   node scripts/scraper/verify-offices.mjs [--limit N] [--dry-run]
 *
 * Env:
 *   OPENROUTER_API_KEY  — required; script exits 1 if absent.
 *   OPENROUTER_MODEL    — optional model override (default: anthropic/claude-3.5-sonnet).
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  VERIFY_CONFIDENCE_THRESHOLD,
  VERIFY_SYSTEM_PROMPT,
} from "../lib/verify-prompt.mjs";
import { delay } from "../lib/wikidata.mjs";

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 200;

// ─── Env (resolved lazily in main() so importing decideVerdict doesn't exit) ─

/** @returns {string} */
function requireApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error(
      "[verify-offices] ERROR: OPENROUTER_API_KEY is not set in the environment.\n" +
        "  Set it before running: OPENROUTER_API_KEY=sk-or-... node scripts/scraper/verify-offices.mjs",
    );
    process.exit(1);
  }
  return key;
}

const MODEL =
  process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet";

// ─── Pure helpers (exported for unit tests) ──────────────────────────────────

/**
 * Apply the same threshold downgrade logic as api/_lib/openrouter.ts.
 *
 * @param {{ verdict?: string; reason?: string; confidence?: number }} raw
 * @returns {{ verdict: "approved"|"rejected"; reason: string; confidence: number } | null}
 */
export function decideVerdict(raw) {
  if (!raw || typeof raw !== "object") return null;

  const confidence =
    typeof raw.confidence === "number"
      ? Math.min(1, Math.max(0, raw.confidence))
      : 0;

  let verdict =
    raw.verdict === "approved" ? /** @type {"approved"} */ ("approved") : /** @type {"rejected"} */ ("rejected");

  let reason = typeof raw.reason === "string" ? raw.reason : "";

  if (verdict === "approved" && confidence < VERIFY_CONFIDENCE_THRESHOLD) {
    verdict = "rejected";
    reason = `Low confidence (${confidence.toFixed(2)} < ${VERIFY_CONFIDENCE_THRESHOLD}) — original verdict was approved`;
  }

  return { verdict, reason, confidence };
}

// ─── OpenRouter fetch (no SDK — fetch-based like scripts/lib/wikidata.mjs) ───

/**
 * @param {string} companyName
 * @param {{ city: string; country: string; address?: string; officeType: string }} office
 * @returns {Promise<{ verdict: "approved"|"rejected"; reason: string; confidence: number } | null>}
 */
async function callOpenRouter(companyName, office) {
  const apiKey = requireApiKey();
  const userPrompt =
    `Company: "${companyName}"\n` +
    `Office: ${office.officeType} in ${office.city}, ${office.country}` +
    (office.address ? ` (${office.address})` : "");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://globalofficefinder.local",
      "X-Title": "GlobalOfficeFinder",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: VERIFY_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenRouter ${response.status}: ${text.slice(0, 200)}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content ?? "";

  try {
    // Strip ```json fences if present (mirrors parseJsonLoose in openrouter.ts)
    let text = content.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) text = fence[1].trim();
    const parsed = JSON.parse(text);
    return decideVerdict(parsed);
  } catch {
    return null;
  }
}

// ─── Data loading ─────────────────────────────────────────────────────────────

const ROOT = join(new URL(".", import.meta.url).pathname, "../..");

/** @returns {any[]} */
function loadOffices() {
  return JSON.parse(readFileSync(join(ROOT, "data/offices.json"), "utf8"));
}

/** @returns {any[]} */
function loadCompanies() {
  return JSON.parse(readFileSync(join(ROOT, "data/companies.json"), "utf8"));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Validate the API key at startup (before loading data or making requests).
  requireApiKey();

  const offices = loadOffices();
  const companies = loadCompanies();

  /** @type {Map<string, string>} */
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));

  // Collect offices that need verification
  const toVerify = offices.filter((o) => {
    if (!o.verification) return true;
    if (o.verification.verdict === "unverified") return true;
    return false;
  });

  const count = Math.min(toVerify.length, LIMIT);
  console.log(
    `[verify-offices] ${toVerify.length} offices need verification; processing ${count}` +
      (DRY_RUN ? " (dry-run — no writes)" : ""),
  );

  let processed = 0;
  let approved = 0;
  let rejected = 0;
  let failed = 0;

  for (let i = 0; i < count; i++) {
    const office = toVerify[i];
    const companyName = companyNameById.get(office.companyId) ?? office.companyId;

    process.stdout.write(
      `[verify-offices] [${i + 1}/${count}] ${companyName} — ${office.city}, ${office.country} … `,
    );

    let verdict;
    try {
      verdict = await callOpenRouter(companyName, office);
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
      // Still pace requests even on error
      if (i < count - 1) await delay(1100);
      continue;
    }

    const verification = verdict
      ? {
          verdict: verdict.verdict,
          reason: verdict.reason,
          confidence: verdict.confidence,
          grounded: false,
          checkedAt: new Date().toISOString(),
          model: MODEL,
        }
      : {
          verdict: "unverified",
          reason: "llm_invalid",
          confidence: 0,
          grounded: false,
          checkedAt: new Date().toISOString(),
          model: MODEL,
        };

    console.log(`${verification.verdict} (confidence=${verification.confidence.toFixed(2)})`);

    if (!DRY_RUN) {
      // Mutate in-place — the office object is the same reference as in the
      // offices array, so writing offices.json at the end captures all updates.
      office.verification = verification;
    }

    if (verdict?.verdict === "approved") approved++;
    else if (verdict?.verdict === "rejected") rejected++;
    else failed++;

    processed++;

    // Pace requests to respect OpenRouter rate limits
    if (i < count - 1) await delay(1100);
  }

  console.log(
    `\n[verify-offices] Done. processed=${processed} approved=${approved} rejected=${rejected} failed/invalid=${failed}`,
  );

  if (!DRY_RUN && processed > 0) {
    const out = JSON.stringify(offices, null, 2) + "\n";
    writeFileSync(join(ROOT, "data/offices.json"), out, "utf8");
    console.log("[verify-offices] Wrote data/offices.json");
  }
}

// Only run main() when executed directly (not when imported by a test).
// import.meta.url ends with the filename when invoked as `node verify-offices.mjs`.
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  new URL(import.meta.url).pathname === new URL(process.argv[1], "file://").pathname;

if (isMain) {
  main().catch((err) => {
    console.error("[verify-offices] Fatal error:", err);
    process.exit(1);
  });
}
