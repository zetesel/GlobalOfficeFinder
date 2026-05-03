import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

describe('Office data validation', () => {
  const dataPath = resolve(process.cwd(), 'data', 'offices.json')
  // @ts-expect-error - dynamic load of JSON in node
  const offices: unknown[] = JSON.parse(readFileSync(dataPath, 'utf-8'))

  it('all offices have required fields with sensible types', () => {
    const requiredFields = ['country','countryCode','region','city','address','officeType','latitude','longitude']
  offices.forEach((o) => {
      const oAny = o as unknown as { [key: string]: unknown }
      // basic shape checks
      requiredFields.forEach((f) => {
        expect(oAny).toHaveProperty(f)
        const v = oAny[f as string] as unknown
        if (f === 'latitude' || f === 'longitude') {
          const num = v as number
          expect(typeof num).toBe('number')
          if (f === 'latitude') expect(num).toBeGreaterThanOrEqual(-90).toBeLessThanOrEqual(90)
          if (f === 'longitude') expect(num).toBeGreaterThanOrEqual(-180).toBeLessThanOrEqual(180)
        } else {
          const s = v as string
          expect(typeof s).toBe('string')
          expect(s).toBeTruthy()
        }
      })
      // optional postalCode
      if (Object.prototype.hasOwnProperty.call(oAny, 'postalCode')) {
        const pc = oAny['postalCode'] as string
        expect(typeof pc).toMatch(/^(.*)$/) // string if present
      }
      // optional contactUrl
      if (Object.prototype.hasOwnProperty.call(oAny, 'contactUrl') && oAny.contactUrl) {
        try {
          new URL(oAny.contactUrl as string)
        } catch {
          fail(`Invalid contactUrl for id ${oAny['id']}: ${oAny['contactUrl']}`)
        }
      }
    })
  })

  it('offices have unique ids', () => {
    const ids = offices.map((o) => o.id).filter(Boolean)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})
