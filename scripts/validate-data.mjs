#!/usr/bin/env node
// @ts-check
/**
 * validate-data.mjs
 * Validates data/companies.json and data/offices.json against their JSON schemas.
 * Also checks for embedded HTML in free-text fields as a security measure.
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
 * Checks if a string contains HTML-like content
 * @param {string} str - String to check
 * @returns {boolean} - True if HTML-like content detected
 */
function containsHTML(str) {
  if (typeof str !== "string") return false;
  // Simple regex to detect HTML tags
  const htmlPattern = /<[^>]+>/;
  return htmlPattern.test(str);
}

/**
 * Recursively checks an object for HTML-like content in string fields
 * @param {string} dataPath - Path to the data file being checked
 * @param {*} data - The data to check (can be object, array, or primitive)
 * @param {string} path - Current path in the data structure (for error reporting)
 */
function checkForHTML(dataPath, data, path = "") {
  if (data === null || typeof data !== "object") {
    // Primitive value - check if it's a string with HTML
    if (typeof data === "string" && containsHTML(data)) {
      console.error(
        `[FAIL]  ${dataPath} — Suspicious HTML detected in field "${path}": "${data.substring(0, 100)}${data.length > 100 ? "..." : ""}"`,
      );
      exitCode = 1;
    }
    return;
  }

  if (Array.isArray(data)) {
    // Array - check each element
    data.forEach((item, index) => {
      checkForHTML(dataPath, item, `${path}[${index}]`);
    });
    return;
  }

  // Object - check each property
  for (const [key, value] of Object.entries(data)) {
    const newPath = path ? `${path}.${key}` : key;
    checkForHTML(dataPath, value, newPath);
  }
}

/**
 * @param {string} dataPath - Path to the JSON data file
 * @param {string} schemaPath - Path to the JSON schema file
 * @param {*} [data] - Optional pre-loaded data to validate (avoids double reading)
 */
function validate(dataPath, schemaPath, data) {
  // Load data if not provided
  if (data === undefined) {
    data = JSON.parse(readFileSync(dataPath, "utf-8"));
  }

  const label = dataPath.replace(root + "/", "");
  let schema;

  try {
    schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  } catch (err) {
    console.error(
      `[ERROR] Could not read schema file: ${schemaPath}\n  ${err.message}`,
    );
    exitCode = 1;
    return;
  }

  // Check for embedded HTML in free-text fields before schema validation
  checkForHTML(dataPath, data);

  const validator = ajv.compile(schema);
  const valid = validator(data);

  if (valid) {
    console.log(
      `[OK]    ${label} — ${Array.isArray(data) ? data.length : 1} record(s) valid`,
    );
  } else {
    console.error(`[FAIL]  ${label}`);
    for (const err of validator.errors ?? []) {
      console.error(`        ${err.instancePath || "root"} ${err.message}`);
    }
    exitCode = 1;
  }
}

// Load and validate companies data
validate(
  join(root, "data", "companies.json"),
  join(root, "data", "schema", "companies.schema.json"),
);

// Load and validate offices data
validate(
  join(root, "data", "offices.json"),
  join(root, "data", "schema", "offices.schema.json"),
);

// Cross-reference: every office must reference a known companyId
try {
  const companies = JSON.parse(
    readFileSync(join(root, "data", "companies.json"), "utf-8"),
  );
  const offices = JSON.parse(
    readFileSync(join(root, "data", "offices.json"), "utf-8"),
  );
  const companyIds = new Set(companies.map((c) => c.id));
  const missing = offices.filter((o) => !companyIds.has(o.companyId));
  if (missing.length > 0) {
    console.error(
      `[FAIL]  Cross-reference check: ${missing.length} office(s) reference unknown companyId:`,
    );
    for (const o of missing) {
      console.error(
        `        office "${o.id}" references companyId "${o.companyId}"`,
      );
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
