import { describe, expect, it } from 'vitest'
import { AlgebraOperationError } from './algebraEngine'
import {
  PGA2_BASIS,
  PGA2_CLASSIFICATION_FIXTURES,
  PGA2_OPERATION_FIXTURES,
  line,
  point,
  type Pga2Coefficients,
} from './pga2ReferenceFixtures'
import { createPga2Engine, PGA_2D_BASIS } from './pgaEngine'
import { ownedMultivector } from '../domain/multivector'

const engine = createPga2Engine()
const owned = (coefficients: Pga2Coefficients) => ownedMultivector(coefficients, PGA_2D_BASIS)

const expectClose = (actual: readonly number[], expected: Pga2Coefficients) => {
  actual.forEach((coefficient, index) => {
    expect(coefficient, PGA2_BASIS[index]).toBeCloseTo(expected[index], 10)
  })
}

describe('PGA(2) engine against the convention reference fixtures', () => {
  it('uses the canonical basis of the convention', () => {
    expect(engine.basis.blades.map((blade) => blade.name)).toEqual([...PGA2_BASIS])
    expect(engine.pseudoscalar().coefficients).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
  })

  for (const fixture of PGA2_OPERATION_FIXTURES) {
    it(`${fixture.id} (${fixture.decision}): ${fixture.description}`, () => {
      const [left, right] = fixture.operands.map(owned)
      const result = (() => {
        switch (fixture.operation) {
          case 'product': return engine.multiply(left, right)
          case 'outer': return engine.outer(left, right)
          case 'regressive': return engine.regressive(left, right)
          case 'dual': return engine.dual(left)
          case 'reverse': return engine.reverse(left)
          case 'sandwich': return engine.sandwich(left, right)
          case 'exp': return engine.exp(left)
        }
      })()
      expectClose(result.coefficients, fixture.expected)
    })
  }

  for (const fixture of PGA2_CLASSIFICATION_FIXTURES) {
    it(`${fixture.id} (${fixture.decision}): norms of ${fixture.description}`, () => {
      const value = owned(fixture.value)
      expect(engine.norm(value).coefficients[0]).toBeCloseTo(fixture.euclideanNorm, 12)
      expect(engine.call('inorm', [value]).coefficients[0]).toBeCloseTo(fixture.idealNorm, 12)
      const normalized = engine.normalize(value)
      if (fixture.normalized) {
        expect(normalized.status).toBe('normalized')
        expectClose(normalized.value.coefficients, fixture.normalized)
      } else {
        expect(normalized.status).toBe('unavailable')
      }
    })
  }
})

describe('PGA(2) engine capabilities', () => {
  it('builds points, ideal points, and lines from the registered constructors', () => {
    const s = engine.scalar
    expectClose(engine.call('point', [s(1), s(2)]).coefficients, point(1, 2))
    expectClose(engine.call('point', [s(2), s(4), s(2)]).coefficients, point(2, 4, 2))
    expectClose(engine.call('ipoint', [s(3), s(4)]).coefficients, point(3, 4, 0))
    expectClose(engine.call('line', [s(1), s(-1), s(0)]).coefficients, line(1, -1, 0))
    expect(engine.functions.get('point')).toEqual([2, 3])
    expect(() => engine.call('point', [engine.basisBlade('e1'), s(0)])).toThrow(AlgebraOperationError)
    expect(() => engine.call('vector', [s(1), s(2)])).toThrow(AlgebraOperationError)
  })

  it('inverts invertible values and refuses null ones', () => {
    const rotor = owned([Math.SQRT1_2, 0, 0, 0, 0, 0, -Math.SQRT1_2, 0])
    expectClose(engine.multiply(rotor, engine.inverse(rotor)).coefficients, [1, 0, 0, 0, 0, 0, 0, 0])
    const mixed = engine.add(engine.scalar(2), engine.add(engine.basisBlade('e1'), engine.basisBlade('e01')))
    expectClose(engine.multiply(engine.inverse(mixed), mixed).coefficients, [1, 0, 0, 0, 0, 0, 0, 0])
    for (const blade of ['e0', 'e01', 'e02', 'e012']) {
      expect(() => engine.inverse(engine.basisBlade(blade))).toThrow(/not invertible/)
    }
    expect(() => engine.inverse(owned(point(3, 4, 0)))).toThrow(/not invertible/)
    expect(() => engine.divide(engine.scalar(1), engine.pseudoscalar())).toThrow(/not invertible/)
  })

  it('computes the degenerate inner product and grade access through the basis', () => {
    const l = owned(line(3, 4, 5))
    expect(engine.inner(l, l).coefficients).toEqual([25, 0, 0, 0, 0, 0, 0, 0])
    expect(engine.inner(engine.basisBlade('e0'), engine.basisBlade('e0')).coefficients).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
    expect(engine.grade(owned(point(1, 2)), 2).coefficients).toEqual([...point(1, 2)])
    expect(engine.coefficient(owned(point(1, 2)), 'e02').coefficients[0]).toBe(-1)
    expect(engine.grade(l, 1).coefficients).toEqual([...l.coefficients])
    expect(() => engine.grade(l, 4)).toThrow(AlgebraOperationError)
    expect(() => engine.basisBlade('e3')).toThrow(AlgebraOperationError)
  })

  it('powers, involutions, and scalar functions follow the common definitions', () => {
    const p = owned(point(2, 1))
    expectClose(engine.power(p, 2).coefficients, [-1, 0, 0, 0, 0, 0, 0, 0])
    expectClose(engine.power(p, 0).coefficients, [1, 0, 0, 0, 0, 0, 0, 0])
    expectClose(engine.power(p, -1).coefficients, engine.inverse(p).coefficients as unknown as Pga2Coefficients)
    expect(engine.gradeInvolution(engine.add(engine.basisBlade('e1'), engine.basisBlade('e12'))).coefficients)
      .toEqual([0, 0, -1, 0, 0, 0, 1, 0])
    expect(engine.scalarFunction('cos', [engine.scalar(0)]).coefficients[0]).toBe(1)
    expect(() => engine.scalarFunction('sin', [engine.basisBlade('e1')])).toThrow(AlgebraOperationError)
    expect(engine.exp(engine.scalar(1)).coefficients[0]).toBeCloseTo(Math.E, 12)
    expect(() => engine.exp(engine.add(engine.scalar(1), engine.basisBlade('e12')))).toThrow(/closed forms/)
  })
})
