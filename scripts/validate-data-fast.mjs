#!/usr/bin/env node
// @ts-check
/**
 * validate-data-fast.mjs
 * A fast-path data validation runner.
 * - It computes a hash of the critical data files (companies.json, offices.json).
 * - If data hasn't changed since the last run, it skips the heavy schema/HTML validation.
 * - If data changed, it runs the existing full validation (scripts/validate-data.mjs) and then updates the hash.
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");
const dataDir = join(root, "data");
const hashFile = join(dataDir, ".validate-hash.json");

function hashFileContents(files) {
  const hash = crypto.createHash("sha256");
  for (const f of files) {
    try {
      const buf = readFileSync(f);
      hash.update(buf);
    } catch (e) {
      // If a file doesn't exist, treat as empty to avoid crash
      hash.update(Buffer.from(""));
    }
  }
  return hash.digest("hex");
}

function loadHashState() {
  if (!existsSync(hashFile)) return null;
  try {
    const raw = readFileSync(hashFile, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveHashState(state) {
  writeFileSync(hashFile, JSON.stringify(state, null, 2));
}

const dataFiles = [
  join(dataDir, "companies.json"),
  join(dataDir, "offices.json"),
];

const currentHash = hashFileContents(dataFiles);
const prev = loadHashState();
if (prev && prev.hash === currentHash) {
  console.log("[FAST VALIDATION] Data unchanged since last run; skipping heavy validation.");
  process.exit(0);
}

console.log("[FAST VALIDATION] Data changed or no previous hash; running full validation...");
// Run the existing full validation script as a child process
const result = spawnSync("node", [join(root, "scripts", "validate-data.mjs")], {
  stdio: "inherit",
});
if (result.status !== 0) {
  process.exit(result.status || 1);
}

// Save new hash only if validation succeeded
saveHashState({ hash: currentHash, updatedAt: new Date().toISOString() });
console.log("[FAST VALIDATION] Validation complete. Hash updated.");
process.exit(0);
