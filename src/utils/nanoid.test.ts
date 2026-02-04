import { describe, test, expect } from 'vitest'
import { nanoid } from './nanoid'

describe('nanoid utility', () => {
  test('generates string', () => {
    const id = nanoid()
    expect(typeof id).toBe('string')
  })

  test('generates non-empty string', () => {
    const id = nanoid()
    expect(id.length).toBeGreaterThan(0)
  })

  test('generates unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      ids.add(nanoid())
    }
    expect(ids.size).toBe(1000)
  })

  test('generates IDs of consistent length', () => {
    const ids = Array.from({ length: 100 }, () => nanoid())
    const lengths = new Set(ids.map(id => id.length))
    
    // Should have consistent length (or very few variations)
    expect(lengths.size).toBeLessThanOrEqual(2)
  })

  test('generates URL-safe characters', () => {
    const ids = Array.from({ length: 100 }, () => nanoid())
    const urlSafePattern = /^[a-zA-Z0-9_-]+$/
    
    ids.forEach(id => {
      expect(id).toMatch(urlSafePattern)
    })
  })

  test('can generate many IDs quickly', () => {
    const start = Date.now()
    for (let i = 0; i < 10000; i++) {
      nanoid()
    }
    const duration = Date.now() - start
    
    // Should generate 10000 IDs in under 1 second
    expect(duration).toBeLessThan(1000)
  })
})
