import { describe, expect, it } from 'vitest'
import { bladeIndex, createAlgebraBasis, permutedBlade } from './algebraBasis'

describe('algebra basis', () => {
  it('orders VGA(2) blades by grade then index', () => {
    const basis = createAlgebraBasis([1, 2])
    expect(basis.blades.map((blade) => blade.name)).toEqual(['e', 'e1', 'e2', 'e12'])
    expect(basis.blades.map((blade) => blade.grade)).toEqual([0, 1, 1, 2])
    expect(basis.maxGrade).toBe(2)
  })

  it('orders Cl(2,0,1) blades in the PGA convention order', () => {
    const basis = createAlgebraBasis([0, 1, 2])
    expect(basis.blades.map((blade) => blade.name))
      .toEqual(['e', 'e0', 'e1', 'e2', 'e01', 'e02', 'e12', 'e012'])
    expect(basis.blades[7].indices).toEqual([0, 1, 2])
  })

  it('rejects non-increasing generator indices', () => {
    expect(() => createAlgebraBasis([2, 1])).toThrow(RangeError)
    expect(() => createAlgebraBasis([1, 1])).toThrow(RangeError)
  })

  it('resolves permuted blade names with the permutation sign', () => {
    const basis = createAlgebraBasis([0, 1, 2])
    expect(permutedBlade(basis, 'e12')).toEqual({ index: 6, sign: 1 })
    expect(permutedBlade(basis, 'e21')).toEqual({ index: 6, sign: -1 })
    expect(permutedBlade(basis, 'e20')).toEqual({ index: 5, sign: -1 })
    expect(permutedBlade(basis, 'e102')).toEqual({ index: 7, sign: -1 })
    expect(permutedBlade(basis, 'e201')).toEqual({ index: 7, sign: 1 })
    expect(permutedBlade(basis, 'e')).toEqual({ index: 0, sign: 1 })
  })

  it('rejects blades outside the basis', () => {
    const basis = createAlgebraBasis([1, 2])
    expect(bladeIndex(basis, 'e0')).toBe(-1)
    expect(permutedBlade(basis, 'e0')).toBeNull()
    expect(permutedBlade(basis, 'e11')).toBeNull()
    expect(permutedBlade(basis, 'e123')).toBeNull()
    expect(permutedBlade(basis, 'x1')).toBeNull()
  })
})
