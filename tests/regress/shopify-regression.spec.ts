import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

describe('Shopify data regression', () => {
  const dataPath = resolve(__dirname, '../../data/offices.json')
  // @ts-ignore - dynamic load of JSON in node
  const offices = JSON.parse(readFileSync(dataPath, 'utf-8'))

  it('includes Shopify offices with required fields', () => {
    const ids = ['shopify-ca-ottawa', 'shopify-ie-dub', 'shopify-sg-sin']
    for (const id of ids) {
      const entry = offices.find((o: any) => o.id === id)
      expect(entry).toBeDefined()
      expect(entry?.country).toBeTruthy()
      expect(entry?.countryCode).toMatch(/^[A-Z]{2}$/)
      expect(entry?.region).toBeTruthy()
      expect(entry?.city).toBeTruthy()
      expect(entry?.address).toBeTruthy()
      expect(entry?.postalCode).toBeTruthy()
      expect(entry?.officeType).toBeTruthy()
      expect(typeof entry?.latitude).toBe('number')
      expect(typeof entry?.longitude).toBe('number')
      expect(entry?.contactUrl?.startsWith('https://')).toBe(true)
    }
  })

  it('Shopify entries are unique by id', () => {
    const shopEntries = offices.filter((o: any) => o.id.startsWith('shopify-'))
    const ids = shopEntries.map((e: any) => e.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('no obvious duplicates for Shopify IDs', () => {
    const seen = new Set<string>()
    const shopEntries = offices.filter((o: any) => o.id.startsWith('shopify-'))
    for (const e of shopEntries) {
      expect(seen.has(e.id)).toBe(false)
      seen.add(e.id)
    }
  })
})
