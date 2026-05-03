#!/usr/bin/env node
// Lightweight CI gate to exercise scraper in sequential and concurrent modes (dry-run)
// Runs two scraper passes: 1x sequential, 4x concurrent, both in DRY_RUN mode to avoid writes.

import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const SCRAPER_CMD = path.resolve(ROOT, "scripts", "scraper", "run-scraper.mjs");

function runScraper(concurrency) {
  const env = Object.assign({}, process.env, {
    SCRAPER_FETCH_CONCURRENCY: String(concurrency),
    SCRAPER_DRY_RUN: "1",
  });
  console.log(`[ci-gate] Running scraper with concurrency=${concurrency} (dry-run)`);
  const result = spawnSync("node", [SCRAPER_CMD], {
    env,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

function main() {
  // 1x sequential pass
  let status = runScraper(1);
  if (status !== 0) {
    console.error("[ci-gate] Sequential gate failed");
    process.exit(1);
  }

  // 4x concurrent pass
  status = runScraper(4);
  if (status !== 0) {
    console.error("[ci-gate] Concurrent gate failed");
    process.exit(1);
  }

  console.log("[ci-gate] Scraper gate passed: both sequential and concurrent runs completed (dry-run)");
  process.exit(0);
}

main();
