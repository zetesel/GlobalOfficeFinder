import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

describe('Shopify data drift guard (Phase 2)', () => {
  // Load current offices.json directly from data directory
  const dataPath = resolve(process.cwd(), 'data', 'offices.json')
  // @ts-expect-error - dynamic load of JSON in node
  const offices: unknown[] = JSON.parse(readFileSync(dataPath, 'utf-8'))

  const byId = Object.fromEntries(offices.map((o) => [ (o as unknown as { id: string }).id, o ]))

  function within(lat: number | undefined, lon: number | undefined, latMin: number, latMax: number, lonMin: number, lonMax: number) {
    if (typeof lat !== 'number' || typeof lon !== 'number') return false
    return lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax
  }

  it('shopify Ottawa coordinates stable', () => {
    const o = byId['shopify-ca-ottawa']
    const oAny = o as unknown as { latitude: number; longitude: number }
    expect(oAny).toBeDefined()
    expect(within(oAny.latitude, oAny.longitude, 45.4115, 45.4315, -75.7072, -75.6872)).toBe(true)
  })

  it('shopify Dublin coordinates stable', () => {
    const o = byId['shopify-ie-dub']
    const oAny = o as unknown as { latitude: number; longitude: number }
    expect(oAny).toBeDefined()
    expect(within(oAny.latitude, oAny.longitude, 53.3378, 53.3578, -6.2539, -6.2339)).toBe(true)
  })

  it('shopify Singapore coordinates stable', () => {
    const o = byId['shopify-sg-sin']
    const oAny = o as unknown as { latitude: number; longitude: number }
    expect(oAny).toBeDefined()
    expect(within(oAny.latitude, oAny.longitude, 1.2661, 1.2861, 103.8358, 103.8558)).toBe(true)
  })
})
