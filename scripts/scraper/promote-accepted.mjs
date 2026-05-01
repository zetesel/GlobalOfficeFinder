#!/usr/bin/env node
// @ts-check
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

function readJson(p) {
  if (!existsSync(p)) return undefined;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function writeJson(p, v) {
  writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function officeDedupKey(office) {
  return [office.companyId, slugify(office.address), slugify(office.city), office.countryCode].join('|');
}

function makeOfficeId(existingOffices, companyId, countryCode, city) {
  const citySlug = slugify(city).slice(0, 12) || 'city';
  const cc = String(countryCode || '').toLowerCase() || 'xx';
  let id = `${companyId}-${cc}-${citySlug}`;
  let i = 2;
  const existingIds = new Set((existingOffices || []).map((o) => o.id));
  while (existingIds.has(id)) { id = `${companyId}-${cc}-${citySlug}-${i}`; i += 1; }
  return id;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, shell: process.platform === 'win32', ...opts });
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`);
}

function main() {
  const acceptedLogPath = join(root, 'data', 'scraper', 'accepted-by-cli.json');
  const acceptedLog = readJson(acceptedLogPath);
  if (!acceptedLog || !Array.isArray(acceptedLog.accepted) || acceptedLog.accepted.length === 0) {
    console.log('No accepted entries found in', acceptedLogPath); process.exit(0);
  }

  const entries = acceptedLog.accepted.map((a) => a.entry || a);
  const officesPath = join(root, 'data', 'offices.json');
  const offices = readJson(officesPath) || [];
  const officeKeys = new Set(offices.map((o) => officeDedupKey(o)));

  const toAdd = [];
  for (const e of entries) {
    const key = officeDedupKey(e);
    if (officeKeys.has(key)) continue;
    // ensure id
    if (!e.id) e.id = makeOfficeId(offices.concat(toAdd), e.companyId, e.countryCode, e.city);
    toAdd.push(e);
    officeKeys.add(key);
  }

  if (toAdd.length === 0) { console.log('No new offices to promote'); return; }

  // Create branch
  const timestamp = Math.floor(Date.now() / 1000);
  const branch = `promote/staged-${timestamp}`;
  run('git', ['checkout', '-b', branch]);

  // Backup and write merged offices
  const merged = [...offices, ...toAdd];
  writeJson(officesPath, merged);

  // Run validation
  try {
    run('npm', ['run', 'validate-data']);
  } catch (e) {
    console.error('validate-data failed; restoring original offices.json');
    writeJson(officesPath, offices);
    run('git', ['checkout', 'main']);
    throw e;
  }

  // Commit and push
  run('git', ['add', 'data/offices.json']);
  run('git', ['commit', '-m', `promote: accept ${toAdd.length} staged offices`]);
  run('git', ['push', '--set-upstream', 'origin', branch]);

  // Create PR
  run('gh', ['pr', 'create', '--title', `promote: accept staged offices ${timestamp}`, '--body', `Promoting ${toAdd.length} offices from staging. Please review.`]);

  console.log(`Promoted ${toAdd.length} offices in branch ${branch}`);
}

main();
