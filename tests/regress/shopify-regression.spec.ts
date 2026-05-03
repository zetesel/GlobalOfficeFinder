import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

describe('Shopify data regression', () => {
  const dataPath = resolve(__dirname, '../../data/offices.json')
  // @ts-expect-error - dynamic load of JSON in node
  const offices: unknown[] = JSON.parse(readFileSync(dataPath, 'utf-8'))

  it('includes Shopify offices with required fields', () => {
    const ids = ['shopify-ca-ottawa', 'shopify-ie-dub', 'shopify-sg-sin']
    for (const id of ids) {
      const entry = (offices as unknown[]).find((o) => {
        const t = o as { id?: string }
        return t.id === id
      })
      expect(entry).toBeDefined()
      const e = entry as unknown as {
        country: string
        countryCode: string
        region: string
        city: string
        address: string
        postalCode: string
        officeType: string
        latitude: number
        longitude: number
        contactUrl?: string
      }
      expect(e.country).toBeTruthy()
      expect(e.countryCode).toMatch(/^[A-Z]{2}$/)
      expect(e.region).toBeTruthy()
      expect(e.city).toBeTruthy()
      expect(e.address).toBeTruthy()
      expect(e.postalCode).toBeTruthy()
      expect(e.officeType).toBeTruthy()
      expect(typeof e.latitude).toBe('number')
      expect(typeof e.longitude).toBe('number')
      expect(e.contactUrl?.startsWith('https://')).toBe(true)
    }
  })

  it('Shopify entries are unique by id', () => {
    const shopEntries = (offices as unknown[]).filter((o) => {
      const t = o as { id?: string }
      return !!t.id && t.id.startsWith('shopify-')
    })
    const ids = shopEntries.map((e) => (e as { id: string }).id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('no obvious duplicates for Shopify IDs', () => {
    const seen = new Set<string>()
    const shopEntries = (offices as unknown[]).filter((o) => {
      const t = o as { id?: string }
      return !!t.id && t.id.startsWith('shopify-')
    })
    for (const e of shopEntries) {
      const id = (e as { id: string }).id
      expect(seen.has(id)).toBe(false)
      seen.add(id)
    }
  })
})
