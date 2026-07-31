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

  it('classifies a value spanning odd and even grades as mixed', () => {
    expect(interpretVga2(ownedMultivector([1, 2, 1, 0]))).toEqual({
      kind: 'mixed-multivector',
    })
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

  it('maps a pure grade-two value to a semantic bivector', () => {
    expect(interpretVga2(ownedMultivector([0, 0, 0, -3]))).toEqual({
      kind: 'bivector-2d',
      value: -3,
    })
  })

  it('maps a non-pure even value to a semantic rotor', () => {
    expect(interpretVga2(ownedMultivector([1, 0, 0, -1]))).toEqual({
      kind: 'rotor-2d',
      scalar: 1,
      bivector: -1,
    })
  })
})
