#!/usr/bin/env node
// @ts-check
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';

const root = dirname(dirname(dirname(new URL(import.meta.url).pathname)));

function readJson(p) {
  if (!existsSync(p)) return undefined;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function writeJson(p, v) {
  writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return normalizeWhitespace(String(value || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sanitizeUrl(url) {
  if (!url) return undefined;
  try { const u = new URL(url.trim()); if (u.protocol === 'http:' || u.protocol === 'https:') return u.href; } catch {};
  return undefined;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

const COUNTRY_CODE_FALLBACK = {
  'united states': 'US',
  'united kingdom': 'GB',
  germany: 'DE',
  france: 'FR',
  ireland: 'IE',
  luxembourg: 'LU',
  singapore: 'SG',
  japan: 'JP',
  india: 'IN',
  australia: 'AU',
  canada: 'CA',
  netherlands: 'NL',
  sweden: 'SE',
};

function normalizeCountryCode(country, countryCode) {
  if (countryCode && /^[A-Z]{2}$/.test(String(countryCode).toUpperCase())) return countryCode.toUpperCase();
  const normalized = String(country || '').trim().toLowerCase();
  return COUNTRY_CODE_FALLBACK[normalized] || '';
}

const REGION_BY_COUNTRY_CODE = {
  US: 'Americas',
  CA: 'Americas',
  MX: 'Americas',
  BR: 'Americas',
  AR: 'Americas',
  CL: 'Americas',
  GB: 'Europe',
  IE: 'Europe',
  DE: 'Europe',
  FR: 'Europe',
  NL: 'Europe',
  LU: 'Europe',
  SE: 'Europe',
  NO: 'Europe',
  FI: 'Europe',
  PL: 'Europe',
  CH: 'Europe',
  ES: 'Europe',
  IT: 'Europe',
  PT: 'Europe',
  JP: 'Asia-Pacific',
  SG: 'Asia-Pacific',
  AU: 'Asia-Pacific',
  NZ: 'Asia-Pacific',
  IN: 'Asia-Pacific',
  KR: 'Asia-Pacific',
  CN: 'Asia-Pacific',
  HK: 'Asia-Pacific',
  AE: 'Middle East & Africa',
  ZA: 'Middle East & Africa',
  EG: 'Middle East & Africa',
  NG: 'Middle East & Africa',
  SA: 'Middle East & Africa',
};

function normalizeRegion(countryCode) {
  if (!countryCode) return '';
  return REGION_BY_COUNTRY_CODE[String(countryCode).toUpperCase()] || '';
}

async function geocodeOffice(office) {
  // minimal geocode via Nominatim
  try {
    const baseUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org/search';
    const q = [office.address, office.city, office.postalCode, office.country].filter(Boolean).join(', ');
    if (!q) return { latitude: undefined, longitude: undefined, certainty: 'none' };
    const url = `${baseUrl}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'GlobalOfficeFinderBot/1.0' } });
    if (!res.ok) return { latitude: undefined, longitude: undefined, certainty: 'none' };
    const payload = await res.json();
    const top = Array.isArray(payload) ? payload[0] : undefined;
    if (!top?.lat || !top?.lon) return { latitude: undefined, longitude: undefined, certainty: 'none' };
    const importance = Number(top.importance || 0);
    const certainty = importance >= 0.7 ? 'high' : importance >= 0.4 ? 'medium' : 'low';
    return { latitude: Number(top.lat), longitude: Number(top.lon), certainty };
  } catch (e) {
    return { latitude: undefined, longitude: undefined, certainty: 'none', error: String(e) };
  }
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

function usage() {
  console.log('Usage: node scripts/scraper/review-queue-cli.mjs [--apply] [--geocode]');
  process.exit(1);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--help')) usage();
  const APPLY = args.has('--apply');
  const DO_GEOCODE = args.has('--geocode');

  const USE_STAGING = process.env.SCRAPER_STAGING === '1';
  const companiesPath = USE_STAGING ? join(root, 'data', 'companies-staging.json') : join(root, 'data', 'companies.json');
  const officesPath = USE_STAGING ? join(root, 'data', 'offices-staging.json') : join(root, 'data', 'offices.json');
  const companies = readJson(companiesPath) || [];
  const existingOffices = readJson(officesPath) || [];
  const collected = readJson(join(root, 'data', 'scraper', 'collected-pages.json')) || [];
  const reviewQueue = readJson(join(root, 'data', 'scraper', 'review-queue.json')) || { items: [] };

  const candidates = [];
  // from collected pages
  for (const p of collected) {
    if (p.extractedOffice) candidates.push({ sourceId: p.sourceId || 'collected', sourceUrl: p.url || null, office: p.extractedOffice });
  }
  // from review queue
  for (const item of (reviewQueue.items || [])) {
    if (item.type === 'office' && item.office) candidates.push({ sourceId: item.sourceId || 'review-queue', sourceUrl: item.sourceUrl || null, office: item.office });
  }

  if (candidates.length === 0) {
    console.log('No extracted candidates found in data/scraper/collected-pages.json or review-queue.json');
    return;
  }

  const proposals = [];
  for (const c of candidates) {
    const off = c.office || {};
    const srcUrl = sanitizeUrl(c.sourceUrl) || '';
    // try to map to company by domain
    const domain = getDomain(srcUrl);
    const company = companies.find((co) => getDomain(co.website) === domain) || null;
    const companyId = company?.id || 'unknown';

    const country = off.country || '';
    const countryCode = normalizeCountryCode(off.country, off.countryCode);
    const city = off.city || '';
    const address = off.address || '';
    const postalCode = off.postalCode || '';

    const proposal = {
      companyId,
      country: country || '',
      countryCode: countryCode || '',
      region: '',
      city: city || '',
      address: address || '',
      postalCode: postalCode || '',
      officeType: off.officeType || 'Regional Office',
      contactUrl: c.sourceUrl || null,
      source: { sourceId: c.sourceId, sourceUrl: c.sourceUrl },
    };

    proposals.push({ proposal, raw: off });
  }

  // Attempt geocode (optional) and validate minimal fields
  const accepted = [];
  for (const p of proposals) {
    const o = p.proposal;
    let geocodeInfo = { latitude: undefined, longitude: undefined, certainty: 'none' };
    if (DO_GEOCODE) {
      geocodeInfo = await geocodeOffice(o);
    }
    o.latitude = geocodeInfo.latitude;
    o.longitude = geocodeInfo.longitude;

    // Compute a simple completeness score over key fields
    const completenessFields = ['country', 'countryCode', 'region', 'city', 'address', 'officeType', 'latitude', 'longitude'];
    const filled = completenessFields.filter((k) => {
      const v = o[k];
      return v !== undefined && v !== null && String(v).toString().trim() !== '';
    }).length;
    const completenessScore = filled / completenessFields.length;

    // Acceptance policy (tightened): require either high-confidence geocode OR high completeness
    const geocodedHigh = DO_GEOCODE && geocodeInfo.certainty === 'high' && typeof o.latitude === 'number' && typeof o.longitude === 'number';
    const completenessHigh = completenessScore >= 0.8;

    if (APPLY && (geocodedHigh || completenessHigh)) {
      accepted.push(o);
    }

    // add metadata
    p.proposal.geocode = geocodeInfo;
    p.proposal.minimal = completenessScore >= 0.5;
    p.proposal.completenessScore = completenessScore;
  }

  // Write proposals to disk for inspection
  const outPath = join(root, 'data', 'scraper', 'proposed-accepts.json');
  writeJson(outPath, { generatedAt: new Date().toISOString(), count: proposals.length, proposals });
  console.log(`Wrote ${proposals.length} proposals to ${outPath}`);

  if (!APPLY) {
    console.log('Dry-run: no changes made. Re-run with --apply to accept candidates that meet minimal criteria.');
    return;
  }

  // APPLY: append accepted proposals to offices.json, with ids and normalized fields
  const toAdd = [];
  for (const o of accepted) {
    // ensure companyId exists
    if (!o.companyId || o.companyId === 'unknown') continue;
    const cc = String(o.countryCode || '').toUpperCase();
    const region = normalizeRegion(cc) || 'Americas';
    const office = {
      companyId: o.companyId,
      country: o.country || '',
      countryCode: cc,
      region,
      city: o.city || '',
      address: o.address || '',
      postalCode: o.postalCode || '',
      officeType: o.officeType || 'Regional Office',
      latitude: o.latitude,
      longitude: o.longitude,
      contactUrl: sanitizeUrl(o.contactUrl) || undefined,
    };
    const id = makeOfficeId(existingOffices.concat(toAdd), office.companyId, office.countryCode, office.city);
    toAdd.push({ id, ...office });
  }

  if (toAdd.length === 0) {
    console.log('No candidates met minimal acceptance criteria; nothing to apply.');
    return;
  }

  // backup and write to either staging or canonical files
  const backup = readJson(officesPath) || [];
  const merged = [...backup, ...toAdd];
  writeJson(officesPath, merged);
  console.log(`Appended ${toAdd.length} offices to ${officesPath}${USE_STAGING ? ' (staging)' : ''}.`);

  // run validation only when applying to canonical files
  if (!USE_STAGING) {
    try {
      const cp = await import('child_process');
      const res = cp.spawnSync('npm', ['run', 'validate-data'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
      if (res.status !== 0) {
        // restore
        writeJson(officesPath, backup);
        console.error('validate-data failed; restored original offices.json');
        process.exit(1);
      }
    } catch (e) {
      console.error('Failed to run validate-data', e);
    }
  } else {
    console.log('Staging mode: skipped validate-data. Inspect staging files before promoting.');
  }

  console.log('Apply complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
