import { describe, expect, it } from 'vitest'
import { createVga2Engine } from '../algebra/vgaEngine'
import { ownedMultivector } from '../domain/multivector'
import { interpretVga2 } from './vga2Interpretation'

describe('standard VGA 2D interpretation', () => {
  it('maps a pure grade-one owned value to a semantic vector', () => {
    expect(interpretVga2(ownedMultivector([0, 2, 1, 0]))).toEqual({
      kind: 'vector-2d',
      x: 2,
      y: 1,
      approximated: false,
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
      approximated: false,
    })
  })

  it('maps a nonzero grade-zero value to a scalar entity', () => {
    expect(interpretVga2(ownedMultivector([12, 0, 0, 0]))).toEqual({
      kind: 'scalar',
      value: 12,
      approximated: false,
    })
  })

  it('maps a pure grade-two value to a semantic bivector', () => {
    expect(interpretVga2(ownedMultivector([0, 0, 0, -3]))).toEqual({
      kind: 'bivector-2d',
      value: -3,
      approximated: false,
    })
  })

  it('maps a non-pure even value to a semantic rotor', () => {
    expect(interpretVga2(ownedMultivector([1, 0, 0, -1]))).toEqual({
      kind: 'rotor-2d',
      scalar: 1,
      bivector: -1,
      approximated: false,
    })
  })

  describe('tolerance-aware classification boundaries', () => {
    it('keeps a deliberate small literal above the floor as its own kind', () => {
      expect(interpretVga2(ownedMultivector([0, 0, 0, 5e-9]))).toEqual({
        kind: 'bivector-2d',
        value: 5e-9,
        approximated: false,
      })
    })

    it('suppresses a deliberate small literal below the absolute floor', () => {
      expect(interpretVga2(ownedMultivector([0, 0, 0, 5e-11]))).toEqual({
        kind: 'scalar',
        value: 0,
        approximated: true,
      })
    })

    it('ignores dominant-grade leakage beside a large coefficient', () => {
      // Mirrors the numeric-policy doc's own near-complete-turn rotor example.
      expect(interpretVga2(ownedMultivector([-1, 0, 0, 3.6e-9]))).toEqual({
        kind: 'scalar',
        value: -1,
        approximated: true,
      })
    })

    it('keeps a standalone near-zero result at its own grade', () => {
      // Documents a known limitation: a relative-only term cannot demote an
      // isolated tiny result to zero without a larger coefficient supplying
      // scale, since the value itself sets the scale here.
      expect(interpretVga2(ownedMultivector([0, 0, 0, 1.7e-9]))).toEqual({
        kind: 'bivector-2d',
        value: 1.7e-9,
        approximated: false,
      })
    })

    it('scales suppression with magnitude via the relative term', () => {
      expect(interpretVga2(ownedMultivector([1000, 0, 0, 2e-5]))).toEqual({
        kind: 'scalar',
        value: 1000,
        approximated: true,
      })
      expect(interpretVga2(ownedMultivector([0.001, 0, 0, 2e-11]))).toEqual({
        kind: 'scalar',
        value: 0.001,
        approximated: true,
      })
    })

    it('classifies a real complete-turn rotor as scalar despite transcendental leakage', () => {
      const engine = createVga2Engine()
      const fullTurn = engine.multiply(
        engine.scalar(2 * Math.PI),
        engine.pseudoscalar(),
      )
      const rotor = engine.exp(fullTurn)

      // Sanity check: the leakage this fixture exists to tolerate is real.
      expect(rotor.coefficients[3]).not.toBe(0)

      const entity = interpretVga2(rotor)
      expect(entity).toMatchObject({ kind: 'scalar', approximated: true })
      if (entity.kind !== 'scalar') throw new Error('unreachable')
      expect(entity.value).toBeCloseTo(1, 10)
    })
  })
})
