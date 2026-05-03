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
  // Optional: run a small subset of end-to-end tests in dry-run to exercise E2E paths
  const e2eSubset = process.env.SCRAPER_GATE_E2E_SUBSET;
  if (e2eSubset === "minimal" || e2eSubset === "extended" || e2eSubset === "full") {
    try {
      // Decide which test files to run based on the subset
      const testFiles = ["e2e/smoke/essential.spec.ts"];
      if (e2eSubset === "extended" || e2eSubset === "full") {
        testFiles.push("e2e/main.spec.ts");
      }
      console.log(`[ci-gate] Running Playwright E2E subset: ${testFiles.join(", ")}`);
      const res = spawnSync("npx", ["playwright", "test", ...testFiles], {
        cwd: ROOT,
        stdio: "inherit",
        shell: false,
      });
      if ((res.status ?? 1) !== 0) {
        console.error("[ci-gate] E2E gate failed");
        process.exit(1);
      }
    } catch (err) {
      console.error("[ci-gate] E2E gate encountered an error:", err);
      process.exit(1);
    }
  }
  // Phase 2: optional drift gate (data drift regression) - run when enabled
  if (process.env.SCRAPER_GATE_DRIFT === '1') {
    try {
      console.log('[ci-gate] Running Shopify drift regression gate (single-file)');
      const drift = spawnSync('npx', ['vitest', 'run', 'tests/regress/shopify-drift.spec.ts'], {
        cwd: ROOT,
        stdio: 'inherit',
        shell: false,
      });
      if ((drift.status ?? 1) !== 0) {
        console.error('[ci-gate] Shopify drift regression failed');
        process.exit(1);
      }
    } catch (err) {
      console.error('[ci-gate] Shopify drift regression error:', err);
      process.exit(1);
    }
  }
  process.exit(0);
}

main();
