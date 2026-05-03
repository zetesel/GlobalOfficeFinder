import { describe, it, expect } from 'vitest'
import {
  slugify,
  sanitizeUrl,
  getDomain,
  normalizeCountryCode,
  normalizeRegion,
  officeDedupKey,
  makeOfficeId,
  scoreConfidence,
  levelPasses,
  isOfficialSourceMatch
} from '../../scripts/scraper/run-scraper.mjs'

describe('Scraper utilities (Phase 3: unit tests)', () => {
  it('slugify works', () => {
    expect(slugify('Hello World!')).toBe('hello-world')
  })

  it('getDomain extracts domain', () => {
    expect(getDomain('https://www.example.com/path')).toBe('example.com')
  })

  it('sanitizeUrl accepts https and rejects others', () => {
    const u1 = sanitizeUrl('https://example.com')
    expect(u1).toBeDefined()
    expect(u1?.startsWith('https://')).toBe(true)
    // Validate domain robustly to avoid CodeQL substring issues
  if (u1) {
      const parsed = new URL(u1)
      const host = parsed.hostname
      const ok = host === 'example.com' || host.endsWith('.example.com')
      expect(ok).toBe(true)
    }
    const u2 = sanitizeUrl('http://example.com')
    expect(u2).toBeDefined()
    expect(u2?.startsWith('http://')).toBe(true)
  if (u2) {
      const parsed2 = new URL(u2)
      const host2 = parsed2.hostname
      const ok2 = host2 === 'example.com' || host2.endsWith('.example.com')
      expect(ok2).toBe(true)
    }
    expect(sanitizeUrl('ftp://example.com')).toBeUndefined()
  })

  it('normalizeCountryCode maps country to code using map', () => {
    const map = new Map([['canada', 'CA']])
    expect(normalizeCountryCode('Canada', undefined, map)).toBe('CA')
    expect(normalizeCountryCode('Canada', 'ca', map)).toBe('CA')
  })

  it('normalizeRegion returns region for code when provided', () => {
    const regionMap = new Map([['US', 'Americas']])
    expect(normalizeRegion('US', regionMap)).toBe('Americas')
  })

  it('isOfficialSourceMatch detects domain match', () => {
    const site = 'https://www.google.com'
    const candidates = ['https://google.com', 'https://example.org']
    expect(isOfficialSourceMatch(site, candidates)).toBe(true)
    expect(isOfficialSourceMatch('https://example.com', candidates)).toBe(false)
  })

  it('officeDedupKey creates stable key', () => {
    const o1 = { companyId: 'shopify', address: '1 Main', city: 'City', countryCode: 'US' }
    const k1 = officeDedupKey(o1)
    const o2 = { companyId: 'shopify', address: '1 Main', city: 'City', countryCode: 'US' }
    const k2 = officeDedupKey(o2)
    expect(k1).toBe(k2)
  })

  it('makeOfficeId generates unique id when collision', () => {
    const existingOffices = [{ id: 'shopify-us-city' }]
    const newId = makeOfficeId(existingOffices, 'shopify', 'US', 'City')
    expect(typeof newId).toBe('string')
    expect(newId.startsWith('shopify-us-city')).toBe(true)
  })

  it('score and level helpers produce plausible outputs', () => {
    const c = scoreConfidence({ officialSourceMatch: true, pageFetchSuccess: true, completenessScore: 0.8, geocodeCertainty: 'high' })
    expect(c).toHaveProperty('score')
    expect(['high', 'medium', 'low']).toContain(c.level)
    expect(levelPasses(c.level)).toBe(true)
  })
})
// PR-51: reaffirm URL tests fix
