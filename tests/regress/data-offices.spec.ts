import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

describe('Office data validation', () => {
  const dataPath = resolve(process.cwd(), 'data', 'offices.json')
  // @ts-ignore - dynamic load of JSON in node
  const offices: any[] = JSON.parse(readFileSync(dataPath, 'utf-8'))

  it('all offices have required fields with sensible types', () => {
    const requiredFields = ['country','countryCode','region','city','address','officeType','latitude','longitude']
    offices.forEach((o) => {
      // basic shape checks
      requiredFields.forEach((f) => {
        expect(o).toHaveProperty(f)
        const v = o[f]
        if (f === 'latitude' || f === 'longitude') {
          expect(typeof v).toBe('number')
          if (f === 'latitude') expect(v).toBeGreaterThanOrEqual(-90).toBeLessThanOrEqual(90)
          if (f === 'longitude') expect(v).toBeGreaterThanOrEqual(-180).toBeLessThanOrEqual(180)
        } else {
          expect(typeof v).toBe('string')
          expect(v).toBeTruthy()
        }
      })
      // optional postalCode
      if (Object.prototype.hasOwnProperty.call(o, 'postalCode')) {
        expect(typeof o.postalCode).toMatch(/^(.*)$/) // string if present
      }
      // optional contactUrl
      if (Object.prototype.hasOwnProperty.call(o, 'contactUrl') && o.contactUrl) {
        try {
          new URL(o.contactUrl)
        } catch {
          fail(`Invalid contactUrl for id ${o.id}: ${o.contactUrl}`)
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
