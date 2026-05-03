#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function main() {
  const root = process.cwd()
  const auditPath = join(root, 'data', 'security', 'audit.json')
  let data = null
  if (existsSync(auditPath)) {
    try {
      data = JSON.parse(readFileSync(auditPath, 'utf-8'))
    } catch {
      console.error('[audit] Failed to parse audit.json')
      process.exit(1)
    }
  } else {
    // If no audit.json found, assume no vulnerabilities reported yet
    console.log('[audit] No audit.json found, assuming no known vulnerabilities')
    process.exit(0)
  }

  if (!data?.vulnerabilities) {
    console.log('[audit] No vulnerabilities field found, nothing to fail')
    process.exit(0)
  }

  const severities = ['critical', 'high']
  let found = false
  for (const [pkg, info] of Object.entries(data.vulnerabilities)) {
    // info is an object with severity fields per advisory; if present and severity is high/critical, flag
    const sev = info?.severity?.toLowerCase?.() ?? ''
    if (severities.includes(sev)) {
      found = true
      console.error(`[audit] ${pkg}: ${sev}`)
      if (info?.via?.length) {
        info.via.forEach((v) => {
          if (typeof v === 'string') console.error(`  - ${v}`)
        })
      }
    }
  }
  if (found) {
    console.error('[audit] High/Critical vulnerabilities found')
    process.exit(1)
  }
  console.log('[audit] No high/critical vulnerabilities detected')
  process.exit(0)
}

main()
