import { describe, expect, it } from 'vitest'
import { ownedMultivector } from '../domain/multivector'
import { interpretVga2 } from './vga2Interpretation'

describe('standard VGA 2D interpretation', () => {
  it('maps a pure grade-one owned value to a semantic vector', () => {
    expect(interpretVga2(ownedMultivector([0, 2, 1, 0]))).toEqual({
      kind: 'vector-2d',
      x: 2,
      y: 1,
    })
  })

  it('does not reinterpret mixed-grade values as vectors', () => {
    expect(interpretVga2(ownedMultivector([1, 2, 1, 0]))).toBeNull()
  })

  it('classifies the all-zero multivector canonically as scalar zero', () => {
    expect(interpretVga2(ownedMultivector([0, 0, 0, 0]))).toEqual({
      kind: 'scalar',
      value: 0,
    })
  })

  it('maps a nonzero grade-zero value to a scalar entity', () => {
    expect(interpretVga2(ownedMultivector([12, 0, 0, 0]))).toEqual({
      kind: 'scalar',
      value: 12,
    })
  })
})
