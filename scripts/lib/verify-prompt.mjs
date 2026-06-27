// @ts-check
/**
 * Shared verification prompt and threshold.
 * Imported by both api/_lib/openrouter.ts (runtime) and
 * scripts/scraper/verify-offices.mjs (CI batch job) so they
 * can never drift apart.
 */

export const VERIFY_CONFIDENCE_THRESHOLD = 0.6;

export const VERIFY_SYSTEM_PROMPT =
  "You verify whether a claimed office belongs to the named company. " +
  "Respond ONLY with JSON " +
  '{"verdict":"approved"|"rejected","reason":string,"confidence":0-1}. ' +
  "Approve only if you are reasonably confident the company actually " +
  "operates an office at that city/country.";
