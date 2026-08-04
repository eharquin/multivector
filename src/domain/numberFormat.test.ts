import { describe, expect, it } from 'vitest'
import { inspectLanguageValue } from './languageValue'
import { inspectMultivector, ownedMultivector } from './multivector'
import { formatRoundTripNumber } from './numberFormat'

describe('round-trip number formatting', () => {
  it('uses uppercase E without changing the represented binary64 value', () => {
    const values = [7.179585925776166e-9, -3.5897930298416118e-9, 1e21]
    for (const value of values) {
      const formatted = formatRoundTripNumber(value)
      expect(formatted).toContain('E')
      expect(formatted).not.toContain('e')
      expect(Number(formatted)).toBe(value)
    }
  })

  it('normalizes signed zero and rejects non-finite values', () => {
    expect(formatRoundTripNumber(-0)).toBe('0')
    expect(() => formatRoundTripNumber(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })

  it('keeps scientific exponents distinct from lowercase blade names', () => {
    const value = ownedMultivector([-1, 0, 0, 3.5897930298416118e-9])
    expect(inspectMultivector(value)).toBe('-1 + 3.5897930298416118E-9e12')
    expect(inspectLanguageValue(value)).toBe('-1 + 3.5897930298416118E-9e12')
  })
})
