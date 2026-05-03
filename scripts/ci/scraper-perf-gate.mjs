#!/usr/bin/env node
// Simple performance gate for scraper: measure 1x sequential vs 4x concurrent dry-run runs
// Exits non-zero if either run exceeds threshold (configurable via env).

import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

// __dirname is not defined in ESM; compute from import.meta.url
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..', '..')
const SCRAPER_CMD = path.resolve(ROOT, 'scripts', 'scraper', 'run-scraper.mjs')
const PERF_OUT_DIR = path.resolve(ROOT, 'data', 'perf')
const PERF_FILE = path.resolve(PERF_OUT_DIR, 'scraper-perf.json')

const SEQ_THRESHOLD_MS = Number(process.env.SCRAPER_PERF_SEQ_THRESHOLD_MS ?? 75000)
const CONC_THRESHOLD_MS = Number(process.env.SCRAPER_PERF_CONC_THRESHOLD_MS ?? 75000)
const SHOULD_FAIL = process.env.SCRAPER_PERF_GATE_FAIL ?? '1'

async function run(concurrency) {
  const env = Object.assign({}, process.env, {
    SCRAPER_FETCH_CONCURRENCY: String(concurrency),
    SCRAPER_DRY_RUN: '1'
  })
  const t0 = process.hrtime.bigint()
  const res = spawnSync('node', [SCRAPER_CMD], { env, stdio: 'inherit' })
  const t1 = process.hrtime.bigint()
  const ms = Number(t1 - t0) / 1e6
  return { code: res.status ?? 1, ms }
}

async function main() {
  if (!existsSync(PERF_OUT_DIR)) mkdirSync(PERF_OUT_DIR, { recursive: true })

  console.log('[perf-gate] Starting Phase 5: scraper performance gate (1x sequential, 4x concurrent)')
  const seq = await run(1)
  console.log(`[perf-gate] Sequential 1x: ${seq.ms.toFixed(0)} ms (exit ${seq.code})`)
  const conc = await run(4)
  console.log(`[perf-gate] Concurrent 4x: ${conc.ms.toFixed(0)} ms (exit ${conc.code})`)

  const results = {
    sequentialMs: Math.round(seq.ms),
    concurrentMs: Math.round(conc.ms),
    sequentialExit: seq.code,
    concurrentExit: conc.code,
    thresholds: {
      sequentialMs: SEQ_THRESHOLD_MS,
      concurrentMs: CONC_THRESHOLD_MS
    },
  }
  writeFileSync(PERF_FILE, JSON.stringify(results, null, 2) + '\n', 'utf-8')

  const failed = (seq.ms > SEQ_THRESHOLD_MS) || (conc.ms > CONC_THRESHOLD_MS) || seq.code !== 0 || conc.code !== 0
  if (failed && SHOULD_FAIL !== '0') {
    console.error('[perf-gate] Performance gate failed: thresholds exceeded or scraper failed')
    process.exit(1)
  }
  console.log('[perf-gate] Performance gate completed')
  process.exit(0)
}

main().catch((e) => {
  console.error('[perf-gate] Unexpected error', e)
  process.exit(1)
})
