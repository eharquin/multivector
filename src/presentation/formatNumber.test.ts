import { describe, expect, it } from 'vitest'
import { ownedList } from '../domain/languageValue'
import { ownedMultivector } from '../domain/multivector'
import {
  formatDisplayMultivector,
  formatDisplayNumber,
  formatDisplayValue,
} from './formatNumber'

describe('numeric presentation', () => {
  it('rounds decimal approximations without trailing or negative zeroes', () => {
    expect(formatDisplayNumber(1.234567, 4)).toBe('1.2346')
    expect(formatDisplayNumber(2, 4)).toBe('2')
    expect(formatDisplayNumber(-0, 4)).toBe('0')
  })

  it('retains nonzero small values with unambiguous scientific notation', () => {
    expect(formatDisplayNumber(7.179585925776166e-9, 4)).toBe('7.1796E-9')
    expect(formatDisplayNumber(-3.5897930298416118e-9, 4)).toBe('-3.5898E-9')
  })

  it('formats multivectors without erasing small nonzero coefficients', () => {
    expect(formatDisplayMultivector(ownedMultivector([
      -1, 0, 0, 3.5897930298416118e-9,
    ]), 4)).toBe('-1 + 3.5898E-9e12')
  })

  it('uses one formatter for list elements', () => {
    const value = ownedList([
      { id: 'a', value: ownedMultivector([1 / 3, 0, 0, 0]) },
      { id: 'b', value: ownedMultivector([0, 1.23456, 0, 0]) },
    ])
    expect(formatDisplayValue(value, 3)).toBe('[0.333, 1.235e1]')
  })

  describe('hiding approximated residue', () => {
    it('hides dominant-grade leakage, matching interpretVga2 exactly', () => {
      // Same fixture as vga2Interpretation.test.ts's "ignores dominant-grade
      // leakage" case, which classifies this value as scalar -1, approximated.
      expect(formatDisplayMultivector(ownedMultivector([
        -1, 0, 0, 3.6e-9,
      ]), 4, false)).toBe('-1')
    })

    it('keeps a standalone near-zero result, matching the same documented limitation', () => {
      expect(formatDisplayMultivector(ownedMultivector([
        0, 0, 0, 1.7e-9,
      ]), 4, false)).toBe('1.7000E-9e12')
    })

    it('reduces a bivector to its blade name when only its scalar leaks', () => {
      expect(formatDisplayMultivector(ownedMultivector([
        6.1232e-17, 0, 0, 1,
      ]), 4, false)).toBe('e12')
    })

    it('defaults to showing residue when the argument is omitted', () => {
      expect(formatDisplayMultivector(ownedMultivector([
        -1, 0, 0, 3.6e-9,
      ]), 4)).toBe('-1 + 3.6000E-9e12')
    })

    it('applies the same suppression to list elements via formatDisplayValue', () => {
      const value = ownedList([
        { id: 'a', value: ownedMultivector([-1, 0, 0, 3.6e-9]) },
      ])
      expect(formatDisplayValue(value, 4, false)).toBe('[-1]')
    })
  })
})
