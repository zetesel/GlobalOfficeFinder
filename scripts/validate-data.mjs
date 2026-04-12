#!/usr/bin/env node
// @ts-check
/**
 * validate-data.mjs
 * Validates data/companies.json and data/offices.json against their JSON schemas.
 * Exit code 0 = valid, non-zero = invalid.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

let exitCode = 0;

/**
 * @param {string} dataPath - Path to the JSON data file
 * @param {string} schemaPath - Path to the JSON schema file
 */
function validate(dataPath, schemaPath) {
  const label = dataPath.replace(root + "/", "");
  let data;
  let schema;

  try {
    data = JSON.parse(readFileSync(dataPath, "utf-8"));
  } catch (err) {
    console.error(`[ERROR] Could not read data file: ${dataPath}\n  ${err.message}`);
    exitCode = 1;
    return;
  }

  try {
    schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  } catch (err) {
    console.error(`[ERROR] Could not read schema file: ${schemaPath}\n  ${err.message}`);
    exitCode = 1;
    return;
  }

  const validator = ajv.compile(schema);
  const valid = validator(data);

  if (valid) {
    console.log(`[OK]    ${label} — ${Array.isArray(data) ? data.length : 1} record(s) valid`);
  } else {
    console.error(`[FAIL]  ${label}`);
    for (const err of validator.errors ?? []) {
      console.error(`        ${err.instancePath || "root"} ${err.message}`);
    }
    exitCode = 1;
  }
}

validate(
  join(root, "data", "companies.json"),
  join(root, "data", "schema", "companies.schema.json")
);

validate(
  join(root, "data", "offices.json"),
  join(root, "data", "schema", "offices.schema.json")
);

// Cross-reference: every office must reference a known companyId
try {
  const companies = JSON.parse(readFileSync(join(root, "data", "companies.json"), "utf-8"));
  const offices = JSON.parse(readFileSync(join(root, "data", "offices.json"), "utf-8"));
  const companyIds = new Set(companies.map((c) => c.id));
  const missing = offices.filter((o) => !companyIds.has(o.companyId));
  if (missing.length > 0) {
    console.error(`[FAIL]  Cross-reference check: ${missing.length} office(s) reference unknown companyId:`);
    for (const o of missing) {
      console.error(`        office "${o.id}" references companyId "${o.companyId}"`);
    }
    exitCode = 1;
  } else {
    console.log(`[OK]    Cross-reference check — all office companyIds exist`);
  }
} catch (err) {
  console.error(`[ERROR] Cross-reference check failed: ${err.message}`);
  exitCode = 1;
}

process.exit(exitCode);
